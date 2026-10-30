// drawScene(ctx, W, H, t, tl): composición de un frame. Todo es función pura del tiempo y de la timeline.
'use strict';
const { createCanvas } = require('@napi-rs/canvas');
const G = require('./gfx');
const { A, B, C, P, clamp, lerp, ease, easeOut, easeBack, hsl, rnd, poly, glow, rrect, ell, gear, label } = G;
const TL = require('./timeline');
const { STATIONS, DOCK, TRAY, CHAIR, CENTER } = TL;
const Wd = require('./world');
const { drawRobot } = require('./robot');

const MACHINE_PT = { LEER: [0.95, 8.0, 1.6], ESCRIBIR: [9.4, 1.7, 1.3], EDITAR: [5.95, 6.0, 1.1], EJECUTAR: [3.5, 1.55, 1.3], BUSCAR: [0.7, 3.4, 1.6], CONECTAR: [10.0, 8.6, 2.6] };
const ROBOT_S = 0.8;
const PHASE_COL = { pensar: [42, 100, 60], actuar: [186, 100, 62], observar: [112, 85, 58], loop: [300, 90, 70] };
const miniCache = { c: null };

// ───────── estado derivado ─────────
function makeState(tl, t, opts) {
  const S = { t, tl, depth: opts.depth || 0, stCache: {}, angCache: tl._ang || (tl._ang = {}) };
  const segs = tl.segs;
  S.seg = segs.find((s) => t >= s.t0 && t < s.t1) || segs[segs.length - 1];
  S.st = (name) => {
    if (S.stCache[name]) return S.stCache[name];
    const r = { name, act: actEnv(tl, name, t), lt: 0, jam: false, jamT: 99, restartT: 99 };
    for (const s of segs) if (s.station === name && (s.type === 'act' || s.type === 'fix-act') && t >= s.t0 && t < s.t1) r.lt = t - s.t0;
    for (const s of segs) if (s.type === 'jam' && s.station === name && t >= s.t0) {
      const rs = tl.events.find((e) => e.type === 'restart' && e.station === name && e.t > s.t0);
      if (!rs || t < rs.t) { r.jam = true; r.jamT = t - s.t0; } else r.restartT = t - rs.t;
    }
    return (S.stCache[name] = r);
  };
  S.ang = (name, base, gain) => {
    const key = name + base + gain; let tab = S.angCache[key];
    if (!tab) {
      const n = Math.ceil((tl.duration + 2) * 60); tab = S.angCache[key] = new Float32Array(n + 2); let a = 0;
      for (let k = 1; k <= n + 1; k++) { const tt = k / 60; const jam = jamAt(tl, name, tt); a += (jam ? 0 : base + gain * actEnv(tl, name, tt)) / 60; tab[k] = a; }
    }
    const f = Math.max(0, t) * 60, i = Math.floor(f); return tab[i] + (tab[i + 1] - tab[i]) * (f - i) + (jamAt(tl, name, t) ? Math.sin(t * 50) * 0.04 : 0);
  };
  S.gearAng = (name) => S.ang(name, 0.5, 3.5);
  S.leverPull = () => { const ev = tl.events.filter((e) => e.type === 'lever').pop(); const e = tl.events.find((e) => e.type === 'lever' && t >= e.t - 0.2 && t < e.t + 1.4); if (!e) return 0; const u = (t - e.t + 0.2) / 1.6; return u < 0.35 ? ease(u / 0.35) : 1 - ease((u - 0.35) / 0.65); };
  S.pulse = (type, dur, st) => {
    let m = 0;
    for (const e of tl.events) { if (e.type !== type || (st && e.station && e.station !== st.name)) continue; const u = (t - e.t); if (u > -0.12 && u < dur) m = Math.max(m, u < 0 ? 1 + u / 0.12 * 0 + (u + 0.12) / 0.12 - 1 : 1 - u / dur); }
    return clamp(m);
  };
  S.pressCount = () => tl.events.filter((e) => e.type === 'press' && e.t < t).length;
  S.hadError = false; S.fixProgress = 1;
  S.catAwake = t > tl.fin + 2.0 && t < tl.fin + 4.0 || t > tl.duration - 0.1;
  S.screenOn = clamp((t - 2) / 2);
  return S;
}
function actEnv(tl, name, t) {
  let v = 0;
  for (const s of tl.segs) {
    if (s.station !== name) continue;
    if (s.type === 'act' || s.type === 'fix-act') { const inn = clamp((t - s.t0) / 0.25), out = clamp((s.t1 + 0.7 - t) / 0.9); if (t >= s.t0) v = Math.max(v, Math.min(inn, out)); }
    else if (s.type === 'insert') { if (t >= s.t0 && t < s.t1 + 0.5) v = Math.max(v, 0.8); }
  }
  return v;
}
function jamAt(tl, name, t) {
  for (const s of tl.segs) if (s.type === 'jam' && s.station === name && t >= s.t0) { const rs = tl.events.find((e) => e.type === 'restart' && e.station === name && e.t > s.t0); if (!rs || t < rs.t) return true; }
  return false;
}

