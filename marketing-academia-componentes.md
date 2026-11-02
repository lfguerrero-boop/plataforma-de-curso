# Marketing Academia: componentes para reutilizar

Guía y código listo para copiar en otros proyectos. Todo el código usa variables CSS (`var(--...)`) definidas en la sección 1: pega esa sección primero.

> **Nota:** este archivo es la guía **portable**; no es lo que ejecuta esta app. `src/app/globals.css` usa otros nombres de token (`--bg`, `--surface`, `--r-*`), radios de 8/12/20 px y tema claro por `prefers-color-scheme`, sin `data-theme`. La equivalencia está en `DESIGN_SYSTEM.md` (sección «Decisiones abiertas»).

## Índice

1. Tokens (CSS)
2. Reglas de marca
3. Componentes

## 1. Tokens (CSS)

Guárdalo como `tokens.css`. El tema oscuro es el predeterminado; para el claro pon `data-theme="light"` en `<html>`. Carga también la fuente:

````html
<link href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;800;900&display=swap" rel="stylesheet">
````

````css
:root,
[data-theme="dark"] {
  --surface-100: #141a26;
  --surface-200: #1c2433;
  --surface-300: #263044;
  --ink: #eef3f8;
  --ink-muted: #a3afc2;
  --brand-teal: #2dd4a7;
  --brand-blue: #4c8dff;
  --accent: #2dd4a7;
  --on-accent: #0a1220;
  --accent-2: #4c8dff;
  --on-accent-2: #0a1220;
  --line: #33405a;
  --border-control: #7a88a3;
  --focus: #7fb0ff;
  --success: #3ddc97;
  --warning: #f5c451;
  --danger: #ff8a8a;
  --shadow-overlay: 0 16px 40px rgba(0,0,0,0.45);
}

[data-theme="light"] {
  --surface-100: #f4f6f9;
  --surface-200: #e6eaf0;
  --surface-300: #d6dce6;
  --ink: #121826;
  --ink-muted: #4a5568;
  --brand-teal: #0b7f68;
  --brand-blue: #1d4fb8;
  --accent: #0b7f68;
  --on-accent: #ffffff;
  --accent-2: #1d4fb8;
  --on-accent-2: #ffffff;
  --line: #c3cbd8;
  --border-control: #6b778c;
  --focus: #1d4fb8;
  --success: #0f7a4a;
  --warning: #8a5a00;
  --danger: #b42318;
  --shadow-overlay: 0 16px 40px rgba(18,24,38,0.18);
}

:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 96px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-pill: 999px;
  --font-sans: "Chivo", "Segoe UI", system-ui, sans-serif;
}
````

### Escala tipográfica

| Estilo | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|
| `display` | 72px / 68px | 900 | Una sola vez por página: portada y cabecera de catálogo. |
| `h1` | 48px / 48px | 900 | Título de página o de curso. |
| `h2` | 32px / 36px | 800 | Secciones: Programa, Instructor, Reseñas. |
| `h3` | 22px / 28px | 700 | Título de módulo o de tarjeta. |
| `lead` | 20px / 30px | 400 | Entradilla bajo un titular. |
| `body` | 16px / 24px | 400 | Texto corrido y descripciones. |
| `body-strong` | 16px / 24px | 700 | Etiquetas de campo, botones y precios. |
| `small` | 14px / 20px | 400 | Metadatos: duración, nivel, fecha. |
| `caption` | 12px / 16px | 700 | Chips y etiquetas en mayúsculas (escribir el texto ya en mayúsculas). |

### Colores

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `surface-100` | `#141a26` | `#f4f6f9` | Fondo de página y secciones principales. Es el azul marino del logo en el tema oscuro. |
| `surface-200` | `#1c2433` | `#e6eaf0` | Paneles, filas de curso en hover, formularios y bloques de contenido sobre surface-100. |
| `surface-300` | `#263044` | `#d6dce6` | Elementos elevados dentro de un panel: módulos, chips, campos de entrada sobre surface-200. |
| `ink` | `#eef3f8` | `#121826` | Texto principal y titulares sobre surface-100, surface-200 y surface-300. |
| `ink-muted` | `#a3afc2` | `#4a5568` | Texto secundario (descripciones, metadatos) sobre surface-100, surface-200 y surface-300. |
| `brand-teal` | `#2dd4a7` | `#0b7f68` | Verde azulado de la marca. Texto de énfasis, enlaces y marcas de progreso sobre surface-100 y surface-200; también bloques de color grandes. |
| `brand-blue` | `#4c8dff` | `#1d4fb8` | Azul de la marca. Enlaces secundarios, datos y bloques de color; texto sobre surface-100 y surface-200. |
| `accent` | `#2dd4a7` | `#0b7f68` | Relleno de la acción principal (Inscribirme, Empezar curso). Siempre con on-accent encima. |
| `on-accent` | `#0a1220` | `#ffffff` | Texto e iconos sobre accent. |
| `accent-2` | `#4c8dff` | `#1d4fb8` | Relleno de la acción secundaria destacada (Ver programa). Siempre con on-accent-2 encima. |
| `on-accent-2` | `#0a1220` | `#ffffff` | Texto e iconos sobre accent-2. |
| `line` | `#33405a` | `#c3cbd8` | Separadores decorativos y bordes de paneles. No lleva significado: para bordes de controles usa border-control. |
| `border-control` | `#7a88a3` | `#6b778c` | Borde de campos, casillas y botones secundarios; cumple 3:1 sobre surface-100 y surface-200. |
| `focus` | `#7fb0ff` | `#1d4fb8` | Anillo de foco de 3px, sólido, sobre cualquier superficie. |
| `success` | `#3ddc97` | `#0f7a4a` | Texto o icono de estado correcto sobre surface-100 y surface-200. Siempre acompañado de una palabra o icono. |
| `warning` | `#f5c451` | `#8a5a00` | Texto o icono de aviso sobre surface-100 y surface-200. Siempre acompañado de una palabra o icono. |
| `danger` | `#ff8a8a` | `#b42318` | Texto o icono de error sobre surface-100 y surface-200. Siempre acompañado de una palabra o icono. |

