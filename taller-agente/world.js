// El taller: suelo, paredes, estaciones y decoración. Cada elemento se registra con una profundidad (x+y) para el orden de pintado.
'use strict';
const G = require('./gfx');
const { A, B, C, P, clamp, lerp, ease, easeOut, hsl, rnd, poly, box, cyl, onWallX, onWallY, onFloor, glow, rrect, ell, gear, label } = G;
const { TRAY, DOCK, CHAIR } = require('./timeline');

const W = 11, WALL_H = 4.2;
const WOOD = [28, 48, 46], STEEL = [205, 28, 36], PLUM = [285, 28, 28], CREAM = [38, 60, 82];
const NEON = { cyan: [185, 100, 60], mag: [320, 95, 62], lime: [95, 90, 55], amber: [38, 100, 58], red: [355, 92, 58], violet: [268, 90, 68] };

// ───────── Suelo y paredes ─────────
function drawBackdrop(ctx, w, h, t) {
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a1840'); g.addColorStop(0.55, '#3b2150'); g.addColorStop(1, '#1a0f2b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 38; i++) { // bokeh cálido lejano
    const x = rnd(i * 3) * w, y = rnd(i * 5 + 1) * h, r = 30 + rnd(i * 7) * 90, a = 0.04 + 0.05 * rnd(i * 9);
    const c = i % 3 === 0 ? [30, 100, 60] : i % 3 === 1 ? [320, 80, 55] : [190, 90, 55];
    glow(ctx, (x + t * (4 + rnd(i) * 6)) % (w + 200) - 100, y + Math.sin(t * 0.3 + i) * 10, r, c, a);
  }
}

function drawFloor(ctx) {
  const side = hsl(WOOD, -22), side2 = hsl(WOOD, -30);
  poly(ctx, [P(0, W, 0), P(W, W, 0), P(W, W, -0.55), P(0, W, -0.55)], side, hsl(WOOD, -40), 2);
  poly(ctx, [P(W, 0, 0), P(W, W, 0), P(W, W, -0.55), P(W, 0, -0.55)], side2, hsl(WOOD, -40), 2);
  poly(ctx, [P(0, 0, 0), P(W, 0, 0), P(W, W, 0), P(0, W, 0)], hsl(WOOD), null);
  onFloor(ctx, 0);
  for (let j = 0; j < W; j++) {
    ctx.fillStyle = hsl(WOOD, (j % 2) * 3 + rnd(j) * 4 - 2); ctx.fillRect(0, j * 64, W * 64, 64);
    ctx.fillStyle = 'rgba(40,18,8,0.28)'; ctx.fillRect(0, j * 64, W * 64, 1.5);
    let x = rnd(j * 11) * 120; while (x < W * 64) { ctx.fillRect(x, j * 64, 1.5, 64); x += 120 + rnd(x + j) * 160; }
    for (let k = 0; k < 3; k++) { ctx.fillStyle = 'rgba(255,220,170,0.06)'; ctx.fillRect(rnd(j * 7 + k) * W * 64, j * 64 + 14 + k * 18, 60 + rnd(k + j) * 120, 2); }
  }
  // alfombra central
  const rx = 3.0, ry = 3.4, rw = 5.2, rh = 4.2;
  ctx.fillStyle = hsl([335, 45, 30]); rrect(ctx, rx * 64, ry * 64, rw * 64, rh * 64, 14); ctx.fill();
  ctx.fillStyle = hsl([20, 70, 55]); rrect(ctx, (rx + 0.18) * 64, (ry + 0.18) * 64, (rw - 0.36) * 64, (rh - 0.36) * 64, 10); ctx.fill();
  ctx.fillStyle = hsl([190, 45, 34]); rrect(ctx, (rx + 0.4) * 64, (ry + 0.4) * 64, (rw - 0.8) * 64, (rh - 0.8) * 64, 8); ctx.fill();
  for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) { // rombos + bits "01" (guiño)
    const cx = (rx + 0.7 + i * 0.5) * 64, cy = (ry + 0.7 + j * 0.5) * 64;
    if ((i + j) % 2) { ctx.fillStyle = hsl([38, 90, 62], 0, 0.35); ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 9, cy); ctx.lineTo(cx, cy + 9); ctx.lineTo(cx - 9, cy); ctx.fill(); }
    else label(ctx, (i * 3 + j) % 2 ? '1' : '0', cx, cy, 13, 'rgba(255,255,255,0.28)', { mono: true });
  }
  ctx.restore();
}

function wallPaper(ctx, plane, tint, tt) {
  const len = W * 64, hh = WALL_H * 64;
  const g = ctx.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, hsl(tint, -8)); g.addColorStop(1, hsl(tint, 6));
  ctx.fillStyle = g; ctx.fillRect(0, 0, len, hh);
  ctx.fillStyle = hsl(tint, -5, 0.5); for (let u = 0; u < len; u += 48) ctx.fillRect(u, 0, 18, hh); // rayas
  // zócalo + moldura
  const wz = 64 * 1.0;
  ctx.fillStyle = hsl(WOOD, -6); ctx.fillRect(0, hh - wz, len, wz);
  ctx.fillStyle = hsl(WOOD, 6); for (let u = 6; u < len; u += 70) { ctx.fillStyle = hsl(WOOD, 5); rrect(ctx, u, hh - wz + 10, 56, wz - 24, 4); ctx.fill(); }
  ctx.fillStyle = hsl(CREAM, -8); ctx.fillRect(0, hh - wz - 6, len, 8);
  ctx.fillStyle = hsl(CREAM, -2); ctx.fillRect(0, hh - 7, len, 7);
  ctx.fillStyle = hsl(CREAM, -12); ctx.fillRect(0, 0, len, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 8, len, 6);
}

function drawWalls(ctx, t) {
  // pared izquierda (x=0)
  onWallX(ctx, 0, W, WALL_H); wallPaper(ctx, 'x', [18, 50, 60], t);
  ctx.restore();
  onWallY(ctx, 0, 0, WALL_H); wallPaper(ctx, 'y', [26, 62, 68], t);
  ctx.restore();
  // canto de la esquina
  poly(ctx, [P(0, 0, 0), P(0, 0, WALL_H), P(0.12, 0.12, WALL_H), P(0.12, 0.12, 0)], hsl(CREAM, -18), hsl(CREAM, -40), 1.5);
}

