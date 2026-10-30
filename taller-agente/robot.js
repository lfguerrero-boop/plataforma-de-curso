// El robot-agente: dibujado en espacio de pantalla, origen en los pies. Expresiones, poses y mochila de contexto.
'use strict';
const { hsl, glow, rrect, ell, clamp, label } = require('./gfx');

const ORANGE = [22, 92, 56], DARK = [22, 55, 30], METAL = [215, 14, 70], FACE = [228, 40, 12], CYAN = [186, 100, 62];

function limb(ctx, sx, sy, a1, a2, side, l1, l2, w, col, handCol) {
  const ex = sx + Math.sin(a1) * side * l1, ey = sy + Math.cos(a1) * l1;
  const hx = ex + Math.sin(a2) * side * l2, hy = ey + Math.cos(a2) * l2;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = hsl(DARK, -10); ctx.lineWidth = w + 4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = hsl(col, 6); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
  ell(ctx, ex, ey, w * 0.55, w * 0.55, hsl(METAL, -20), hsl(DARK, -10));
  ell(ctx, hx, hy, w * 0.78, w * 0.78, hsl(handCol || METAL, 0), hsl(DARK, -10), 2);
  return [hx, hy];
}

function eyes(ctx, expr, t, cx, cy, look) {
  const blink = (Math.sin(t * 1.3) > 0.985 || (t % 3.7) > 3.6) ? 0.15 : 1;
  const e = (x, w, h, o = {}) => {
    ctx.fillStyle = hsl(o.col || CYAN); rrect(ctx, x - w / 2 + (o.dx || 0) + look[0], cy - h / 2 + (o.dy || 0) + look[1], w, h, Math.min(w, h) / 2); ctx.fill();
  };
  glow(ctx, cx, cy, 70, CYAN, expr === 'off' ? 0.0 : 0.18);
  switch (expr) {
    case 'off': ctx.strokeStyle = hsl(CYAN, -30, 0.5); ctx.lineWidth = 4; ctx.lineCap = 'round'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * 17 - 8, cy + 3); ctx.lineTo(cx + s * 17 + 8, cy + 3); ctx.stroke(); } break;
    case 'sleep': ctx.strokeStyle = hsl(CYAN, -10, 0.8); ctx.lineWidth = 4; ctx.lineCap = 'round'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * 17, cy - 2, 8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); } break;
    case 'happy': ctx.strokeStyle = hsl(CYAN, 6); ctx.lineWidth = 5; ctx.lineCap = 'round'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * 17, cy + 5, 9, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(cx, cy + 17, 9, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); break;
    case 'surprise': for (const s of [-1, 1]) { ell(ctx, cx + s * 18 + look[0], cy + look[1], 12, 13 * (blink > 0.5 ? 1 : 0.3), hsl(CYAN, 10)); ell(ctx, cx + s * 18 + look[0], cy + look[1], 4, 4, hsl(FACE)); }
      ell(ctx, cx, cy + 20, 5, 7, null, hsl(CYAN), 3); break;
    case 'doubt': e(cx - 18, 16, 20 * blink); e(cx + 18, 16, 9 * blink, { dy: 4 });
      ctx.strokeStyle = hsl(CYAN); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 28, cy - 20); ctx.lineTo(cx - 8, cy - 25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 10, cy + 18); ctx.lineTo(cx + 30, cy + 15); ctx.stroke(); break;
    case 'think': e(cx - 18, 14, 18 * blink, { dy: -4 }); e(cx + 18, 14, 18 * blink, { dy: -4 });
      ctx.strokeStyle = hsl(CYAN); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 8, cy + 18); ctx.lineTo(cx + 12, cy + 18); ctx.stroke(); break;
    case 'focus': e(cx - 18, 18, 11 * blink); e(cx + 18, 18, 11 * blink);
      ctx.strokeStyle = hsl(CYAN); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 6, cy + 17); ctx.lineTo(cx + 6, cy + 17); ctx.stroke(); break;
    case 'error': ctx.strokeStyle = hsl([355, 95, 62]); ctx.lineWidth = 5; ctx.lineCap = 'round'; for (const s of [-1, 1]) { const x = cx + s * 18; ctx.beginPath(); ctx.moveTo(x - 8, cy - 8); ctx.lineTo(x + 8, cy + 8); ctx.moveTo(x + 8, cy - 8); ctx.lineTo(x - 8, cy + 8); ctx.stroke(); } break;
    default: e(cx - 18, 15, 20 * blink); e(cx + 18, 15, 20 * blink);
      ctx.strokeStyle = hsl(CYAN, 0, 0.9); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy + 12, 8, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  }
}