## 2. Reglas de marca

Marketing Academia es una academia online de cursos de inteligencia artificial y marketing digital. El diseño es serio, moderno y directo: planos de color sólidos sobre azul marino, titulares pesados y un único gesto gráfico, la flecha ascendente del logo.

### Fundamentos de contenido

- Háblale al estudiante de **tú**, en frases cortas y con verbo de acción: "Empieza hoy", "Aprende a automatizar tus campañas", "Continúa donde lo dejaste".
- Promete resultados concretos, no adjetivos. Escribe "6 módulos · 14 horas · nivel intermedio", no "un curso increíble".
- Nombre de la marca: **Marketing Academia**, con esa capitalización. Los cursos llevan nombre propio en minúscula normal: "IA para campañas de Meta Ads".
- Sin emojis. Los estados se dicen con palabras: "Completado", "En curso", "Borrador".
- Botones: verbo + objeto, máximo tres palabras ("Inscribirme", "Ver programa", "Continuar curso").

### Fundamentos visuales

- **Tema oscuro primero.** El tema `dark` es el del logo: fondo `surface-100`, texto `ink`. El tema `light` conserva la misma jerarquía y sirve para lectura larga y para imprimir.
- **Planos de color, sin degradados.** Las superficies se escalan solo con `surface-100`, `surface-200` y `surface-300`. No uses degradados, brillos ni sombras en reposo; `shadow-overlay` es solo para menús y diálogos.
- **Dos colores de marca, con funciones distintas.** `brand-teal` / `accent` es la acción principal y el progreso; `brand-blue` / `accent-2` es la acción secundaria, los datos y los enlaces. Una pantalla tiene como máximo un botón `accent` relleno.
- **Texto sobre relleno.** Sobre `accent` usa `on-accent`; sobre `accent-2` usa `on-accent-2`. Nunca pongas blanco o negro literal.
- **Tipografía.** Una sola familia, `sans` (Chivo). Titulares en `display`, `h1`, `h2`, `h3` con peso 800–900 y tracking negativo; el resto en `lead`, `body`, `small`. Un solo `display` por página.
- **Espaciado.** Paneles con `space-5`; huecos entre campos con `space-4`; separación entre secciones con `space-8`. Márgenes laterales de `space-6` en escritorio y `space-4` en móvil.
- **Radios.** Esquinas contenidas, acordes con la geometría angular del logo: `radius-sm` en botones y campos, `radius-md` en paneles y tarjetas, `radius-pill` solo en insignias y barras de progreso.
- **Catálogo como lista, no como mosaico.** Los cursos se muestran como filas completas y clicables: punto de color, título, dos líneas de descripción y precio a la derecha. En hover la fila pasa a `surface-200`.
- **Foco y estados.** Todo control interactivo muestra un anillo de foco sólido de 3px en `focus`. El hover de un botón relleno oscurece un paso su fondo; nunca cambia de color de marca. Los estados `success`, `warning` y `danger` siempre llevan palabra o icono, nunca solo color.
- **Bordes.** `line` para separar bloques sin significado; `border-control` para cualquier borde que un usuario deba percibir (campos, botones secundarios).
- **Movimiento.** Transiciones de 120–160 ms en color y posición; respeta `prefers-reduced-motion`.

### Iconografía

- No hay librería de iconos propia. Usa trazos de 2px, esquinas rectas, a 20px o 24px, en `ink` o `brand-teal`.
- El motivo de marca es la **flecha en zigzag ascendente** del logo: úsala como máximo una vez por pantalla, como divisor o elemento de portada, nunca como viñeta.
- Sin emojis como decoración.

### Logo

- Usa el archivo de `assets/Logos/` y no lo redibujes. Solo sobre `surface-100` del tema oscuro: el archivo tiene fondo azul marino propio. Respeta un margen de seguridad igual a la altura de la "M" a cada lado.
- No lo recortes, estires ni cambies sus colores. Para fondos claros se necesita una versión sin fondo (pendiente de recibir del cliente).

## 3. Componentes

Cada componente trae su guía de uso y un HTML completo de ejemplo. Copia el bloque `<style>` y el HTML a tu proyecto; los textos son de ejemplo.

### 3.1 Botón (`Button`)

Botón de acción. Un solo botón relleno `accent` por pantalla: la acción que lleva al estudiante a inscribirse o continuar.

