// Ejecuta las pruebas E2E (scripts/e2e/*.cjs) contra la app en marcha y el proyecto Supabase.
// Antes: `npm run dev` (o `npm start` tras `npm run build`) y SUPABASE_ACCESS_TOKEN definido.
// Usa E2E_BASE si la app no corre en http://localhost:3000.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "scripts", "e2e");
const base = process.env.E2E_BASE || "http://localhost:3000";

try {
  await fetch(base, { signal: AbortSignal.timeout(10_000) });
} catch {
  console.error(`No hay una app respondiendo en ${base}. Inicia \`npm run dev\` o define E2E_BASE.`);
  process.exit(2);
}

let checks = 0;
let failed = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".cjs")).sort()) {
  const run = spawnSync(process.execPath, [join(dir, file)], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, E2E_BASE: base },
  });

  let result;
  try {
    result = JSON.parse(run.stdout.slice(run.stdout.indexOf("{")));
  } catch {
    checks++;
    failed++;
    console.log(`FALLO  ${file}: salida no válida\n${run.stderr || run.stdout}`);
    continue;
  }

  const entries = Object.entries(result).filter(([k]) => k !== "limpieza" && k !== "emails");
  const bad = entries.filter(([k, v]) => k === "error" || v === "FALLO" || (typeof v === "object" && JSON.stringify(v).includes("FALLO")));
  checks += entries.length;
  failed += bad.length;

  console.log(`${bad.length ? "FALLO" : "OK   "}  ${file} (${entries.length - bad.length}/${entries.length})`);
  bad.forEach(([k, v]) => console.log(`         - ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`));
  if (result.limpieza) console.log(`         limpieza: ${result.limpieza}`);
}

console.log(`\n${checks - failed}/${checks} comprobaciones E2E pasaron`);
process.exit(failed ? 1 : 0);