// decoración mural (planos)
function wallDecor(ctx, S) {
  const t = S.t;
  const uX = (y) => (W - y) * 64, vZ = (z) => (WALL_H - z) * 64;
  // — pared izquierda —
  onWallX(ctx, 0, W, WALL_H);
  // reloj
  { const cx = uX(8.0), cy = vZ(3.82), r = 20; ell(ctx, cx, cy, r, r, hsl(CREAM, 8), hsl(WOOD, -20), 4);
    ctx.strokeStyle = hsl(WOOD, -35); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(t * 0.1) * 10, cy - Math.cos(t * 0.1) * 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(t * 1.2) * 15, cy - Math.cos(t * 1.2) * 15); ctx.stroke(); }
  // póster "ATTENTION" (guiño a los transformers)
  { const x = uX(5.9), y = vZ(2.8), w = 52, h = 72; ctx.fillStyle = hsl(CREAM, 6); rrect(ctx, x, y, w, h, 3); ctx.fill(); ctx.strokeStyle = hsl(WOOD, -30); ctx.lineWidth = 3; ctx.stroke();
    label(ctx, 'ATTENTION', x + w / 2, y + 11, 8.5, hsl([280, 60, 30]), { weight: '800', mono: true });
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const a = Math.exp(-Math.abs(i - j) * 0.8) * (0.5 + 0.5 * Math.sin(t * 1.5 + i * 2 + j)); ctx.fillStyle = hsl([280, 80, 60], 0, 0.15 + a * 0.85); ctx.fillRect(x + 8 + i * 7.2, y + 22 + j * 7.2, 6.4, 6.4); }
    label(ctx, 'is all you need', x + w / 2, y + 62, 6.5, hsl([280, 40, 30]), { mono: true }); }
  // radar en pared (BUSCAR)
  { const cx = uX(3.5), cy = vZ(2.55), r = 46; ell(ctx, cx, cy, r + 6, r + 6, hsl(STEEL, -6), hsl(STEEL, -34), 4); ell(ctx, cx, cy, r, r, hsl([150, 60, 8]));
    ctx.strokeStyle = hsl(NEON.lime, 0, 0.35); ctx.lineWidth = 1.5; for (const k of [0.33, 0.66, 1]) { ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, 6.3); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
    const sa = S.ang('BUSCAR', 1.4, 3);
    const gr = ctx.createConicGradient ? ctx.createConicGradient(sa - 1.1, cx, cy) : null;
    if (gr) { gr.addColorStop(0, hsl(NEON.lime, 0, 0)); gr.addColorStop(0.17, hsl(NEON.lime, 0, 0.55)); gr.addColorStop(0.1801, hsl(NEON.lime, 0, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.fill(); }
    ctx.strokeStyle = hsl(NEON.lime, 10); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sa) * r, cy + Math.sin(sa) * r); ctx.stroke();
    for (let i = 0; i < 4; i++) { const a = rnd(i) * 6.3, d = 8 + rnd(i + 9) * (r - 14); const on = 0.35 + 0.65 * Math.max(0, Math.cos(sa - a)); ell(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 3.5, 3.5, hsl(NEON.lime, 12, on)); }
    ctx.fillStyle = hsl(STEEL, -4); rrect(ctx, cx - 30, cy + r + 8, 60, 12, 3); ctx.fill(); label(ctx, 'grep -r', cx, cy + r + 14, 8, hsl(NEON.lime), { mono: true }); }
  // ventana nocturna con luna
  { const x = uX(2.25), y = vZ(3.75), w = 80, h = 92; ctx.fillStyle = hsl(WOOD, -10); rrect(ctx, x - 7, y - 7, w + 14, h + 14, 5); ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#16224d'); g.addColorStop(1, '#5a3a78'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    for (let i = 0; i < 16; i++) { ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i))})`; ctx.fillRect(x + rnd(i) * w, y + rnd(i + 4) * h * 0.8, 2, 2); }
    ell(ctx, x + w * 0.74, y + h * 0.3, 15, 15, '#fff3c4'); ell(ctx, x + w * 0.74 + 6, y + h * 0.3 - 3, 13, 13, '#2a2f66');
    ctx.fillStyle = hsl(WOOD, -10); ctx.fillRect(x + w / 2 - 2, y, 4, h); ctx.fillRect(x, y + h / 2 - 2, w, 4); }
  ctx.restore();
  // — pared derecha —
  const uY = (x) => x * 64;
  onWallY(ctx, 0, 0, WALL_H);
  // cuadro "Hello, World!"
  { const x = uY(0.85), y = vZ(3.3), w = 78, h = 56; ctx.fillStyle = hsl(WOOD, -8); rrect(ctx, x - 5, y - 5, w + 10, h + 10, 4); ctx.fill(); ctx.fillStyle = hsl([220, 40, 12]); ctx.fillRect(x, y, w, h);
    label(ctx, 'print(', x + 6, y + 16, 10, hsl(NEON.lime), { mono: true, align: 'left' }); label(ctx, '"Hola mundo")', x + 12, y + 32, 10, hsl(NEON.amber), { mono: true, align: 'left' });
    if (Math.floor(t * 2) % 2) { ctx.fillStyle = hsl(NEON.lime); ctx.fillRect(x + 6, y + 40, 7, 10); } }
  ctx.restore();
}