- **Principal** (`accent` + `on-accent`): Inscribirme, Continuar curso, Pagar.
- **Secundario** (`accent-2` + `on-accent-2`): Ver programa, Descargar temario.
- **Contorno** (`border-control` sobre transparente): acciones de apoyo como Guardar para después.
- **Enlace** (`brand-teal` subrayado): navegación dentro del texto.

Quien lo use aporta la etiqueta (verbo + objeto, máximo tres palabras) y el manejador de clic. Usa un `<button>` para acciones y un `<a>` para navegar. El anillo de foco `focus` de 3px debe verse siempre; el estado deshabilitado usa `surface-300` y `ink-muted` y dice por qué en el texto cercano. No mezcles dos botones rellenos del mismo color en una fila.

````html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: var(--space-5); background: var(--surface-100); color: var(--ink); font-family: var(--font-sans); }
  .row { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: center; }
  .row + .row { margin-top: var(--space-4); }
  .btn { font: 700 16px/24px var(--font-sans); padding: 12px var(--space-5); border: 2px solid transparent; border-radius: var(--radius-sm); cursor: pointer; transition: background-color .14s, border-color .14s, transform .14s; }
  .btn:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
  .primary { background: var(--accent); color: var(--on-accent); }
  .primary:hover { filter: brightness(.9); transform: translateY(-1px); }
  .secondary { background: var(--accent-2); color: var(--on-accent-2); }
  .secondary:hover { filter: brightness(.9); transform: translateY(-1px); }
  .outline { background: transparent; color: var(--ink); border-color: var(--border-control); }
  .outline:hover { background: var(--surface-200); }
  .link { background: none; color: var(--brand-teal); text-decoration: underline; text-underline-offset: 4px; padding-inline: 0; }
  .btn:disabled { background: var(--surface-300); color: var(--ink-muted); border-color: transparent; cursor: not-allowed; transform: none; filter: none; }
  @media (prefers-reduced-motion: reduce) { .btn { transition: none; } }
</style>
</head>
<body>
<div class="row">
  <button class="btn primary">Inscribirme</button>
  <button class="btn secondary">Ver programa</button>
  <button class="btn outline">Guardar para después</button>
  <button class="btn link">Ver todos los cursos</button>
</div>
<div class="row">
  <button class="btn primary" style="outline:3px solid var(--focus);outline-offset:3px">Con foco</button>
  <button class="btn primary" disabled>Inscripción cerrada</button>
</div>
</body>
</html>
````

### 3.2 Campo de formulario (`Field`)

Campo de formulario (texto, correo, selección) para registro, inicio de sesión e inscripción.

Quien lo use aporta la etiqueta visible (siempre encima del campo, en `body-strong`), el `id` que la enlaza, el valor y, si aplica, un texto de ayuda en `ink-muted` o un mensaje de error.

- Fondo `surface-200`, borde de 2px en `border-control`, radio `radius-sm`, foco con anillo `focus` de 3px.
- Error: borde y mensaje en `danger`, y el mensaje empieza con la palabra "Error" y dice cómo corregirlo; nunca solo color.
- Un campo por fila en móvil; dos columnas con hueco `space-4` en escritorio. No uses el placeholder como etiqueta.

````html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: var(--space-5); background: var(--surface-100); color: var(--ink); font-family: var(--font-sans); }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); max-width: 640px; }
  label { display: block; font: 700 16px/24px var(--font-sans); margin-bottom: var(--space-1); }
  input, select { width: 100%; box-sizing: border-box; font: 400 16px/24px var(--font-sans); padding: 12px var(--space-4); background: var(--surface-200); color: var(--ink); border: 2px solid var(--border-control); border-radius: var(--radius-sm); }
  input::placeholder { color: var(--ink-muted); }
  input:focus, select:focus { outline: 3px solid var(--focus); outline-offset: 2px; }
  .err input { border-color: var(--danger); }
  .msg { margin: var(--space-1) 0 0; font-size: 14px; line-height: 20px; color: var(--danger); }
  .help { margin: var(--space-1) 0 0; font-size: 14px; line-height: 20px; color: var(--ink-muted); }
</style>
</head>
<body>
<div class="grid">
  <div><label for="n">Nombre completo</label><input id="n" placeholder="Ana Pérez"><p class="help">Como aparecerá en tu certificado.</p></div>
  <div><label for="l">Nivel</label><select id="l"><option>Principiante</option><option>Intermedio</option><option>Avanzado</option></select></div>
  <div class="err"><label for="e">Correo electrónico</label><input id="e" value="ana@correo" aria-invalid="true"><p class="msg">Error: escribe un correo completo, por ejemplo ana@correo.com.</p></div>
</div>
</body>
</html>
````

### 3.3 Alerta (`Alert`)

Mensaje de estado en línea: éxito, aviso o error.

Quien lo use aporta el texto, que empieza con la palabra del estado ("Completado", "Aviso", "Error") y dice qué hacer a continuación. Fondo `surface-200`, borde de 2px y icono de 24px en `success`, `warning` o `danger`; el texto del cuerpo queda en `ink`.

- Usa `role="alert"` para errores y `role="status"` para éxito y aviso.
- Nunca dependas solo del color: el icono y la palabra siempre van.
- Un mensaje por acción; no apiles más de tres.

