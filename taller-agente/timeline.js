// Línea de tiempo única: de data.json salen los tramos (segs), la pista del robot,
// la cámara, los eventos de sonido y los "items" de la mochila. Imagen y audio la comparten.
'use strict';

// Estaciones del taller (coordenadas de mundo en casillas). stand = dónde se para el robot.
const STATIONS = {
  LEER:     { es: 'LEER',     real: 'Read',           stand: [2.2, 8.0], focus: [1.2, 8.0, 1.4], color: [210, 90, 62], verb: 'lee' },
  ESCRIBIR: { es: 'ESCRIBIR', real: 'Write',          stand: [9.2, 2.4], focus: [9.4, 1.0, 1.4], color: [320, 90, 62], verb: 'escribe' },
  EDITAR:   { es: 'EDITAR',   real: 'Edit',           stand: [6.9, 4.6], focus: [6.8, 5.8, 1.0], color: [38, 100, 58], verb: 'edita' },
  EJECUTAR: { es: 'EJECUTAR', real: 'Bash',           stand: [4.5, 2.4], focus: [3.5, 0.8, 1.4], color: [160, 95, 52], verb: 'ejecuta' },
  BUSCAR:   { es: 'BUSCAR',   real: 'Grep · Glob',    stand: [2.2, 3.7], focus: [1.0, 3.4, 1.4], color: [95, 85, 55], verb: 'busca' },
  CONECTAR: { es: 'CONECTAR', real: 'Web · Artifact', stand: [8.3, 8.2], focus: [9.5, 8.7, 1.4], color: [270, 85, 68], verb: 'publica' },
};
const TOOL_STATION = {
  Read: 'LEER', Write: 'ESCRIBIR', Edit: 'EDITAR', NotebookEdit: 'EDITAR',
  Bash: 'EJECUTAR', PowerShell: 'EJECUTAR', Grep: 'BUSCAR', Glob: 'BUSCAR', ToolSearch: 'BUSCAR',
};
const stationOf = (tool) => TOOL_STATION[tool] || 'CONECTAR';
const TOOL_COLORS = {};
for (const k in STATIONS) TOOL_COLORS[k] = STATIONS[k].color;

const DOCK = [5.2, 3.9];       // base de carga: aquí empieza el robot
const TRAY = [1.1, 1.1];       // bandeja donde cae la cápsula con la tarea
const CHAIR = [6.6, 3.0];      // sillón final
const CENTER = [5.0, 5.3];
const WIDE = [5.5, 5.4, 1.0, 0.97];

const DUR = { think: 0.6, walk: 1.0, act: 2.3, obs: 2.2, errAct: 1.8, jam: 2.4, fixAct: 2.4, insert: 1.2 };

// Agrupa los pasos reales sin cambiar el orden: tramos de la misma herramienta se funden,
// el error y su arreglo quedan siempre como pasos propios.
function groupSteps(steps, maxNormal) {
  const beats = [];
  let afterError = false;
  for (const s of steps) {
    const station = stationOf(s.tool);
    if (s.error) { beats.push({ kind: 'error', tool: s.tool, station, label: s.label, errorText: s.errorText || 'algo falló', count: 1 }); afterError = true; continue; }
    if (afterError) { beats.push({ kind: 'fix', tool: s.tool, station, label: s.label, count: 1 }); afterError = false; continue; }
    const last = beats[beats.length - 1];
    if (last && last.kind === 'normal' && last.station === station) { last.count += s.group || 1; last.label = last.count + ' pasos de ' + s.tool; last.multi = true; continue; }
    beats.push({ kind: 'normal', tool: s.tool, station, label: s.label, count: s.group || 1, multi: (s.group || 1) > 1 });
  }
  // demasiados pasos normales: se funde el par normal adyacente más liviano (orden intacto)
  const normals = () => beats.filter((b) => b.kind === 'normal').length;
  while (normals() > maxNormal) {
    let k = -1;
    for (let i = 0; i < beats.length - 1; i++) {
      if (beats[i].kind === 'normal' && beats[i + 1].kind === 'normal' && (k < 0 || beats[i].count + beats[i + 1].count < beats[k].count + beats[k + 1].count)) k = i;
    }
    if (k < 0) { // sin pares adyacentes: se funde un normal con el normal más cercano en orden
      const idx = beats.findIndex((b) => b.kind === 'normal'); const nxt = beats.findIndex((b, j) => j > idx && b.kind === 'normal');
      beats[nxt].count += beats[idx].count; beats[nxt].label = beats[nxt].count + ' pasos agrupados'; beats.splice(idx, 1); continue;
    }
    const a = beats[k], b = beats[k + 1];
    a.count += b.count; a.label = a.count + ' pasos agrupados'; a.tool = a.count >= b.count ? a.tool : b.tool; beats.splice(k + 1, 1);
  }
  return beats;
}