// ───────── estado del robot ─────────
function robotState(tl, t, S) {
  const pos = TL.robotPos(tl, t); const seg = S.seg; const lt = t - seg.t0;
  let pose = 'idle', expr = 'neutral', hop = 0, sit = false, carry = null, look = [0, 0];
  const ev = (type, win = 0.4) => tl.events.some((e) => e.type === type && t >= e.t && t < e.t + win);
  const hopEv = G.clamp(Math.max(...tl.events.filter((e) => (e.type === 'hop' || e.type === 'surprise') && t >= e.t && t < e.t + 0.45).map((e) => Math.sin((t - e.t) / 0.45 * Math.PI)), 0)) * 30;
  const lastJam = [...tl.segs].reverse().find((s) => s.type === 'jam' && t >= s.t0 + 1.2);
  const repairEv = tl.events.find((e) => e.type === 'repair'), wrenchEv = tl.events.find((e) => e.type === 'wrench');
  if (lastJam) {
    const rep = tl.events.find((e) => e.type === 'repair' && e.t > lastJam.t0); const wr = tl.events.find((e) => e.type === 'wrench' && e.t > lastJam.t0);
    if (!rep || t < rep.t) carry = 'broken'; else if (!wr || t < wr.t) carry = 'fixed';
  }
  switch (seg.type) {
    case 'task': expr = t < 1.9 ? 'off' : t < 2.1 ? 'surprise' : 'neutral'; pose = t < 1.9 ? 'sleep' : 'walk'; if (t >= 2.1 && t < 3.1) pose = 'walk'; else if (t >= 3.1) pose = 'read'; break;
    case 'plan': expr = lt < 1.5 ? 'doubt' : lt < 2.7 ? 'think' : 'happy'; pose = lt < 2.7 ? 'think' : 'idle'; if (lt >= 2.7) hop = Math.abs(Math.sin((lt - 2.7) * 9)) * 14 * (lt < 3.0 ? 1 : 0); break;
    case 'think': expr = 'think'; pose = 'think'; break;
    case 'walk': expr = 'neutral'; pose = 'walk'; break;
    case 'act': case 'fix-act': {
      expr = 'focus'; const s = seg.station;
      pose = s === 'LEER' ? 'read' : s === 'EDITAR' ? 'hammer' : s === 'EJECUTAR' ? (lt > 0.7 && lt < 1.9 ? 'pull' : 'work') : 'work';
      if (seg.type === 'fix-act' && lt > 1.9) { expr = 'happy'; pose = 'idle'; carry = 'fixed'; }
      if (seg.type === 'fix-act' && seg.station === 'EDITAR' && lt >= 0.3 && lt < 2.0) carry = null; // el engranaje está sobre el yunque
      break; }
    case 'observe': expr = lt < 1.1 ? 'neutral' : 'happy'; pose = lt < 0.5 ? 'work' : 'read'; look = [Math.sin(lt * 2) * 2, -2]; break;
    case 'jam': expr = lt < 0.25 ? 'focus' : lt < 1.2 ? 'surprise' : 'doubt'; pose = lt < 0.25 ? 'work' : lt < 1.2 ? 'surprise' : 'read'; break;
    case 'insert': expr = lt < 0.8 ? 'focus' : 'happy'; pose = lt < 0.8 ? 'work' : 'idle'; break;
    case 'context': expr = 'happy'; pose = 'idle'; break;
    case 'repeat': expr = 'neutral'; pose = 'walk'; break;
    case 'celebrate': expr = 'happy'; pose = 'celebrate'; break;
    case 'tochair': expr = 'happy'; pose = 'walk'; break;
    case 'sit': expr = 'happy'; pose = 'sit'; sit = true; break;
    case 'rest': expr = lt < 2.6 ? 'happy' : 'sleep'; pose = 'sit'; sit = true; break;
  }
  if (carry && (pose === 'idle' || pose === 'walk')) { if (pose === 'idle') pose = 'carry'; else pose = 'carry'; }
  if (carry && pose === 'read') pose = 'carry';
  // orientación: caminando, hacia el avance; parado, hacia su estación
  let flip;
  if (pos.walking) flip = Math.sign(pos.dir[0] - pos.dir[1]) || 1;
  else {
    const stn = seg.station && STATIONS[seg.station]; let dx;
    if (stn && ['think', 'act', 'fix-act', 'observe', 'jam', 'insert'].includes(seg.type)) { const f = MACHINE_PT[seg.station]; dx = (f[0] - f[1]) - (pos.x - pos.y); }
    else if (seg.type === 'plan' || seg.type === 'task') dx = 1;
    else if (seg.type === 'sit' || seg.type === 'rest') dx = -1;
    else dx = Math.sign(pos.dir[0] - pos.dir[1]);
    flip = Math.abs(dx) < 0.25 ? (S._lastFlip || 1) : Math.sign(dx);
  }
  S._lastFlip = flip;
  let stride = 0;
  if (pos.walking) { const m = tl.moves.find((m) => t >= m.t0 && t < m.t1); const u = (t - m.t0) / (m.t1 - m.t0); stride = u * m.n * Math.PI; }
  const sx = P(pos.x, pos.y, sit ? 0.18 : 0);
  const phase = tl.phases.filter((p) => t >= p.t0 && t < p.t1).pop();
  const ph = phase && phase.phase;
  let phaseCol = ph ? PHASE_COL[ph] : null;
  if (seg.type === 'jam' && lt < 1.6) phaseCol = [355, 95, 60];
  if (seg.type === 'celebrate' || seg.type === 'rest' || seg.type === 'sit') phaseCol = [130, 90, 60];
  if (expr === 'off') phaseCol = [0, 0, 30];
  return { x: sx[0], y: sx[1], wx: pos.x, wy: pos.y, flip, stride, walk: pos.walking, pose, expr, hop: Math.max(hopEv, hop), sit, carry, phaseCol, look };
}

