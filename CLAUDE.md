# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Plataforma de cursos de marketing digital (instructor / estudiante). Next.js 16 (App Router) + Supabase (Auth, Postgres, Storage). Es un ejercicio de aprendizaje cuyo foco es la **autorización por rol con RLS**. Las especificaciones vigentes están en `openspec/specs/` y el historial del cambio en `openspec/changes/archive/`. El README explica la puesta en marcha.

## Next.js no es el que conoces

`AGENTS.md` lo avisa y es cierto: esta versión (16.4) tiene cambios incompatibles. Lee la guía relevante en `node_modules/next/dist/docs/` antes de escribir código de Next. Lo que ya mordió en este repo:

- `middleware` ahora es **`src/proxy.ts`** (exporta `proxy`).
- `cacheComponents` está activo (`next.config.ts`): no se admite `export const dynamic`; todo acceso a cookies o `params` debe ir dentro de un `<Suspense>`, y los componentes que leen datos por petición empiezan con `await connection()`. Patrón de las páginas: el `default export` es síncrono y envuelve un componente `async` interno en `<Suspense>`.
- `params` y `searchParams` son `Promise`; `cookies()` es asíncrona.
- Por la misma razón del *streaming*, una página que llama a `notFound()` dentro de `<Suspense>` responde **HTTP 200** con la UI de «no encontrado» (no 404). Las pruebas lo asumen.
- Server Actions: el límite de cuerpo está subido a 10 MB en `next.config.ts` (subida de recursos).

## Comandos

```bash
npm run dev                 # app en http://localhost:3000
npm run build               # build de producción (también valida tipos)
npm run lint                # ESLint (ignora scripts/**)
npx tsc --noEmit            # solo tipos

npx supabase db push        # aplica supabase/migrations al proyecto enlazado
npx supabase functions deploy <nombre> --use-api   # despliega una Edge Function sin Docker (embed-course lleva además --no-verify-jwt)
npm run test:rls            # todas las pruebas SQL de RLS (supabase/tests/*.sql)
npm run test:e2e            # E2E con sesiones y formularios reales (la app debe estar corriendo)
npm run test:unit           # Vitest, proyecto unit: src/**/*.test.ts (sin red)
npm run test:integration    # Vitest, proyecto integration: src/**/*.integration.test.ts (contra el Supabase remoto)
```

No hay Docker ni Supabase local: todo corre contra un **proyecto Supabase remoto** enlazado (`supabase link`). Las pruebas necesitan `SUPABASE_ACCESS_TOKEN` en el entorno (la CLI lo usa para consultar la base); sin él fallan con `AccessTokenRequiredError`. La CLI no lee `.env.local` sola (está en `.gitignore`): cárgalo antes en el mismo comando, p. ej. `set -a; . ./.env.local; set +a; npm run test:e2e`, sin imprimir el valor. Se usa siempre `npx supabase` (la CLI es una devDependency, no está global).

**Una sola prueba:**
```bash
npx supabase db query --linked -f supabase/tests/5_1_enrollment_progress.sql   # un archivo RLS
E2E_BASE=http://localhost:3123 node scripts/e2e/e2e-reviews.cjs                # un E2E (imprime JSON)
npx vitest run --project unit src/lib/ratings.test.ts                       # un archivo de Vitest
```
Un archivo SQL pasa si no imprime error (los `assert` abortan con exit 1; `RAISE NOTICE` no se ve). Los E2E usan `E2E_BASE` si la app no está en el puerto 3000.

Variables en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (formato `sb_publishable_…`, no la anon JWT). La app de Next nunca usa `service_role`; la única excepción es la Edge Function `embed-course` (ver Búsqueda semántica), que corre en el servidor de Supabase.

## Arquitectura

**La autorización vive en la base, no en la app.** Las páginas y Server Actions solo traducen errores; quién puede qué lo deciden las políticas RLS de `supabase/migrations/`. `src/proxy.ts` redirige por comodidad (visitante → `/login`, no-instructor fuera de `/instructor`) y no es una barrera de seguridad. Por eso `src/lib/supabase/server.ts` siempre usa la clave publicable con la sesión del usuario.

Decisiones que atraviesan varios archivos:

