# Tasks

## 1. Base de datos

- [x] 1.1 Migración `20261102000100`: extensión `vector`, columna `courses.embedding vector(384)` e índice HNSW por coseno; verificado con `db push` y con `vector_dims(embedding) = 384` en los cursos rellenados.
- [x] 1.2 Migración `20261102000200`: `pg_net`, función `queue_course_embedding` y trigger `courses_queue_embedding`, con URL y secreto leídos del Vault; verificado con `scripts/e2e/e2e-embeddings.cjs` (un curso publicado obtiene su embedding de 384 dimensiones).
- [x] 1.3 Migración `20261103000100`: el embedding se calcula solo al publicar (no al crear) y trigger `courses_protect_embedding`; verificado con `supabase/tests/7_2_embedding_protection.sql` y con el E2E (un instructor real recibe `42501` al escribir o insertar `embedding`, y el borrador no obtiene embedding).
- [x] 1.4 Migración `20261103000300`: la comparación del trigger de protección usa el texto del vector, porque con `search_path` vacío no se resuelve `=`; verificado: `7_2_embedding_protection.sql` pasa (fallaba antes con «operator does not exist»).
- [x] 1.5 Migraciones `20261102000300` y `20261103000200`: `match_courses` (`security invoker`, solo publicados, campos públicos, `category` y `level` antes del tope); verificado con `supabase/tests/7_1_course_search.sql`, que incluye el sabotaje de una aserción falsa para comprobar que la prueba falla cuando debe.

## 2. Edge Functions y secretos

- [x] 2.1 `supabase/functions/embed` (texto → vector `gte-small`, sin acceso a la base); verificado con una llamada real: 384 dimensiones, norma 1.0, HTTP 200 con la clave publicable y 401 sin credenciales.
- [x] 2.2 `supabase/functions/embed-course` (service role, `--no-verify-jwt`, secreto en `x-webhook-secret` comparado en tiempo constante, ignora cursos no publicados); verificado: 401 sin secreto y el E2E de publicación pasa. La omisión de un borrador está en el código pero no tiene prueba directa.
- [x] 2.3 Secretos `EMBED_WEBHOOK_SECRET` de la función y `embed_course_url` y `embed_course_secret` en el Vault, y relleno de los cursos ya publicados; verificado: 7 de 7 cursos con embedding de 384 dimensiones.

## 3. App: búsqueda en el catálogo

- [x] 3.1 `src/lib/course-search.ts` (`searchCourses`: recorta a 300 caracteres, convierte la frase y llama a `match_courses`); verificado con frases reales: «quiero aprender a vender por redes» devuelve primero cursos de redes sociales y «automatizar mis ventas con inteligencia artificial» devuelve primero «Ejecución algorítmica de ventas con IA».
- [x] 3.2 Caja de búsqueda y resultados en `src/app/page.tsx` (`?q=`, combinable con categoría y nivel, hasta 8 resultados); verificado en un navegador real: las filas quedan a la derecha del título con `opacity: 1`, y `scripts/e2e/e2e-catalog.cjs` pasa sus 13 comprobaciones.
- [x] 3.3 `src/components/reveal.tsx` observa con `MutationObserver` lo que llega por *streaming*; verificado quitándolo: sin él las filas siguen en `opacity: 0`.
- [x] 3.4 `src/lib/course-text.ts` con el armado del texto del curso; verificado contra cursos reales. Hoy no lo usa ningún código de la app (ver Workflow follow-up).
- [x] 3.5 `supabase/functions/` fuera de `tsconfig.json` y de ESLint; verificado: `npx tsc --noEmit` y `npm run lint` terminan sin errores.

## 4. Marca y portada

- [x] 4.1 `logo-mark.png` en el nav (sustituye al triángulo CSS) y `src/app/icon.png` como favicon; verificado con capturas en tema oscuro, claro y 390 px, e `/icon.png` responde `image/png`.
- [x] 4.2 En 440 px o menos queda solo la marca con el nombre accesible; verificado a 390 px: el enlace de marca mide una línea (antes de la corrección medía dos).
- [x] 4.3 Franja de servicios (`servicio-*.webp` y `figcaption` con título y descripción) en `src/components/home-sections.tsx`; verificado en un navegador real en tema oscuro, claro y 390 px: WebGL activo, 4 imágenes de 322×322 cargadas y sin errores de consola; con `prefers-reduced-motion` queda el HTML.
- [x] 4.4 *Shader* de `posters-gl.tsx` con el radio `--r-md` y alfa; verificado en las capturas: las esquinas redondeadas se conservan bajo WebGL.
- [x] 4.5 Se eliminan los cuatro carteles antiguos y sus entradas de `public/img/credits.json` (queda solo el video del anuncio) y el crédito de los carteles del pie; verificado: `grep` sin referencias en `src`.

## 5. Documentación

- [x] 5.1 `DESIGN_SYSTEM.md`, sección 3 «Imágenes de servicios (excepción)»: alcance, marco, sin texto dentro y tamaño; verificado por lectura del archivo.
- [x] 5.2 `CLAUDE.md` (búsqueda semántica, comandos de despliegue, trampas, imágenes) y `README.md`; verificado por búsqueda: ya no aparece «carteles de la portada» ni los `ia-*.svg`.

## 6. Verificación de integración

- [x] 6.1 `npm run test:rls`: 10 de 13 pasan, incluidas `7_1` y `7_2`. Fallan `2_2`, `3_3` y `4_1`, que suponen tablas vacías (p. ej. «un anónimo ve exactamente 1 curso») y hoy hay 7 cursos publicados reales; no los causó este cambio.
- [ ] 6.2 Ejecutar `npm run test:e2e` completo con la app en marcha y confirmar que los 7 scripts más `e2e-embeddings.cjs` pasan. En este cambio solo se ejecutaron `e2e-catalog.cjs` y `e2e-embeddings.cjs`.

## 7. Umbral de similitud y API pública

- [x] 7.1 `MIN_SIMILARITY = 0.8` en `src/lib/course-search.ts`, enviado a `match_courses` como `min_similarity`; verificado leyendo la llamada RPC y con `npx tsc --noEmit` y ESLint sin errores. Pasó por 0.88 y 0.90 antes de quedar en 0.8 por decisión del usuario.
- [x] 7.2 `GET /api/courses/search?q=…` en `src/app/api/courses/search/route.ts`; verificado con la app en marcha: con «quiero aprender a vender por redes» responde 200 con cursos (id, título, descripción, url) y sin `q` responde 400 con el mensaje de error.
- [ ] 7.3 Probar frases reales en `/?q=…` y anotar la similitud de resultados buenos y malos para decidir si 0.8 basta o conviene 0.88–0.90.

## Workflow follow-up

- Archivar el cambio (`/opsx:archive`) una vez ejecutado 6.2: sincroniza `specs/course-search/spec.md` con `openspec/specs/`.
- Pendientes conocidos fuera de alcance (ver proposal.md, «Impact»): regenerar el embedding al editar un curso publicado; validar la dimensión del vector y limitar el abuso de `embed`; borrar o unificar `src/lib/course-text.ts`; corregir las pruebas `2_2`, `3_3` y `4_1`; añadir un E2E del catálogo con `?q=`.
- El flujo de recuperación de contraseña (`/recuperar`, `/auth/callback`, `/nueva-clave`) y el cambio sin confirmar en `openspec/specs/user-roles/spec.md` son anteriores y ajenos a este cambio; no se incluyen aquí.
