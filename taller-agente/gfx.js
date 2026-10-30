// Primitivas isométricas vectoriales sobre Canvas 2D. Mundo: x,y en casillas, z hacia arriba.
'use strict';
const A = 64, B = 32, C = 58;
const P = (x, y, z = 0) => [(x - y) * A, (x + y) * B - z * C];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
const easeBack = (u) => { u = clamp(u); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
const hsl = (c, dl = 0, a = 1) => `hsla(${c[0]},${c[1]}%,${clamp(c[2] + dl, 0, 100)}%,${a})`;
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function poly(ctx, pts, fill, stroke, lw = 1.5) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}

// caja con tres caras visibles: techo, cara izquierda (+y) y cara derecha (+x)
function box(ctx, x, y, z, w, d, h, col, o = {}) {
  const p = (a, b, c) => P(x + a * w, y + b * d, z + c * h);
  const st = o.noStroke ? null : hsl(col, -28, 0.9);
  poly(ctx, [p(0, 1, 1), p(1, 1, 1), p(1, 1, 0), p(0, 1, 0)], hsl(col, o.left ?? 0), st);
  poly(ctx, [p(1, 0, 1), p(1, 1, 1), p(1, 1, 0), p(1, 0, 0)], hsl(col, o.right ?? -13), st);
  poly(ctx, [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)], hsl(col, o.top ?? 9), st);
  if (!o.noShine) { // filo claro en el borde frontal superior
    ctx.strokeStyle = hsl(col, 22, 0.55); ctx.lineWidth = 1.5; ctx.beginPath();
    const a = p(0, 1, 1), b = p(1, 1, 1), c = p(1, 0, 1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
  }
}

// cilindro vertical
function cyl(ctx, x, y, z, r, h, col, o = {}) {
  const [cx, cy] = P(x, y, z); const rx = r * A * Math.SQRT2, ry = r * B * Math.SQRT2, hh = h * C;
  const g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  g.addColorStop(0, hsl(col, 6)); g.addColorStop(0.35, hsl(col, 18)); g.addColorStop(1, hsl(col, -16));
  ctx.beginPath(); ctx.moveTo(cx - rx, cy); ctx.lineTo(cx - rx, cy - hh); ctx.ellipse(cx, cy - hh, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(cx + rx, cy); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI, false); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = hsl(col, -30, 0.9); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy - hh, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = hsl(o.top || col, 12); ctx.fill(); ctx.stroke();
}

// planos: pared x=const (se ve desde +x), pared y=const (se ve desde +y), suelo. Unidad local ≈ 1/64 casilla, v hacia abajo.
function onWallX(ctx, x, y1, zTop) { const [ox, oy] = P(x, y1, zTop); ctx.save(); ctx.transform(A, -B, 0, C, ox, oy); ctx.scale(1 / 64, 1 / 64); }
function onWallY(ctx, y, x0, zTop) { const [ox, oy] = P(x0, y, zTop); ctx.save(); ctx.transform(A, B, 0, C, ox, oy); ctx.scale(1 / 64, 1 / 64); }
function onFloor(ctx, z = 0) { const [ox, oy] = P(0, 0, z); ctx.save(); ctx.transform(A, B, -A, B, ox, oy); ctx.scale(1 / 64, 1 / 64); }

function glow(ctx, x, y, r, col, a = 0.6) {
  if (a <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hsl(col, 8, a)); g.addColorStop(0.4, hsl(col, 0, a * 0.35)); g.addColorStop(1, hsl(col, 0, 0));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function ell(ctx, x, y, rx, ry, fill, stroke, lw = 1.5, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function gear(ctx, x, y, r, teeth, rot, col, hole = 0.35) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
  const n = teeth * 2;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2; const rr = i % 2 ? r * 0.82 : r;
    ctx.lineTo(Math.cos(a0 + 0.02) * rr, Math.sin(a0 + 0.02) * rr); ctx.lineTo(Math.cos(a1 - 0.02) * rr, Math.sin(a1 - 0.02) * rr);
  }
  ctx.closePath(); ctx.fillStyle = hsl(col, 4); ctx.fill(); ctx.strokeStyle = hsl(col, -30, 0.95); ctx.lineWidth = Math.max(1.2, r * 0.07); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * hole, 0, Math.PI * 2); ctx.fillStyle = hsl(col, -30); ctx.fill();
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78); ctx.strokeStyle = hsl(col, -18, 0.7); ctx.lineWidth = r * 0.12; ctx.stroke(); }
  ctx.restore();
}
function label(ctx, text, x, y, size, color, o = {}) {
  ctx.font = `${o.weight || '600'} ${size}px ${o.mono ? 'Consolas, monospace' : "'Segoe UI', sans-serif"}`;
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
  if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(text, x + 0, y + size * 0.06); }
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

module.exports = { A, B, C, P, clamp, lerp, ease, easeOut, easeBack, hsl, rnd, poly, box, cyl, onWallX, onWallY, onFloor, glow, rrect, ell, gear, label };