// R = {x,y,s,flip,t,stride,walk,pose,expr,hop,sit,items:[{color,name}],lit,phaseCol,carry,look}
function drawRobot(ctx, R) {
  const t = R.t; ctx.save(); ctx.translate(R.x, R.y);
  ell(ctx, 0, 2, (54 - R.hop * 0.15) * R.s, 15 * R.s, 'rgba(10,5,20,0.32)');
  ctx.scale(R.s * R.flip, R.s); ctx.translate(0, -R.hop);
  const ph = R.stride, w = R.walk;
  const bob = w ? -Math.abs(Math.sin(ph)) * 6 : Math.sin(t * 2.3) * 1.4;
  const sitDrop = R.sit ? 22 : 0;
  const sleepDrop = R.expr === 'off' ? 6 : 0;
  const by = bob + sitDrop;

  // ── mochila (detrás del cuerpo, asomando a un lado) ──
  {
    const px = -86, py = -156 + by + sleepDrop, pw = 56, phh = 134;
    ctx.save(); ctx.translate(0, 0);
    const swing = w ? Math.sin(ph) * 2 : 0;
    rrect(ctx, px, py, pw, phh, 14); ctx.fillStyle = hsl([200, 40, 36]); ctx.fill(); ctx.strokeStyle = hsl([200, 40, 14]); ctx.lineWidth = 3; ctx.stroke();
    rrect(ctx, px + 5, py + 6, pw - 10, 16, 6); ctx.fillStyle = hsl([200, 35, 44]); ctx.fill();               // tapa
    // ventana de cristal con bloques
    const wx = px + 8, wy = py + 28, ww = pw - 16, wh = phh - 38;
    rrect(ctx, wx, wy, ww, wh, 8); ctx.fillStyle = hsl([210, 50, 10], 0, 0.95); ctx.fill();
    const n = R.items.length, maxBlocks = 7, bh = Math.min(15, (wh - 8) / Math.max(n, 5) - 1.5);
    ctx.save(); rrect(ctx, wx, wy, ww, wh, 8); ctx.clip();
    for (let i = 0; i < n; i++) {
      const it = R.items[i]; const age = clamp((R.t - it.t0) / 0.5); const y = wy + wh - 4 - (i + 1) * (bh + 1.5) + (1 - age) * -30;
      const lit = R.lit === i;
      ctx.globalAlpha = age; rrect(ctx, wx + 4, y, ww - 8, bh, 4); ctx.fillStyle = hsl(it.color, lit ? 14 : 0); ctx.fill();
      ctx.strokeStyle = hsl(it.color, -28); ctx.lineWidth = 1.5; ctx.stroke();
      if (bh > 9) { ctx.save(); ctx.translate(wx + ww / 2, y + bh / 2 + 0.5); ctx.scale(R.flip, 1); label(ctx, it.name, 0, 0, Math.min(10, bh - 3), 'rgba(15,10,30,0.9)', { mono: true, weight: '700' }); ctx.restore(); }
      if (lit) glow(ctx, wx + ww / 2, y + bh / 2, 40, it.color, 0.7);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    const g = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh); g.addColorStop(0, 'rgba(255,255,255,0.25)'); g.addColorStop(0.3, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.06)');
    rrect(ctx, wx, wy, ww, wh, 8); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = hsl([200, 30, 62]); ctx.lineWidth = 2.5; ctx.stroke();
    // asa
    ctx.strokeStyle = hsl([200, 40, 22]); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px + pw - 4, py + 34); ctx.quadraticCurveTo(-18, py + 12 + swing, -22, -108 + by); ctx.stroke();
    if (n >= 1) glow(ctx, px + pw / 2, py + phh / 2, 56 + n * 6, R.packCol || [190, 90, 60], 0.12 + 0.03 * n);
    ctx.restore();
  }

  // ── brazo trasero (lado izquierdo local) ──
  const arms = armAngles(R, ph, w, t);
  const sy = -100 + by;
  // ── piernas ──
  const leg = (dx, phs) => {
    const swing = w ? Math.sin(ph + phs) * 15 : 0, lift = w ? Math.max(0, Math.cos(ph + phs)) * 7 : 0;
    ctx.fillStyle = hsl(DARK, 4); ctx.strokeStyle = hsl(DARK, -14); ctx.lineWidth = 3;
    if (R.sit) { rrect(ctx, dx - 8, -44 + by + 8, 16, 26, 6); ctx.fill(); ctx.stroke(); rrect(ctx, dx - 8 + 8, -24 + by + 20, 30, 14, 6); ctx.fill(); ctx.stroke(); return; }
    rrect(ctx, dx - 8 + swing * 0.3, -40 + by * 0.4, 16, 32, 6); ctx.fill(); ctx.stroke();
    rrect(ctx, dx - 15 + swing, -12 - lift, 30, 14, 7); ctx.fillStyle = hsl(ORANGE, -14); ctx.fill(); ctx.stroke();
  };
  leg(-17, 0); leg(17, Math.PI);

  // brazo izquierdo (local -x): detrás del cuerpo
  const hands = [];
  hands[0] = limb(ctx, -36, sy, arms.L[0], arms.L[1], -1, 26, 24, 12, ORANGE);

  // ── cuerpo ──
  const g = ctx.createLinearGradient(-34, 0, 34, 0); g.addColorStop(0, hsl(ORANGE, 8)); g.addColorStop(0.5, hsl(ORANGE, 14)); g.addColorStop(1, hsl(ORANGE, -12));
  rrect(ctx, -34, -112 + by, 68, 74, 18); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = hsl(DARK, -12); ctx.lineWidth = 3.5; ctx.stroke();
  rrect(ctx, -22, -98 + by, 44, 40, 10); ctx.fillStyle = hsl(FACE, 4); ctx.fill(); ctx.strokeStyle = hsl(ORANGE, -22); ctx.lineWidth = 2.5; ctx.stroke();
  // pantallita del pecho: latido que cambia de color con la fase
  const pc = R.phaseCol || CYAN; glow(ctx, 0, -78 + by, 34, pc, 0.45);
  ctx.strokeStyle = hsl(pc, 6); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let i = 0; i <= 20; i++) { const x = -16 + i * 1.6, ph2 = (i / 20 + t * 0.9) % 1; const y = -78 + by + (ph2 > 0.45 && ph2 < 0.55 ? -Math.sin((ph2 - 0.45) * 10 * Math.PI) * 11 : 0); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  ell(ctx, -22, -46 + by, 3.5, 3.5, hsl([140, 90, 55])); ell(ctx, 0, -46 + by, 3.5, 3.5, hsl([40, 95, 58], 0, 0.5 + 0.5 * Math.sin(t * 4))); ell(ctx, 22, -46 + by, 3.5, 3.5, hsl([350, 90, 60]));

  // ── objeto cargado (engranaje roto / reparado) ──
  if (R.carry) {
    const cx = 0, cy = -60 + by;
    ctx.save(); ctx.translate(cx, cy + 6); ctx.scale(R.flip, 1); ctx.rotate(Math.sin(t * 3) * 0.1);
    require('./gfx').gear(ctx, 0, 0, 20, 8, t * (R.carry === 'fixed' ? 2 : 0), R.carry === 'fixed' ? [140, 70, 50] : [355, 50, 45]);
    if (R.carry === 'broken') { ctx.strokeStyle = 'rgba(10,5,10,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, -18); ctx.lineTo(2, -6); ctx.lineTo(-3, 2); ctx.lineTo(4, 14); ctx.stroke(); }
    else glow(ctx, 0, 0, 40, [140, 90, 60], 0.5);
    ctx.restore();
  }

  // brazo derecho (local +x) delante
  hands[1] = limb(ctx, 36, sy, arms.R[0], arms.R[1], 1, 26, 24, 12, ORANGE);

  // ── cabeza ──
  const hy = -176 + by + (R.expr === 'off' || R.expr === 'sleep' ? 10 : 0), tilt = R.expr === 'doubt' ? -0.1 : R.expr === 'off' ? 0.12 : Math.sin(t * 1.7) * 0.012;
  ctx.save(); ctx.translate(0, hy + 30); ctx.rotate(tilt); ctx.translate(0, -(hy + 30));
  // cuello
  ctx.fillStyle = hsl(DARK, 6); rrect(ctx, -10, hy + 52, 20, 14, 4); ctx.fill();
  // antena
  ctx.strokeStyle = hsl(METAL, -20); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, hy); ctx.quadraticCurveTo(4, hy - 14, 0, hy - 22 + (R.expr === 'surprise' ? -6 : 0)); ctx.stroke();
  const ac = R.phaseCol || [45, 95, 58]; const aPulse = 0.7 + 0.3 * Math.sin(t * 6);
  glow(ctx, 0, hy - 26, 34, ac, 0.8 * aPulse); ell(ctx, 0, hy - 26, 7, 7, hsl(ac, 8), hsl(ac, -30), 2);
  const hg = ctx.createLinearGradient(-44, 0, 44, 0); hg.addColorStop(0, hsl(METAL, 4)); hg.addColorStop(0.45, hsl(METAL, 14)); hg.addColorStop(1, hsl(METAL, -14));
  rrect(ctx, -46, hy, 92, 66, 22); ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = hsl(METAL, -48); ctx.lineWidth = 3.5; ctx.stroke();
  ell(ctx, -50, hy + 33, 6, 14, hsl(ORANGE), hsl(DARK, -10), 2); ell(ctx, 50, hy + 33, 6, 14, hsl(ORANGE), hsl(DARK, -10), 2);
  rrect(ctx, -37, hy + 8, 74, 50, 14); ctx.fillStyle = hsl(FACE); ctx.fill(); ctx.strokeStyle = hsl(FACE, 16); ctx.lineWidth = 2; ctx.stroke();
  eyes(ctx, R.expr, t, 0, hy + 31, R.look || [0, 0]);
  ctx.restore();

  // sombrero de ayuda: "z z z" al dormir
  if (R.expr === 'sleep' || R.expr === 'off') { ctx.save(); ctx.scale(R.flip, 1); for (let i = 0; i < 3; i++) { const u = ((t * 0.5 + i / 3) % 1); ctx.globalAlpha = Math.sin(u * Math.PI); label(ctx, 'z', 40 + u * 24 + i * 4, hy - 20 - u * 46, 16 + i * 6, 'rgba(255,255,255,0.9)', { weight: '800' }); } ctx.restore(); }
  ctx.restore();
  return { hands, packPos: [R.x + (-58) * R.s * R.flip, R.y - (95 - by) * R.s], headPos: [R.x, R.y - (176 - by + 20) * R.s] };
}