- **Rol**: se elige al registrarse (`raw_user_meta_data.role`); un trigger crea `profiles` y rechaza cualquier valor distinto de `student`/`instructor`; otro trigger impide cambiarlo (salvo operaciones sin `auth.uid()`). El rol se lee **siempre de `profiles`**, nunca de `user_metadata` (el usuario puede editarlo).
- **Temario público, contenido protegido**: RLS filtra filas, no columnas. Por eso `lessons` (título/orden, público si el curso está publicado) está separada de `lesson_contents` (texto y video, solo inscritos y dueño) y de `lesson_resources`.
- **Funciones auxiliares `SECURITY DEFINER`** (`is_course_owner`, `is_enrolled`, `is_course_published`, `course_of_lesson`, …) evitan la recursión entre políticas; son de solo lectura y con `search_path` fijo. Las políticas nuevas deben reutilizarlas.
- **Reglas con estado van en triggers**, no en políticas (p. ej. publicar exige ≥1 lección; el trigger también cubre `INSERT` directo con `status='published'`).
- **Recursos**: bucket privado `lesson-resources`, ruta `<course_id>/<archivo>`; las políticas de `storage.objects` extraen el curso de la ruta con `course_id_from_path`. Descarga por URLs firmadas de 5 min. `uploadResource` toma el `course_id` de la base, no del formulario.
- **Recuperación de contraseña** (`/recuperar` → correo → `/auth/callback` → `/nueva-clave`): el flujo es PKCE, así que el enlace solo funciona en el navegador donde se pidió. `src/app/auth/callback/route.ts` canjea el `code` y solo redirige a destinos de una lista (`ALLOWED_NEXT`); `requestPasswordReset` responde igual exista o no el correo. Exige configurar en el dashboard de Supabase *Site URL* y `…/auth/callback` en *Redirect URLs*; no se puede probar de punta a punta sin un correo real.
- **Búsqueda semántica**: `courses.embedding` (`vector(384)`, gte-small, índice HNSW coseno; extensión `vector` en el esquema `public`). Un trigger (`courses_queue_embedding`) avisa por `pg_net` a la Edge Function `supabase/functions/embed-course` cuando un curso **pasa a `published`** (no al crear: un borrador no se busca y aún no tiene lecciones); la función ignora cursos no publicados, arma el texto (título, categoría y nivel, descripción y títulos de módulos/lecciones, **nunca** el `body` de `lesson_contents`), calcula el embedding y lo guarda con el service role. Editar un curso ya publicado **no** regenera su embedding. Solo el servidor escribe `embedding`: el trigger `courses_protect_embedding` rechaza cualquier escritura con `auth.uid()` (RLS filtra filas, no columnas: sin él un instructor podría fijar su propio vector y salir primero en cualquier búsqueda). La URL de la función y el secreto compartido están en **Supabase Vault** (`embed_course_url`, `embed_course_secret`) y en el secreto de la función `EMBED_WEBHOOK_SECRET`; se crean a mano una vez por proyecto (el repositorio es público) y sin ellos el trigger solo emite un `WARNING`. La Edge Function `embed` (texto → vector, sin acceso a la base) la usa `src/lib/course-search.ts` (`searchCourses`), que llama a `match_courses` (SQL, `security invoker`, solo publicados y campos públicos; `category`/`level` son parámetros opcionales que filtran **antes** del tope). El catálogo (`/?q=…`) la usa y combina `q` con `category`/`level`. La similitud de gte-small es alta incluso para lo poco relacionado (~0.82+): sirve para ordenar, no como umbral. Para rellenar cursos sin embedding, llama a `embed-course` por cada uno desde SQL con `net.http_post` leyendo los secretos del Vault.
- **Servidor MCP local** (`mcp-server/`, JavaScript por stdio, de solo lectura; paquete y `node_modules` propios, fuera de `tsconfig`/ESLint de la app): cuatro herramientas — `list_public_assets` y `read_public_asset` (solo dentro de `public/`; rechaza `..`, rutas absolutas y enlaces simbólicos que salgan), `get_site_map` (recorre `src/app` y excluye grupos `(x)`, `_privadas` y `@slots`) y `list_published_courses` (anon/publishable key, solo `id, title, description, category, level, created_at` con `status = 'published'` explícito). Lee `mcp-server/.env` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`; ignorado por git) y está registrado en Claude con alcance **local** como `marketing-academia-context` (`claude mcp add … --scope local`), nunca con alcance de proyecto: un `.mcp.json` metería la clave en el repositorio público. La API pública equivalente del sitio es `GET /api/courses/search?q=` (`src/app/api/courses/search/route.ts`).
- **Pruebas con Vitest** (`vitest.config.mts`, dos proyectos; las pruebas viven junto al código y usan el alias `@/`): `unit` no toca la red; `integration` (`*.integration.test.ts`, timeouts largos) usa `src/test/world.ts`, que con `SUPABASE_SERVICE_ROLE_KEY` (solo de `.env.local` o del entorno, nunca en código de la app) crea instructor, curso publicado, estudiante inscrito y otro sin inscribir con sesiones reales, y los borra con `cleanup()` (llámalo siempre). Los E2E de `scripts/e2e/*.cjs` siguen aparte; `*.spec.ts` y `e2e/` quedan fuera de Vitest.
- **Calificaciones**: la vista `course_ratings` es `security_invoker` para respetar la RLS de `reviews`; un curso sin reseñas no tiene fila ("sin calificar").

Estructura de la app: Server Actions en `src/app/{auth,instructor,cursos}/actions.ts` (cada una exige sesión con `requireUser()`); formularios con el componente cliente `src/components/action-form.tsx` (`useActionState`, muestra `error`/`message`).

## Trampas conocidas

- **Embeds de PostgREST ambiguos**: `courses` llega a `profiles` por dos caminos (instructor e inscripciones). Usa la pista de relación: `instructor:profiles!courses_instructor_id_fkey(full_name)`. Sin ella falla en silencio con `PGRST201` y el catálogo sale vacío.
- Las relaciones 1-1 (`lesson_contents`) llegan como objeto pero los tipos las infieren como arreglo; el código acepta ambas formas.
- El catálogo filtra `status = 'published'` **explícitamente**: un instructor con sesión también vería sus borradores por RLS.
- Supabase **prohíbe `DELETE` directo en `storage.objects` por SQL** (`protect_delete`); el borrado se prueba con la API real en `e2e-storage.cjs`.
- Nuevas migraciones: nombre `YYYYMMDDHHMMSS_descripcion.sql` en orden; toda tabla nueva nace con `enable row level security` (sin políticas = acceso denegado) y su archivo de prueba en `supabase/tests/`, que corre en una transacción con `ROLLBACK`.
- CSS: no pongas `overflow-x: hidden` en `html` ni en `body` (convierte a `body` en contenedor de scroll y rompe el `position: sticky` del nav, `.catalog-side` y `.enroll-box`); `body` usa `overflow-x: clip`. Sobre `--deep` (oscuro en ambos temas) usa `--muted-on-deep`/`--line-on-deep`; `.slip` es una tarjeta que sigue el tema y usa `--muted`.
- El repositorio de GitHub es **público**: `.env*`, `node_modules/` (incluido el de `taller-agente/`) y `supabase/.temp/` están en `.gitignore`; no pegues claves ni contraseñas en archivos versionados. Para cargar datos de ejemplo sin `service_role`, inicia sesión como instructor por la API de Auth y escribe por PostgREST con ese token (así RLS se aplica); las credenciales van por variables de entorno, nunca en el script.
- `courses.category` es un enum cerrado (`seo`, `paid_ads`, `social_media`, `email_marketing`, `analytics`) y `level` es `basic`/`intermediate`/`advanced`; un tema nuevo (p. ej. IA) hay que encajarlo en una de esas categorías o añadir una migración.
- `DESIGN_SYSTEM.md`, `marketing-academia-componentes.md` y `marketing-academia.html` (prototipo estático de la marca) usan otros tokens (`--surface-*`, `--space-*`) que `src/app/globals.css`. `CourseCard` es solo una propuesta; el catálogo real usa `course-rows.tsx`. No mezcles ambos sistemas sin decidir cuál manda.
- `supabase/functions/` son Edge Functions de **Deno** (tipos `Deno`/`Supabase`): están excluidas de `tsconfig.json` y de ESLint; sin eso `tsc` y `next build` fallan. El armado del texto del curso está duplicado en `src/lib/course-text.ts` y en `embed-course/index.ts` (la función no puede importar con el alias `@/`): si cambias uno, cambia el otro.
- `npx supabase db query --linked "<sql>"` falla con consultas de varias líneas en Windows (`query` vacío): usa `-f archivo.sql`. `src/app/page.tsx` y `CLAUDE.md` están en CRLF (`globals.css` en LF); si parchas por script, normaliza y restaura los saltos.
- `npm run test:rls` hoy pasa 10 de 13: `2_2`, `3_3` y `4_1` suponen tablas vacías (p. ej. «un anónimo ve exactamente 1 curso») y fallan con los cursos reales cargados en el proyecto remoto. Al escribir pruebas nuevas cuenta solo las filas del propio test, no `count(*)` de la tabla. `e2e-embeddings.cjs` tarda ~30 s por las esperas del webhook.
- `mcp-server/index.js`: stdout es el canal del protocolo, así que nada imprime ahí (`dotenv` se carga con `quiet: true`; los mensajes van a `stderr`). Al registrarlo con `claude mcp add`, la ruta tiene un espacio (`sesion 4`): ponla entre comillas o se parte en dos argumentos y el servidor no conecta.
- Los E2E crean usuarios `@example.com` reales en el proyecto remoto y los borran al final; si un script se interrumpe, quedan en `auth.users`.
- La confirmación de correo está desactivada en el proyecto de desarrollo (los registros de prueba dan sesión inmediata); con ella activa, los E2E de registro no funcionan.

## Interfaz

- Todo el estilo vive en `src/app/globals.css` (sin librerías): tokens, Chivo (`next/font`), tema oscuro por defecto (azul marino + verde azulado + azul) y tema claro vía `prefers-color-scheme` (no hay interruptor `data-theme`); las secciones invertidas usan `--deep` y su texto atenuado `--muted-on-deep`/`--line-on-deep` (nunca `--muted`/`--line`, que cambian con el tema); la llamada final usa `--accent`. Planos de color sin degradados (salvo las imágenes de servicios de la portada); la sombra (`--overlay`) y el desenfoque del nav son las únicas excepciones. Radios `--r-sm/md/lg` = 8/12/20 px. Los tokens de diseño están documentados en `DESIGN_SYSTEM.md`. La portada (`src/components/home-sections.tsx`) y las filas del catálogo (`course-rows.tsx`) son componentes reutilizables; la entrada animada la hace `reveal.tsx` y sin JS todo queda visible.
- Los E2E leen el HTML por subcadenas: conserva los `id`/`data-*` (`#catalogo`, `#temario`, `data-calificacion`, `data-curso`…) y textos como «Inscribirme», «Mis cursos» o «4.5/5 (2)» al tocar el diseño.
- `src/components/posters-gl.tsx` dibuja las ilustraciones de la portada con Three.js sobre las `<img>` (`public/img/servicio-*.webp`, 322×322, solo la ilustración: el título y la descripción son texto real en el `<figcaption>`, fuera de la `<img>` y por tanto fuera del WebGL; el *shader* aplica el radio `--r-md`) (mejora progresiva: sin WebGL o con `prefers-reduced-motion` queda el HTML). Three se descarga con `import()` solo cuando la franja de servicios está cerca de la pantalla; las `<img>` deben seguir existiendo porque el WebGL se sincroniza con su posición.
- `logo-mark.png` y los `servicio-*.webp` de `public/img/` son material del proyecto; los `servicio-*` tienen brillo y degradados (excepción documentada en `DESIGN_SYSTEM.md`, no un estilo para componentes). El video del anuncio de 1956 (`anuncio-1956.mp4` y su póster) es de dominio público (Wikimedia Commons); su crédito está en el pie de la portada y en `public/img/credits.json`.

## Flujo OpenSpec

Los cambios se planifican con `/opsx:propose` → `/opsx:apply` → `/opsx:archive`. Las specs vigentes son `openspec/specs/{user-roles,course-catalog,course-management,course-enrollment,course-reviews,about-page}`; un cambio de comportamiento debe reflejarse ahí.
