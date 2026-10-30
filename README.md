# Cursos de marketing digital

Plataforma de cursos al estilo Udemy, enfocada en marketing digital, con dos roles:
**instructor** (crea y publica cursos) y **estudiante** (se inscribe, avanza y reseña).
Es un ejercicio de aprendizaje: el foco está en la **autorización por rol aplicada con RLS**
en Supabase, no en la interfaz.

**Stack:** Next.js 16 (App Router) · Supabase (Auth, Postgres, Storage) · TypeScript.

## Qué hace

| Rol | Puede |
| --- | --- |
| Visitante | Ver el catálogo de cursos publicados, filtrarlo por categoría y nivel, ver el temario, el promedio y las reseñas. |
| Estudiante | Inscribirse a cursos publicados, leer lecciones, descargar recursos, marcar progreso, ver *Mis cursos* y reseñar los cursos en los que está inscrito. |
| Instructor | Crear, editar, publicar y borrar **sus** cursos, con módulos, lecciones (texto y enlace de video) y recursos descargables. |

Fuera de alcance: pagos, video alojado, quizzes, certificados y rol admin.

La especificación completa (requisitos y escenarios) está en
[openspec/changes/add-course-platform/](openspec/changes/add-course-platform/).

## Requisitos

- Node.js 20 o superior y npm.
- Una cuenta de [Supabase](https://supabase.com) (el plan gratuito basta). **No hace falta Docker.**

## Puesta en marcha

1. **Instala las dependencias**

   ```bash
   npm install
   ```

2. **Crea un proyecto en Supabase** (dashboard → *New project*) y anota su *project ref*, que es la
   parte de la URL antes de `.supabase.co`. Usa un proyecto solo para este ejercicio: las pruebas
   escriben datos temporales.

3. **Enlaza el proyecto y aplica las migraciones**

   ```bash
   npx supabase login
   npx supabase link --project-ref <tu-project-ref>
   npx supabase db push
   ```

   `login` abre el navegador; `link` pide la contraseña de la base de datos. Las migraciones están
   en [supabase/migrations/](supabase/migrations/): crean las tablas, las funciones auxiliares, las
   políticas RLS, el bucket privado de recursos y la vista de calificaciones.

4. **Configura las variables de entorno**: crea `.env.local` en la raíz con la URL y la clave
   *publishable* (Project Settings → API):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<tu-project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   Nunca pongas la clave `service_role` en la app ni en este archivo: la aplicación solo usa la
   clave publicable con la sesión del usuario, para que RLS siempre se aplique.

5. **(Solo para desarrollo) desactiva la confirmación de correo** en el dashboard:
   *Authentication → Sign In / Providers → Email → Confirm email*. Sin esto, cada registro de prueba
   envía un correo y el plan gratuito limita los envíos a unos pocos por hora. Vuelve a activarla
   antes de usar la app con usuarios reales.

6. **Arranca la app**

   ```bash
   npm run dev
   ```

   Abre <http://localhost:3000>, regístrate como instructor o estudiante en `/registro` y recorre
   el flujo.

## Pruebas

Hay dos niveles; ambos necesitan un token de acceso de Supabase (Account → Access Tokens) para
hablar con la base de datos desde la CLI:

```bash
# PowerShell
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."
# bash
export SUPABASE_ACCESS_TOKEN=sbp_...
```

| Comando | Qué verifica |
| --- | --- |
| `npm run test:rls` | Ejecuta [supabase/tests/](supabase/tests/) contra el proyecto enlazado. Cada archivo simula visitante, estudiante, instructor dueño y otro instructor, y comprueba que **la base** acepta o rechaza cada operación. Todo corre en una transacción con `ROLLBACK`, sin dejar datos. |
| `npm run test:e2e` | Con la app en marcha (`npm run dev`), recorre el flujo completo con sesiones y formularios reales: registro, login, panel del instructor, catálogo, inscripción, progreso, recursos y reseñas. Crea usuarios `@example.com` temporales y los borra al terminar. Usa `E2E_BASE` si la app no corre en `http://localhost:3000`. |

Otros comandos: `npm run lint` y `npm run build`.

## Cómo se aplica la autorización

- **Rol:** se elige al registrarse y un trigger lo guarda en `profiles`; otro trigger impide
  cambiarlo. La app lo lee de `profiles`, nunca de `user_metadata`, que el usuario puede editar.
- **RLS en todas las tablas**, con funciones auxiliares `SECURITY DEFINER` de solo lectura
  (`is_course_owner`, `is_enrolled`, …) para que las políticas no se vuelvan recursivas.
- **Contenido protegido:** el título de cada lección es público (forma el temario) pero su texto,
  video y recursos viven en `lesson_contents`, legible solo por inscritos y por el dueño.
- **Recursos:** bucket privado `lesson-resources`, con la ruta `<course_id>/<archivo>`. La descarga
  se hace con URLs firmadas de 5 minutos.
- **Reglas de negocio** que dependen del estado, como publicar solo con al menos una lección, se
  aplican con triggers.
- `src/proxy.ts` solo redirige por comodidad; la seguridad real la imponen las políticas.

## Estructura

```
src/app/                 páginas y Server Actions (catálogo, curso, lección, panel, mis-cursos)
src/lib/supabase/        clientes de navegador y de servidor
src/proxy.ts             redirecciones por sesión y rol
supabase/migrations/     esquema, políticas RLS, Storage y vistas
supabase/tests/          pruebas SQL de RLS
scripts/                 ejecutores de pruebas (RLS y E2E)
openspec/                especificación del cambio (propuesta, specs, diseño y tareas)
```

## Limitaciones conocidas

- Las pruebas E2E comprueban el HTML y las acciones del servidor, pero no el aspecto visual ni el
  comportamiento con JavaScript activo en un navegador.
- Cualquiera puede registrarse como instructor; un flujo de aprobación sería una mejora futura.
- Borrar la última lección de un curso publicado no lo despublica.
- Las páginas usan estilos mínimos: el diseño visual no forma parte del ejercicio.
