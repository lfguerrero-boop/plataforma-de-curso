// Síntesis de audio 100% con código (ondas, ruido filtrado, envolventes). Los efectos salen de tl.events,
// los MISMOS eventos que mueven la animación. node audio.js data.json out/
'use strict';
const fs = require('fs');
const TL = require('./timeline');
const SR = 44100;
const TWO_PI = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
let seed = 1337; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

class Track {
  constructor(seconds) { this.n = Math.ceil(seconds * SR); this.L = new Float32Array(this.n); this.R = new Float32Array(this.n); }
  add(t0, i, v, pan = 0) { const k = Math.round(t0 * SR) + i; if (k < 0 || k >= this.n) return; const a = (pan + 1) * Math.PI / 4; this.L[k] += v * Math.cos(a) * 1.414; this.R[k] += v * Math.sin(a) * 1.414; }
}

// tono con glide exponencial, parciales y envolvente (ataque lineal + caída exponencial)
function tone(tr, t0, dur, o) {
  const { f0, f1 = f0, type = 'sine', gain = 0.3, att = 0.004, tau = dur / 4, pan = 0, vib = 0, vibHz = 6, parts = null, lp = 0 } = o;
  const n = Math.floor(dur * SR); let ph = 0, lpS = 0; const a = lp ? 1 - Math.exp(-TWO_PI * lp / SR) : 1;
  for (let i = 0; i < n; i++) {
    const t = i / SR, u = t / dur; const f = f0 * Math.pow(f1 / f0, u) * (1 + vib * Math.sin(TWO_PI * vibHz * t));
    ph += TWO_PI * f / SR;
    let s;
    if (parts) { s = 0; for (const [r, g, ts] of parts) s += Math.sin(ph * r) * g * Math.exp(-t / (tau * (ts || 1))); s /= 2; }
    else if (type === 'sine') s = Math.sin(ph);
    else if (type === 'tri') s = 2 / Math.PI * Math.asin(Math.sin(ph));
    else if (type === 'square') s = Math.sin(ph) > 0 ? 0.6 : -0.6;
    else s = ((ph / TWO_PI) % 1) * 2 - 1;
    if (lp) { lpS += a * (s - lpS); s = lpS; }
    const env = Math.min(1, t / att) * (parts ? 1 : Math.exp(-t / tau)) * Math.min(1, (dur - t) / 0.01);
    tr.add(t0, i, s * env * gain, pan);
  }
}
// ruido filtrado (SVF pasa-banda con barrido, o LP/HP simples)
function noise(tr, t0, dur, o) {
  const { gain = 0.3, att = 0.003, tau = dur / 4, pan = 0, bp = null, bp1 = null, q = 0.6, lp = 0, hp = 0, rise = false, shape = null } = o;
  const n = Math.floor(dur * SR); let low = 0, band = 0, l1 = 0, h1 = 0, hx = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, u = t / dur; let x = rand() * 2 - 1;
    if (bp) { const fc = bp1 ? bp * Math.pow(bp1 / bp, u) : bp; const f = 2 * Math.sin(Math.PI * Math.min(fc, 12000) / SR); low += f * band; const high = x - low - q * band; band += f * high; x = band * 1.2; }
    if (lp) { l1 += (1 - Math.exp(-TWO_PI * lp / SR)) * (x - l1); x = l1; }
    if (hp) { const k = Math.exp(-TWO_PI * hp / SR); h1 = k * (h1 + x - hx); hx = x; x = h1; }
    let env = shape ? shape(u, t) : (rise ? Math.min(1, t / att) * Math.pow(u, 1.2) * Math.pow(1 - u, 0.6) * 2 : Math.min(1, t / att) * Math.exp(-t / tau));
    env *= Math.min(1, (dur - t) / 0.006);
    tr.add(t0, i, x * env * gain, pan);
  }
}
const tick = (tr, t, g = 0.3, pan = 0, f = 4000) => noise(tr, t, 0.012, { gain: g, hp: f * 0.6, tau: 0.003, pan });
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ───────── efectos ─────────
const SFX = {
  step(tr, e, pan) { const lo = e.side ? 105 : 130; tone(tr, e.t, 0.09, { f0: lo, f1: lo * 0.5, gain: 0.34, tau: 0.03, pan }); noise(tr, e.t, 0.05, { gain: 0.16, lp: 1100, tau: 0.012, pan }); tone(tr, e.t + 0.004, 0.05, { f0: e.side ? 1900 : 2300, gain: 0.05, tau: 0.01, pan }); },
  whoosh(tr, e) { noise(tr, e.t, 0.8, { bp: 2600, bp1: 380, q: 0.35, gain: 0.55, rise: true }); noise(tr, e.t, 0.8, { bp: 900, bp1: 200, q: 0.5, gain: 0.25, rise: true }); },
  thud(tr, e) { tone(tr, e.t, 0.35, { f0: 95, f1: 45, gain: 0.6, tau: 0.09 }); noise(tr, e.t, 0.12, { lp: 700, gain: 0.35, tau: 0.03 }); tone(tr, e.t, 0.3, { f0: 1500, gain: 0.08, parts: [[1, 1, 1], [2.7, 0.5, 0.6]], tau: 0.08 }); },
  boot(tr, e) { [0, 1, 2, 3].forEach((k) => tone(tr, e.t + k * 0.07, 0.12, { f0: [392, 523, 659, 988][k], type: 'square', gain: 0.1, tau: 0.05, lp: 3000, vib: 0.01 })); tone(tr, e.t, 0.5, { f0: 90, f1: 220, gain: 0.12, tau: 0.3, type: 'tri' }); },
  blip(tr, e) { const f = [660, 740, 880, 990, 1175][e.n % 5]; tone(tr, e.t, 0.14, { f0: f, f1: f * 1.5, gain: 0.2, tau: 0.06, type: 'tri' }); tone(tr, e.t + 0.09, 0.14, { f0: f * 1.5, gain: 0.14, tau: 0.06, type: 'tri' }); },
  think(tr, e) { tone(tr, e.t, 0.2, { f0: 420, f1: 640, gain: 0.16, att: 0.03, tau: 0.09, vib: 0.02 }); tone(tr, e.t + 0.12, 0.18, { f0: 520, f1: 780, gain: 0.1, att: 0.03, tau: 0.08 }); },
  click(tr, e) { tick(tr, e.t, 0.3); tone(tr, e.t, 0.04, { f0: 1500, gain: 0.08, tau: 0.01 }); },
  page(tr, e, pan) { noise(tr, e.t, 0.2, { bp: 3200, bp1: 6500, q: 0.4, gain: 0.5, att: 0.02, tau: 0.07, pan }); noise(tr, e.t + 0.06, 0.12, { hp: 5000, gain: 0.18, tau: 0.04, pan }); },
  press(tr, e, pan) { tone(tr, e.t, 0.4, { f0: 75, f1: 38, gain: 0.7, tau: 0.1, pan }); noise(tr, e.t, 0.14, { lp: 500, gain: 0.5, tau: 0.04, pan }); tone(tr, e.t, 0.4, { f0: 420, gain: 0.1, parts: [[1, 1, 1], [1.58, 0.6, 0.8], [2.4, 0.4, 0.5]], tau: 0.1, pan }); noise(tr, e.t - 0.1, 0.1, { bp: 700, bp1: 1400, gain: 0.2, att: 0.05, tau: 0.08, pan }); },
  hammer(tr, e, pan) { tone(tr, e.t, 0.5, { f0: 1200, gain: 0.22, parts: [[1, 1, 1], [1.52, 0.8, 0.7], [2.12, 0.6, 0.5], [2.9, 0.4, 0.3]], tau: 0.16, pan }); noise(tr, e.t, 0.05, { lp: 1800, gain: 0.4, tau: 0.012, pan }); tone(tr, e.t, 0.1, { f0: 160, f1: 90, gain: 0.3, tau: 0.03, pan }); },
  gear(tr, e, pan) { for (let k = 0; k < 9; k++) tick(tr, e.t + k * 0.045, 0.28, pan, 2500 + (k % 2) * 900); tone(tr, e.t, 0.5, { f0: 120, f1: 170, gain: 0.18, att: 0.05, tau: 0.25, type: 'saw', lp: 500, vib: 0.03, vibHz: 22, pan }); },
  work(tr, e, pan) { for (let k = 0; k < 4; k++) tick(tr, e.t + k * 0.05, 0.26, pan, 2200 + k * 300); tone(tr, e.t, 0.25, { f0: 200, f1: 240, gain: 0.12, tau: 0.12, type: 'saw', lp: 900, pan }); },
  lever(tr, e, pan) { tone(tr, e.t - 0.15, 0.5, { f0: 220, f1: 130, gain: 0.2, att: 0.08, tau: 0.35, type: 'saw', lp: 700, vib: 0.04, vibHz: 18, pan }); tone(tr, e.t + 0.38, 0.3, { f0: 110, f1: 55, gain: 0.55, tau: 0.07, pan }); noise(tr, e.t + 0.38, 0.1, { lp: 900, gain: 0.3, tau: 0.03, pan }); },
  steam(tr, e, pan) { noise(tr, e.t, 1.5, { hp: 3000, gain: 0.34, att: 0.08, tau: 0.6, pan: -0.15 }); noise(tr, e.t, 1.2, { bp: 5500, q: 0.3, gain: 0.2, att: 0.1, tau: 0.5, pan: -0.15 }); },
  ping(tr, e, pan) { tone(tr, e.t, 1.1, { f0: 1175, gain: 0.26, tau: 0.35, pan }); tone(tr, e.t + 0.28, 1.0, { f0: 1175, gain: 0.1, tau: 0.3, pan }); tone(tr, e.t + 0.52, 0.9, { f0: 1175, gain: 0.05, tau: 0.3, pan }); },
  signal(tr, e, pan) { [1500, 1900, 2400].forEach((f, k) => tone(tr, e.t + k * 0.06, 0.08, { f0: f, type: 'square', gain: 0.09, tau: 0.03, lp: 4000, pan })); },
  ok(tr, e) { tone(tr, e.t, 0.35, { f0: 784, gain: 0.2, tau: 0.12, type: 'tri' }); tone(tr, e.t + 0.1, 0.45, { f0: 1175, gain: 0.2, tau: 0.16, type: 'tri' }); },
  result(tr, e) {
    if (e.kind === 'error') { tone(tr, e.t, 0.35, { f0: 117, f1: 98, gain: 0.3, tau: 0.2, type: 'saw', lp: 600 }); tone(tr, e.t, 0.35, { f0: 123, f1: 104, gain: 0.25, tau: 0.2, type: 'saw', lp: 600 }); return; }
    tone(tr, e.t, 0.12, { f0: 420, f1: 980, gain: 0.25, tau: 0.04 });
    const base = e.kind === 'fix' ? [523, 659, 784, 1047] : e.kind === 'task' ? [659, 880] : [880, 1319];
    base.forEach((f, k) => tone(tr, e.t + 0.06 + k * 0.07, 0.5, { f0: f, gain: 0.16, parts: [[1, 1, 1], [2, 0.3, 0.5]], tau: 0.2 }));
    noise(tr, e.t, 0.06, { hp: 4000, gain: 0.12, tau: 0.02 });
  },
  pack(tr, e) { const f = mtof(72 + (e.n * 2) % 12); tone(tr, e.t, 0.35, { f0: f, gain: 0.2, parts: [[1, 1, 1], [3, 0.25, 0.4]], tau: 0.14 }); tone(tr, e.t, 0.08, { f0: 300, f1: 700, gain: 0.12, tau: 0.03 }); },
  spark(tr, e, pan) { tone(tr, e.t, 0.3, { f0: 3200, f1: 180, type: 'saw', gain: 0.22, tau: 0.09, lp: 5000, pan }); noise(tr, e.t, 0.5, { hp: 3500, gain: 0.3, tau: 0.12, pan });
    for (let k = 0; k < 14; k++) tick(tr, e.t + 0.02 + rand() * 0.6, 0.18 + rand() * 0.25, pan, 2500 + rand() * 3500); tone(tr, e.t, 0.35, { f0: 100, type: 'square', gain: 0.12, tau: 0.12, lp: 800, vib: 0.2, vibHz: 50, pan }); },
  alarm(tr, e) { for (let k = 0; k < 5; k++) tone(tr, e.t + k * 0.16, 0.16, { f0: k % 2 ? 620 : 880, type: 'square', gain: 0.1, tau: 0.2, lp: 1800 }); },
  surprise(tr, e) { tone(tr, e.t, 0.2, { f0: 350, f1: 1400, gain: 0.26, tau: 0.12, type: 'tri', vib: 0.02 }); tone(tr, e.t + 0.18, 0.25, { f0: 1100, f1: 500, gain: 0.18, tau: 0.1, type: 'tri' }); },
  repair(tr, e) { for (let k = 0; k < 6; k++) tick(tr, e.t - 0.3 + k * 0.05, 0.25, 0, 3000); [523, 659, 784, 1047].forEach((f, k) => tone(tr, e.t + k * 0.09, 0.6, { f0: f, gain: 0.17, parts: [[1, 1, 1], [2, 0.35, 0.5]], tau: 0.25 })); },
  wrench(tr, e) { for (let k = 0; k < 5; k++) { tick(tr, e.t + k * 0.07, 0.3, -0.2, 2800); tone(tr, e.t + k * 0.07, 0.06, { f0: 1500 + k * 120, gain: 0.07, tau: 0.02 }); } tone(tr, e.t + 0.38, 0.4, { f0: 900, gain: 0.14, parts: [[1, 1, 1], [1.5, 0.7, 0.7], [2.3, 0.4, 0.4]], tau: 0.15 }); },
  restart(tr, e) { tone(tr, e.t, 0.9, { f0: 55, f1: 130, gain: 0.35, att: 0.05, tau: 0.5, type: 'tri', pan: -0.2 }); noise(tr, e.t, 0.7, { hp: 3500, gain: 0.2, att: 0.05, tau: 0.3, pan: -0.2 }); tone(tr, e.t + 0.25, 0.5, { f0: 1319, gain: 0.14, parts: [[1, 1, 1], [2, 0.3, 0.5]], tau: 0.2 }); },
  tick(tr, e) { const f = mtof(76 + [0, 2, 4, 7, 9, 12][e.n % 6]); tone(tr, e.t, 0.14, { f0: f, gain: 0.2, parts: [[1, 1, 1], [4, 0.3, 0.2]], tau: 0.06 }); },
  bell(tr, e) { [[880, 1, 1], [1318.5, 0.55, 0.8], [1760, 0.4, 0.6], [2217, 0.25, 0.5], [2637, 0.2, 0.4]].forEach(([f, g, ts]) => tone(tr, e.t, 3.2, { f0: f, gain: 0.2 * g, att: 0.002, tau: 0.9 * ts, parts: null })); tone(tr, e.t, 3, { f0: 880.5, gain: 0.1, tau: 0.8 }); noise(tr, e.t, 0.1, { hp: 4000, gain: 0.15, tau: 0.03 }); },
  confetti(tr, e) { noise(tr, e.t, 0.12, { lp: 1800, gain: 0.45, tau: 0.03 }); tone(tr, e.t, 0.1, { f0: 220, f1: 90, gain: 0.3, tau: 0.04 }); noise(tr, e.t + 0.03, 0.9, { hp: 5000, gain: 0.2, att: 0.05, tau: 0.35, shape: (u, t) => Math.min(1, t / 0.05) * Math.exp(-t / 0.35) * (0.6 + 0.4 * Math.sin(t * 90)) });
    for (let k = 0; k < 10; k++) tone(tr, e.t + 0.05 + k * 0.045, 0.2, { f0: mtof(84 + [0, 4, 7, 12, 9][k % 5]), gain: 0.07, tau: 0.07 }); },
  hop(tr, e) { tone(tr, e.t, 0.18, { f0: 280, f1: 620, gain: 0.2, tau: 0.09, type: 'tri', vib: 0.03 }); tone(tr, e.t + 0.2, 0.1, { f0: 150, f1: 80, gain: 0.3, tau: 0.04 }); },
  sit(tr, e) { noise(tr, e.t, 0.3, { lp: 500, gain: 0.45, tau: 0.09 }); tone(tr, e.t, 0.25, { f0: 90, f1: 50, gain: 0.3, tau: 0.08 }); noise(tr, e.t + 0.1, 0.7, { bp: 1800, bp1: 700, q: 0.7, gain: 0.12, att: 0.15, tau: 0.3 }); },
  cat(tr, e) { tone(tr, e.t, 0.5, { f0: 520, f1: 760, gain: 0.07, att: 0.06, tau: 0.3, parts: [[1, 1, 1], [2, 0.5, 1], [3, 0.3, 1]], pan: -0.5 }); tone(tr, e.t + 0.3, 0.4, { f0: 760, f1: 430, gain: 0.07, att: 0.03, tau: 0.25, parts: [[1, 1, 1], [2, 0.5, 1]], pan: -0.5 }); },
};
const LOUD = { whoosh: 0.5, thud: 0.6, boot: 0.4, press: 0.6, hammer: 0.5, gear: 0.45, lever: 0.4, steam: 0.4, spark: 0.7, alarm: 0.5, surprise: 0.55, repair: 0.55, wrench: 0.4, restart: 0.5, bell: 0.65, confetti: 0.5, result: 0.5, ok: 0.4, page: 0.35, ping: 0.4, signal: 0.35, pack: 0.4, think: 0.25, blip: 0.3, hop: 0.3, sit: 0.35, cat: 0.2, tick: 0.2, click: 0.1, work: 0.3, step: 0.12 };

