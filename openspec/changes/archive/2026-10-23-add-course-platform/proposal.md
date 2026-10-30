# Proposal

## Why

Se necesita una plataforma de cursos en línea, al estilo Udemy pero dirigida a marketing digital, donde instructores publiquen cursos y estudiantes los consuman. Es un ejercicio de aprendizaje, así que el foco es modelar bien la autorización por rol (instructor/estudiante) con Row Level Security (RLS) en Supabase, con un alcance acotado a un MVP.

## What Changes

- Autenticación con Supabase Auth y dos roles: `instructor` y `student`, guardados en un perfil por usuario.
- Catálogo público de cursos publicados, con categoría (conjunto cerrado de marketing digital), nivel y filtros por ambas.
- Gestión de cursos, módulos y lecciones por el instructor dueño; los cursos tienen estado borrador/publicado.
- Lecciones de texto, con enlace opcional a video externo (YouTube/Vimeo) y recursos descargables.
- Inscripción de estudiantes a cursos publicados y marcado de lecciones completadas, con progreso por curso.
- Reseñas (calificación 1-5 y comentario) de cursos, solo por estudiantes inscritos.
- Toda la autorización se aplica con políticas RLS en la base de datos, no solo en la interfaz.
- Fuera de alcance: pagos, carrito, cupones, video alojado, quizzes, certificados, rol admin, rutas de aprendizaje.

## Capabilities

### New Capabilities
- `user-roles`: registro, inicio de sesión y perfil con rol instructor o estudiante.
- `course-catalog`: listado y detalle público de cursos publicados con filtros por categoría y nivel.
- `course-management`: creación y edición de cursos, módulos, lecciones y recursos por su instructor, y publicación.
- `course-enrollment`: inscripción a cursos publicados, acceso a lecciones y progreso del estudiante.
- `course-reviews`: reseñas y calificación promedio de cursos por estudiantes inscritos.

### Modified Capabilities

## Impact

- Proyecto nuevo: aplicación Next.js (App Router) sin código existente.
- Supabase: tablas, políticas RLS, Auth y Storage (recursos descargables).
- Dependencias: `next`, `@supabase/supabase-js`, `@supabase/ssr`.
- Supuestos registrados: categorías y niveles son valores fijos; el video es solo un enlace externo; un usuario tiene un único rol, asignado al registrarse.
