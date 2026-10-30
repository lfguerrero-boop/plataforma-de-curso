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
npm run test:rls            # todas las pruebas SQL de RLS (supabase/tests/*.sql)
npm run test:e2e            # E2E con sesiones y formularios reales (la app debe estar corriendo)
```

No hay Docker ni Supabase local: todo corre contra un **proyecto Supabase remoto** enlazado (`supabase link`). Las pruebas necesitan `SUPABASE_ACCESS_TOKEN` en el entorno (la CLI lo usa para consultar la base); sin él fallan con `AccessTokenRequiredError`. Se usa siempre `npx supabase` (la CLI es una devDependency, no está global).

**Una sola prueba:**
```bash
npx supabase db query --linked -f supabase/tests/5_1_enrollment_progress.sql   # un archivo RLS
E2E_BASE=http://localhost:3123 node scripts/e2e/e2e-reviews.cjs                # un E2E (imprime JSON)
```
Un archivo SQL pasa si no imprime error (los `assert` abortan con exit 1; `RAISE NOTICE` no se ve). Los E2E usan `E2E_BASE` si la app no está en el puerto 3000.

Variables en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (formato `sb_publishable_…`, no la anon JWT). La app nunca usa `service_role`.

## Arquitectura

**La autorización vive en la base, no en la app.** Las páginas y Server Actions solo traducen errores; quién puede qué lo deciden las políticas RLS de `supabase/migrations/`. `src/proxy.ts` redirige por comodidad (visitante → `/login`, no-instructor fuera de `/instructor`) y no es una barrera de seguridad. Por eso `src/lib/supabase/server.ts` siempre usa la clave publicable con la sesión del usuario.

Decisiones que atraviesan varios archivos:

- **Rol**: se elige al registrarse (`raw_user_meta_data.role`); un trigger crea `profiles` y rechaza cualquier valor distinto de `student`/`instructor`; otro trigger impide cambiarlo (salvo operaciones sin `auth.uid()`). El rol se lee **siempre de `profiles`**, nunca de `user_metadata` (el usuario puede editarlo).
- **Temario público, contenido protegido**: RLS filtra filas, no columnas. Por eso `lessons` (título/orden, público si el curso está publicado) está separada de `lesson_contents` (texto y video, solo inscritos y dueño) y de `lesson_resources`.
- **Funciones auxiliares `SECURITY DEFINER`** (`is_course_owner`, `is_enrolled`, `is_course_published`, `course_of_lesson`, …) evitan la recursión entre políticas; son de solo lectura y con `search_path` fijo. Las políticas nuevas deben reutilizarlas.
- **Reglas con estado van en triggers**, no en políticas (p. ej. publicar exige ≥1 lección; el trigger también cubre `INSERT` directo con `status='published'`).
- **Recursos**: bucket privado `lesson-resources`, ruta `<course_id>/<archivo>`; las políticas de `storage.objects` extraen el curso de la ruta con `course_id_from_path`. Descarga por URLs firmadas de 5 min. `uploadResource` toma el `course_id` de la base, no del formulario.
- **Calificaciones**: la vista `course_ratings` es `security_invoker` para respetar la RLS de `reviews`; un curso sin reseñas no tiene fila ("sin calificar").

Estructura de la app: Server Actions en `src/app/{auth,instructor,cursos}/actions.ts` (cada una exige sesión con `requireUser()`); formularios con el componente cliente `src/components/action-form.tsx` (`useActionState`, muestra `error`/`message`).

## Trampas conocidas

- **Embeds de PostgREST ambiguos**: `courses` llega a `profiles` por dos caminos (instructor e inscripciones). Usa la pista de relación: `instructor:profiles!courses_instructor_id_fkey(full_name)`. Sin ella falla en silencio con `PGRST201` y el catálogo sale vacío.
- Las relaciones 1-1 (`lesson_contents`) llegan como objeto pero los tipos las infieren como arreglo; el código acepta ambas formas.
- El catálogo filtra `status = 'published'` **explícitamente**: un instructor con sesión también vería sus borradores por RLS.
- Supabase **prohíbe `DELETE` directo en `storage.objects` por SQL** (`protect_delete`); el borrado se prueba con la API real en `e2e-storage.cjs`.
- Nuevas migraciones: nombre `YYYYMMDDHHMMSS_descripcion.sql` en orden; toda tabla nueva nace con `enable row level security` (sin políticas = acceso denegado) y su archivo de prueba en `supabase/tests/`, que corre en una transacción con `ROLLBACK`.
- Los E2E crean usuarios `@example.com` reales en el proyecto remoto y los borran al final; si un script se interrumpe, quedan en `auth.users`.
- La confirmación de correo está desactivada en el proyecto de desarrollo (los registros de prueba dan sesión inmediata); con ella activa, los E2E de registro no funcionan.

## Interfaz

- Todo el estilo vive en `src/app/globals.css` (sin librerías): tokens, Chivo (`next/font`), papel gris claro con tinta casi negra y un acento latón (paleta «Newsprint and brass»; los campos invertidos usan `--deep` y la llamada final `--accent`), planos de color sin degradados ni sombras. La portada (`src/components/home-sections.tsx`) y las filas del catálogo (`course-rows.tsx`) son componentes reutilizables; la entrada animada la hace `reveal.tsx` y sin JS todo queda visible.
- Los E2E leen el HTML por subcadenas: conserva los `id`/`data-*` (`#catalogo`, `#temario`, `data-calificacion`, `data-curso`…) y textos como «Inscribirme», «Mis cursos» o «4.5/5 (2)» al tocar el diseño.
- `src/components/posters-gl.tsx` dibuja los carteles de la portada con Three.js sobre las `<img>` (mejora progresiva: sin WebGL o con `prefers-reduced-motion` queda el HTML). Three se descarga con `import()` solo cuando los carteles están cerca de la pantalla; las `<img>` deben seguir existiendo porque el WebGL se sincroniza con su posición.
- Las imágenes de `public/img/` son de dominio público (Wikimedia Commons); sus créditos están en el pie de la portada y en `public/img/credits.json`.

## Flujo OpenSpec

Los cambios se planifican con `/opsx:propose` → `/opsx:apply` → `/opsx:archive`. Las specs vigentes son `openspec/specs/{user-roles,course-catalog,course-management,course-enrollment,course-reviews}`; un cambio de comportamiento debe reflejarse ahí.