````html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: var(--space-5); background: var(--surface-100); color: var(--ink); font-family: var(--font-sans); display: grid; gap: var(--space-3); max-width: 640px; }
  .a { display: grid; grid-template-columns: auto 1fr; gap: var(--space-3); align-items: start; padding: var(--space-4); background: var(--surface-200); border-radius: var(--radius-md); font-size: 16px; line-height: 24px; }
  .a b { font-weight: 700; }
  .a svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 2; }
  .ok { border: 2px solid var(--success); } .ok svg, .ok b { color: var(--success); }
  .warn { border: 2px solid var(--warning); } .warn svg, .warn b { color: var(--warning); }
  .bad { border: 2px solid var(--danger); } .bad svg, .bad b { color: var(--danger); }
</style>
</head>
<body>
<div class="a ok" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg><span><b>Completado.</b> Tu inscripción a "IA para campañas de Meta Ads" está activa.</span></div>
<div class="a warn" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3L2 21h20zM12 10v5M12 18v1"/></svg><span><b>Aviso.</b> El curso cierra inscripciones el 15 de noviembre.</span></div>
<div class="a bad" role="alert"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg><span><b>Error.</b> No pudimos procesar el pago. Revisa los datos de tu tarjeta.</span></div>
</body>
</html>
````

### 3.4 Barra de navegación (`Navbar`)

Barra de navegación superior, de 64px de alto como mínimo, sobre `surface-100` con un separador `line` debajo.

Quien la use aporta los enlaces (Cursos, Mis cursos, Instructores) y marca el activo con `aria-current="page"`; el activo se subraya 3px en `brand-teal`. La marca va a la izquierda y la única acción rellena (`accent`, "Inscribirme") a la derecha. Con sesión iniciada, cambia la acción por el nombre del estudiante.

- Enlaces en `body-strong`, hover en `surface-200`, foco con anillo `focus`.
- En móvil colapsa los enlaces en un menú que se abre con `shadow-overlay`; la acción principal queda visible.
- No pongas más de cuatro enlaces ni dos botones rellenos.

````html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  body { margin: 0; background: var(--surface-100); color: var(--ink); font-family: var(--font-sans); }
  nav { display: flex; align-items: center; gap: var(--space-6); min-height: 64px; padding: 0 var(--space-6); border-bottom: 1px solid var(--line); }
  .brand { font: 900 20px/24px var(--font-sans); letter-spacing: -.03em; color: var(--ink); text-decoration: none; margin-right: auto; }
  .brand span { color: var(--brand-teal); }
  a.l { font: 700 16px/24px var(--font-sans); color: var(--ink); text-decoration: none; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); }
  a.l:hover { background: var(--surface-200); }
  a.l[aria-current="page"] { color: var(--brand-teal); box-shadow: inset 0 -3px 0 var(--brand-teal); border-radius: 0; }
  .cta { font: 700 16px/24px var(--font-sans); background: var(--accent); color: var(--on-accent); text-decoration: none; padding: 10px var(--space-5); border-radius: var(--radius-sm); }
  a:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
</style>
</head>
<body>
<nav aria-label="Principal">
  <a class="brand" href="#">Marketing <span>Academia</span></a>
  <a class="l" href="#" aria-current="page">Cursos</a>
  <a class="l" href="#">Mis cursos</a>
  <a class="l" href="#">Instructores</a>
  <a class="cta" href="#">Inscribirme</a>
</nav>
</body>
</html>
````

### 3.5 Fila de curso (`CourseRow`)

Fila de curso para el catálogo y "Mis cursos". Es la unidad principal de la plataforma: una fila completa y clicable, no una tarjeta con imagen.

Quien la use aporta: título (`h3`), descripción de dos líneas como máximo (`small` en `ink-muted`), chips de nivel, módulos y horas (en mayúsculas, estilo `caption`), y a la derecha el precio o el estado ("Inscrito"). El punto de 16px toma `brand-teal` o `brand-blue` según la categoría (IA o marketing digital).

- Separa filas con `line`; en hover la fila pasa a `surface-200`; en foco muestra el anillo `focus` hacia dentro.
- En "Mis cursos" añade debajo la barra de progreso de 8px (`surface-300` de pista, `brand-teal` de relleno) con el porcentaje y la palabra del estado.
- No añadas imágenes ni sombras. No pongas más de tres chips.

````html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: var(--space-5); background: var(--surface-100); color: var(--ink); font-family: var(--font-sans); }
  ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
  li { border-bottom: 1px solid var(--line); }
  a { display: grid; grid-template-columns: 16px 1fr auto; gap: var(--space-4); align-items: start; padding: var(--space-5) var(--space-3); color: inherit; text-decoration: none; transition: background-color .14s; }
  a:hover { background: var(--surface-200); }
  a:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }
  .dot { width: 16px; height: 16px; border-radius: 50%; margin-top: 6px; }
  .t { font: 800 22px/28px var(--font-sans); letter-spacing: -.01em; margin: 0; }
  .d { margin: 4px 0 0; font-size: 14px; line-height: 20px; color: var(--ink-muted); max-width: 52ch; }
  .meta { margin-top: var(--space-2); display: flex; gap: var(--space-2); flex-wrap: wrap; }
  .chip { font: 700 12px/16px var(--font-sans); letter-spacing: .08em; padding: 4px var(--space-2); border-radius: var(--radius-pill); background: var(--surface-300); color: var(--ink); }
  .price { font: 700 16px/24px var(--font-sans); white-space: nowrap; }
  .prog { margin-top: var(--space-3); height: 8px; border-radius: var(--radius-pill); background: var(--surface-300); overflow: hidden; }
  .prog > i { display: block; height: 100%; width: 62%; background: var(--brand-teal); }
  .pl { font-size: 12px; line-height: 16px; color: var(--ink-muted); margin-top: 4px; }