function renderFx(tl) {
  const tr = new Track(tl.duration + 3);
  for (const e of tl.events) {
    const fn = SFX[e.type]; if (!fn) { console.warn('sin sonido para', e.type); continue; }
    let pan = 0; if (e.station) pan = { LEER: -0.6, BUSCAR: -0.45, EJECUTAR: -0.25, EDITAR: 0.05, ESCRIBIR: 0.55, CONECTAR: 0.6 }[e.station] || 0;
    else if (e.type === 'step') { const p = TL.robotPos(tl, e.t); pan = clamp((p.x - p.y) / 9, -0.6, 0.6); }
    fn(tr, e, pan);
  }
  // ambiente de taller: zumbido grave de máquinas + reloj, muy suave
  const n = tr.n;
  for (let i = 0; i < n; i++) { const t = i / SR; const v = (Math.sin(TWO_PI * 55 * t) * 0.5 + Math.sin(TWO_PI * 82.5 * t + 1) * 0.3) * 0.022 * (0.7 + 0.3 * Math.sin(t * 0.4)); tr.L[i] += v; tr.R[i] += v; }
  for (let s = 0; s < tl.duration; s += 1) { tick(tr, s + 0.5, 0.028, 0.5, 3000); }
  return tr;
}

// ───────── música: 8 compases Am–F–C–G, kalimba + pad + bajo + shaker; se repite en bucle ─────────
function renderMusic(duration, duckEnv) {
  const tr = new Track(duration + 3); const bpm = 92, beat = 60 / bpm, bar = beat * 4;
  const prog = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]]; // acordes (Am F C G)
  const roots = [45, 41, 36, 43];
  const scale = [69, 72, 74, 76, 79, 81, 84];
  const loopBars = 8, total = Math.ceil(duration / bar) + 1;
  seed = 4242;
  for (let b = 0; b < total; b++) {
    const t0 = b * bar, chord = prog[Math.floor((b % loopBars) / 2)], root = roots[Math.floor((b % loopBars) / 2)];
    // pad: dos sierras desafinadas filtradas
    chord.forEach((m, k) => { const f = mtof(m + 12); tone(tr, t0, bar * 1.02, { f0: f * 0.997, gain: 0.04, att: 0.5, tau: 99, type: 'saw', lp: 700, pan: -0.3 + k * 0.3 }); tone(tr, t0, bar * 1.02, { f0: f * 1.003, gain: 0.04, att: 0.5, tau: 99, type: 'saw', lp: 700, pan: 0.3 - k * 0.3 }); });
    // bajo (tri) en 1 y 3, con corchea de paso
    for (const [pos, dm] of [[0, 0], [2, 0], [3.5, 7]]) tone(tr, t0 + pos * beat, beat * 1.6, { f0: mtof(root + dm), gain: 0.2, tau: 0.35, type: 'tri', lp: 500 });
    // kalimba: arpegio en corcheas con variación determinista
    for (let i = 0; i < 8; i++) {
      const on = (b % 4 === 3 && i > 5) ? false : (i % 2 === 0 || rand() > 0.55); if (!on) continue;
      const m = i % 2 === 0 ? chord[(i / 2) % 3] + 24 : scale[Math.floor(rand() * scale.length)];
      tone(tr, t0 + i * beat / 2, 0.7, { f0: mtof(m), gain: 0.085, parts: [[1, 1, 1], [4.2, 0.2, 0.15], [9.1, 0.07, 0.07]], tau: 0.22, pan: -0.35 + (i / 8) * 0.7 });
    }
    // shaker suave en contratiempos
    for (let i = 0; i < 8; i++) noise(tr, t0 + i * beat / 2 + (i % 2 ? 0 : 0), 0.05, { hp: 6000, gain: i % 2 ? 0.05 : 0.025, tau: 0.015, pan: 0.2 });
  }
  // fundido de entrada/salida y ducking
  for (let i = 0; i < tr.n; i++) {
    const t = i / SR; const fin = clamp(t / 1.5), fout = clamp((duration - t) / 1.5); const g = Math.min(fin, fout) * duckEnv[Math.min(duckEnv.length - 1, Math.floor(t * 200))];
    tr.L[i] *= g; tr.R[i] *= g;
  }
  return tr;
}
// envolvente de ducking (200 Hz de control): baja la música cuando suenan efectos
function duck(tl, n) {
  const env = new Float32Array(n).fill(1); const sr = 200;
  const depthAt = new Float32Array(n);
  for (const e of tl.events) { const d = LOUD[e.type] || 0.2; const k0 = Math.floor((e.t - 0.03) * sr), len = Math.floor((e.type === 'bell' ? 1.6 : e.type === 'steam' ? 0.9 : 0.35) * sr);
    for (let k = k0; k < k0 + len && k < n; k++) { if (k < 0) continue; const u = (k - k0) / len; const sh = u < 0.1 ? u / 0.1 : Math.exp(-(u - 0.1) * 3.2); depthAt[k] = Math.max(depthAt[k], d * sh); } }
  let s = 0; for (let k = 0; k < n; k++) { const tgt = depthAt[k]; s += (tgt > s ? 0.5 : 0.03) * (tgt - s); env[k] = 1 - 0.62 * Math.min(1, s * 1.4); }
  return env;
}

