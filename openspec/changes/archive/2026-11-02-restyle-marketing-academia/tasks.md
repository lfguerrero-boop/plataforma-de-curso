# Tasks

## 1. Correcciones de CSS

- [x] 1.1 `body { overflow-x: clip }` y sin `overflow-x` en `html`; verificado en Chrome: con `scrollY` 1800 el nav sigue en `top: 0` y `body` computa `clip`.
- [x] 1.2 Añadir `--muted-on-deep` y `--line-on-deep` y aplicarlos a `.how-copy p`, `.footer-credits` y `.footer-legal`; verificado en tema claro: contraste 7.99:1.
- [x] 1.3 `.slip li .when` conserva `--muted` (la tarjeta sigue el tema); verificado en captura: «Explorar» y «1 clic» se leen.
- [x] 1.4 Quitar `border-radius: 4px` de `:focus-visible`; verificado con Tab real: `INPUT` y `BUTTON` mantienen 8 px y el anillo de 3 px.
- [x] 1.5 `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

## 2. Documentación

- [x] 2.1 CLAUDE.md (Interfaz) y README.md (Interfaz) describen el tema oscuro/claro, los radios 8/12/20 y los tokens `--*-on-deep`; verificado con búsqueda: ya no aparece «Newsprint and brass».
- [x] 2.2 `DESIGN_SYSTEM.md`: tema claro solo por `prefers-color-scheme`, radios reales y tabla de equivalencias hacia `globals.css`.
- [x] 2.3 `marketing-academia-componentes.md` con nota de guía portable; `marketing-academia.html` añadido a `.gitignore` y ausente de `git status`.

## 3. Verificación pendiente antes de fusionar

- [x] 3.1 Tema oscuro revisado en Chrome (portada, «Así se aprende aquí», pie y login): textos atenuados entre 7.0:1 y 8.3:1; `INPUT` y `BUTTON` conservan 8 px con anillo de 3 px al tabular. No se revisaron las páginas de curso ni de instructor.
- [x] 3.2 Ancho móvil (390 px) en `/`, `/login` y `/registro`: sin desbordamiento horizontal (`scrollWidth` 390) y `.catalog-side` en `static`.
- [x] 3.3 Catálogo con 25 filas clonadas solo en el DOM del navegador (sin tocar datos): `.catalog-side` queda pegado en `top: 96px` mientras se hace scroll.
- [x] 3.4 `npm run test:e2e` con la app en marcha y el token cargado desde `.env.local`: 113/113 comprobaciones pasan en los 7 scripts y cada uno limpia sus usuarios de prueba.
- [x] 3.5 Commits en la rama `restyle-marketing-academia` (no `main`), separados en CSS, documentación y OpenSpec; verificado con `git log` y `git status` sin el `.html`.

## Workflow follow-up

- Pendientes fuera de alcance: esquinas cuadradas de los carteles WebGL frente a `<img>` redondeadas (`posters-gl.tsx`); colores fijos en `.cta .btn` y `.video-link` y `.slip .leader` sin uso; `content: "." / ""` en `.hero-word::after`; implementar `CourseCard`.
- Archivar el cambio con `/opsx:archive` cuando se completen las tareas 3.x (sin deltas de specs, por `skip_specs: true`).