</style>
</head>
<body>
<ul>
  <li><a href="#">
    <span class="dot" style="background:var(--brand-teal)"></span>
    <span><h3 class="t">IA para campañas de Meta Ads</h3>
      <p class="d">Automatiza creativos, segmentación y reportes con herramientas de IA generativa.</p>
      <span class="meta"><span class="chip">INTERMEDIO</span><span class="chip">6 MÓDULOS</span><span class="chip">14 H</span></span></span>
    <span class="price">$189.000</span></a></li>
  <li><a href="#">
    <span class="dot" style="background:var(--brand-blue)"></span>
    <span><h3 class="t">Fundamentos de marketing digital</h3>
      <p class="d">Embudos, SEO, analítica y email marketing desde cero, con proyecto final.</p>
      <div class="prog" role="progressbar" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100" aria-label="Progreso"><i></i></div>
      <div class="pl">62 % completado · En curso</div></span>
    <span class="price">Inscrito</span></a></li>
</ul>
</body>
</html>
````

### 3.6 Cabecera de curso (`CourseHero`)

Cabecera de la página de un curso: texto a la izquierda y caja de inscripción fija a la derecha (360px como máximo).

Quien la use aporta categoría y nivel (en mayúsculas, `caption`, `brand-teal`), título (`h1`), entradilla (`lead` en `ink-muted`), instructor, módulos y horas, precio y tres beneficios como máximo.

- La caja es un panel `surface-200` con `radius-md` y relleno `space-5`; contiene el único botón `accent` de la página.
- El precio va en `h1` con peso 900 reducido a 32px; debajo, una línea en `ink-muted` con la condición de pago.
- En móvil la caja baja debajo del texto y su botón ocupa todo el ancho.
- No añadas imagen ni vídeo en esta cabecera; el avance del curso vive en la lista de módulos.

````html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: var(--space-6); background: var(--surface-100); color: var(--ink); font-family: var(--font-sans); }
  .hero { display: grid; grid-template-columns: 1fr 320px; gap: var(--space-7); align-items: start; max-width: 960px; }
  .eyebrow { font: 700 12px/16px var(--font-sans); letter-spacing: .08em; color: var(--brand-teal); margin: 0 0 var(--space-3); }
  h1 { margin: 0; font: 900 48px/48px var(--font-sans); letter-spacing: -.03em; }
  .lead { margin: var(--space-4) 0 0; font-size: 20px; line-height: 30px; color: var(--ink-muted); max-width: 44ch; }
  .meta { margin: var(--space-4) 0 0; font-size: 14px; line-height: 20px; color: var(--ink-muted); }
  .box { background: var(--surface-200); border-radius: var(--radius-md); padding: var(--space-5); }
  .price { font: 900 32px/36px var(--font-sans); letter-spacing: -.02em; margin: 0; }
  .note { margin: var(--space-1) 0 var(--space-4); font-size: 14px; line-height: 20px; color: var(--ink-muted); }
  .go { display: block; text-align: center; font: 700 16px/24px var(--font-sans); background: var(--accent); color: var(--on-accent); text-decoration: none; padding: 12px var(--space-5); border-radius: var(--radius-sm); }
  .go:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
  ul { list-style: none; margin: var(--space-4) 0 0; padding: var(--space-4) 0 0; border-top: 1px solid var(--line); display: grid; gap: var(--space-2); font-size: 14px; line-height: 20px; }
</style>
</head>
<body>
<div class="hero">
  <div>
    <p class="eyebrow">INTELIGENCIA ARTIFICIAL · INTERMEDIO</p>
    <h1>IA para campañas de Meta Ads</h1>
    <p class="lead">Automatiza creativos, segmentación y reportes con IA generativa, paso a paso.</p>
    <p class="meta">Instructor: Laura Gómez · 6 módulos · 14 horas</p>
  </div>
  <aside class="box" aria-label="Inscripción">
    <p class="price">$189.000</p>
    <p class="note">Pago único. Acceso de por vida.</p>
    <a class="go" href="#">Inscribirme</a>
    <ul><li>Certificado al terminar</li><li>Proyecto final con retroalimentación</li><li>Acceso desde cualquier dispositivo</li></ul>
  </aside>
</div>
</body>
</html>
````

### 3.7 Lista de módulos (`ModuleList`)

Lista del programa de un curso, un módulo por fila, dentro de un panel `surface-200` con los módulos en `surface-300`.

Quien la use aporta número, título, cantidad de lecciones, duración y estado. El estado se dice con palabra en mayúsculas (`caption`): COMPLETADO en `success`, EN CURSO en `brand-blue`, PENDIENTE en `ink-muted`; nunca solo con color.

- El número del módulo va en `h3` con peso 900, en `brand-teal` (en `success` si está completado).
- Cada fila es clicable cuando el módulo está disponible; en hover pasa un paso más claro y muestra el anillo `focus` en teclado.
- Máximo 12 módulos visibles; si hay más, agrúpalos por bloques.