// ───────── Estación EJECUTAR (Bash): sala de máquinas ─────────
function boiler(ctx, S) {
  const st = S.st('EJECUTAR'), t = S.t;
  const run = st.jam ? 0 : 0.5 + 3.5 * st.act;
  const gearA = S.gearAng('EJECUTAR');
  box(ctx, 1.9, 0.1, 0, 3.2, 1.4, 1.9, STEEL);
  // tanques
  cyl(ctx, 2.6, 0.75, 1.9, 0.45, 1.2, [200, 30, 40]); cyl(ctx, 4.3, 0.75, 1.9, 0.38, 0.8, [200, 30, 40]);
  // tubería superior + chimenea
  cyl(ctx, 3.45, 0.45, 1.9, 0.14, 1.35, [30, 30, 50]);
  box(ctx, 2.4, 0.55, 2.75, 2.1, 0.2, 0.2, [30, 30, 50]);
  // franjas neón
  const nc = st.jam ? NEON.red : NEON.cyan; const flick = st.jam ? (Math.sin(t * 24) > 0 ? 1 : 0.35) : 1;
  const [nx, ny] = P(1.9, 1.5, 1.82), [nx2, ny2] = P(5.1, 1.5, 1.82);
  ctx.strokeStyle = hsl(nc, 10, flick); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx2, ny2); ctx.stroke();
  glow(ctx, (nx + nx2) / 2, (ny + ny2) / 2, 220, nc, 0.18 * flick);
  // panel frontal (plano y=1.5)
  onWallY(ctx, 1.5, 1.9, 1.9);
  // ventana con engranajes
  ctx.fillStyle = hsl([200, 40, 8]); rrect(ctx, 14, 18, 130, 100, 8); ctx.fill();
  ctx.save(); rrect(ctx, 14, 18, 130, 100, 8); ctx.clip();
  glow(ctx, 80, 68, 120, st.jam ? NEON.red : NEON.cyan, 0.35 + 0.3 * st.act);
  gear(ctx, 52, 68, 38, 10, gearA, [210, 20, 52]); gear(ctx, 112, 54, 28, 8, -gearA * 1.35 + 0.2, [38, 70, 52]); gear(ctx, 98, 100, 20, 7, gearA * 1.9, [190, 40, 50]);
  ctx.restore(); ctx.strokeStyle = hsl(STEEL, 16); ctx.lineWidth = 5; rrect(ctx, 14, 18, 130, 100, 8); ctx.stroke();
  // manómetros
  for (let i = 0; i < 3; i++) {
    const cx = 180 + i * 0 + 0, cy = 34 + i * 38; // columna de 3 manómetros
    ell(ctx, cx, cy, 16, 16, hsl(CREAM, 12), hsl(STEEL, -30), 3);
    const val = st.jam && i === 1 ? 1.0 + Math.sin(t * 40) * 0.05 : 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * (1 + i * 0.7) + i)) * (0.4 + st.act);
    const a = Math.PI * (0.8 + val * 1.4); ctx.strokeStyle = st.jam && i === 1 ? hsl(NEON.red) : '#222'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12); ctx.stroke();
  }
  // leds
  for (let i = 0; i < 8; i++) { const on = st.jam ? Math.sin(t * 20 + i) > 0 : Math.sin(t * (2 + st.act * 6) + i * 1.3) > 0.2; ell(ctx, 22 + i * 16, 132, 4.5, 4.5, on ? hsl(st.jam ? NEON.red : NEON.lime, 8) : hsl([200, 20, 15])); }
  // rejilla
  ctx.fillStyle = hsl(STEEL, -14); for (let i = 0; i < 5; i++) ctx.fillRect(140 + i * 14, 140, 10, 6);
  ctx.restore();
  if (st.jam) { // luz de alarma giratoria
    const [ax, ay] = P(2.0, 0.6, 3.0); const k = 0.5 + 0.5 * Math.sin(t * 14);
    glow(ctx, ax, ay, 90 + k * 30, NEON.red, 0.7); ell(ctx, ax, ay - 4, 10, 12, hsl(NEON.red, 8 * k), hsl(NEON.red, -30), 2);
  } else { const [ax, ay] = P(2.0, 0.6, 3.0); ell(ctx, ax, ay - 4, 10, 12, hsl([140, 70, 38]), hsl([140, 60, 14]), 2); if (st.restartT < 1.2) glow(ctx, ax, ay, 100, NEON.lime, 0.8 * (1 - st.restartT / 1.2)); }
  // palanca
  { const [bx, by] = P(5.1, 1.0, 1.0); const pull = S.leverPull(); const ang = lerp(-1.1, 0.7, pull);
    ctx.strokeStyle = hsl([30, 20, 20]); ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.sin(ang) * 70, by - Math.cos(ang) * 70); ctx.stroke();
    ctx.strokeStyle = hsl([0, 80, 52]); ctx.lineWidth = 4; ctx.stroke();
    ell(ctx, bx + Math.sin(ang) * 72, by - Math.cos(ang) * 72, 9, 9, hsl([0, 85, 52]), hsl([0, 80, 22]), 2); ell(ctx, bx, by, 8, 8, hsl(STEEL, 14), hsl(STEEL, -30), 2); }
}

// ───────── Estación ESCRIBIR (Write): imprenta ─────────
function press(ctx, S) {
  const st = S.st('ESCRIBIR'), t = S.t; const col = [300, 28, 30];
  // piezas traseras
  box(ctx, 8.3, 0.25, 0, 2.3, 1.45, 0.75, col);
  box(ctx, 8.45, 0.35, 0.75, 0.28, 1.1, 1.75, [300, 22, 42]); box(ctx, 10.2, 0.35, 0.75, 0.28, 1.1, 1.75, [300, 22, 42]);
  box(ctx, 8.35, 0.3, 2.5, 2.2, 1.3, 0.35, [300, 25, 36]);
  // platina móvil: baja con cada golpe (eventos 'press')
  const pr = S.pulse('press', 0.35, st);
  const z = 1.7 - pr * 0.75; box(ctx, 8.8, 0.45, z, 1.4, 0.9, 0.22, [300, 18, 60], { left: 6 });
  cyl(ctx, 9.5, 0.9, z + 0.22, 0.09, 2.5 - z - 0.22 + 0.0, [215, 14, 62]);
  // tinta + rodillos
  cyl(ctx, 8.75, 1.6, 0.75, 0.13, 0.35, [185, 80, 50]); cyl(ctx, 9.25, 1.6, 0.75, 0.13, 0.35, [320, 80, 52]);
  // volante (plano x=10.6, cara derecha)
  { onWallX(ctx, 10.6, 1.7, 2.9); const a = S.ang('ESCRIBIR', 0.5, 5); ctx.translate(50, 0); ell(ctx, 0, 70, 56, 56, hsl([30, 30, 28]), hsl([30, 30, 10]), 5);
    for (let i = 0; i < 6; i++) { const aa = a + i * Math.PI / 3; ctx.strokeStyle = hsl([38, 30, 62]); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 70); ctx.lineTo(Math.cos(aa) * 50, 70 + Math.sin(aa) * 50); ctx.stroke(); }
    ell(ctx, 0, 70, 10, 10, hsl(NEON.amber), hsl([38, 90, 20]), 2); ctx.restore(); }
  // bandeja de papeles impresos al frente
  const n = Math.min(12, S.pressCount()); box(ctx, 8.55, 1.75, 0, 1.3, 0.62, 0.38, [30, 40, 50]);
  for (let i = 0; i < n; i++) box(ctx, 8.62 + (i % 2) * 0.03, 1.8, 0.38 + i * 0.045, 1.14, 0.5, 0.04, [45, 30, 94], { noShine: true });
  // neón
  const [gx, gy] = P(9.4, 1.7, 2.6); glow(ctx, gx, gy, 170, NEON.mag, 0.22 + 0.25 * st.act);
  const [lx, ly] = P(8.35, 1.6, 2.85), [lx2, ly2] = P(10.55, 1.6, 2.85);
  ctx.strokeStyle = hsl(NEON.mag, 8); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx2, ly2); ctx.stroke();
}

