# Design

## Context

La autorización vive en la base (RLS) y la app solo usa la clave publicable con la sesión del usuario; no hay Docker ni Supabase local, todo corre contra un proyecto remoto. RLS filtra filas, no columnas, y el repositorio es público: no puede llevar claves ni URLs privadas. El catálogo ya filtra `status = 'published'` de forma explícita. Ver proposal.md para la motivación.

## Goals / Non-Goals

**Goals:**
- Que la búsqueda no pueda mostrar nada que el catálogo normal no muestre, ni siquiera a un instructor sobre sus borradores.
- Que el embedding se calcule sin que ningún flujo de la app tenga que acordarse de hacerlo, y que un fallo de ese cálculo nunca impida guardar un curso.
- Una portada con imágenes actuales de IA y marketing sin romper el sistema de diseño más allá de una excepción acotada.

**Non-Goals:**
- Regenerar el embedding al editar un curso ya publicado (ver Riesgos).
- Un umbral de relevancia que recorte de verdad: con `gte-small` no es fiable (ver decisión 7). El umbral de 0.8 es un piso decidido por el usuario, no una medida de acierto.
- Indexar el contenido de las lecciones, ni siquiera para inscritos.
- Hacer que las tarjetas de servicios enlacen a algún sitio.

## Decisions

1. **Columna `courses.embedding`, no una tabla aparte.** `vector(384)` con índice HNSW por coseno. Es lo más simple y viaja con la fila. Alternativa descartada: tabla `course_embeddings` con sus propias políticas, que permitiría restringir la escritura sin triggers pero añade un join en cada búsqueda. La consecuencia, que RLS no protege columnas, se resuelve con la decisión 6. El vector sale de texto público, así que leerlo no filtra nada.
2. **`gte-small` en el runtime de Supabase.** 384 dimensiones, sin proveedor externo ni claves de terceros. Alternativa descartada: un modelo de pago de 1536 dimensiones, que exigiría una clave guardada en algún sitio y otra dimensión de columna.
3. **El texto del curso es título, categoría y nivel (con etiquetas en español), descripción y títulos de módulos y lecciones.** Nunca `lesson_contents.body`: indexarlo en una columna de lectura pública filtraría contenido que hoy solo ven los inscritos y el dueño. Las etiquetas aportan señal semántica que `paid_ads` no tiene.
4. **Cálculo dirigido por la base: trigger → `pg_net` → Edge Function `embed-course` → `UPDATE` con service role.** Funciona sea cual sea el camino que publique el curso, y como `pg_net` envía tras el `COMMIT` nunca bloquea la transacción; la función de trigger además atrapa cualquier excepción y emite un `WARNING`. Alternativa descartada: una Server Action del instructor que calcule y guarde con su sesión; dejaría sin embedding cualquier curso publicado por otra vía y obligaría a abrir la escritura del vector a usuarios. La URL de la función y el secreto compartido van en **Supabase Vault** (`embed_course_url`, `embed_course_secret`), creados a mano por proyecto, porque el repositorio es público; sin ellos el trigger solo avisa.
5. **El embedding se calcula al publicar, no al crear.** Primera versión: al crear y al publicar. La revisión de código mostró que un borrador recién creado no tiene lecciones, así que su vector se calculaba en el momento equivocado y se descartaba al publicar. Se corrigió en `20261103000100`. `embed-course` además ignora cualquier curso no publicado, como defensa en profundidad.
6. **`courses_protect_embedding`: un trigger que rechaza escrituras de `embedding` con `auth.uid()`.** Sin él, la política «el dueño edita los suyos» permitía a un instructor fijar su propio vector y salir primero en cualquier búsqueda. Sigue el patrón del trigger que impide cambiar el rol (permitido sin `auth.uid()`: Edge Function y operaciones directas). Compara el texto del vector porque con `search_path` vacío no se resuelve el operador `=` de `vector` (que vive en `public`); lo reveló la prueba `7_2` y se corrigió en `20261103000300`. Alternativa descartada: revocar el `UPDATE` de la columna, más frágil ante los privilegios por defecto de Supabase.
7. **`match_courses` es SQL, `security invoker`, con filtro de estado explícito y campos públicos.** Hereda RLS en lugar de saltarla. `category` y `level` son parámetros opcionales aplicados **antes** del `LIMIT`; el primer intento filtraba en la app sobre los 50 más parecidos y podía decir «ningún curso» habiéndolos. `min_similarity` vale 0 por defecto en SQL, y `searchCourses` envía 0.8 (`MIN_SIMILARITY` en `src/lib/course-search.ts`), valor elegido por el usuario tras probar 0.88 y 0.90: con `gte-small` hasta lo poco relacionado puntúa por encima de 0.82, así que 0.8 casi no recorta y la similitud sirve para ordenar, no como umbral de acierto. Si se quiere recortar de verdad, subirlo a ~0.88–0.90 tras probar frases reales; una frase vaga podría quedarse sin resultados.
8. **Dos Edge Functions con propósitos y accesos distintos.** `embed` solo convierte texto en vector, no toca la base y se llama con la clave publicable, de modo que los visitantes pueden buscar. `embed-course` escribe, se despliega con `--no-verify-jwt` (la llamada viene de la base, sin usuario) y se autentica con el secreto en `x-webhook-secret`, comparado en tiempo constante. Es la única pieza que usa `service_role`.
9. **Catálogo: formulario GET (`?q=`).** Funciona sin JavaScript, el estado vive en la URL y los enlaces de filtros conservan la frase. Los resultados van dentro de **un único** elemento: el catálogo es una cuadrícula de dos columnas y un fragmento con dos hijos mandaba la lista a la columna estrecha de abajo. `reveal.tsx` pasó a observar con un `MutationObserver` los elementos que llegan después por *streaming*; sin eso quedaban en `opacity: 0`. Las dos correcciones eran necesarias por separado: se comprobó quitando cada una.
10. **Marca: solo la «M» con la flecha, sobre su propio mosaico oscuro.** La imagen original lleva el nombre mal escrito («merkating») y ilegible a tamaño de nav. Los verdes y azules del logo están pensados para fondo marino y perderían contraste sobre el fondo claro, así que el mosaico (radio `--r-sm`) se lee igual en los dos temas. A 440 px o menos queda solo la marca, con el nombre accesible para lectores de pantalla: con el logo, el nombre se partía en dos líneas a 390 px. También es el favicon.
11. **Franja de servicios: imagen solo de la ilustración, texto real aparte.** Las cuatro piezas salen de un compuesto de 765×1024 recortado a 322×322 (WebP). El título y la descripción son un `<figcaption>`: editables, traducibles y accesibles, y fuera del WebGL, que solo dibuja la `<img>`. El *shader* aplica el radio `--r-md` con un campo de distancia y mezcla alfa; antes dibujaba rectángulos. Las imágenes tienen brillo y degradados: **excepción acotada** (`DESIGN_SYSTEM.md`, sección 3) a «planos de color, sin degradados». Alternativas descartadas: dejar el texto dentro de la imagen (no editable ni nítido), y adaptar toda la página al verde neón (rediseño mayor). Antes se habían dibujado cuatro ilustraciones planas en SVG con los tokens del sistema; se sustituyeron cuando se aportó arte propio, y se borraron.
12. **Las tarjetas no enlazan.** `courses.category` es un enum cerrado sin «IA» ni «atención al cliente»; enlazar al catálogo habría exigido emparejamientos forzados.
13. **Herramientas.** `supabase/functions/` queda fuera de `tsc` y ESLint: usa tipos de Deno y rompía `next build`.

