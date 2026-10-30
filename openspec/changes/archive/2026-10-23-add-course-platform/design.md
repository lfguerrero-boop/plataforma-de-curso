# Design

## Context

Proyecto nuevo, sin código previo. Stack decidido: Next.js (App Router) + Supabase (Auth, Postgres, Storage). La autorización debe vivir en la base de datos con RLS; la interfaz solo refleja lo que la base permite. Motivación y alcance en proposal.md; requisitos en `specs/`.

## Goals / Non-Goals

**Goals:**
- Que toda regla de acceso de las specs se cumpla aunque se salte la interfaz y se llame a la API de Supabase directamente.
- Un modelo de datos pequeño, fácil de razonar y de probar con RLS.

**Non-Goals:**
- Pagos, video alojado, quizzes, certificados, rol admin.
- Rendimiento a gran escala (sin caché ni búsqueda de texto completo).

## Decisions

### 1. Modelo de datos

```
profiles(id = auth.users.id, role, full_name)
courses(id, instructor_id -> profiles, title, description, category, level, status)
modules(id, course_id, title, position)
lessons(id, module_id, title, position)              -- metadatos públicos
lesson_contents(lesson_id PK, body, video_url)       -- contenido protegido
lesson_resources(id, lesson_id, file_path, file_name)
enrollments(student_id, course_id)   PK (student_id, course_id)
lesson_progress(student_id, lesson_id) PK (student_id, lesson_id)
reviews(student_id, course_id, rating 1-5, comment) PK (student_id, course_id)
```

`category`, `level` y `status` son enums de Postgres, así los valores inválidos se rechazan en la base. Las claves compuestas de `enrollments`, `lesson_progress` y `reviews` garantizan "una sola vez" sin lógica extra.

### 2. Contenido de lección separado de los metadatos

El catálogo debe mostrar el temario (títulos) a cualquiera, pero ocultar el contenido a los no inscritos. RLS filtra filas, no columnas, así que `lessons` guarda títulos y orden (lectura pública si el curso está publicado) y `lesson_contents` guarda texto y video (lectura solo para inscritos y dueño).
- Alternativa: una sola tabla con una vista que oculte columnas. Descartada: es más fácil equivocarse y filtrar contenido por accidente.

### 3. Funciones auxiliares para las políticas

Las políticas consultan tablas que a su vez tienen RLS (por ejemplo `lessons` -> `modules` -> `courses`), lo que puede causar recursión o políticas ilegibles. Se definen funciones `SECURITY DEFINER` con `search_path` fijo y solo lectura: `is_course_owner(course_id)`, `is_enrolled(course_id)`, `course_of_lesson(lesson_id)`. Cada política queda en una línea y la lógica de pertenencia está en un solo lugar.
- Alternativa: subconsultas en cada política. Descartada por duplicación y riesgo de recursión.

### 4. Rol asignado al registrarse e inmutable

El rol viaja en los metadatos del registro y un trigger sobre `auth.users` crea el `profiles` validando que sea `student` o `instructor` (cualquier otro valor falla). Un trigger `BEFORE UPDATE` en `profiles` impide cambiar `role`. Las políticas de escritura se basan en `profiles.role` leído desde la base, nunca en un claim editable por el cliente.
- Alternativa: rol en `app_metadata` del JWT. Descartada para el MVP: obliga a refrescar el token y complica las pruebas.

### 5. Reglas de negocio con triggers, no con políticas

Dos reglas dependen del estado y no solo de quién es el usuario: publicar un curso exige al menos una lección (trigger al pasar a `published`), y la reseña/inscripción exigen curso publicado (se comprueba en la política `WITH CHECK`). El promedio de calificación se expone con una vista `course_ratings` en modo `security_invoker`, para que respete RLS.

### 6. Recursos descargables en Storage privado

Bucket privado `lesson-resources`; la ruta empieza por `course_id/`. Las políticas de `storage.objects` reutilizan `is_enrolled` e `is_course_owner` sobre ese primer segmento de la ruta. La descarga se hace con URLs firmadas de corta duración emitidas por el servidor.

### 7. Next.js

Sesión con `@supabase/ssr` y cookies. El cliente de servidor usa la clave anónima con la sesión del usuario, de modo que RLS siempre se aplica. La clave `service_role` no se usa en la aplicación. Un middleware redirige a login las rutas protegidas y bloquea `/instructor/*` a quien no sea instructor (comodidad de interfaz; la seguridad real es RLS).

### 8. Pruebas de RLS

Se usa un proyecto Supabase en la nube (no hay Docker para la instancia local), por lo que cada prueba corre en una transacción que termina en `ROLLBACK`. Las políticas se verifican con scripts SQL que simulan cada rol (`set local role authenticated` con `request.jwt.claims`) frente a cada escenario de las specs. Es la forma de comprobar que "la base rechaza" y no solo la interfaz.

## Risks / Trade-offs

- [Una política mal escrita expone contenido] → Pruebas SQL por escenario, incluido el caso del usuario no inscrito y del visitante anónimo.
- [Funciones `SECURITY DEFINER` mal configuradas escalan privilegios] → `search_path` fijo, solo `SELECT`, sin parámetros que construyan SQL dinámico.
- [Triggers repartidos hacen difícil seguir las reglas] → Un archivo de migración por área y comentarios que citan el requisito de la spec.
- [Un usuario se registra como instructor sin verificación] → Aceptado: es un ejercicio; un flujo de aprobación sería una iteración futura.
- [Separar `lessons` y `lesson_contents` añade un join] → Aceptado por la claridad en seguridad.