// ───────── Estación LEER (Read): biblioteca ─────────
function library(ctx, S) {
  const st = S.st('LEER'), t = S.t;
  box(ctx, 0, 6, 0, 0.95, 4.0, 3.45, [22, 45, 30], { noShine: true });
  onWallX(ctx, 0.95, 10, 3.45);
  const zs = [0.18, 1.0, 1.82, 2.64]; // baldas
  for (let s = 0; s < 4; s++) {
    const top = (3.45 - (zs[s] + 0.72)) * 64; let u = 6;
    ctx.fillStyle = hsl([20, 40, 14]); ctx.fillRect(2, top - 1, 4 * 64 - 4, 52 + 1);
    for (let k = 0; u < 4 * 64 - 14; k++) {
      const w = 9 + rnd(s * 50 + k) * 8, h = 34 + rnd(s * 70 + k * 2) * 15; const hue = [[8, 70, 50], [200, 60, 45], [45, 80, 55], [150, 50, 38], [330, 55, 50], [260, 45, 50]][Math.floor(rnd(s * 33 + k) * 6)];
      const lean = (s === 1 && k === 11) ? 0.28 : 0;
      ctx.save(); ctx.translate(u + w / 2, top + 51); ctx.rotate(lean); ctx.fillStyle = hsl(hue); ctx.fillRect(-w / 2, -h, w, h); ctx.fillStyle = hsl(hue, -16); ctx.fillRect(-w / 2, -h, 2.5, h);
      ctx.fillStyle = hsl(hue, 22, 0.7); ctx.fillRect(-w / 2 + 2, -h + 7, w - 4, 2); ctx.fillRect(-w / 2 + 2, -8, w - 4, 2); ctx.restore(); u += w + 1.5;
    }
    ctx.fillStyle = hsl([22, 50, 38]); ctx.fillRect(0, top + 51, 4 * 64, 7);
  }
  // libro especial "LLM" que brilla cuando se lee
  { const g = st.act; ctx.fillStyle = hsl(NEON.cyan, 6); ctx.fillRect(196, (3.45 - 2.64 - 0.72) * 64 + 52 - 46, 15, 46); glow(ctx, 203, (3.45 - 2.64 - 0.72) * 64 + 30, 60, NEON.cyan, 0.3 + g * 0.6);
    ctx.save(); ctx.translate(203, (3.45 - 2.64 - 0.72) * 64 + 28); ctx.rotate(-Math.PI / 2); label(ctx, 'LLM', 0, 0, 8, '#06212a', { mono: true, weight: '800' }); ctx.restore(); }
  ctx.restore();
  // atril con libro abierto
  box(ctx, 1.15, 7.45, 0, 0.55, 0.45, 0.95, [24, 45, 36]);
  const open = 1; const [a1x, a1y] = P(1.05, 7.35, 1.2), [a2x, a2y] = P(1.8, 7.35, 1.1), [a3x, a3y] = P(1.8, 8.65, 1.1), [a4x, a4y] = P(1.05, 8.65, 1.2);
  poly(ctx, [[a1x, a1y], [a2x, a2y], [a3x, a3y], [a4x, a4y]], hsl([40, 30, 92]), hsl([30, 30, 30]), 2);
  // pliegue + líneas de texto que se iluminan
  const [m1x, m1y] = P(1.42, 7.35, 1.15), [m2x, m2y] = P(1.42, 8.65, 1.15); ctx.strokeStyle = hsl([30, 30, 50]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(m1x, m1y); ctx.lineTo(m2x, m2y); ctx.stroke();
  for (let i = 0; i < 6; i++) { const y0 = 7.5 + i * 0.19; const [lx, ly] = P(1.12, y0, 1.19), [lx2, ly2] = P(1.38, y0, 1.15); const sc = (st.lt * 1.8) % 6; const lit = st.act > 0.05 && Math.abs(sc - i) < 1.2;
    ctx.strokeStyle = lit ? hsl(NEON.cyan, 6) : hsl([30, 20, 40], 0, 0.55); ctx.lineWidth = lit ? 3.5 : 2; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx2, ly2); ctx.stroke(); }
  // página que pasa
  const flip = S.pulse('page', 0.5, st);
  if (flip > 0.01) { const f = 1 - flip; const [px, py] = P(1.42, 8.0, 1.15); const w = Math.cos(f * Math.PI) * 52; ctx.fillStyle = hsl([40, 30, 96]); ctx.strokeStyle = hsl([30, 30, 40]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, py - 12); ctx.lineTo(px + w, py - 30 - Math.sin(f * Math.PI) * 30); ctx.lineTo(px + w, py + 22 - Math.sin(f * Math.PI) * 30); ctx.lineTo(px, py + 28); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  glow(ctx, ...P(1.42, 8.0, 1.5), 150, NEON.cyan, 0.15 + 0.4 * st.act);
  // escalera
  const [s1x, s1y] = P(0.98, 6.2, 0), [s2x, s2y] = P(0.98, 6.2, 3.2); ctx.strokeStyle = hsl([30, 40, 52]); ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(s1x - 4, s1y); ctx.lineTo(s2x - 4, s2y - 40); ctx.moveTo(s1x + 22, s1y + 10); ctx.lineTo(s2x + 22, s2y - 30); ctx.stroke();
}

// ───────── Estación BUSCAR (Grep/Glob): radar y telescopio ─────────
function radar(ctx, S) {
  const st = S.st('BUSCAR'), t = S.t;
  box(ctx, 0.15, 2.9, 0, 1.1, 1.0, 0.55, [95, 25, 30]);
  cyl(ctx, 0.7, 3.4, 0.55, 0.1, 0.9, [210, 14, 60]);
  const [cx, cy] = P(0.7, 3.4, 1.55); const a = S.ang('BUSCAR', 0.9, 4);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.35);
  const rx = Math.abs(Math.cos(a)) * 62 + 10; ctx.beginPath(); ctx.ellipse(0, 0, rx, 46, 0, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(-rx, 0, rx, 0); g.addColorStop(0, hsl([95, 25, 70])); g.addColorStop(1, hsl([95, 25, 38])); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = hsl([95, 25, 20]); ctx.lineWidth = 3.5; ctx.stroke();
  ctx.strokeStyle = hsl([210, 14, 50]); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sign(Math.cos(a)) * -30, -34); ctx.stroke(); ell(ctx, Math.sign(Math.cos(a)) * -30, -34, 5, 5, hsl(NEON.lime, 8)); ctx.restore();
  glow(ctx, cx, cy, 110, NEON.lime, 0.15 + 0.4 * st.act);
  // telescopio
  const [tx, ty] = P(0.8, 4.55, 0);
  ctx.strokeStyle = hsl([30, 40, 30]); ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (const [dx, dy] of [[-34, 6], [34, 6], [0, 20]]) { ctx.beginPath(); ctx.moveTo(tx + dx, ty + dy); ctx.lineTo(tx, ty - 74); ctx.stroke(); }
  ctx.save(); ctx.translate(tx, ty - 78); ctx.rotate(-0.55 + Math.sin(t * 0.7 + st.lt) * 0.06 * (1 + st.act * 3));
  rrect(ctx, -10, -20, 92, 40, 10); ctx.fillStyle = hsl([210, 30, 45]); ctx.fill(); ctx.strokeStyle = hsl([210, 30, 16]); ctx.lineWidth = 3.5; ctx.stroke();
  rrect(ctx, 70, -25, 24, 50, 5); ctx.fillStyle = hsl(NEON.amber, -12); ctx.fill(); ctx.stroke(); ell(ctx, 94, 0, 6, 22, hsl([200, 90, 80], 0, 0.8)); ctx.restore();
  // lupa buscando "pistas" en el suelo
  const [mx, my] = P(1.7, 4.4, 0);
  ctx.save(); ctx.translate(mx, my);
  const o = 0.5 + 0.5 * Math.sin(t * 2);
  for (let i = 0; i < 3; i++) { ctx.strokeStyle = hsl(NEON.lime, 8, 0.2 + 0.3 * (st.act)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 22 + i * 14 + o * 6, 11 + i * 7 + o * 3, 0, 0, 7); ctx.stroke(); }
  ctx.restore();
}