function armAngles(R, ph, w, t) {
  const sw = Math.sin(ph) * 0.55;
  switch (R.pose) {
    case 'walk': return { L: [0.25 + sw, 0.2], R: [0.25 - sw, 0.2] };
    case 'think': return { L: [0.15, 0.05], R: [2.45, -2.6 + Math.sin(t * 5) * 0.12] };
    case 'work': return { L: [0.75 + 0.18 * Math.sin(t * 8), -1.5], R: [0.75 + 0.18 * Math.sin(t * 8 + 2), -1.5] };
    case 'hammer': return { L: [0.75, -1.5], R: [2.2 + 0.9 * Math.max(0, Math.sin(t * 9)), -0.4 - 1.0 * Math.max(0, Math.sin(t * 9))] };
    case 'pull': return { L: [0.2, 0.1], R: [2.0 + 0.5 * Math.sin(t * 3), -0.6] };
    case 'surprise': return { L: [2.5 + 0.08 * Math.sin(t * 28), 0.25], R: [2.5 + 0.08 * Math.sin(t * 28 + 1), 0.25] };
    case 'celebrate': return { L: [2.75 + 0.35 * Math.sin(t * 11), 0.2], R: [2.75 + 0.35 * Math.sin(t * 11 + 2), 0.2] };
    case 'carry': return { L: [0.95, -1.4], R: [0.95, -1.4] };
    case 'sit': return { L: [0.5, -1.3], R: [0.5, -1.3] };
    case 'read': return { L: [0.85, -1.55], R: [0.85, -1.55] };
    case 'sleep': return { L: [0.1, 0.1], R: [0.1, 0.1] };
    default: return { L: [0.14 + 0.03 * Math.sin(t * 2), 0.05], R: [0.14 + 0.03 * Math.sin(t * 2 + 1), 0.05] };
  }
}

module.exports = { drawRobot };
