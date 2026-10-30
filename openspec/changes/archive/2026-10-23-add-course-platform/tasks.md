# Tasks

## 1. Proyecto y Supabase

- [x] 1.1 Crear la app Next.js (App Router, TypeScript) e instalar `@supabase/supabase-js` y `@supabase/ssr`; verificar que `npm run dev` levanta y `npm run build` pasa
- [x] 1.2 Usar un proyecto Supabase en la nube (sin Docker): `supabase init`, `supabase link` y `.env.local` con URL y clave anónima; verificar que `supabase migration list` se conecta al proyecto remoto
- [x] 1.3 Crear los clientes Supabase de servidor y de navegador con cookies y verificar que una página de prueba lee la sesión sin errores

## 2. Perfiles, roles y autenticación (user-roles)

- [x] 2.1 Migración: enum de rol, tabla `profiles`, trigger de alta desde `auth.users` que valida `student`/`instructor`, y trigger que impide cambiar `role`; verificar con un script SQL que un rol inválido falla y que un `UPDATE` del rol es rechazado
- [x] 2.2 RLS de `profiles` (cada usuario lee y edita solo el suyo, sin tocar `role`); verificar con script SQL por cada escenario de la spec
- [x] 2.3 Páginas de registro con selector de rol, inicio y cierre de sesión; verificar registrando un estudiante y un instructor y comprobando su `role` en `profiles`
- [x] 2.4 Middleware: redirigir a login las rutas protegidas y bloquear `/instructor/*` a estudiantes; verificar en navegador con visitante, estudiante e instructor

## 3. Cursos, módulos y lecciones (course-management)

- [x] 3.1 Migración: enums `category`, `level`, `status`; tablas `courses`, `modules`, `lessons`, `lesson_contents`, `lesson_resources` y `enrollments` (solo la tabla, sus políticas van en 5.1); funciones auxiliares `is_course_owner`, `is_enrolled`, `course_of_lesson` con `search_path` fijo; verificar que `supabase db push` aplica todo sin errores
- [x] 3.2 Trigger que exige al menos una lección para pasar un curso a `published`; verificar con script SQL que publicar vacío falla y publicar con lección funciona
- [x] 3.3 Políticas RLS de escritura del dueño sobre cursos, módulos, lecciones, contenidos y recursos; verificar con scripts SQL: dueño edita, otro instructor y estudiante son rechazados
- [x] 3.4 Bucket privado `lesson-resources` y sus políticas de `storage.objects` (subida para dueño, descarga para dueño e inscritos); verificar con scripts SQL y una subida y descarga reales
- [x] 3.5 Panel del instructor: lista de sus cursos, formularios de curso, módulos y lecciones (texto, video, recursos), y botón publicar/despublicar; verificar el flujo completo en navegador y que un instructor no ve borradores ajenos

## 4. Catálogo público (course-catalog)

- [x] 4.1 Políticas de lectura pública de cursos publicados, módulos y títulos de lecciones (dueño ve sus borradores); verificar con scripts SQL como visitante anónimo, incluido que un borrador ajeno no se devuelve
- [x] 4.2 Página de catálogo con filtros por categoría y nivel (combinables) y estado vacío; verificar en navegador los escenarios de filtros de la spec
- [x] 4.3 Página de detalle del curso con temario sin contenido de lecciones y 404 para borradores ajenos; verificar con visitante y con URL de un borrador

## 5. Inscripción y progreso (course-enrollment)

- [x] 5.1 Migración: tabla `lesson_progress` con clave compuesta y RLS de `enrollments` (tabla creada en 3.1) y de `lesson_progress` (inscribirse solo a cursos publicados y solo estudiantes; ver lo propio; el instructor ve las de sus cursos); verificar con scripts SQL: duplicada, borrador, instructor inscribiéndose y lectura cruzada
- [x] 5.2 Política de lectura de `lesson_contents` solo para inscritos y dueño; verificar con script SQL que un no inscrito recibe cero filas
- [x] 5.3 Botón de inscripción, página de lección con contenido, video y recursos, y marcar completada; verificar en navegador y que un usuario no inscrito no ve el contenido
- [x] 5.4 Vista "Mis cursos" con porcentaje de progreso; verificar que el porcentaje sube al completar lecciones y llega a 100%

## 6. Reseñas (course-reviews)

- [x] 6.1 Migración: tabla `reviews` con rango 1-5, clave compuesta y RLS (solo inscritos en cursos publicados, solo estudiantes, editar y borrar lo propio, lectura pública); verificar con scripts SQL: rango inválido, no inscrito, instructor, segunda reseña y edición ajena
- [x] 6.2 Vista `course_ratings` con `security_invoker` (promedio y conteo); verificar con un script SQL que 5 y 3 dan promedio 4 con 2 reseñas y que un curso sin reseñas devuelve sin calificación
- [x] 6.3 Formulario de reseña, listado de reseñas y promedio en catálogo y detalle; verificar en navegador que solo un inscrito ve el formulario y que el promedio se actualiza

## 7. Integración

- [x] 7.1 Script que ejecuta todas las pruebas SQL de RLS en una sola corrida contra el proyecto remoto, cada script dentro de una transacción con `ROLLBACK` para no dejar datos; verificar que pasa completo
- [x] 7.2 Recorrido de extremo a extremo con datos de ejemplo: instructor crea y publica, estudiante se inscribe, completa y reseña; verificar que cada escenario de las specs queda cubierto
- [x] 7.3 README con pasos para crear y enlazar el proyecto Supabase, correr la app y las pruebas de RLS; verificar siguiendo el README desde cero

## Workflow follow-up

- Archivar el cambio cuando la revisión del ejercicio esté lista.