// ───────── Estación EDITAR (Edit): mesa con lupa y martillo ─────────
function bench(ctx, S) {
  const st = S.st('EDITAR'), t = S.t;
  const x0 = 5.5, y0 = 5.5, w = 2.6, d = 1.2, h = 0.85;
  for (const [lx, ly] of [[x0 + 0.1, y0 + 0.05], [x0 + w - 0.28, y0 + 0.05], [x0 + 0.1, y0 + d - 0.28], [x0 + w - 0.28, y0 + d - 0.28]]) box(ctx, lx, ly, 0, 0.18, 0.18, h, [24, 40, 30], { noShine: true });
  box(ctx, x0, y0, h, w, d, 0.14, [30, 55, 54]);
  // papel sobre la mesa con código
  const [p1x, p1y] = P(x0 + 1.2, y0 + 0.2, h + 0.15), [p2x, p2y] = P(x0 + 2.3, y0 + 0.2, h + 0.15), [p3x, p3y] = P(x0 + 2.3, y0 + 1.0, h + 0.15), [p4x, p4y] = P(x0 + 1.2, y0 + 1.0, h + 0.15);
  poly(ctx, [[p1x, p1y], [p2x, p2y], [p3x, p3y], [p4x, p4y]], hsl([45, 40, 94]), hsl([30, 30, 35]), 1.5);
  const fixP = S.fixProgress;
  for (let i = 0; i < 5; i++) { const y = y0 + 0.3 + i * 0.13; const [a, b] = P(x0 + 1.3, y, h + 0.16), [c, dd] = P(x0 + 1.3 + 0.5 + rnd(i) * 0.35, y, h + 0.16);
    const bad = i === 2 && S.hadError && fixP < 1; ctx.strokeStyle = bad ? hsl(NEON.red, 4) : hsl([220, 30, 30], 0, 0.7); ctx.lineWidth = bad ? 3.5 : 2.2; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, dd); ctx.stroke(); }
  // yunque + engranaje roto/reparado encima
  const [ax, ay] = P(x0 + 0.45, y0 + 0.6, h + 0.14);
  ctx.fillStyle = hsl([220, 12, 26]); ctx.beginPath(); ctx.moveTo(ax - 28, ay - 22); ctx.lineTo(ax + 28, ay - 22); ctx.lineTo(ax + 14, ay - 10); ctx.lineTo(ax + 18, ay + 2); ctx.lineTo(ax - 18, ay + 2); ctx.lineTo(ax - 14, ay - 10); ctx.closePath(); ctx.fill(); ctx.strokeStyle = hsl([220, 12, 10]); ctx.lineWidth = 3; ctx.stroke();
  // mini robot de juguete "ELIZA 1966" (guiño)
  { const [tx, ty] = P(x0 + 1.05, y0 + 1.05, h + 0.14); rrect(ctx, tx - 9, ty - 26, 18, 18, 4); ctx.fillStyle = hsl([210, 15, 70]); ctx.fill(); ctx.strokeStyle = hsl([210, 15, 25]); ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#222'; ctx.fillRect(tx - 5, ty - 21, 4, 4); ctx.fillRect(tx + 1, ty - 21, 4, 4); rrect(ctx, tx - 7, ty - 8, 14, 11, 3); ctx.fillStyle = hsl([210, 15, 62]); ctx.fill(); ctx.stroke();
    label(ctx, 'ELIZA', tx, ty + 9, 6.5, 'rgba(255,255,255,0.8)', { mono: true }); }
  // lámpara de brazo con neón ámbar
  { const [bx, by] = P(x0 + 2.35, y0 + 0.2, h + 0.14); ctx.strokeStyle = hsl([220, 12, 30]); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 8, by - 70); ctx.lineTo(bx - 52, by - 96); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx - 52, by - 96); ctx.lineTo(bx - 80, by - 84); ctx.lineTo(bx - 66, by - 112); ctx.closePath(); ctx.fillStyle = hsl(NEON.amber, -6); ctx.fill(); ctx.stroke();
    glow(ctx, bx - 66, by - 82, 130, NEON.amber, 0.35 + 0.35 * st.act); }
  // lupa (se mueve mientras se edita)
  { const mv = st.act > 0.02 ? Math.sin(st.lt * 3.2) : 0; const [lx, ly] = P(x0 + 1.75 + 0.25 * mv, y0 + 0.62, h + 0.2);
    ctx.save(); ctx.translate(lx, ly - 24 - 6 * Math.abs(mv)); ctx.strokeStyle = hsl([30, 50, 25]); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(22, 20); ctx.lineTo(52, 50); ctx.stroke();
    ell(ctx, 0, 0, 26, 26, hsl([195, 80, 85], 0, 0.45), hsl([40, 70, 40]), 5); ctx.beginPath(); ctx.arc(-8, -9, 9, 3.6, 4.7); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
}
function hammerProp(ctx, S) { // martillo que cae sobre el yunque cuando se edita
  const st = S.st('EDITAR'); const pr = S.pulse('hammer', 0.28, st);
  const [ax, ay] = P(5.95, 6.1, 0.99);
  const active = st.act > 0.02; const lift = active ? pr : 0;
  ctx.save(); ctx.translate(ax + (active ? 20 : 34), ay - (active ? 28 : 6)); ctx.rotate(active ? -0.15 - lift * 1.0 : -1.35);
  ctx.strokeStyle = hsl([30, 50, 40]); ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-6, -64); ctx.stroke();
  rrect(ctx, -30, -92, 52, 28, 5); ctx.fillStyle = hsl([220, 12, 52]); ctx.fill(); ctx.strokeStyle = hsl([220, 12, 14]); ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
}

