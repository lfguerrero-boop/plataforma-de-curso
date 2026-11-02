# Design

## Context

Todo el estilo vive en `src/app/globals.css` (sin librerías) y los E2E leen el HTML por subcadenas, así que el rediseño debe conservar `id`, `data-*` y textos como «Inscribirme» o «4.5/5 (2)». No existe `tailwind.config.ts`. Ver proposal.md para la motivación.

## Goals / Non-Goals

**Goals:**
- Que el código, CLAUDE.md, README.md y `DESIGN_SYSTEM.md` describan el mismo sistema visual.
- Corregir los tres defectos de CSS que la revisión confirmó o que la prueba visual reprodujo.

**Non-Goals:**
- Interruptor manual de tema (`data-theme`).
- Implementar `CourseCard` (sigue siendo propuesta; el catálogo usa `CourseRows`).
- Corregir los hallazgos de menor prioridad (ver tasks.md, «Workflow follow-up»).

## Decisions

- **El diseño nuevo manda sobre «Newsprint and brass».** La documentación se alinea con el código, no al revés. Alternativa descartada: revertir el CSS, porque el rediseño ya estaba hecho y aceptado por el usuario.
- **Tema claro solo por `prefers-color-scheme`.** `DESIGN_SYSTEM.md` se corrige para decir lo mismo. Alternativa descartada: añadir selectores `[data-theme]` y un botón, que es trabajo de interfaz nuevo sin petición.
- **`overflow-x: clip` en `body` (y nada en `html`).** `hidden` en ambos convierte a `body` en contenedor de scroll y rompe el `position: sticky` del nav, `.catalog-side` y `.enroll-box`; `clip` recorta sin crear contenedor. Verificado: con `scrollY` 1800 el nav sigue en `top: 0`.
- **Dos tokens para superficies invertidas, `--muted-on-deep` y `--line-on-deep`.** `--deep` es oscuro en los dos temas, pero `--muted` y `--line` cambian con el tema y quedaban a ~2:1 en claro. Se aplican solo a `.how-copy p`, `.footer-credits` y `.footer-legal`. `.slip` (la tarjeta dentro de `.how`) usa `--surface`, que sigue el tema, así que conserva `--muted`: la primera corrección lo trató por error como superficie oscura y la prueba visual lo detectó.
- **Sin `border-radius` en `:focus-visible` global.** Cada elemento conserva el radio de su propia regla; el anillo es solo `outline`.
- **`DESIGN_SYSTEM.md` mapea nombres, no los renombra.** `surface-200` → `--surface`, `success` → `--ok`, etc. `marketing-academia-componentes.md` queda como guía portable con una nota; `marketing-academia.html` no se versiona.

## Risks / Trade-offs

- [`overflow-x: clip` no lo soportan navegadores muy antiguos] → El desbordamiento horizontal volvería a verse, pero el nav no se rompe; aceptable para esta plataforma.
- [Dos fuentes de verdad de tokens (guía portable y `globals.css`)] → Tabla de equivalencias en `DESIGN_SYSTEM.md` y nota en la guía; puede desfasarse si no se mantiene.
- [Prueba visual parcial] → Solo se probó el tema claro en 1280 px y el catálogo no tenía recorrido para comprobar los laterales sticky; tema oscuro, móvil y catálogo largo quedan por revisar.
- [E2E sin ejecutar] → Se espera que el CSS no los afecte, pero hay que correrlos antes de fusionar.
