# DECISIONES — «El taller del agente»

Animación de 59,3 s · 1920×1080 · 30 fps · MP4 con audio. Todo se genera con código: no hay imágenes, audios ni modelos externos.

## Técnicas elegidas

**Imagen: Canvas 2D vectorial en Node (`@napi-rs/canvas`) con proyección isométrica propia.**
- `drawFrame(t)` es una función pura del tiempo: dado `t` y la línea de tiempo, dibuja el frame. No hay estado entre frames, así que se puede renderizar en paralelo y en cualquier orden.
- Se descartaron Three.js y SVG/HTML en navegador: obligan a capturar con Chrome (lento y frágil) y el estilo «ilustración vectorial con contorno» sale más directo con trazos 2D.
- Cajas isométricas con tres caras sombreadas, planos de pared/suelo para pegar texto y dibujos con la perspectiva correcta, brillos neón con degradados radiales aditivos, y partículas sin estado (la posición se calcula con el tiempo transcurrido desde el evento).
- La pantalla del taller contiene una **miniatura recursiva**: la propia escena se vuelve a dibujar a 640×360 y a 6× de velocidad dentro del monitor.

**Sonido: síntesis offline en Node (`audio.js`).** Osciladores (seno/triángulo/cuadrada/sierra con parciales), ruido filtrado (filtro de variables de estado con barrido), envolventes de ataque lineal + caída exponencial, reparto estéreo por estación. Música: bucle de 8 compases (La menor–Fa–Do–Sol) con pad, bajo, «kalimba» y shaker; baja de volumen (*ducking* a 200 Hz) cuando suena un efecto.

**Vídeo: `ffmpeg-static` (H.264 + AAC).** Los frames salen en bruto por la entrada estándar de ffmpeg; 4 procesos renderizan rangos distintos y luego se concatenan y se mezcla el audio.

## Flujo técnico

```
registro de la sesión (.jsonl) ──extract-session.js──► data.full.json (todos los pasos, anonimizados)
                                                  └──► data.json      (condensado, mismo orden)
data.json ──timeline.js──► segmentos, pista del robot, cámara, títulos, ítems de la mochila, EVENTOS
                              ├──► scene.js / world.js / robot.js  → frames
                              └──► audio.js                         → fx.wav + music.wav + mix.wav
render.js: 4 workers → chunks MP4 → concat + mix.wav → video.mp4
```

Los **mismos eventos** (`tl.events`) disparan el sonido y las partículas/animaciones: pasos, páginas, imprenta, engranajes, vapor, chispas, reparación y la campanita final.

## El recorrido es real

`extract-session.js` lee el `.jsonl` más reciente de esta carpeta en `~/.claude/projects/` y convierte cada llamada a herramienta en un paso (herramienta, si falló y una etiqueta generada por reglas). Al renderizar había **60 pasos reales y 3 errores**. Para caber en un minuto, sin cambiar el orden:

- Se conservan 2 de los 3 errores, cada uno con el paso que lo arregló (se prefieren los arreglos que usaron otra herramienta): un comando bloqueado y un script de shell mal cerrado, corregido escribiendo el archivo con `Write`. El tercer error (leer un archivo inexistente) queda fuera.
- El resto se agrupa en tramos contiguos («3 pasos», «27 pasos: Read+Bash»…). La herramienta que se dibuja es la más frecuente del tramo; por eso la estación puede no coincidir con cada paso individual.
- **Anonimización:** solo se emiten etiquetas fabricadas por reglas y nombres de archivo del proyecto. No salen rutas, correos ni claves (comprobado con `grep` sobre ambos JSON).

## Iteraciones y correcciones

1. **Primer render:** ya funcionaba la sala, pero faltaban los letreros de estación, la antena del fondo era enorme, el martillo flotaba en el aire y la cámara de planificación cortaba la burbuja por arriba.
2. **Letreros y legibilidad:** se añadieron letreros con nombre en español y herramienta real en monoespaciada (se iluminan al usarse); se achicaron al ver que tapaban las máquinas con el zoom.
3. **Glifos:** `✓`, `⚙` y `👁` salían como cuadrados vacíos; se dibujaron con trazos.
4. **Etiquetas de la mochila** salían en espejo cuando el robot miraba a la izquierda; se contra-volteó el texto. Se agrandó la mochila para que los nombres de herramienta se lean y se añadió una tarjeta «Lo que el agente recuerda».
5. **Cámara del final:** se adelantaba al robot y lo dejaba fuera de cuadro en la celebración; ahora espera, enfoca la pantalla con la miniatura y se aleja hasta el plano general con el texto final.
6. **Tiempos:** los títulos de acción del error duraban 1,8 s; se adelantó su aparición para cumplir los 2 s mínimos. Se recortaron el tramo final y las transiciones para que 2 errores reparados + 3 pasos quepan en 59,3 s.
7. **Estación EDITAR:** el martillo y el yunque quedaban delante de la cara del robot; se movieron a la izquierda de la mesa.

## Detalles y guiños

Gato «Token» durmiendo, póster «ATTENTION is all you need» con matriz de atención animada, cuadro `print("Hola mundo")`, pato de goma de depuración, taza `T=.7` (temperatura), juguete «ELIZA», libro «LLM» que brilla al leer, caja «404», alfombra con bits 0/1, luces de colores que parpadean, papeles que caen y radar/telescopio.

## Entregables

`out/final/video.mp4` (audio mezclado) · `out/final/fx.wav` · `out/final/music.wav` (con el *ducking* ya aplicado) · `data.json` / `data.full.json`.

## Tiempo aproximado

Un recorrido continuo de ~2 h en total: ~1 h 15 min en escribir y depurar el motor de escena, ~30 min iterando sobre frames clave, ~15 min en audio y extracción del registro. El render definitivo tarda unos minutos (≈0,2 s por frame en dibujo, 4 procesos).

## Límites conocidos

- Los sonidos no se pudieron escuchar durante el desarrollo; se comprobaron niveles y sincronía con la línea de tiempo, no el timbre.
- La música y el ruido usan una semilla fija, así que el render es reproducible.
- Con muchos pasos reales, la agrupación hace que la herramienta mostrada sea la predominante del tramo, no cada paso.