// ───────── Estación CONECTAR (Web/Artifact): antena ─────────
function antenna(ctx, S) {
  const st = S.st('CONECTAR'), t = S.t;
  box(ctx, 9.1, 8.2, 0, 1.3, 1.0, 0.5, [250, 25, 32]);
  box(ctx, 9.62, 8.52, 0.5, 0.16, 0.16, 1.7, [210, 14, 58]);
  const [cx, cy] = P(9.7, 8.6, 1.95);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.5); ctx.beginPath(); ctx.ellipse(0, 0, 38, 26, 0, 0, 7); ctx.fillStyle = hsl([270, 20, 82]); ctx.fill(); ctx.strokeStyle = hsl([270, 25, 25]); ctx.lineWidth = 3.5; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(6, 0, 26, 17, 0, 0, 7); ctx.fillStyle = hsl([270, 25, 62]); ctx.fill(); ctx.restore();
  for (let i = 0; i < 3; i++) { const k = ((S.ang('CONECTAR', 0.6, 1.5) + i / 3) % 1); ctx.strokeStyle = hsl(NEON.violet, 10, (1 - k) * (0.3 + 0.7 * st.act)); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx - 22, cy - 28, 16 + k * 70, -Math.PI * 0.9, -Math.PI * 0.1); ctx.stroke(); }
  const [bx, by] = P(9.7, 8.6, 2.25); ell(ctx, bx, by, 5, 5, hsl(Math.sin(t * 5) > 0 ? NEON.red : [355, 40, 25], 6));
  const [mx, my] = P(9.2, 9.0, 0.5); rrect(ctx, mx - 3, my - 34, 38, 28, 5); ctx.fillStyle = hsl([0, 70, 52]); ctx.fill(); ctx.strokeStyle = hsl([0, 70, 20]); ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#111'; ctx.fillRect(mx + 5, my - 24, 22, 4); label(ctx, 'OUT', mx + 16, my - 12, 8, '#fff', { mono: true });
  glow(ctx, cx, cy, 100, NEON.violet, 0.16 + 0.4 * st.act);
}

// ───────── Consola con la pantalla del final ─────────
function consoleDesk(ctx, S) {
  box(ctx, 5.3, 0.1, 0, 2.7, 0.95, 0.85, [220, 20, 28]);
  box(ctx, 5.25, 0.05, 0.85, 2.8, 1.05, 0.1, [30, 30, 40]);
  // teclado + ratón
  { const [kx, ky] = P(6.5, 0.72, 0.98); poly(ctx, [[kx - 38, ky - 4], [kx + 18, ky - 4 + 28], [kx + 40, ky + 8 + 2], [kx - 16, ky - 20]].map((p) => p), hsl([220, 15, 70]), hsl([220, 15, 20]), 2);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = hsl([220, 15, 90], 0, 0.7); ctx.fillRect(kx - 26 + i * 10, ky - 6 + i * 5 - 8, 6, 3); } }
  // pato de goma (depuración) + taza con "T=0.7"
  { const [dx, dy] = P(7.6, 0.5, 0.95); ell(ctx, dx, dy - 8, 11, 8, hsl([50, 95, 58]), hsl([40, 80, 25]), 2); ell(ctx, dx + 8, dy - 18, 7, 7, hsl([50, 95, 60]), hsl([40, 80, 25]), 2); ctx.fillStyle = hsl([20, 95, 55]); ctx.fillRect(dx + 13, dy - 18, 6, 3); ell(ctx, dx + 10, dy - 19, 1.3, 1.3, '#222');
    const [mx, my] = P(5.7, 0.55, 0.95); rrect(ctx, mx - 11, my - 22, 22, 22, 4); ctx.fillStyle = hsl([190, 70, 45]); ctx.fill(); ctx.strokeStyle = hsl([190, 70, 18]); ctx.lineWidth = 2; ctx.stroke(); label(ctx, 'T=.7', mx, my - 11, 7, '#fff', { mono: true });
    for (let i = 0; i < 3; i++) { const k = (S.t * 0.5 + i / 3) % 1; ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.5})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - 4 + i * 4, my - 26 - k * 20); ctx.quadraticCurveTo(mx - 8 + i * 4, my - 34 - k * 20, mx - 4 + i * 4, my - 42 - k * 20); ctx.stroke(); } }
}
function monitor(ctx, S, drawScreen) {
  // marco sobre la pared y=0: x 5.55–7.45, z 1.15–2.95
  const x0 = 5.2, w = 2.9, z1 = 3.3, hh = 1.8;
  box(ctx, x0 - 0.06, 0.02, z1 - hh - 0.04, w + 0.12, 0.14, hh + 0.08, [220, 15, 22], { noShine: true });
  onWallY(ctx, 0.16, x0, z1);
  const sw = w * 64, sh = hh * 64; ctx.fillStyle = '#05060e'; rrect(ctx, 0, 0, sw, sh, 6); ctx.fill();
  ctx.save(); rrect(ctx, 4, 4, sw - 8, sh - 8, 4); ctx.clip();
  drawScreen(ctx, sw, sh); ctx.restore();
  ctx.restore();
  const [gx, gy] = P(x0 + w / 2, 0.3, 2.3); glow(ctx, gx, gy, 260, [200, 90, 60], 0.14 + 0.1 * S.screenOn);
}

