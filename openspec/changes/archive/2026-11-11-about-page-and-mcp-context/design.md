## Context

Ver proposal.md (Why). El sitio usa Next 16 con `cacheComponents`: las lecturas por petición van en un componente `async` con `await connection()` dentro de `<Suspense>`. La autorización vive en RLS; la app usa la clave publicable con la sesión del usuario.

## Goals / Non-Goals

**Goals:**
- Una página coherente con el resto del sitio, con datos reales y sin inventar hechos (equipo, fechas, cifras).
- Un servidor MCP que no pueda escribir ni salirse de las carpetas previstas.

**Non-Goals:**
- Historia, misión o equipo propios: no existen en el repositorio y no se inventan.
- Un spec para el servidor MCP: es herramienta de desarrollo, no cambia el comportamiento del sitio.
- Publicar o compartir el servidor MCP fuera de la máquina local.

## Decisions

- **Reutilizar `CourseRows` y los estilos existentes** (`main.page`, `.page-head`, `.btn`) en lugar de crear un sistema nuevo; solo se añaden unas líneas de CSS para el ancho de lectura del texto. `CourseRows` usa `id="catalogo"`, que no choca porque la página es otra; los E2E del catálogo lo buscan solo en `/`.
- **Los 3 más recientes por `created_at` descendente**, igual que el catálogo y que la herramienta MCP. «Primeros» se interpretó como «más recientes».
- **Estado `published` explícito en la consulta**: RLS dejaría ver al instructor sus borradores.
- **Áreas y niveles desde `CATEGORIES` y `LEVELS`** (`src/lib/courses.ts`), no escritos a mano, para que no se desfasen.
- **Servidor MCP con SDK oficial y stdio.** Herramientas con `readOnlyHint`; la anon/publishable key, nunca la service role; columnas públicas explícitas (`id, title, description, category, level, created_at`), sin `instructor_id`, `status` ni `embedding`.
- **`read_public_asset` valida dos veces**: sobre el texto de la ruta (`..`, rutas absolutas, otra unidad) y sobre la ruta real (`realpath`) para cortar enlaces simbólicos. Máximo 1 MB; texto como texto, binarios en base64.
- **`get_site_map` lee el sistema de archivos**, no una lista fija: ignora grupos `(x)`, `_privadas` y `@slots`, conserva `[id]` y detecta los métodos exportados de los route handlers.
- **`dotenv` con `quiet: true`**: stdout es el canal del protocolo y sus avisos lo romperían.
- **Registro con alcance local** (`claude mcp add … --scope local`): un `.mcp.json` pondría la clave en el repositorio público. La ruta tiene un espacio, así que va entre comillas.

## Risks / Trade-offs

- [Texto institucional genérico] → solo describe comportamiento verificable de la plataforma; se amplía cuando haya misión o equipo reales.
- [`id="catalogo"` repetido entre páginas] → aceptado; si se añade otra lista en la misma página habría que parametrarlo.
- [La clave publicable queda en `~/.claude.json` y en `mcp-server/.env`] → es pública por diseño; `.env` está ignorado por git.
- [El servidor MCP depende de rutas relativas a `public/` y `src/app/`] → si se mueven esas carpetas, hay que actualizar las constantes de `index.js`.

## Migration Plan

1. Desplegar la página con la app; no requiere migraciones ni variables nuevas.
2. Cada persona que quiera el servidor MCP crea `mcp-server/.env` y ejecuta `claude mcp add marketing-academia-context --scope local -e SUPABASE_URL=… -e SUPABASE_ANON_KEY=… -- node "<ruta>/mcp-server/index.js"`.
3. Reversión: `claude mcp remove marketing-academia-context --scope local` y borrar la ruta `/quienes-somos` con su enlace.