// ───────── iconos de estaciones ─────────
function icon(ctx, kind, x, y, r, col, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = hsl(col, 6); ctx.fillStyle = hsl(col, 6); ctx.lineWidth = r * 0.16;
  switch (kind) {
    case 'LEER': ctx.beginPath(); ctx.moveTo(0, -r * 0.55); ctx.quadraticCurveTo(-r * 0.5, -r * 0.8, -r, -r * 0.55); ctx.lineTo(-r, r * 0.6); ctx.quadraticCurveTo(-r * 0.5, r * 0.35, 0, r * 0.6); ctx.quadraticCurveTo(r * 0.5, r * 0.35, r, r * 0.6); ctx.lineTo(r, -r * 0.55); ctx.quadraticCurveTo(r * 0.5, -r * 0.8, 0, -r * 0.55); ctx.moveTo(0, -r * 0.55); ctx.lineTo(0, r * 0.6); ctx.stroke(); break;
    case 'ESCRIBIR': ctx.strokeRect(-r * 0.7, -r * 0.9, r * 1.4, r * 1.2); ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.5); ctx.lineTo(r * 0.4, -r * 0.5); ctx.moveTo(-r * 0.4, -r * 0.15); ctx.lineTo(r * 0.4, -r * 0.15); ctx.moveTo(-r * 0.9, r * 0.7); ctx.lineTo(r * 0.9, r * 0.7); ctx.stroke(); break;
    case 'EDITAR': ctx.beginPath(); ctx.moveTo(-r * 0.9, r * 0.9); ctx.lineTo(r * 0.5, -r * 0.5); ctx.stroke(); ctx.fillRect(r * 0.1 - r * 0.2, -r * 0.95, r * 0.9, r * 0.5); break;
    case 'EJECUTAR': gear(ctx, 0, 0, r * 0.95, 8, t, col, 0.3); break;
    case 'BUSCAR': ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.9 * Math.cos(t * 2), r * 0.9 * Math.sin(t * 2)); ctx.stroke(); break;
    case 'CONECTAR': for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(0, r * 0.7, r * 0.45 * i, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, r * 0.7, r * 0.12, 0, 7); ctx.fill(); break;
    case 'TAREA': ctx.beginPath(); ctx.rect(-r * 0.9, -r * 0.65, r * 1.8, r * 1.3); ctx.moveTo(-r * 0.9, -r * 0.65); ctx.lineTo(0, r * 0.1); ctx.lineTo(r * 0.9, -r * 0.65); ctx.stroke(); break;
  }
  ctx.restore();
}
function bubble(ctx, cx, cy, w, h, tailX, tailY, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(255,250,240,0.96)'; ctx.strokeStyle = 'rgba(60,35,70,0.9)'; ctx.lineWidth = 4;
  rrect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2.4); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 3; i++) { const u = (i + 1) / 4; const x = lerp(tailX, cx - w / 2 + 30, u), y = lerp(tailY, cy + h / 2, u); ell(ctx, x, y, 5 + i * 3.5, 5 + i * 3.5, 'rgba(255,250,240,0.96)', 'rgba(60,35,70,0.9)', 3); }
  ctx.restore();
}
function ticket(ctx, x, y, text, col, scale, alpha, head, kind) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
  ctx.font = "700 17px Consolas, monospace"; const w = Math.max(160, ctx.measureText(text).width + 62), h = 56;
  glow(ctx, 0, 0, 120, col, 0.35);
  ctx.fillStyle = 'rgba(255,250,236,0.98)'; ctx.strokeStyle = hsl(col, -22); ctx.lineWidth = 3.5; rrect(ctx, -w / 2, -h / 2, w, h, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = hsl(col); rrect(ctx, -w / 2, -h / 2, w, 17, 9); ctx.fill(); ctx.fillRect(-w / 2, -h / 2 + 8, w, 9);
  label(ctx, head, 0, -h / 2 + 8.5, 11, '#101020', { mono: true, weight: '800' });
  const ix = -w / 2 + 24; ell(ctx, ix, 9, 11, 11, kind === 'error' ? hsl([355, 90, 55]) : hsl([140, 70, 42]));
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  if (kind === 'error') { ctx.moveTo(ix - 5, 4); ctx.lineTo(ix + 5, 14); ctx.moveTo(ix + 5, 4); ctx.lineTo(ix - 5, 14); } else { ctx.moveTo(ix - 5, 9); ctx.lineTo(ix - 1, 13); ctx.lineTo(ix + 6, 5); }
  ctx.stroke();
  label(ctx, text, 14, 8, 17, '#2a1a30', { mono: true, weight: '700' });
  ctx.restore();
}