````html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: var(--space-5); background: var(--surface-100); color: var(--ink); font-family: var(--font-sans); }
  ol { list-style: none; margin: 0; padding: var(--space-5); background: var(--surface-200); border-radius: var(--radius-md); display: grid; gap: var(--space-2); max-width: 680px; }
  li { display: grid; grid-template-columns: 40px 1fr auto; gap: var(--space-4); align-items: center; padding: var(--space-3) var(--space-4); background: var(--surface-300); border-radius: var(--radius-sm); }
  .n { font: 900 22px/28px var(--font-sans); color: var(--brand-teal); }
  .t { font: 700 16px/24px var(--font-sans); margin: 0; }
  .s { font-size: 14px; line-height: 20px; color: var(--ink-muted); }
  .done .n { color: var(--success); }
  .st { font: 700 12px/16px var(--font-sans); letter-spacing: .08em; }
  .done .st { color: var(--success); }
  .cur .st { color: var(--brand-blue); }
  .lock .st { color: var(--ink-muted); }
</style>
</head>
<body>
<ol>
  <li class="done"><span class="n">01</span><span><p class="t">Cómo piensa un modelo de lenguaje</p><span class="s">4 lecciones · 52 min</span></span><span class="st">COMPLETADO</span></li>
  <li class="cur"><span class="n" style="color:var(--brand-blue)">02</span><span><p class="t">Prompts que venden</p><span class="s">5 lecciones · 1 h 10 min</span></span><span class="st">EN CURSO</span></li>
  <li class="lock"><span class="n" style="color:var(--ink-muted)">03</span><span><p class="t">Automatiza tus campañas</p><span class="s">6 lecciones · 1 h 40 min</span></span><span class="st">PENDIENTE</span></li>
</ol>
</body>
</html>
````

### 3.8 Banda de llamada a la acción (`CtaBand`)

Banda de ancho completo que cierra la portada o una página de curso con una sola llamada a la acción.

Relleno `accent`; el texto y el botón usan `on-accent` y se invierten (botón `on-accent` con texto `accent`). Quien la use aporta un titular `h1` de máximo cuatro palabras, una frase de apoyo y un único enlace con verbo + objeto.

- Aire vertical `space-7` y márgenes laterales `space-6`.
- Una por página, siempre antes del pie. No la combines con otro botón `accent` visible en la misma pantalla.

````html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  body { margin: 0; background: var(--surface-100); color: var(--ink); font-family: var(--font-sans); }
  .band { background: var(--accent); color: var(--on-accent); padding: var(--space-7) var(--space-6); display: flex; flex-wrap: wrap; gap: var(--space-5); align-items: end; justify-content: space-between; }
  h2 { margin: 0; font: 900 48px/48px var(--font-sans); letter-spacing: -.03em; max-width: 14ch; }
  p { margin: var(--space-3) 0 0; font-size: 16px; line-height: 24px; max-width: 40ch; }
  a { font: 700 16px/24px var(--font-sans); background: var(--on-accent); color: var(--accent); text-decoration: none; padding: 14px var(--space-5); border-radius: var(--radius-sm); }
  a:focus-visible { outline: 3px solid var(--on-accent); outline-offset: 3px; }
</style>
</head>
<body>
<section class="band">
  <div><h2>Empieza a crecer hoy</h2><p>Dos cursos nuevos al mes de IA aplicada al marketing. Cancela cuando quieras.</p></div>
  <a href="#">Ver cursos</a>
</section>
</body>
</html>
````

### 3.9 Pie de página (`Footer`)

Pie de página sobre `surface-200`, con la marca y una frase a la izquierda (5 columnas de 12) y hasta tres grupos de enlaces a la derecha (7 de 12).

Quien lo use aporta los grupos y enlaces. Los encabezados de grupo van en mayúsculas con estilo `caption` y `ink-muted`; los enlaces en `small` y `ink`, con hover en `brand-teal` subrayado. Cierra con una línea `line` y el aviso legal en `ink-muted`.

- Máximo tres grupos y cuatro enlaces por grupo.
- En móvil apila marca y grupos en una columna.
- Va siempre después de la banda de llamada a la acción.

````html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  body { margin: 0; background: var(--surface-100); color: var(--ink); font-family: var(--font-sans); }
  footer { background: var(--surface-200); padding: var(--space-7) var(--space-6) var(--space-5); display: grid; grid-template-columns: 5fr 7fr; gap: var(--space-7); }
  .brand { font: 900 24px/28px var(--font-sans); letter-spacing: -.03em; margin: 0; }
  .brand span { color: var(--brand-teal); }
  .tag { margin: var(--space-2) 0 0; font-size: 14px; line-height: 20px; color: var(--ink-muted); max-width: 32ch; }
  .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-5); }
  h3 { margin: 0 0 var(--space-3); font: 700 12px/16px var(--font-sans); letter-spacing: .08em; color: var(--ink-muted); }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); }
  a { color: var(--ink); font-size: 14px; line-height: 20px; text-decoration: none; }
  a:hover { color: var(--brand-teal); text-decoration: underline; text-underline-offset: 3px; }
  a:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
  .legal { grid-column: 1 / -1; border-top: 1px solid var(--line); padding-top: var(--space-4); font-size: 12px; line-height: 16px; color: var(--ink-muted); }
