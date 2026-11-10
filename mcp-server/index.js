import { config } from "dotenv";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
// quiet: dotenv imprime avisos por stdout y stdout es el canal del protocolo MCP.
config({ path: join(here, ".env"), quiet: true });

const ASSETS_DIR = resolve(here, "..", "public");
const APP_DIR = resolve(here, "..", "src", "app");
const MAX_FILE_BYTES = 1024 * 1024;
const TEXT_EXTENSIONS = new Set([".json", ".svg", ".txt", ".md", ".css", ".js", ".html", ".xml"]);

// Solo lectura: ninguna herramienta escribe en disco ni en la base.
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

const text = (value) => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});
const failure = (message) => ({ isError: true, content: [{ type: "text", text: message }] });

const toPosix = (p) => p.split(sep).join("/");

async function walkFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(full)));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

// Resuelve una ruta pedida dentro de ASSETS_DIR; devuelve null si se sale de la carpeta.
// Se comprueba dos veces: sobre el texto (../, rutas absolutas) y sobre la ruta real
// (enlaces simbólicos que apunten fuera).
async function resolveInsideAssets(requested) {
  const root = await realpath(ASSETS_DIR);
  const candidate = resolve(root, requested);
  const inside = (p) => {
    const rel = relative(root, p);
    // rel vacío es la propia carpeta; en otra unidad de Windows relative() devuelve ruta absoluta.
    return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
  };
  if (!inside(candidate)) return null;
  let real;
  try {
    real = await realpath(candidate);
  } catch {
    return { path: candidate, missing: true };
  }
  return inside(real) ? { path: real, missing: false } : null;
}

const server = new McpServer({ name: "mcp-server", version: "1.0.0" });

server.registerTool(
  "list_public_assets",
  {
    description: "Lista los archivos de la carpeta de assets públicos (public/), con ruta relativa y tamaño en bytes.",
    annotations: READ_ONLY,
  },
  async () => {
    try {
      const root = await realpath(ASSETS_DIR);
      const files = await walkFiles(root);
      const items = await Promise.all(
        files.map(async (f) => ({ path: toPosix(relative(root, f)), bytes: (await stat(f)).size })),
      );
      items.sort((a, b) => a.path.localeCompare(b.path));
      return text(items);
    } catch (e) {
      return failure(`No se pudo listar los assets: ${e.message}`);
    }
  },
);

server.registerTool(
  "read_public_asset",
  {
    description:
      "Lee un archivo de la carpeta de assets públicos (public/). Rechaza rutas que salgan de esa carpeta. " +
      "Los de texto se devuelven como texto; los binarios, en base64. Máximo 1 MB.",
    inputSchema: { path: z.string().min(1).describe("Ruta relativa dentro de public/, p. ej. img/credits.json") },
    annotations: READ_ONLY,
  },
  async ({ path }) => {
    if (path.includes("\0")) return failure("Ruta no válida.");
    const target = await resolveInsideAssets(path);
    if (!target) return failure("Ruta rechazada: queda fuera de la carpeta de assets públicos.");
    if (target.missing) return failure(`No existe el archivo: ${path}`);
    try {
      const info = await stat(target.path);
      if (!info.isFile()) return failure("La ruta no es un archivo.");
      if (info.size > MAX_FILE_BYTES) {
        return failure(`El archivo pesa ${info.size} bytes; el máximo permitido es ${MAX_FILE_BYTES}.`);
      }
      const data = await readFile(target.path);
      if (TEXT_EXTENSIONS.has(extname(target.path).toLowerCase())) return text(data.toString("utf8"));
      return text({ encoding: "base64", bytes: info.size, data: data.toString("base64") });
    } catch (e) {
      return failure(`No se pudo leer el archivo: ${e.message}`);
    }
  },
);

// Convierte una carpeta de src/app en su URL siguiendo las reglas del App Router:
// (grupo) no cuenta, [param] se conserva, _privada y @slot no son rutas.
function routeFor(segments) {
  const parts = segments.filter((s) => !(s.startsWith("(") && s.endsWith(")")));
  if (parts.some((s) => s.startsWith("_") || s.startsWith("@"))) return null;
  return "/" + parts.join("/");
}

async function describeRoute(file) {
  const kind = file.name === "page.tsx" ? "page" : "route";
  if (kind === "page") return { type: "page" };
  const source = await readFile(file.full, "utf8");
  const methods = [...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map(
    (m) => m[1],
  );
  return { type: "route handler", methods };
}

server.registerTool(
  "get_site_map",
  {
    description:
      "Mapa de páginas del sitio según el App Router de src/app: URL, tipo (página o route handler con sus métodos) y archivo.",
    annotations: READ_ONLY,
  },
  async () => {
    try {
      const entries = [];
      for (const full of await walkFiles(APP_DIR)) {
        const name = full.slice(full.lastIndexOf(sep) + 1);
        if (name !== "page.tsx" && name !== "route.ts") continue;
        const dirSegments = toPosix(relative(APP_DIR, dirname(full))).split("/").filter(Boolean);
        const url = routeFor(dirSegments);
        if (url === null) continue;
        entries.push({
          url,
          ...(await describeRoute({ name, full })),
          file: toPosix(relative(resolve(here, ".."), full)),
        });
      }
      entries.sort((a, b) => a.url.localeCompare(b.url));
      return text(entries);
    } catch (e) {
      return failure(`No se pudo leer el router: ${e.message}`);
    }
  },
);

// Columnas reales de public.courses (migración 20261023000300_courses_schema.sql):
// id, instructor_id, title, description, category, level, status, created_at; y
// `embedding` (20261102000100). Solo se piden las públicas: no instructor_id, status ni embedding.
const PUBLIC_COURSE_COLUMNS = "id, title, description, category, level, created_at";

server.registerTool(
  "list_published_courses",
  {
    description:
      "Trae los cursos publicados desde Supabase con la anon key, solo con columnas públicas " +
      "(id, title, description, category, level, created_at). Filtros opcionales por categoría y nivel.",
    inputSchema: {
      category: z.enum(["seo", "paid_ads", "social_media", "email_marketing", "analytics"]).optional(),
      level: z.enum(["basic", "intermediate", "advanced"]).optional(),
      limit: z.number().int().min(1).max(100).default(50),
    },
    annotations: { ...READ_ONLY, openWorldHint: true },
  },
  async ({ category, level, limit }) => {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return failure("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en mcp-server/.env.");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    // El filtro de estado es explícito aunque RLS ya lo imponga a un anónimo.
    let query = supabase
      .from("courses")
      .select(PUBLIC_COURSE_COLUMNS)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (category) query = query.eq("category", category);
    if (level) query = query.eq("level", level);
    const { data, error } = await query;
    if (error) return failure(`Supabase respondió con un error: ${error.message}`);
    return text(data);
  },
);

await server.connect(new StdioServerTransport());
console.error("Servidor MCP en marcha (stdio)");