// ───────── partículas sin estado ─────────
function particles(ctx, S, rob) {
  const t = S.t, tl = S.tl;
  for (const e of tl.events) {
    const dt = t - e.t;
    if (e.type === 'spark' || e.type === 'hammer') {
      if (dt < 0 || dt > 0.9) continue;
      const jamSeg = [...tl.segs].reverse().find((s) => s.type === 'jam' && s.t0 <= e.t + 0.01);
      const stn = e.type === 'hammer' ? 'EDITAR' : (jamSeg ? jamSeg.station : 'EJECUTAR'); const mp = e.type === 'hammer' ? [5.95, 6.0, 1.05] : MACHINE_PT[stn];
      const [ox, oy] = P(...mp); const n = e.type === 'hammer' ? 10 : 30;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (rnd(i * 3 + e.t * 7) - 0.5) * 3.2, v = 140 + rnd(i + e.t * 13) * 280 * (e.type === 'hammer' ? 0.5 : 1);
        const x = ox + Math.cos(a) * v * dt, y = oy + Math.sin(a) * v * dt + 520 * dt * dt, life = 1 - dt / 0.9;
        ctx.strokeStyle = `hsla(${38 + rnd(i) * 20},100%,${60 + rnd(i + 5) * 30}%,${life})`; ctx.lineWidth = 3 * life + 0.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * 9 * life, y - (Math.sin(a) * 9 + 520 * dt * 0.02) * life); ctx.stroke();
      }
      ctx.restore();
    } else if (e.type === 'steam') {
      if (dt < 0 || dt > 2.2) continue;
      const [ox, oy] = P(3.45, 0.45, 3.6);
      for (let i = 0; i < 9; i++) { const d = dt - i * 0.12; if (d < 0) continue; const u = d / 1.6; if (u > 1) continue; ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - u)})`; const r = 14 + u * 34; ell(ctx, ox + Math.sin(i * 2 + d * 3) * 12 + u * 30, oy - u * 130, r, r * 0.85, ctx.fillStyle); }
    } else if (e.type === 'ping') {
      if (dt < 0 || dt > 1.4) continue;
      const [ox, oy] = P(0.7, 3.4, 0.05); const u = dt / 1.4; ctx.strokeStyle = hsl([95, 85, 60], 8, 1 - u); ctx.lineWidth = 4 * (1 - u) + 1; ctx.beginPath(); ctx.ellipse(ox, oy, 40 + u * 260, 20 + u * 130, 0, 0, 7); ctx.stroke();
    } else if (e.type === 'confetti') {
      if (dt < 0 || dt > 4) continue;
      const base = e.t < tl.fin + 0.3 ? 0 : 1;
      for (let i = 0; i < 60; i++) {
        const x0 = (rnd(i + base * 99) - 0.5) * 700, spd = 150 + rnd(i * 2) * 120; const ox = rob.x + x0, oy = rob.y - 700;
        const y = oy + dt * spd * 1.5 + 80 * dt * dt - 0, x = ox + Math.sin(dt * 3 + i) * 30;
        if (y > rob.y + 60) continue; ctx.save(); ctx.translate(x, y); ctx.rotate(dt * 4 + i); ctx.fillStyle = hsl([[340, 90, 62], [45, 95, 60], [185, 90, 58], [110, 80, 55], [280, 80, 66]][i % 5]); ctx.scale(1, Math.cos(dt * 6 + i)); ctx.fillRect(-5, -3, 10, 6); ctx.restore();
      }
    }
  }
  // humo negro durante el atasco
  for (const s of tl.segs) if (s.type === 'jam' && t >= s.t0) {
    const rs = tl.events.find((e) => e.type === 'restart' && e.station === s.station && e.t > s.t0);
    if (rs && t > rs.t + 1) continue; const [ox, oy] = P(...MACHINE_PT[s.station]);
    const on = t < (rs ? rs.t : 1e9);
    for (let i = 0; i < 8; i++) { const u = (((t - s.t0) * 0.5 + i / 8) % 1); if (!on && u > 0.5) continue; ctx.fillStyle = `rgba(30,25,35,${0.55 * (1 - u)})`; ell(ctx, ox + Math.sin(i * 3 + u * 5) * 18 + u * 20, oy - 30 - u * 120, 12 + u * 30, 10 + u * 24, ctx.fillStyle); }
  }
  // vapor suave continuo de la sala de máquinas cuando trabaja
  const b = S.st('EJECUTAR'); if (b.act > 0.05 && !b.jam) { const [ox, oy] = P(3.45, 0.45, 3.6); for (let i = 0; i < 6; i++) { const u = ((t * 0.6 + i / 6) % 1); ctx.fillStyle = `rgba(255,255,255,${0.4 * (1 - u) * b.act})`; ell(ctx, ox + u * 26, oy - u * 110, 10 + u * 28, 9 + u * 22, ctx.fillStyle); } }
}

// ───────── escena principal ─────────
function drawScene(ctx, W, H, t, tl, opts = {}) {
  const S = makeState(tl, t, opts);
  const depth = opts.depth || 0;
  const k = W / 1920;
  Wd.drawBackdrop(ctx, W, H, t);
  const [wx, wy, wz, zoom] = TL.cameraAt(tl, t);
  const [cx, cy] = P(wx, wy, wz);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom * k, zoom * k); ctx.translate(-cx, -cy);

  Wd.drawFloor(ctx); Wd.drawWalls(ctx, t); Wd.wallDecor(ctx, S); Wd.stringLights(ctx, S);
  // base de carga
  { const [dx, dy] = P(DOCK[0], DOCK[1], 0); const awake = t > 1.9; ell(ctx, dx, dy, 56, 28, hsl([220, 20, 22]), hsl([220, 20, 10]), 3); ell(ctx, dx, dy, 40, 20, null, hsl([186, 100, 60], 0, awake ? 0.3 : 0.9 + 0.1 * Math.sin(t * 5)), 4); if (!awake) glow(ctx, dx, dy, 90, [186, 100, 60], 0.25); }

  const rob = robotState(tl, t, S);
  const objs = [];
  const add = (d, f) => objs.push({ d, f });
  add(0.6, () => Wd.taskTube(ctx, S));
  add(4.3, () => { Wd.fShadow(ctx, 1.9, 0.1, 3.2, 1.4); Wd.boiler(ctx, S); });
  add(4.35, () => Wd.sign(ctx, S, 'EJECUTAR', 3.5, 0.6, 4.05, STATIONS));
  add(10.45, () => Wd.sign(ctx, S, 'ESCRIBIR', 9.4, 0.8, 3.75, STATIONS));
  add(9.05, () => Wd.sign(ctx, S, 'LEER', 0.9, 8.0, 3.95, STATIONS));
  add(4.15, () => Wd.sign(ctx, S, 'BUSCAR', 0.9, 3.6, 3.95, STATIONS));
  add(12.95, () => Wd.sign(ctx, S, 'EDITAR', 4.7, 6.7, 2.1, STATIONS));
  add(18.45, () => Wd.sign(ctx, S, 'CONECTAR', 9.7, 8.6, 3.05, STATIONS));
  add(10.4, () => { Wd.fShadow(ctx, 8.3, 0.25, 2.3, 1.5); Wd.press(ctx, S); });
  add(9.0, () => Wd.library(ctx, S));
  add(4.1, () => Wd.radar(ctx, S));
  add(12.9, () => { Wd.fShadow(ctx, 5.5, 5.5, 2.6, 1.2, 0.22); Wd.bench(ctx, S); }); add(12.95, () => Wd.hammerProp(ctx, S));
  add(18.4, () => Wd.antenna(ctx, S));
  add(6.6, () => { Wd.consoleDesk(ctx, S); Wd.monitor(ctx, S, (c, sw, sh) => drawMonitor(c, sw, sh, S, depth, tl)); });
  add(13.2, () => Wd.cat(ctx, S));
  add(15.6, () => Wd.plant(ctx, S, 10.3, 5.5, 1.1)); add(11.8, () => Wd.plant(ctx, S, 1.4, 10.3, 1.0));
  add(9.6, () => Wd.armchair(ctx, S)); add(14.9, () => Wd.crates(ctx, S));
  // robot (más adelante que el sillón si está sentado)
  const rd = rob.wx + rob.wy + (rob.sit ? 1.2 : 0.02);
  add(rd, () => {
    const items = packItems(tl, t); let lit = -1;
    if (S.seg.type === 'context') { const lt = t - S.seg.t0; lit = Math.floor((lt - 0.9) / (2.0 / Math.max(1, items.length))); if (lt < 0.9) lit = -1; }
    const info = drawRobot(ctx, { ...rob, s: ROBOT_S, t, hop: rob.hop, items, lit, packCol: PHASE_COL.actuar });
    rob.info = info;
  });
  objs.sort((a, b) => a.d - b.d); for (const o of objs) o.f();

  // capa superior en mundo
  Wd.fallingPapers(ctx, S); particles(ctx, S, rob);
  overlays(ctx, S, rob, tl, t);
  ctx.restore();

  if (opts.hud !== false && depth === 0) hud(ctx, W, H, t, tl, S);
  else if (depth > 0) { /* miniatura: sin HUD */ }
}

function packItems(tl, t) { return tl.items.filter((i) => i.t <= t + 0.0001).map((i) => ({ color: i.color, name: i.name, t0: i.t })); }

// tickets, burbujas, cápsula y carta
function overlays(ctx, S, rob, tl, t) {
  const seg = S.seg, lt = t - seg.t0;
  const head = [rob.x, rob.y - 245 * ROBOT_S - 20];
  const packPos = [rob.x + (-58) * ROBOT_S * rob.flip, rob.y - 98 * ROBOT_S];
  // cápsula y carta de tarea
  { const [tx, ty] = P(0.62, 0.62, 0.22);
    if (t >= 0.45 && t < 1.4) { const u = clamp((t - 0.55) / 0.8); const z = lerp(6.5, 0.4, u * u); const [x, y] = P(0.5, 0.5, z); capsule(ctx, x, y, 1, 0); if (u < 0.99) { ctx.strokeStyle = 'rgba(160,240,255,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x, y - 160 * u - 60); ctx.stroke(); } }
    else if (t >= 1.4 && t < 1.75) { const u = (t - 1.4) / 0.35; const [x, y] = P(0.5, 0.5, 0.4); capsule(ctx, x + 2, y + 8 - Math.sin(u * Math.PI) * 14, 1, u); }
    if (t >= 1.75 && t < 2.45) { const [x, y] = P(0.5, 0.5, 0.4); capsule(ctx, x + 2, y + 8, 1, 1); }
    // carta: sale, se despliega y vuela hasta flotar junto al robot durante la planificación
    if (t >= 1.85) {
      const startP = P(0.5, 0.5, 0.6); const u1 = easeOut(clamp((t - 1.85) / 0.7)); const hover = [rob.x - 250, head[1] - 20];
      let x = startP[0], y = startP[1] - 60 * u1; let sc = 0.4 + 0.6 * u1;
      const fly = clamp((t - 2.7) / 0.7);
      if (fly > 0) { x = lerp(x, hover[0], ease(fly)); y = lerp(y, hover[1], ease(fly)); sc *= 1 - 0.38 * ease(fly); }
      let a = 1;
      const end = tl.items[0] ? tl.items[0].t : 6.2;
      if (t >= end - 0.5) { const f = clamp((t - (end - 0.5)) / 0.5); x = lerp(x, packPos[0], ease(f)); y = lerp(y, packPos[1], ease(f)); sc *= (1 - 0.7 * ease(f)); }
      if (t < end) letter(ctx, x, y, sc, tl.task, t);
    }
  }
  // plan
  if (seg.type === 'plan') {
    const u = easeBack(clamp(lt / 0.5)); const stns = tl.beats.map((b) => b.station);
    const w = 60 + stns.length * 78, h = 112; const bx = rob.x + 200, by = head[1] - 40;
    ctx.save(); ctx.translate(bx, by); ctx.scale(u, u); ctx.translate(-bx, -by);
    bubble(ctx, bx, by, w, h, rob.x + 30, head[1] + 70);
    stns.forEach((s, i) => { const a = easeBack(clamp((lt - 0.9 - i * 0.28) / 0.35)); const ix = bx - w / 2 + 48 + i * 78; ctx.save(); ctx.translate(ix, by - 8); ctx.scale(a, a); icon(ctx, s, 0, 0, 22, STATIONS[s].color.map((v, j) => (j === 2 ? 36 : v)), t); label(ctx, STATIONS[s].es.toLowerCase(), 0, 38, 12, 'rgba(60,35,80,0.95)', { mono: true, weight: '700' }); ctx.restore();
      if (i < stns.length - 1) { ctx.fillStyle = 'rgba(70,40,90,0.7)'; ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(ix + 40, by - 14); ctx.lineTo(ix + 49, by - 8); ctx.lineTo(ix + 40, by - 2); ctx.fill(); ctx.globalAlpha = 1; } });
    if (lt < 1.0) label(ctx, '?', bx, by, 56, 'rgba(70,40,90,0.9)', { weight: '800' });
    ctx.restore();
  }
  if (seg.type === 'think' || (seg.type === 'walk' && lt < 0.4 && !seg.carry)) {
    const b = seg.b; const l2 = seg.type === 'think' ? lt : DUR_THINK_FAKE + lt;
    const u = seg.type === 'think' ? easeBack(clamp(lt / 0.3)) : 1 - clamp(lt / 0.4); const bx = rob.x + 90, by = head[1] - 10;
    if (u > 0.01) { ctx.save(); ctx.translate(bx, by); ctx.scale(u, u); ctx.translate(-bx, -by); bubble(ctx, bx, by, 100, 78, rob.x + 20, head[1] + 60); icon(ctx, b.station, bx, by, 24, [270, 50, 30], t); ctx.restore(); }
  }
  // signos de duda / sorpresa
  if (seg.type === 'plan' && lt < 1.5) { const a = easeBack(clamp(lt / 0.3)); ctx.save(); ctx.translate(head[0] - 70, head[1] + 20); ctx.rotate(-0.2); ctx.scale(a, a); label(ctx, '?', 0, 0, 62, '#ffd24a', { weight: '900', shadow: 'rgba(40,10,50,.9)' }); ctx.restore(); }
  if (seg.type === 'jam' && lt > 0.25 && lt < 1.3) { const a = easeBack(clamp((lt - 0.25) / 0.2)); ctx.save(); ctx.translate(head[0] + 30, head[1]); ctx.scale(a, a); label(ctx, '!', 0, 0, 78, '#ff4d5e', { weight: '900', shadow: 'rgba(40,10,50,.9)' }); ctx.restore(); }
  // tickets de resultado → mochila
  tl.items.forEach((it, idx) => {
    if (it.kind === 'task') return;
    const hov = it.hover || 1.75; const t0 = it.t - hov - 0.45; if (t < t0 || t > it.t + 0.02) return;
    const u = t - t0; const hoverIn = easeBack(clamp(u / 0.3)); const flyU = clamp((u - hov) / 0.45);
    const b = it.beat; const text = it.kind === 'error' ? clip(b.errorText, 24) : clip(b.label, 24);
    const hx = head[0] + 4 * rob.flip, hy = head[1] - 30 + Math.sin(t * 4) * 3;
    const x = lerp(hx, packPos[0], ease(flyU)), y = lerp(hy, packPos[1], ease(flyU)), sc = (1 - 0.65 * ease(flyU)) * hoverIn;
    ticket(ctx, x, y, text, it.color, sc * 0.95, 1 - 0.3 * ease(flyU), it.kind === 'error' ? 'ERROR' : it.kind === 'fix' ? 'ARREGLO · ' + b.tool : 'RESULTADO · ' + b.tool, it.kind);
    // destello al entrar en la mochila
    if (flyU >= 1) glow(ctx, packPos[0], packPos[1], 80, it.color, 0.8);
  });
  for (const it of tl.items) { const d = t - it.t; if (d >= 0 && d < 0.5) glow(ctx, packPos[0], packPos[1], 60 + d * 140, it.color, 0.8 * (1 - d / 0.5)); }
  // engranaje roto que sale disparado de la máquina atascada hacia el robot
  { const jam = [...tl.segs].reverse().find((s) => s.type === 'jam' && t >= s.t0 + 1.0 && t < s.t0 + 1.5);
    if (jam) { const u = ease((t - jam.t0 - 1.0) / 0.5); const [mx, my] = P(...MACHINE_PT[jam.station]); const x = lerp(mx, rob.x, u), y = lerp(my, rob.y - 70, u) - Math.sin(u * Math.PI) * 120; gear(ctx, x, y, 20, 8, t * 6, [355, 50, 45]); } }
  // yunque: engranaje sobre el mesa de EDITAR durante la reparación
  { const s = seg.type === 'fix-act' && seg.station === 'EDITAR' && lt >= 0.3 ? seg : null;
    if (s) { const [ax, ay] = P(5.95, 6.1, 0.99); const rep = lt > 2.0; gear(ctx, ax, ay - 38, 18, 8, rep ? t * 2 : 0, rep ? [140, 70, 50] : [355, 50, 45]); if (!rep) { ctx.strokeStyle = '#0a0508'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax - 3, ay - 55); ctx.lineTo(ax + 2, ay - 42); ctx.lineTo(ax - 2, ay - 36); ctx.stroke(); } else glow(ctx, ax, ay - 38, 70, [140, 90, 60], 0.7); } }
  // reparación: destello verde + llave inglesa en la máquina
  { const ins = tl.segs.find((s) => s.type === 'insert' && t >= s.t0 && t < s.t1);
    if (ins) { const l = t - ins.t0; const [mx, my] = P(...MACHINE_PT[ins.station]); if (l > 0.2 && l < 1.0) { ctx.save(); ctx.translate(mx + 40, my - 20); ctx.rotate(Math.sin(l * 18) * 0.5); ctx.strokeStyle = hsl([210, 15, 70]); ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(0, -16); ctx.stroke(); ell(ctx, 0, -22, 13, 13, null, hsl([210, 15, 70]), 7); ctx.restore(); }
      if (l > 0.75) glow(ctx, mx, my, 160 * (1 - (l - 0.75) / 0.6) + 40, [140, 90, 58], 0.8 * clamp(1 - (l - 0.75) / 0.5)); } }
  // "ding" check al final del bucle
  if (seg.type === 'repeat') {
    const cxs = rob.x, cys = rob.y - 230; const R = 110; const ph = ['pensar', 'actuar', 'observar'];
    ctx.save(); ctx.globalAlpha = clamp(lt / 0.3) * clamp((seg.t1 - t) / 0.3) * 0.95; ctx.translate(cxs, cys);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 5; ctx.setLineDash([2, 14]); ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ph.forEach((p, i) => { const a = -Math.PI / 2 + i * 2.094 + lt * 2.2; const on = true; ell(ctx, Math.cos(a) * R, Math.sin(a) * R, 24, 24, hsl(PHASE_COL[p], -6), 'rgba(255,255,255,0.9)', 3); { const px = Math.cos(a) * R, py = Math.sin(a) * R; if (p === 'pensar') { for (const d of [-8, 0, 8]) ell(ctx, px + d, py, 2.8, 2.8, '#101020'); } else if (p === 'actuar') gear(ctx, px, py, 13, 7, lt * 3, [220, 30, 20], 0.3); else { ell(ctx, px, py, 14, 8, null, '#101020', 3); ell(ctx, px, py, 4.5, 4.5, '#101020'); } } });
    ctx.restore();
  }
  // texto flotante "¡Listo!"
  if (seg.type === 'celebrate') { const a = easeBack(clamp(lt / 0.4)); ctx.save(); ctx.translate(rob.x, rob.y - 330); ctx.scale(a, a); label(ctx, '¡Listo!', 0, 0, 64, '#fff4b0', { weight: '900', shadow: 'rgba(60,20,70,0.95)' }); ctx.restore(); }
}
const DUR_THINK_FAKE = 0.6;
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function capsule(ctx, x, y, s, open) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(ctx, -14, -28, 28, 56, 13); ctx.fillStyle = hsl([190, 25, 70]); ctx.fill(); ctx.strokeStyle = hsl([190, 25, 20]); ctx.lineWidth = 3.5; ctx.stroke();
  ctx.fillStyle = hsl([186, 100, 60]); ctx.fillRect(-14, -4, 28, 8); glow(ctx, 0, 0, 56, [186, 100, 60], 0.6);
  if (open > 0) { ctx.save(); ctx.translate(0, -28); ctx.rotate(-open * 0.9); rrect(ctx, -14, -14, 28, 14, 7); ctx.fillStyle = hsl([190, 25, 78]); ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
function letter(ctx, x, y, sc, task, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(Math.sin(t * 2) * 0.03);
  glow(ctx, 0, 0, 170, [48, 100, 60], 0.35);
  ctx.fillStyle = '#fff6df'; ctx.strokeStyle = hsl([30, 50, 30]); ctx.lineWidth = 3.5; rrect(ctx, -150, -64, 300, 128, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = hsl([48, 100, 58]); rrect(ctx, -150, -64, 300, 28, 10); ctx.fill(); ctx.fillRect(-150, -50, 300, 14);
  icon(ctx, 'TAREA', -128, -50, 11, [30, 80, 20]);
  label(ctx, 'NUEVA TAREA', -4, -50, 15, '#3a2200', { weight: '800', mono: true });
  const lines = wrap(ctx, task, 260, "700 20px 'Segoe UI'");
  lines.slice(0, 2).forEach((l, i) => label(ctx, l, 0, -12 + i * 28, 20, '#2a1a30', { weight: '700' }));
  ctx.strokeStyle = 'rgba(120,80,40,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-130, 44); ctx.lineTo(60, 44); ctx.stroke();
  ctx.restore();
}
function wrap(ctx, text, maxW, font) {
  ctx.font = font; const words = text.split(' '); const out = []; let cur = '';
  for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (ctx.measureText(tt).width > maxW && cur) { out.push(cur); cur = w; } else cur = tt; }
  if (cur) out.push(cur); return out;
}

// ───────── pantalla del taller: registro en vivo y, al final, miniatura recursiva ─────────
function drawMonitor(c, sw, sh, S, depth, tl) {
  const t = S.t;
  c.fillStyle = hsl([220, 40, 8]); c.fillRect(0, 0, sw, sh);
  const finStart = tl.fin + 2.2;
  if (depth === 0 && t >= finStart - 0.2) {
    if (!miniCache.c) miniCache.c = createCanvas(640, 360);
    const mc = miniCache.c, mx = mc.getContext('2d');
    const speed = 6; const tm = Math.max(0, ((t - finStart + 0.2) * speed) % (tl.duration - 0.5));
    drawScene(mx, 640, 360, tm, tl, { depth: 1, hud: false });
    // título en vivo dentro de la miniatura
    const ti = tl.titles.find((x) => tm >= x.t0 && tm < x.t1);
    if (ti && !ti.final) { mx.fillStyle = 'rgba(10,6,20,0.65)'; mx.fillRect(0, 316, 640, 38); label(mx, ti.text, 320, 335, 20, '#fff', { weight: '700' }); }
    c.save(); const ar = 640 / 360; let dw = sh * ar, dh = sh; c.drawImage(mc, (sw - dw) / 2, 0, dw, dh); c.restore();
    const g = c.createLinearGradient(0, 0, sw, sh); g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, sw, sh);
    return;
  }
  // registro en vivo
  const lines = ['> esperando tarea_'];
  const done = tl.items.filter((i) => i.t <= t);
  const log = done.map((i) => (i.kind === 'error' ? '! ' : '+ ') + (i.name || '').toLowerCase());
  const all = S.depth ? ['$ agente'] : ['$ agente --tarea'].concat(log.slice(-6));
  const on = t > 1.9;
  if (!on) { label(c, '> esperando tarea', 12, 24, 11, hsl([140, 90, 60]), { mono: true, align: 'left' }); if (Math.floor(t * 2) % 2) { c.fillStyle = hsl([140, 90, 60]); c.fillRect(110, 16, 7, 12); } return; }
  all.forEach((l, i) => label(c, l, 10, 18 + i * 17, 11, l.startsWith('!') ? hsl([355, 95, 65]) : hsl([140, 90, 62]), { mono: true, align: 'left' }));
  c.fillStyle = hsl([140, 90, 60]); if (Math.floor(t * 2) % 2) c.fillRect(10, 18 + all.length * 17 - 6, 7, 12);
  // barra de memoria
  const n = done.length / Math.max(1, tl.items.length); c.fillStyle = hsl([220, 30, 18]); c.fillRect(10, sh - 22, sw - 20, 8); c.fillStyle = hsl([186, 100, 55]); c.fillRect(10, sh - 22, (sw - 20) * n, 8);
}

// ───────── HUD ─────────
function hud(ctx, W, H, t, tl, S) {
  const k = W / 1920;
  // viñeta
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(10,4,20,0)'); vg.addColorStop(1, 'rgba(10,4,20,0.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.scale(k, k);
  // título de escena
  for (const ti of tl.titles) {
    if (t < ti.t0 - 0.01 || t > ti.t1 + 0.01) continue;
    const a = clamp((t - ti.t0) / 0.35) * clamp((ti.t1 - t) / 0.35); const slide = (1 - ease(clamp((t - ti.t0) / 0.5))) * 24;
    if (ti.final) {
      ctx.globalAlpha = a; ctx.font = "800 54px 'Segoe UI'"; const lines = ['Así funciona la IA…', 'que acaba de crear esta animación.']; const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 90, h = 170;
      ctx.fillStyle = 'rgba(18,8,32,0.82)'; rrect(ctx, 960 - w / 2, 800 - h / 2 + slide, w, h, 30); ctx.fill(); ctx.strokeStyle = 'rgba(255,190,90,0.9)'; ctx.lineWidth = 3; ctx.stroke();
      label(ctx, lines[0], 960, 770 + slide, 54, '#fff4dc', { weight: '800' }); label(ctx, lines[1], 960, 836 + slide, 54, 'hsl(186,100%,72%)', { weight: '800' }); ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = a; ctx.font = "800 58px 'Segoe UI'"; const w = ctx.measureText(ti.text).width + 90;
      ctx.fillStyle = 'rgba(18,8,32,0.78)'; rrect(ctx, 960 - w / 2, 52 - slide, w, 96, 48); ctx.fill(); ctx.strokeStyle = 'rgba(255,190,90,0.85)'; ctx.lineWidth = 3; ctx.stroke();
      label(ctx, ti.text, 960, 101 - slide, 58, '#fff4dc', { weight: '800' }); ctx.globalAlpha = 1;
    }
  }
  // indicador del ciclo
  { const phase = (tl.phases.filter((p) => t >= p.t0 && t < p.t1).pop() || {}).phase;
    const x0 = 50, y0 = 970; ctx.fillStyle = 'rgba(18,8,32,0.7)'; rrect(ctx, x0 - 14, y0 - 20, 560, 84, 22); ctx.fill();
    label(ctx, 'EL CICLO DEL AGENTE', x0 + 2, y0 - 4, 14, 'rgba(255,255,255,0.55)', { align: 'left', mono: true });
    const names = [['pensar', 'PENSAR'], ['actuar', 'ACTUAR'], ['observar', 'OBSERVAR']];
    names.forEach(([p, n], i) => { const on = phase === p || phase === 'loop'; const bx = x0 + i * 178; ctx.fillStyle = on ? hsl(PHASE_COL[p], 0, 1) : 'rgba(255,255,255,0.1)'; rrect(ctx, bx, y0 + 12, 158, 38, 19); ctx.fill();
      if (on) glow(ctx, bx + 79, y0 + 31, 100, PHASE_COL[p], 0.35); label(ctx, n, bx + 79, y0 + 31, 19, on ? '#14102a' : 'rgba(255,255,255,0.45)', { weight: '800' });
      if (i < 2) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(bx + 162, y0 + 25); ctx.lineTo(bx + 172, y0 + 31); ctx.lineTo(bx + 162, y0 + 37); ctx.fill(); } }); }
  // tarjeta del contexto: lo que el agente recuerda
  { const seg = S.seg; if (seg.type === 'context') { const lt = t - seg.t0, per = 2.0 / Math.max(1, tl.items.length); const x0 = 1190, y0 = 190, w = 640, h = 130 + tl.items.length * 62;
      const a = clamp(lt / 0.4) * clamp((seg.t1 - t) / 0.3); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(18,8,32,0.86)'; rrect(ctx, x0, y0, w, h, 26); ctx.fill(); ctx.strokeStyle = 'rgba(255,190,90,0.85)'; ctx.lineWidth = 3; ctx.stroke();
      label(ctx, 'LO QUE EL AGENTE RECUERDA', x0 + 28, y0 + 34, 22, 'rgba(255,255,255,0.7)', { align: 'left', mono: true, weight: '800' });
      tl.items.forEach((it, i) => { const u = clamp((lt - 0.9 - i * per) / 0.3); if (u <= 0) return; const y = y0 + 90 + i * 62; ctx.globalAlpha = a * u; ctx.fillStyle = hsl(it.color); rrect(ctx, x0 + 28, y - 22, 14, 44, 5); ctx.fill();
        const nm = it.kind === 'task' ? 'Tarea recibida' : it.kind === 'error' ? 'Error: ' + clip(it.beat.errorText, 24) : it.beat.tool + ': ' + clip(it.beat.label, 26);
        label(ctx, nm, x0 + 60, y, 30, '#fff4dc', { align: 'left', weight: '700' }); });
      ctx.globalAlpha = 1; } }
  // medidor de contexto
  { const n = tl.items.filter((i) => i.t <= t).length, tot = tl.items.length; const x0 = 1440, y0 = 970; ctx.fillStyle = 'rgba(18,8,32,0.7)'; rrect(ctx, x0 - 14, y0 - 20, 440, 84, 22); ctx.fill();
    label(ctx, 'MEMORIA DE TRABAJO (CONTEXTO)', x0 + 2, y0 - 4, 14, 'rgba(255,255,255,0.55)', { align: 'left', mono: true });
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; rrect(ctx, x0, y0 + 14, 410, 34, 17); ctx.fill();
    const fill = tot ? n / tot : 0; const gg = ctx.createLinearGradient(x0, 0, x0 + 410, 0); gg.addColorStop(0, hsl([186, 100, 55])); gg.addColorStop(1, hsl([320, 90, 62]));
    if (fill > 0) { ctx.fillStyle = gg; rrect(ctx, x0, y0 + 14, Math.max(34, 410 * fill), 34, 17); ctx.fill(); }
    label(ctx, `${n} bloques`, x0 + 205, y0 + 31, 18, '#fff', { weight: '800', shadow: 'rgba(0,0,0,0.5)' }); }
  ctx.restore();
  // fundidos de entrada/salida
  const fi = 1 - clamp(t / 0.6), fo = clamp((t - (tl.duration - 0.5)) / 0.5);
  if (fi + fo > 0) { ctx.fillStyle = `rgba(10,4,20,${Math.min(1, fi + fo)})`; ctx.fillRect(0, 0, W, H); }
}

module.exports = { drawScene, makeState };
