# Marketing Academia: sistema de diseño

Fuente de verdad de los tokens y de los componentes de la interfaz. Los tokens base y las reglas de marca viven en [marketing-academia-componentes.md](marketing-academia-componentes.md) (secciones 1 y 2); este documento los resume y añade los componentes nuevos.

> **Estado:** `CourseCard` es una **propuesta, no está implementada**. En el código hay `CourseRows` ([src/components/course-rows.tsx](src/components/course-rows.tsx)), que sigue siendo el componente del catálogo.

## 1. Tokens base (resumen)

Tema oscuro por defecto; el claro se activa solo con `prefers-color-scheme: light` (no hay interruptor manual ni `data-theme`). Valores completos y contrastes en `marketing-academia-componentes.md` §1.

| Familia | Tokens |
|---|---|
| Superficies | `surface-100` (página), `surface-200` (paneles, hover), `surface-300` (elementos elevados, pistas, chips) |
| Texto | `ink`, `ink-muted` |
| Marca / acción | `brand-teal`, `brand-blue`, `accent` + `on-accent`, `accent-2` + `on-accent-2` |
| Bordes y foco | `line` (decorativo), `border-control` (percibible), `focus` (anillo de 3px) |
| Estado | `success`, `warning`, `danger` (siempre con palabra o icono) |
| Espaciado | `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 24 · `space-6` 32 · `space-7` 48 · `space-8` 64 · `space-9` 96 |
| Radios | `radius-sm` 8 · `radius-md` 12 · `radius-lg` 20 · `radius-pill` 999 (en `globals.css`: `--r-sm/md/lg/pill`) |
| Tipografía | Chivo; escalas `h3`, `body`, `small`, `caption` |
| Sombra | `shadow-overlay`, solo menús y diálogos |

## 2. Componentes

### 2.1 `CourseCard`

Tarjeta de curso para vistas en cuadrícula. Resume un curso en una unidad clicable: categoría, título, descripción corta, metadatos y valor (precio, calificación o estado).

**Relación con `CourseRow`.** Las reglas de marca fijan el catálogo como lista («lista, no mosaico»). `CourseCard` **no sustituye** a `CourseRow`: se usa solo en los patrones de la sección «Patrones». El catálogo principal y «Mis cursos» siguen con `CourseRow`.

#### Anatomía

1. Punto de categoría, 16px: `brand-teal` (IA) o `brand-blue` (marketing digital).
2. Título (`h3`, 22px/28px, peso 800). Es el único enlace; su `::after` cubre toda la tarjeta para que sea clicable entera.
3. Descripción: `small` en `ink-muted`, máximo dos líneas.
4. Chips: nivel, módulos, horas. `caption` en mayúsculas, máximo tres.
5. Pie: valor a la izquierda (precio o calificación `4.5/5 (2)`; «Sin calificar» si no hay reseñas) y, a la derecha, una palabra de estado cuando aplica (`INSCRITO`, `BORRADOR`, `PUBLICADO`).

Sin imagen, sin degradados y sin sombra en reposo.

#### Tokens

| Parte | Propiedad | Token |
|---|---|---|
| Contenedor | fondo | `surface-200` |
| | radio | `radius-md` |
| | relleno | `space-5` |
| | hueco entre bloques | `space-3` |
| | borde | ninguno en reposo; `2px solid transparent` reservado para que el hover no desplace el contenido |
| Punto | fondo | `brand-teal` o `brand-blue` |
| | radio | `radius-pill` |
| Título | color | `ink` |
| Descripción | color | `ink-muted` |
| Chip | fondo / texto | `surface-300` / `ink` |
| | radio | `radius-pill` |
| | relleno | `space-1` × `space-2` |
| Valor | color | `ink` (precio), `ink-muted` (sin calificar) |
| Estado `INSCRITO`, `PUBLICADO` | color | `success` |
| Estado `BORRADOR` | color | `warning` |
| Foco | anillo | `focus`, 3px sólido, `outline-offset: 3px` |
| Cuadrícula (contenedor externo) | hueco | `space-5`; columnas `repeat(auto-fill, minmax(280px, 1fr))` |

#### Estados

| Estado | Comportamiento |
|---|---|
| **Normal** | Fondo `surface-200`, sin sombra ni borde visible. |
| **Hover** | Fondo `surface-300` y borde de 2px en `border-control`. Transición de 140 ms en `background-color` y `border-color`. No cambia de tamaño ni se desplaza. |
| **Foco (teclado)** | Anillo `focus` de 3px sobre el título enlazado, extendido a toda la tarjeta con `:has(a:focus-visible)`. |
| **Loading** | Mismo tamaño que la tarjeta real para evitar saltos. Fondo `surface-200`; punto, título, dos líneas de descripción y tres chips como bloques planos `surface-300` con `radius-sm` (`radius-pill` en los chips). Animación de opacidad 1 → 0.6 en bucle de 1.2 s (sin degradado de brillo, por la regla de planos de color). Con `prefers-reduced-motion: reduce` queda estática. Usa `aria-busy="true"` y el texto oculto «Cargando cursos». |
| **Sin calificar** | El valor muestra «Sin calificar» en `ink-muted` y peso 400; no se muestra una puntuación a cero. |
| **Deshabilitado** | No aplica: una tarjeta no clicable no debe renderizarse como tarjeta. |

Las páginas cargan datos dentro de `<Suspense>`; el estado `loading` es el `fallback` de ese `<Suspense>`, no un estado interno de la tarjeta.

#### Patrones donde aparece

**Galería** (portada y destacados). Cuadrícula de `CourseCard` para mostrar entre 3 y 6 cursos publicados, con el valor del pie en precio o calificación. Solo cursos con `status = 'published'` (el filtro es explícito, ver CLAUDE.md). Debajo, un enlace «Ver cursos» hacia el catálogo en filas. En móvil, una columna.

**Panel del instructor** (`/instructor`). Cuadrícula de los cursos del instructor, borradores incluidos. El pie sustituye al precio por la palabra de estado (`BORRADOR` en `warning`, `PUBLICADO` en `success`) y el número de lecciones. Un borrador sin lecciones lo dice en la descripción, porque publicar exige al menos una lección. El título enlaza a la edición del curso, no a la ficha pública. No hay botón relleno `accent` dentro de la tarjeta: la única acción primaria del panel es «Crear curso», fuera de la cuadrícula.

#### Reglas de uso

- Una sola zona clicable por tarjeta (el título). No anides botones ni enlaces dentro.
- La tarjeta no decide qué mostrar según el rol: recibe los datos y el pie ya resueltos. La autorización sigue en RLS.
- Conserva los atributos que leen los E2E: `data-curso`, `data-calificacion` y textos como «4.5/5 (2)» y «Sin calificar».
- Sin emojis; el estado se dice con palabras.

#### Contrato propuesto (props)

```ts
type CourseCardProps = {
  id: string;
  title: string;
  description: string | null;   // máx. 2 líneas
  category: "ai" | "marketing"; // define el color del punto
  chips: string[];              // máx. 3, ya en mayúsculas
  value: string;                // "$189.000", "4.5/5 (2)", "Sin calificar"
  status?: "enrolled" | "draft" | "published";
  href: string;                 // ficha pública o edición del instructor
};
```

El estado `loading` se entrega como un componente aparte, `CourseCardSkeleton`, con las mismas dimensiones.

#### Decisiones abiertas

- `category` no existe hoy en la base: el catálogo no distingue IA de marketing digital. Hasta tenerlo, el punto puede usar `brand-teal` fijo.
- Los tokens de este documento (`surface-*`, `space-*`) usan nombres distintos a los de [src/app/globals.css](src/app/globals.css). Manda el diseño nuevo (decisión del 2026-10-31); al implementar `CourseCard` se traducen así: `surface-100` → `--bg`, `surface-200` → `--surface`, `surface-300` → `--raised`, `ink-muted` → `--muted`, `brand-teal` → `--accent`, `brand-blue` → `--accent-2`, `border-control` → `--border-control`, `focus` → `--focus`, `success` → `--ok`, `warning` → `--warn`, `radius-*` → `--r-*`. `space-*` no tiene equivalente: `globals.css` usa píxeles sueltos y `--margin`.

## 3. Imágenes de servicios (excepción)

Las cuatro imágenes de la franja de servicios de la portada (`public/img/servicio-*.webp`) son arte generado con brillo neón y degradados en verde sobre negro. Rompen la regla de «planos de color, sin degradados» a propósito: son **contenido**, como una fotografía, no estilo de interfaz.

- **Alcance.** Solo esas imágenes. Ningún componente, fondo ni botón usa brillo, degradado ni ese verde neón; la interfaz sigue con `--accent` y `--accent-2`.
- **Marco.** Se muestran con el radio `--r-md`, sin borde propio y sin sombra. El efecto WebGL aplica el mismo radio en el *shader*.
- **Sin texto dentro.** Solo la ilustración (322×322). El título y la descripción son texto real en Chivo, en el `<figcaption>`: así se pueden editar, traducir y leer con lector de pantalla.
- **Tamaño.** Con 322 px de ancho se ven nítidas en pantallas normales y algo blandas en las de alta densidad; si se sustituyen, conviene un original de al menos 600 px por pieza.