// valor de cámara en t sobre claves ordenadas (smootherstep entre claves consecutivas)
function camAt(cam, t) {
  if (!cam.length) return WIDE.slice();
  if (t <= cam[0].t) { const c = cam[0]; return [c.wx, c.wy, c.wz, c.zoom]; }
  for (let i = 0; i < cam.length - 1; i++) {
    const a = cam[i], b = cam[i + 1];
    if (t >= a.t && t <= b.t) {
      let u = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t); u = u * u * u * (u * (u * 6 - 15) + 10);
      return [a.wx + (b.wx - a.wx) * u, a.wy + (b.wy - a.wy) * u, a.wz + (b.wz - a.wz) * u, a.zoom * Math.pow(b.zoom / a.zoom, u)];
    }
  }
  const c = cam[cam.length - 1]; return [c.wx, c.wy, c.wz, c.zoom];
}

function build(data) {
  const beats = groupSteps(data.steps, 4);
  const segs = [], moves = [], events = [], cam = [], titles = [], items = [], phases = [];
  const ev = (t, type, o = {}) => events.push({ t, type, ...o });
  const seg = (t0, dur, type, o = {}) => { const s = { t0, t1: t0 + dur, type, ...o }; segs.push(s); return s; };
  const camKey = (t, wx, wy, wz, zoom) => { cam.push({ t, wx, wy, wz, zoom }); cam.sort((a, b) => a.t - b.t); };
  const holdCam = (t) => camKey(t, ...camAt(cam, t));
  let pos = DOCK.slice();
  const moveTo = (t, dur, to) => {
    const from = pos.slice(); pos = to.slice();
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const n = Math.max(2, Math.round(dist * 1.5));
    moves.push({ t0: t, t1: t + dur, from, to: pos.slice(), n });
    for (let i = 0; i < n; i++) ev(t + dur * (i + 0.5) / n, 'step', { side: i % 2 });
  };

  // ── 1. Llega una tarea (0–3.2) ─────────────────────────────
  let t = 0;
  seg(0, 3.2, 'task');
  titles.push({ t0: 0.5, t1: 3.1, text: '1. Llega una tarea' });
  ev(0.6, 'whoosh'); ev(1.35, 'thud'); ev(1.9, 'boot'); ev(2.4, 'blip', { n: 0 });
  phases.push({ t0: 0, t1: 3.2, phase: null });
  camKey(0, ...WIDE); camKey(1.0, ...WIDE); camKey(1.9, 2.6, 2.4, 2.0, 1.4); camKey(3.2, 2.6, 2.5, 2.4, 1.4);
  moveTo(2.0, 1.1, [2.2, 2.2]);
  t = 3.2;

  // ── 2. Piensa qué necesita (3.2–6.4) ──────────────────────
  seg(t, 3.2, 'plan');
  titles.push({ t0: t + 0.1, t1: t + 3.1, text: '2. Piensa qué necesita' });
  phases.push({ t0: t, t1: t + 3.2, phase: 'pensar' });
  ev(t + 0.2, 'think'); ev(t + 1.0, 'think'); ev(t + 1.8, 'think'); ev(t + 2.6, 'blip', { n: 2 });
  items.push({ t: t + 2.9, color: [48, 100, 60], kind: 'task', station: null, name: 'Tarea' }); ev(t + 2.9, 'result', { color: [48, 100, 60], kind: 'task' });
  camKey(t + 0.3, 3.4, 2.6, 2.5, 1.4);
  camKey(t + 3.2, 3.4, 2.6, 2.5, 1.4);
  t += 3.2;

  // ── Pasos reales ──────────────────────────────────────────
  let nth = 0, jammed = null;
  for (let bi = 0; bi < beats.length; bi++) {
    const b = beats[bi]; const S = STATIONS[b.station];
    const b0 = t;
    const standCam = (st) => [st.focus[0] * 0.25 + st.stand[0] * 0.5 + CENTER[0] * 0.25, st.focus[1] * 0.25 + st.stand[1] * 0.5 + CENTER[1] * 0.25, 1.9];
    if (b.kind === 'fix') {
      const jam = jammed; const J = STATIONS[jam.station];
      const same = jam.station === b.station;
      const walkD = same ? 0 : DUR.walk;
      const total = walkD + DUR.fixAct + walkD + DUR.insert;
      phases.push({ t0: t, t1: t + total, phase: 'actuar' });
      titles.push({ t0: t, t1: t + total, text: 'Si falla… lo corrige' });
      seg(t, walkD, 'walk', { beat: bi, b, station: b.station, carry: true });
      if (!same) { holdCam(t); camKey(t + walkD * 0.5, 5.5, 5.0, 1.0, 1.15); moveTo(t, walkD, S.stand); }
      camKey(t + walkD + 0.3, ...standCam(S), 1.65);
      seg(t + walkD, DUR.fixAct, 'fix-act', { beat: bi, b, station: b.station });
      ev(t + walkD + 0.2, 'think');
      const w = b.station === 'EDITAR' ? 'hammer' : 'work';
      ev(t + walkD + 0.5, w, { station: b.station }); ev(t + walkD + 1.0, w, { station: b.station }); ev(t + walkD + 1.5, w, { station: b.station });
      ev(t + walkD + 2.0, 'repair');
      t += walkD + DUR.fixAct;
      if (!same) {
        seg(t, walkD, 'walk', { beat: bi, b, station: jam.station, carry: true, repaired: true });
        holdCam(t); camKey(t + walkD * 0.5, 5.5, 5.0, 1.0, 1.15); moveTo(t, walkD, J.stand);
        camKey(t + walkD + 0.1, ...standCam(J), 1.65);
      }
      t += walkD;
      seg(t, DUR.insert, 'insert', { beat: bi, b, station: jam.station });
      ev(t + 0.35, 'wrench'); ev(t + 0.7, 'restart', { station: jam.station });
      ev(t + 1.1, 'result', { color: [140, 90, 55], kind: 'fix' });
      items.push({ t: t + 1.1, hover: 1.1, color: [140, 90, 55], kind: 'fix', station: b.station, name: b.tool + ' fix', beat: b });
      holdCam(t + DUR.insert);
      t += DUR.insert; jammed = null;
      b.t0 = b0; b.t1 = t; b.jamStation = jam.station;
      continue;
    }
    // pensar + caminar
    phases.push({ t0: t, t1: t + DUR.think + DUR.walk, phase: 'pensar' });
    seg(t, DUR.think, 'think', { beat: bi, b, station: b.station });
    ev(t + 0.05, 'think');
    holdCam(t); camKey(t + DUR.think + 0.2, 5.5, 5.2, 1.0, 1.05);
    seg(t + DUR.think, DUR.walk, 'walk', { beat: bi, b, station: b.station });
    if (Math.hypot(pos[0] - S.stand[0], pos[1] - S.stand[1]) > 0.3) moveTo(t + DUR.think, DUR.walk, S.stand);
    t += DUR.think + DUR.walk;
    camKey(t + 0.2, ...standCam(S), 1.65);
    // actuar
    const actD = b.kind === 'error' ? DUR.errAct : DUR.act;
    phases.push({ t0: t, t1: t + actD, phase: 'actuar' });
    titles.push({ t0: b.kind === 'error' ? t - 0.25 : t, t1: t + actD, text: nth === 0 && b.kind !== 'error' ? '3. Actúa: usa una herramienta' : '3. Actúa: ' + S.verb });
    seg(t, actD, 'act', { beat: bi, b, station: b.station });
    ev(t + 0.05, 'click');
    const workEv = { LEER: 'page', ESCRIBIR: 'press', EDITAR: 'hammer', EJECUTAR: 'gear', BUSCAR: 'ping', CONECTAR: 'signal' }[b.station];
    const nWork = b.station === 'LEER' ? 4 : b.station === 'EJECUTAR' ? 2 : 3;
    for (let k = 0; k < nWork; k++) ev(t + 0.3 + k * (actD - 0.6) / nWork, workEv, { station: b.station });
    if (b.station === 'EJECUTAR') { ev(t + 0.9, 'lever'); ev(t + 1.2, 'steam'); }
    t += actD;
    // observar (o fallo)
    if (b.kind === 'error') {
      phases.push({ t0: t, t1: t + DUR.jam, phase: 'observar' });
      titles.push({ t0: t, t1: t + DUR.jam, text: 'Si falla… lo corrige' });
      seg(t, DUR.jam, 'jam', { beat: bi, b, station: b.station });
      ev(t + 0.05, 'spark'); ev(t + 0.2, 'alarm'); ev(t + 0.5, 'surprise'); ev(t + 0.9, 'spark'); ev(t + 1.3, 'spark'); ev(t + 1.5, 'page');
      items.push({ t: t + 2.15, color: [355, 90, 58], kind: 'error', station: b.station, name: 'Error', beat: b });
      ev(t + 2.15, 'result', { color: [355, 90, 58], kind: 'error' });
      jammed = b;
      t += DUR.jam;
    } else {
      phases.push({ t0: t, t1: t + DUR.obs, phase: 'observar' });
      titles.push({ t0: t, t1: t + DUR.obs, text: '4. Observa el resultado' });
      seg(t, DUR.obs, 'observe', { beat: bi, b, station: b.station });
      ev(t + 0.5, 'ok'); ev(t + 1.9, 'result', { color: TOOL_COLORS[b.station], kind: 'ok' });
      items.push({ t: t + 1.9, color: TOOL_COLORS[b.station], kind: 'ok', station: b.station, name: b.tool, beat: b });
      t += DUR.obs; nth++;
    }
    b.t0 = b0; b.t1 = t;
  }

  // ── El contexto crece ─────────────────────────────────────
  const lastPos = pos.slice();
  seg(t, 3.0, 'context');
  titles.push({ t0: t + 0.1, t1: t + 3.0, text: 'El contexto crece' });
  phases.push({ t0: t, t1: t + 3.0, phase: null });
  holdCam(t); camKey(t + 0.9, lastPos[0] + 1.0, lastPos[1] - 1.0, 1.1, 2.3); camKey(t + 3.0, lastPos[0] + 1.0, lastPos[1] - 1.0, 1.1, 2.3);
  for (let i = 0; i < items.length; i++) ev(t + 0.9 + (i + 0.5) * (1.9 / items.length), 'pack', { n: i });
  const ctx0 = t;
  t += 3.0;

  // ── Repite hasta terminar ─────────────────────────────────
  seg(t, 2.4, 'repeat');
  titles.push({ t0: t + 0.1, t1: t + 2.4, text: 'Repite hasta terminar' });
  phases.push({ t0: t, t1: t + 2.4, phase: 'loop' });
  camKey(t + 0.2, lastPos[0] + 1.0, lastPos[1] - 1.0, 1.1, 2.3); camKey(t + 2.4, CENTER[0], CENTER[1], 1.0, 1.25);
  for (let i = 0; i < 6; i++) ev(t + 0.15 + i * 0.36, 'tick', { n: i });
  moveTo(t + 0.2, 1.9, CENTER);
  t += 2.4;

  // ── Final ─────────────────────────────────────────────────
  const fin = t;
  const MON = [6.65, 0.3, 2.3];
  seg(t, 1.6, 'celebrate');
  ev(t + 0.05, 'bell'); ev(t + 0.1, 'confetti'); ev(t + 0.6, 'confetti'); ev(t + 0.9, 'hop'); ev(t + 1.3, 'hop');
  phases.push({ t0: t, t1: t + 99, phase: null });
  camKey(t, CENTER[0], CENTER[1], 1.0, 1.25); camKey(t + 1.2, CENTER[0], CENTER[1], 1.0, 1.25); camKey(t + 2.6, MON[0], MON[1], MON[2], 2.6);
  t += 1.6;
  seg(t, 1.5, 'tochair');
  moveTo(t, 1.5, [CHAIR[0], CHAIR[1] + 0.2]);
  camKey(t + 2.4, MON[0], MON[1], MON[2], 2.9);
  seg(t + 1.5, 0.3, 'sit'); ev(t + 1.6, 'sit');
  t += 1.8;
  const rest = 5.0;
  seg(t, rest, 'rest');
  ev(t + 0.6, 'blip', { n: 4 }); ev(t + 1.8, 'cat');
  const duration = t + rest;
  camKey(t + 0.5, MON[0], MON[1], MON[2], 2.9); camKey(t + 2.2, ...WIDE); camKey(duration, WIDE[0], WIDE[1] - 0.1, WIDE[2], WIDE[3] - 0.01);
  titles.push({ t0: fin + 5.2, t1: duration, text: 'Así funciona la IA… que acaba de crear esta animación.', final: true });

  // títulos contiguos con el mismo texto se funden en uno
  titles.sort((a, b) => a.t0 - b.t0);
  const merged = [];
  for (const ti of titles) { const l = merged[merged.length - 1]; if (l && l.text === ti.text && ti.t0 <= l.t1 + 0.05) l.t1 = Math.max(l.t1, ti.t1); else merged.push({ ...ti }); }
  events.sort((a, b) => a.t - b.t);
  return { duration, beats, segs, moves, events, cam, titles: merged, items, phases, ctx0, fin, task: data.task || 'una tarea' };
}

const cameraAt = (tl, t) => camAt(tl.cam, t);

function robotPos(tl, t) {
  let p = DOCK, walking = 0, dir = [1, 1], k = 0;
  for (const m of tl.moves) {
    if (t >= m.t1) { p = m.to; dir = [m.to[0] - m.from[0], m.to[1] - m.from[1]]; continue; }
    if (t >= m.t0) {
      let u = (t - m.t0) / (m.t1 - m.t0); u = u * u * (3 - 2 * u);
      p = [m.from[0] + (m.to[0] - m.from[0]) * u, m.from[1] + (m.to[1] - m.from[1]) * u];
      walking = 1; dir = [m.to[0] - m.from[0], m.to[1] - m.from[1]]; k = t - m.t0;
    }
    break;
  }
  return { x: p[0], y: p[1], walking, dir, k };
}

module.exports = { build, cameraAt, robotPos, STATIONS, TOOL_COLORS, DOCK, TRAY, CHAIR, CENTER, WIDE, stationOf };