## Risks / Trade-offs

- [Editar título, descripción o temario de un curso publicado deja su embedding desactualizado] → Cambio futuro: regenerar desde triggers sobre `courses`, `modules` y `lessons`, o desde las Server Actions del instructor.
- [`embed` se llama con la clave publicable, que es pública: se puede gastar cómputo] → Riesgo aceptado ahora; mitigar con límite de tasa o exigiendo sesión.
- [Si cambian el modelo o la dimensión, `match_courses` falla con un error genérico al usuario] → Validar la longitud del vector antes de la llamada.
- [El texto del curso está duplicado en `src/lib/course-text.ts` y en `embed-course`, y la versión de la app no la usa nadie] → Borrar la copia de la app o unificarlas; hasta entonces, cualquier cambio de etiquetas debe hacerse en ambas.
- [Con muchos cursos, el filtro de estado y el de categoría pueden impedir que Postgres use el índice HNSW y devolver menos filas que el tope] → Irrelevante con el catálogo actual (7 cursos); revisar al crecer.
- [`embedding` es legible por quien lee `courses`] → Es derivado de texto ya público; no se considera sensible.
- [Los secretos del Vault y de la función se crean a mano en cada proyecto y, sin ellos, el trigger solo emite un aviso] → Documentado en CLAUDE.md; el curso se publica igual (requisito «El cálculo no bloquea la gestión del curso»).
- [Imágenes de servicios de 322 px: blandas en pantallas de alta densidad] → Sustituir por originales de 600 px o más sin cambiar código.
- [Excepción de estilo: el verde neón de las imágenes no coincide con `--accent`] → Acotada a esas cuatro imágenes y documentada; ningún componente la imita.

## Migration Plan

1. Desplegar las funciones y el secreto antes de que el trigger las necesite: `npx supabase functions deploy embed --use-api`, `npx supabase functions deploy embed-course --use-api --no-verify-jwt` y `npx supabase secrets set EMBED_WEBHOOK_SECRET=…`.
2. `npx supabase db push` aplica las seis migraciones en orden.
3. Crear en el Vault `embed_course_url` y `embed_course_secret` (el mismo valor que `EMBED_WEBHOOK_SECRET`).
4. Rellenar los cursos ya publicados llamando a `embed-course` por cada uno desde SQL con `net.http_post` y los secretos del Vault. Hecho para los 7 cursos existentes.
5. Verificar: `supabase/tests/7_1_course_search.sql`, `7_2_embedding_protection.sql` y `scripts/e2e/e2e-embeddings.cjs`.

Revertir: eliminar los triggers, las tres funciones SQL, la columna y las extensiones; borrar las dos Edge Functions y los secretos. No hay datos de usuario implicados.

## Open Questions

- ¿Qué mecanismo regenera el embedding al editar: triggers en la base o las Server Actions? Es el siguiente cambio y no altera lo especificado hoy.
- ¿Conviene un límite de tasa para `embed`, o exigir sesión para buscar? No cambia las specs mientras el acceso público siga siendo un requisito.
