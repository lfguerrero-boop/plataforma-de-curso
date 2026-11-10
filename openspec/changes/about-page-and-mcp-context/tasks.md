# Tasks

## 1. Servidor MCP

- [x] 1.1 `mcp-server/` con `type: module`, dependencias, `.gitignore` (`.env`, `node_modules`) y script `npm start`; verificado con `git check-ignore` sobre `.env` y `node_modules`.
- [x] 1.2 Herramientas `list_public_assets` y `read_public_asset` (solo dentro de `public/`); verificado con un cliente MCP real por stdio: `img/credits.json` se lee y `../package.json`, `..\package.json`, `img/../../package.json`, `C:/Windows/win.ini`, `/etc/passwd` y `.` se rechazan.
- [x] 1.3 Herramienta `get_site_map` sobre `src/app`; verificado con el cliente MCP: devuelve páginas y los route handlers `/api/courses/search` y `/auth/callback` con su método `GET`.
- [x] 1.4 Herramienta `list_published_courses` con la anon key, leyendo antes las migraciones para usar las columnas reales; verificado con el cliente MCP y la clave real: devuelve los 7 cursos publicados y ninguna columna fuera de `id, title, description, category, level, created_at`.
- [x] 1.5 Registro `marketing-academia-context` con alcance local; verificado con `claude mcp list`: «Connected» (el primer intento falló por la ruta con espacio sin comillas).

## 2. Página «Quiénes somos»

- [x] 2.1 `src/components/featured-courses.tsx`: 3 cursos publicados más recientes con instructor, fecha y calificación; verificado contra la app en marcha: salen «Ejecución algorítmica de ventas con IA», «Agentes de IA que venden por ti» y «Trafficker de Meta Ads», todos «Sin calificar».
- [x] 2.2 `src/app/quienes-somos/page.tsx`, enlace en `site-nav.tsx` y CSS en `globals.css`; verificado: `/quienes-somos` responde 200, y `npx tsc --noEmit` y ESLint terminan sin errores.
- [ ] 2.3 Revisar la página en un navegador real en tema oscuro, tema claro y 390 px (sin desbordamiento horizontal ni texto ilegible).
- [ ] 2.4 `npm run build` y `npm run test:e2e` con la app en marcha; todos pasan (el enlace nuevo del menú no debe romper los E2E que leen el HTML por subcadenas).

## 3. Documentación

- [x] 3.1 `CLAUDE.md`: sección del servidor MCP y dos trampas (stdout reservado al protocolo, ruta con espacio); verificado por lectura del archivo, conservando los saltos CRLF.

## Workflow follow-up

- Archivar con `/opsx:archive` cuando se completen 2.3 y 2.4; sincroniza `specs/about-page/spec.md` con `openspec/specs/`.
- Pendiente fuera de alcance: una misión, historia o equipo reales para la página.
