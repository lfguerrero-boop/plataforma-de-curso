# Proposal

## Why

El catálogo solo se podía recorrer por categoría y nivel: quien llega sin saber cómo se llama lo que necesita («quiero aprender a vender por redes») no tiene por dónde empezar. Además, la portada mostraba carteles de publicidad de hace un siglo que no comunicaban IA ni marketing digital actual, y la marca no aparecía en la interfaz. El código de este cambio ya está implementado y verificado; esta propuesta deja constancia de él, de las decisiones tomadas y de lo que queda pendiente.

## What Changes

- **Búsqueda semántica del catálogo.** Quien busca escribe una frase con sus palabras y recibe los cursos publicados más parecidos, de más a menos relevante, combinable con los filtros de categoría y nivel (`/?q=…`).
- **Embeddings por curso.** `courses.embedding` (`vector(384)`, modelo `gte-small`, índice HNSW por coseno). Se calcula **al publicar** un curso, a partir de título, categoría y nivel, descripción y títulos de módulos y lecciones. Nunca del contenido (`body`) de las lecciones, que es protegido.
- **Cálculo automático.** Un trigger avisa por `pg_net` a la Edge Function `embed-course`, que calcula y guarda el vector con el service role. La URL y el secreto compartido viven en Supabase Vault, no en el repositorio.
- **Solo el servidor escribe el embedding.** Un trigger rechaza cualquier escritura de `courses.embedding` hecha con sesión de usuario: RLS filtra filas, no columnas, y sin él un instructor podría fijar su propio vector y salir primero en cualquier búsqueda.
- **Consulta de búsqueda.** La función SQL `match_courses` (`security invoker`) devuelve solo cursos publicados y solo campos públicos; la categoría y el nivel filtran antes del tope de resultados. La frase se convierte en vector con la Edge Function `embed`.
- **Umbral de similitud 0.8.** La búsqueda por frase solo muestra cursos con similitud coseno de 0.8 o más (`MIN_SIMILARITY` en `src/lib/course-search.ts`, enviado como `min_similarity`). Con `gte-small` casi no recorta; ordena igual.
- **API pública.** `GET /api/courses/search?q=…` devuelve en JSON los cursos publicados más parecidos (id, título, descripción, enlace); 400 si falta `q`.
- **Marca.** La «M» con la flecha del logo en el nav (sustituye al triángulo provisional) y como favicon; en pantallas de 440 px o menos queda solo la marca.
- **Franja de servicios de la portada.** Cuatro tarjetas (Funnels y dashboards, Atención al cliente, Agentes de venta IA, IA generativa) con imágenes dibujadas por WebGL, en lugar de los carteles antiguos. El título y la descripción son texto real. Las imágenes tienen brillo y degradados: es una excepción documentada en `DESIGN_SYSTEM.md`, solo para ellas.
- **Efecto WebGL.** El *shader* aplica el radio `--r-md` del sistema. Esto cierra el pendiente «esquinas de los carteles WebGL» del cambio archivado `restyle-marketing-academia`.
- **Corrección de la animación de entrada.** `reveal.tsx` observa también los elementos que llegan después por *streaming*; sin esto los resultados de búsqueda quedaban invisibles.
- **Herramientas.** `supabase/functions/` queda fuera de `tsc` y ESLint (son funciones de Deno); sin eso `next build` fallaba.
- Sin cambios en roles, inscripciones, reseñas ni en las políticas RLS de las tablas existentes.

## Capabilities

### New Capabilities
- `course-search`: búsqueda de cursos publicados por similitud semántica con una frase libre, cálculo automático y protegido del embedding de cada curso, y el alcance público de lo que se devuelve.

### Modified Capabilities
Ninguna. `course-catalog` describe el listado y los filtros, que no cambian: la búsqueda se suma por encima y se especifica en `course-search`. La marca y la franja de servicios son presentación; no se inventan requisitos para ellas (ver `design.md`).

## Impact

- **Base de datos** (6 migraciones, `20261102000100` a `20261103000300`): extensiones `vector` y `pg_net`; columna `courses.embedding` con su índice; funciones `queue_course_embedding`, `protect_course_embedding` y `match_courses`; triggers `courses_queue_embedding` y `courses_protect_embedding`.
- **Edge Functions** (nuevas, en `supabase/functions/`): `embed` y `embed-course`. La segunda usa `service_role`, la única excepción a «la app nunca usa `service_role`».
- **Configuración remota:** secreto `EMBED_WEBHOOK_SECRET` de la función y secretos `embed_course_url` y `embed_course_secret` en el Vault; se crean a mano una vez por proyecto.
- **App:** `src/lib/course-search.ts`, `src/lib/course-text.ts`, `src/app/page.tsx`, `src/components/{home-sections,posters-gl,reveal,site-nav}.tsx`, `src/app/globals.css`, `tsconfig.json`, `eslint.config.mjs`; imágenes `logo-mark.png`, `icon.png` y `servicio-*.webp`; se eliminan los cuatro carteles y su entrada en `credits.json`.
- **Pruebas:** `supabase/tests/7_1_course_search.sql`, `7_2_embedding_protection.sql` y `scripts/e2e/e2e-embeddings.cjs`.
- **Documentación:** `CLAUDE.md`, `README.md`, `DESIGN_SYSTEM.md`.
- **Fuera de alcance (pendientes conocidos):** regenerar el embedding al editar un curso ya publicado; validar la dimensión del vector y limitar el abuso de `embed` (acepta la clave publicable); unificar el armado del texto del curso, hoy duplicado en `course-text.ts` y en `embed-course` (y sin uso en la app); tres pruebas RLS anteriores (`2_2`, `3_3`, `4_1`) que suponen tablas vacías; el flujo de recuperación de contraseña, ajeno a este cambio.