function wav(path, L, R, peak = 0.92) {
  let mx = 0; for (let i = 0; i < L.length; i++) mx = Math.max(mx, Math.abs(L[i]), Math.abs(R[i]));
  const g = mx > peak ? peak / mx : 1; const n = L.length; const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.tanh(L[i] * g) * 32767 * 0.98), 44 + i * 4); buf.writeInt16LE(Math.round(Math.tanh(R[i] * g) * 32767 * 0.98), 46 + i * 4); }
  fs.writeFileSync(path, buf); return g;
}

function renderAll(tl, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const secs = tl.duration + 0.5; const N = Math.ceil(secs * SR);
  seed = 1337; const fx = renderFx(tl);
  const music = renderMusic(tl.duration, duck(tl, Math.ceil((tl.duration + 4) * 200)));
  const cut = (a) => a.subarray(0, N);
  const fxG = wav(outDir + '/fx.wav', cut(fx.L), cut(fx.R), 0.9);
  wav(outDir + '/music.wav', cut(music.L), cut(music.R), 0.9);
  // mezcla final: efectos + música (ya con ducking)
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < N; i++) { L[i] = cut(fx.L)[i] * fxG + cut(music.L)[i] * 0.9; R[i] = cut(fx.R)[i] * fxG + cut(music.R)[i] * 0.9; }
  wav(outDir + '/mix.wav', L, R, 0.9);
  return N / SR;
}
module.exports = { renderAll };
if (require.main === module) {
  const [, , dataFile, outDir] = process.argv; const tl = TL.build(JSON.parse(fs.readFileSync(dataFile, 'utf8')));
  const t0 = Date.now(); const d = renderAll(tl, outDir); console.log('audio listo', d.toFixed(1) + 's', (Date.now() - t0) + 'ms', 'eventos:', tl.events.length);
}