</style>
</head>
<body>
<footer>
  <div><p class="brand">Marketing <span>Academia</span></p><p class="tag">Cursos de inteligencia artificial y marketing digital.</p></div>
  <div class="cols">
    <div><h3>CURSOS</h3><ul><li><a href="#">Inteligencia artificial</a></li><li><a href="#">Marketing digital</a></li><li><a href="#">Todos los cursos</a></li></ul></div>
    <div><h3>ACADEMIA</h3><ul><li><a href="#">Instructores</a></li><li><a href="#">Certificados</a></li><li><a href="#">Contacto</a></li></ul></div>
    <div><h3>LEGAL</h3><ul><li><a href="#">Términos</a></li><li><a href="#">Privacidad</a></li></ul></div>
  </div>
  <p class="legal">© 2026 Marketing Academia</p>
</footer>
</body>
</html>
````

### 3.10 Portada completa de ejemplo

Página que combina barra de navegación, cabecera, filas de curso, banda de acción y pie. Úsala como punto de partida.

````html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--surface-100); color: var(--ink); font-family: var(--font-sans); }
  a { color: inherit; text-decoration: none; }
  a:focus-visible, button:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
  .wrap { max-width: 1120px; margin: 0 auto; padding: 0 var(--space-6); }

  nav { border-bottom: 1px solid var(--line); }
  nav .wrap { display: flex; align-items: center; gap: var(--space-6); min-height: 64px; }
  .brand { font: 900 20px/24px var(--font-sans); letter-spacing: -.03em; margin-right: auto; }
  .brand span { color: var(--brand-teal); }
  .nl { font: 700 16px/24px var(--font-sans); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); }
  .nl:hover { background: var(--surface-200); }
  .nl[aria-current] { color: var(--brand-teal); box-shadow: inset 0 -3px 0 var(--brand-teal); border-radius: 0; }
  .btn { display: inline-block; font: 700 16px/24px var(--font-sans); padding: 12px var(--space-5); border-radius: var(--radius-sm); border: 2px solid transparent; }
  .p { background: var(--accent); color: var(--on-accent); }
  .o { border-color: var(--border-control); }
  .o:hover { background: var(--surface-200); }

  .hero { padding: var(--space-9) 0 var(--space-8); display: grid; grid-template-columns: 7fr 5fr; gap: var(--space-7); align-items: center; }
  .eyebrow { font: 700 12px/16px var(--font-sans); letter-spacing: .08em; color: var(--brand-teal); margin: 0 0 var(--space-4); }
  h1 { margin: 0; font: 900 72px/68px var(--font-sans); letter-spacing: -.04em; }
  h1 em { font-style: normal; color: var(--brand-teal); }
  .lead { margin: var(--space-5) 0 var(--space-6); font-size: 20px; line-height: 30px; color: var(--ink-muted); max-width: 44ch; }
  .acts { display: flex; gap: var(--space-4); flex-wrap: wrap; }
  .stats { display: grid; gap: var(--space-3); }
  .stat { background: var(--surface-200); border-radius: var(--radius-md); padding: var(--space-5); }
  .stat b { display: block; font: 900 48px/48px var(--font-sans); letter-spacing: -.03em; color: var(--brand-teal); }
  .stat:nth-child(2) b { color: var(--brand-blue); }
  .stat span { font-size: 14px; line-height: 20px; color: var(--ink-muted); }

  h2 { margin: 0 0 var(--space-5); font: 800 32px/36px var(--font-sans); letter-spacing: -.02em; }
  .cat { padding: var(--space-8) 0; }
  ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
  li { border-bottom: 1px solid var(--line); }
  .row { display: grid; grid-template-columns: 16px 1fr auto; gap: var(--space-4); padding: var(--space-5) var(--space-3); transition: background-color .14s; }
  .row:hover { background: var(--surface-200); }
  .dot { width: 16px; height: 16px; border-radius: 50%; margin-top: 6px; }
  .t { font: 800 22px/28px var(--font-sans); letter-spacing: -.01em; margin: 0; }
  .d { margin: 4px 0 0; font-size: 14px; line-height: 20px; color: var(--ink-muted); max-width: 52ch; }
  .chips { margin-top: var(--space-2); display: flex; gap: var(--space-2); }
  .chip { font: 700 12px/16px var(--font-sans); letter-spacing: .08em; padding: 4px var(--space-2); border-radius: var(--radius-pill); background: var(--surface-300); }
  .price { font: 700 16px/24px var(--font-sans); white-space: nowrap; }

  .band { background: var(--accent); color: var(--on-accent); padding: var(--space-8) 0; }
  .band .wrap { display: flex; flex-wrap: wrap; gap: var(--space-5); align-items: end; justify-content: space-between; }
  .band h2 { font: 900 48px/48px var(--font-sans); letter-spacing: -.03em; max-width: 14ch; margin: 0; }
  .band p { margin: var(--space-3) 0 0; max-width: 40ch; }
  .band a { background: var(--on-accent); color: var(--accent); }

  footer { background: var(--surface-200); padding: var(--space-7) 0 var(--space-5); }
  footer .wrap { display: grid; grid-template-columns: 5fr 7fr; gap: var(--space-7); }
  .fb { font: 900 24px/28px var(--font-sans); letter-spacing: -.03em; margin: 0; }
  .fb span { color: var(--brand-teal); }
  .ft { margin: var(--space-2) 0 0; font-size: 14px; line-height: 20px; color: var(--ink-muted); }
  .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-5); }
  footer h3 { margin: 0 0 var(--space-3); font: 700 12px/16px var(--font-sans); letter-spacing: .08em; color: var(--ink-muted); }
  footer ul { border: 0; display: grid; gap: var(--space-2); }
  footer li { border: 0; font-size: 14px; line-height: 20px; }
  .legal { grid-column: 1 / -1; border-top: 1px solid var(--line); padding-top: var(--space-4); font-size: 12px; line-height: 16px; color: var(--ink-muted); }
  @media (prefers-reduced-motion: reduce) { .row { transition: none; } }