// ───────── Cápsula de tareas ─────────
function taskTube(ctx, S) {
  const [px, py] = P(0.5, 0.5, 0);
  // tubo que baja hasta el borde de la pantalla
  const [tx, ty] = P(0.5, 0.5, 1.7);
  const g = ctx.createLinearGradient(tx - 15, 0, tx + 15, 0); g.addColorStop(0, hsl([200, 15, 52])); g.addColorStop(0.4, hsl([200, 15, 78])); g.addColorStop(1, hsl([200, 15, 34]));
  ctx.fillStyle = g; ctx.fillRect(tx - 15, ty - 900, 30, 900); ctx.strokeStyle = hsl([200, 15, 18]); ctx.lineWidth = 3; ctx.strokeRect(tx - 15, ty - 900, 30, 900);
  for (let k = 0; k < 8; k++) { ctx.fillStyle = hsl([200, 15, 30]); ctx.fillRect(tx - 17, ty - 40 - k * 110, 34, 8); }
  ctx.fillStyle = hsl([200, 15, 45]); ctx.beginPath(); ctx.moveTo(tx - 15, ty); ctx.lineTo(tx - 23, ty + 18); ctx.lineTo(tx + 23, ty + 18); ctx.lineTo(tx + 15, ty); ctx.fill(); ctx.stroke();
  // bandeja
  box(ctx, 0.2, 0.2, 0, 0.9, 0.9, 0.18, [10, 60, 45]);
  ell(ctx, ...P(0.65, 0.65, 0.2), 28, 14, hsl(NEON.amber, 0, 0.45));
}

// ───────── Gato durmiendo ─────────
function cat(ctx, S) {
  const [cx, cy] = P(4.5, 8.7, 0.0), t = S.t; const awake = S.catAwake;
  ell(ctx, cx, cy + 6, 62, 26, hsl([335, 60, 42]), hsl([335, 60, 18]), 3); ell(ctx, cx, cy - 4, 52, 22, hsl([335, 55, 55]));
  const br = Math.sin(t * 1.8) * 1.6;
  ctx.fillStyle = hsl([28, 70, 55]); ctx.strokeStyle = hsl([28, 70, 20]); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cx, cy - 20 - br * 0.3, 40, 22 + br, 0, 0, 7); ctx.fill(); ctx.stroke();
  // rayas
  ctx.strokeStyle = hsl([28, 70, 36]); ctx.lineWidth = 4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 20 + i * 14, cy - 38 - br); ctx.lineTo(cx - 14 + i * 14, cy - 24); ctx.stroke(); }
  // cabeza
  const hx = cx + 34, hy = cy - 24; ell(ctx, hx, hy, 18, 15, hsl([28, 70, 58]), hsl([28, 70, 20]), 3);
  ctx.fillStyle = hsl([28, 70, 55]); ctx.strokeStyle = hsl([28, 70, 20]);
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s * 5, hy - 12); ctx.lineTo(hx + s * 14, hy - 27 + (awake ? -2 : 0)); ctx.lineTo(hx + s * 17, hy - 8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (const s of [-1, 1]) { ctx.beginPath(); if (awake) { ctx.arc(hx + s * 7, hy - 1, 3, 0, 7); } else { ctx.arc(hx + s * 7, hy - 3, 4, 0.15 * Math.PI, 0.85 * Math.PI); } ctx.stroke(); }
  ell(ctx, hx, hy + 4, 2.5, 2, '#d77'); label(ctx, 'Token', hx - 2, hy + 18, 7, 'rgba(255,255,255,0.85)', { mono: true });
  // cola
  ctx.strokeStyle = hsl([28, 70, 55]); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(cx - 36, cy - 16); ctx.quadraticCurveTo(cx - 62, cy - 6 + Math.sin(t * 2) * 6, cx - 46, cy + 8); ctx.stroke();
  if (!awake) for (let i = 0; i < 3; i++) { const u = ((t * 0.4 + i / 3) % 1); ctx.globalAlpha = Math.sin(u * Math.PI); label(ctx, 'z', hx + 14 + u * 30, hy - 30 - u * 40, 12 + i * 5, 'rgba(255,255,255,0.9)', { weight: '800' }); ctx.globalAlpha = 1; }
}

