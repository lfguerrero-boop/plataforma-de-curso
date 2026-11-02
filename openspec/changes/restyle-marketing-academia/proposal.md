# Proposal

## Why

La interfaz cambió de la paleta «Newsprint and brass» (papel gris claro, acento latón, sin sombras) a un tema «Marketing Academy» oscuro por defecto con tema claro según el sistema. El cambio ya está en el código (`src/app/globals.css`, `layout.tsx`) pero no tenía registro: CLAUDE.md y README.md describían el diseño anterior, y una revisión de código detectó errores de CSS (barra `sticky` que no se pegaba, texto atenuado ilegible sobre superficies oscuras, radio de foco forzado). Este cambio deja constancia del rediseño, de las correcciones y de lo que queda pendiente.

## What Changes

- Rediseño visual: tema oscuro por defecto (azul marino, verde azulado, azul) y tema claro vía `prefers-color-scheme`; radios `--r-sm/md/lg` = 8/12/20 px; sombra `--overlay` y desenfoque del nav como únicas excepciones a los planos de color.
- Correcciones tras la revisión:
  - `body { overflow-x: clip }` en lugar de `overflow-x: hidden` en `html` y `body`, para que el nav y los laterales `sticky` se peguen al viewport.
  - Tokens `--muted-on-deep` y `--line-on-deep` para texto y bordes sobre `--deep` (oscuro en ambos temas); `.slip` sigue usando `--muted` porque su tarjeta cambia con el tema.
  - Se quita `border-radius: 4px` de la regla global `:focus-visible`, que pisaba el radio de botones y campos.
- Documentación: CLAUDE.md y README.md (sección Interfaz) describen el diseño nuevo; `DESIGN_SYSTEM.md` (propuesta de `CourseCard`, tokens y tabla de equivalencias hacia `globals.css`) y `marketing-academia-componentes.md` (guía portable, con nota de que no es lo que ejecuta la app); `marketing-academia.html` queda en `.gitignore` como prototipo local.
- Sin cambios de comportamiento, de datos ni de RLS.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
Ninguna. Las specs vigentes (`user-roles`, `course-catalog`, `course-management`, `course-enrollment`, `course-reviews`) describen comportamiento y ninguna menciona el estilo visual. El cambio declara `skip_specs: true`.

## Impact

- Código: `src/app/globals.css`, `src/app/layout.tsx`.
- Documentación: `CLAUDE.md`, `README.md`, `DESIGN_SYSTEM.md`, `marketing-academia-componentes.md`, `.gitignore`.
- Fuera de alcance (pendientes conocidos): esquinas de los carteles WebGL (`posters-gl.tsx`), colores fijos fuera de tokens y `.slip .leader` sin uso, `content: "." / ""` en `.hero-word::after`, implementar `CourseCard`, tema oscuro y móvil sin revisar, E2E sin ejecutar.