</style>
</head>
<body>
<nav aria-label="Principal"><div class="wrap">
  <a class="brand" href="#">Marketing <span>Academia</span></a>
  <a class="nl" href="#" aria-current="page">Cursos</a><a class="nl" href="#">Mis cursos</a><a class="nl" href="#">Instructores</a>
  <a class="btn p" href="#">Inscribirme</a>
</div></nav>

<header class="wrap hero">
  <div>
    <p class="eyebrow">CURSOS DE IA Y MARKETING DIGITAL</p>
    <h1>Aprende lo que mueve tu <em>negocio</em></h1>
    <p class="lead">Cursos prácticos de inteligencia artificial y marketing digital, con proyecto final y certificado.</p>
    <div class="acts"><a class="btn p" href="#">Ver cursos</a><a class="btn o" href="#">Cómo funciona</a></div>
  </div>
  <div class="stats">
    <div class="stat"><b>12</b><span>cursos con proyecto final</span></div>
    <div class="stat"><b>140 h</b><span>de contenido práctico</span></div>
  </div>
</header>

<section class="wrap cat">
  <h2>Cursos disponibles</h2>
  <ul>
    <li><a class="row" href="#"><span class="dot" style="background:var(--brand-teal)"></span><span><h3 class="t" style="color:var(--ink);letter-spacing:-.01em;font-size:22px;line-height:28px;text-transform:none;margin:0">IA para campañas de Meta Ads</h3><p class="d">Automatiza creativos, segmentación y reportes con IA generativa.</p><span class="chips"><span class="chip">INTERMEDIO</span><span class="chip">6 MÓDULOS</span><span class="chip">14 H</span></span></span><span class="price">$189.000</span></a></li>
    <li><a class="row" href="#"><span class="dot" style="background:var(--brand-blue)"></span><span><h3 class="t" style="color:var(--ink);letter-spacing:-.01em;font-size:22px;line-height:28px;text-transform:none;margin:0">Fundamentos de marketing digital</h3><p class="d">Embudos, SEO, analítica y email marketing desde cero.</p><span class="chips"><span class="chip">PRINCIPIANTE</span><span class="chip">8 MÓDULOS</span><span class="chip">20 H</span></span></span><span class="price">$149.000</span></a></li>
    <li><a class="row" href="#"><span class="dot" style="background:var(--brand-teal)"></span><span><h3 class="t" style="color:var(--ink);letter-spacing:-.01em;font-size:22px;line-height:28px;text-transform:none;margin:0">Agentes de IA para atención al cliente</h3><p class="d">Diseña y lanza un asistente que responde a tus clientes las 24 horas.</p><span class="chips"><span class="chip">AVANZADO</span><span class="chip">5 MÓDULOS</span><span class="chip">12 H</span></span></span><span class="price">$229.000</span></a></li>
  </ul>
</section>

<section class="band"><div class="wrap">
  <div><h2>Empieza a crecer hoy</h2><p>Dos cursos nuevos al mes de IA aplicada al marketing.</p></div>
  <a class="btn" href="#">Ver cursos</a>
</div></section>

<footer><div class="wrap">
  <div><p class="fb">Marketing <span>Academia</span></p><p class="ft">Cursos de inteligencia artificial y marketing digital.</p></div>
  <div class="cols">
    <div><h3>CURSOS</h3><ul><li><a href="#">Inteligencia artificial</a></li><li><a href="#">Marketing digital</a></li></ul></div>
    <div><h3>ACADEMIA</h3><ul><li><a href="#">Instructores</a></li><li><a href="#">Contacto</a></li></ul></div>
    <div><h3>LEGAL</h3><ul><li><a href="#">Términos</a></li><li><a href="#">Privacidad</a></li></ul></div>
  </div>
  <p class="legal">© 2026 Marketing Academia</p>
</div></footer>
</body>
</html>
````

## Logo

Logotipo de Marketing Academia: una "M" lineal con una flecha de crecimiento en zigzag y la palabra en degradado verde azulado a azul, con "digital" debajo en blanco azulado.

- `merkating-digital-logo.jpg`: logo completo, 2000 × 2000 px, a todo color sobre su propio fondo azul marino (`surface-100` del tema oscuro). Úsalo solo sobre ese fondo, sin recortar ni recolorear.
- La "K" y la "A" del nombre están fusionadas con una flecha, y el nombre se lee "merkating". Si el nombre comercial debe escribirse "marketing", conviene pedir una versión corregida.
- Falta una versión vectorial (SVG) y una con fondo transparente para usar sobre el tema claro.