// ───────── Plantas, cajas, sillón, etc. ─────────
function plant(ctx, S, x, y, s = 1) {
  const [px, py] = P(x, y, 0), t = S.t;
  ctx.fillStyle = hsl([15, 60, 45]); ctx.strokeStyle = hsl([15, 60, 18]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 24 * s, py - 44 * s); ctx.lineTo(px + 24 * s, py - 44 * s); ctx.lineTo(px + 16 * s, py); ctx.lineTo(px - 16 * s, py); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.38 + Math.sin(t * 1.2 + i) * 0.05; const L = (70 + rnd(i + x) * 40) * s; ctx.save(); ctx.translate(px, py - 44 * s); ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = hsl([130 + i * 4, 55, 34 + i * 2]); ctx.strokeStyle = hsl([130, 55, 14]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(16 * s, -L * 0.5, 0, -L); ctx.quadraticCurveTo(-16 * s, -L * 0.5, 0, 0); ctx.fill(); ctx.stroke(); ctx.restore(); }
}
function armchair(ctx, S) {
  const x = CHAIR[0] - 0.55, y = CHAIR[1] - 0.2;
  box(ctx, x, y - 0.05, 0, 1.1, 0.25, 1.3, [350, 50, 36]);        // respaldo (detrás)
  box(ctx, x - 0.15, y, 0, 0.22, 1.2, 0.8, [350, 50, 40]);
  box(ctx, x + 1.05, y, 0, 0.22, 1.2, 0.8, [350, 50, 40]);
  box(ctx, x + 0.05, y + 0.1, 0, 1.0, 1.05, 0.5, [350, 55, 46]);
  // mesita con taza de té
  box(ctx, 7.95, 3.0, 0, 0.55, 0.55, 0.65, [28, 45, 40]);
  const [tx, ty] = P(8.22, 3.27, 0.7); rrect(ctx, tx - 9, ty - 17, 18, 17, 3); ctx.fillStyle = hsl([10, 70, 90]); ctx.fill(); ctx.strokeStyle = hsl([10, 30, 30]); ctx.lineWidth = 2; ctx.stroke();
}
function crates(ctx, S) {
  box(ctx, 9.4, 4.6, 0, 0.9, 0.9, 0.7, [30, 45, 48]); box(ctx, 9.55, 4.7, 0.7, 0.6, 0.6, 0.5, [30, 45, 55]);
  const [lx, ly] = P(10.3, 5.0, 0.35); label(ctx, '404', lx - 24, ly + 6, 9, 'rgba(0,0,0,0.5)', { mono: true });
  // cables + herramientas en el suelo
  const [sx, sy] = P(4.2, 9.9, 0); ctx.strokeStyle = hsl([0, 0, 15]); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx - 70, sy - 4); ctx.bezierCurveTo(sx - 20, sy - 30, sx + 20, sy + 20, sx + 80, sy - 6); ctx.stroke();
  const [bx, by] = P(5.8, 9.5, 0); box(ctx, 5.6, 9.3, 0, 0.8, 0.5, 0.3, [10, 70, 45]);
}

// papeles que caen (decoración viva)
function fallingPapers(ctx, S) {
  for (let i = 0; i < 7; i++) {
    const per = 7 + i * 1.3, u = ((S.t + i * 2.3) % per) / per; const z = 4.3 - u * 4.1; const bx = 1.6 + (i % 3) * 1.5, by = 0.8 + Math.floor(i / 3) * 1.1;
    const [x, y] = P(bx + Math.sin(u * 9 + i) * 0.35, by + Math.cos(u * 7 + i) * 0.25, z); ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(u * 14 + i) * 0.7);
    ctx.globalAlpha = Math.sin(u * Math.PI) * 0.9; const sq = Math.abs(Math.cos(u * 12 + i)); ctx.fillStyle = '#fff4dc'; ctx.fillRect(-9, -6 * sq - 1, 18, 12 * sq + 2); ctx.restore(); ctx.globalAlpha = 1;
  }
}
function stringLights(ctx, S) {
  const pts = []; for (let i = 0; i <= 22; i++) { const x = 0.3 + i * 0.5, z = 3.98 - 0.22 * Math.sin((i % 6) / 6 * Math.PI) * 1; pts.push(P(x, 0.1, 3.98 - Math.sin(((i % 6) / 6) * Math.PI) * 0.25)); }
  ctx.strokeStyle = hsl([0, 0, 12]); ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
  pts.forEach((p, i) => { if (i % 2) return; const c = [NEON.amber, NEON.mag, NEON.cyan, NEON.lime][(i / 2) % 4]; const on = 0.55 + 0.45 * Math.sin(S.t * 3 + i * 1.7); glow(ctx, p[0], p[1] + 8, 40, c, 0.55 * on); ell(ctx, p[0], p[1] + 8, 4.5, 6, hsl(c, 14, 0.7 + 0.3 * on)); });
}

function sign(ctx, S, name, wx, wy, wz, S2) {
  const st = S.st(name), stn = S2[name], t = S.t; const [x, y] = P(wx, wy, wz); const on = st.act; const w = 150, h = 52; const col = stn.color;
  ctx.save(); ctx.translate(x, y); const pop = 1 + 0.07 * on * (0.5 + 0.5 * Math.sin(t * 6)); ctx.scale(pop, pop);
  ctx.strokeStyle = hsl([220, 12, 25]); ctx.lineWidth = 3; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * (w / 2 - 22), -h / 2); ctx.lineTo(s * (w / 2 - 22), -h / 2 - 22); ctx.stroke(); }
  glow(ctx, 0, 0, 150, col, 0.15 + 0.5 * on + (st.jam ? 0 : 0));
  rrect(ctx, -w / 2, -h / 2, w, h, 12); ctx.fillStyle = hsl([250, 35, 13], 0, 0.96); ctx.fill(); ctx.strokeStyle = hsl(st.jam ? NEON.red : col, 6, 0.55 + 0.45 * Math.max(on, 0.3)); ctx.lineWidth = 4; ctx.stroke();
  label(ctx, stn.es, 0, -7, 24, hsl(st.jam ? NEON.red : col, 22), { weight: '900' });
  label(ctx, stn.real, 0, 15, 12, 'rgba(255,255,255,0.78)', { mono: true, weight: '700' });
  ctx.restore();
}
function fShadow(ctx, x, y, w, d, a = 0.2) { poly(ctx, [P(x - 0.15, y - 0.05), P(x + w + 0.25, y - 0.05), P(x + w + 0.25, y + d + 0.3), P(x - 0.15, y + d + 0.3)], `rgba(10,4,20,${a})`, null); }
module.exports = { sign, fShadow, W, NEON, drawBackdrop, drawFloor, drawWalls, wallDecor, boiler, press, library, radar, bench, hammerProp, antenna, consoleDesk, monitor, taskTube, cat, plant, armchair, crates, fallingPapers, stringLights };
