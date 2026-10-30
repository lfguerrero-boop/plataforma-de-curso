// node extract-session.js [archivo.jsonl] → data.full.json (todos los pasos, anonimizados) + data.json (condensado, mismo orden)
// Lee el registro .jsonl más reciente de ESTA carpeta en ~/.claude/projects y convierte las llamadas a herramientas en guion.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const TL = require('./timeline');

function latestLog() {
  const dir = path.join(os.homedir(), '.claude', 'projects');
  const proj = fs.readdirSync(dir).filter((d) => /sesion-4$/.test(d))[0];
  const files = fs.readdirSync(path.join(dir, proj)).filter((f) => f.endsWith('.jsonl')).map((f) => ({ f: path.join(dir, proj, f), m: fs.statSync(path.join(dir, proj, f)).mtimeMs }));
  files.sort((a, b) => b.m - a.m); return files[0].f;
}

// ── anonimización: solo se emiten etiquetas generadas por reglas; nunca rutas, correos ni claves ──
const base = (p) => path.basename(String(p || '').replace(/\\/g, '/'));
const SAFE = (s) => String(s).replace(/[A-Za-z]:[\\/][^\s"']+/g, '<ruta>').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<correo>').replace(/\b(sk|sb|eyJ)[\w-]{12,}/g, '<clave>');
function labelFor(name, input) {
  const cmd = String(input.command || '');
  switch (name) {
    case 'Write': return 'escribe ' + base(input.file_path);
    case 'Edit': return 'edita ' + base(input.file_path);
    case 'Read': return /\.(png|jpe?g)$/i.test(input.file_path || '') ? 'mira un frame' : 'lee ' + base(input.file_path);
    case 'Grep': case 'Glob': return 'busca en el proyecto';
    case 'Bash': case 'PowerShell':
      if (/npm i|npm init|npm install/.test(cmd)) return 'instala dependencias';
      if (/keyframes/.test(cmd)) return 'renderiza frames clave';
      if (/render\.js/.test(cmd)) return 'renderiza el video final';
      if (/audio\.js/.test(cmd)) return 'sintetiza el audio';
      if (/extract-session/.test(cmd)) return 'lee el registro de la sesión';
      if (/sleep|until/.test(cmd)) return 'espera una tarea';
      if (/node -e|node -|patch\(/.test(cmd)) return 'prueba o ajusta el código';
      if (/ls |node -v|--version|where |python/.test(cmd)) return 'revisa el entorno';
      if (/\.jsonl|wc -l/.test(cmd)) return 'inspecciona el registro';
      return 'ejecuta un comando';
    case 'Artifact': return 'publica un artefacto';
    default: return 'usa ' + name;
  }
}
function errorGloss(text) {
  const t = String(text || '');
  if (/unexpected EOF|syntax error/i.test(t)) return 'comando mal cerrado';
  if (/Blocked/i.test(t)) return 'comando bloqueado';
  if (/Cannot find module|MODULE_NOT_FOUND/i.test(t)) return 'módulo no encontrado';
  if (/does not exist|ENOENT/i.test(t)) return 'archivo inexistente';
  if (/InputValidation/i.test(t)) return 'parámetros inválidos';
  if (/no encontrado|not found/i.test(t)) return 'texto no encontrado';
  if (/TypeError|ReferenceError|Error:/.test(t)) return 'error en el código';
  if (/Exit code/i.test(t)) return 'el comando falló';
  return 'algo falló';
}

function readSteps(file) {
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const results = {};
  for (const l of lines) if (l.type === 'user' && Array.isArray(l.message && l.message.content)) for (const c of l.message.content) if (c.type === 'tool_result') {
    const txt = typeof c.content === 'string' ? c.content : JSON.stringify(c.content);
    results[c.tool_use_id] = { err: !!c.is_error || /^Exit code [1-9]/.test(txt), text: txt };
  }
  const steps = [];
  for (const l of lines) if (l.type === 'assistant') for (const c of l.message.content || []) if (c.type === 'tool_use') {
    const r = results[c.id]; if (!r) continue; // llamada aún sin resultado (la actual)
    const s = { tool: c.name, label: SAFE(labelFor(c.name, c.input || {})) };
    if (r.err) { s.error = true; s.errorText = errorGloss(r.text); }
    steps.push(s);
  }
  return steps;
}

// ── condensación: conserva el orden; máx. 2 corridas de error con su arreglo; el resto se agrupa en tramos contiguos ──
function condense(full, maxNormal) {
  // corridas de error: [i0..i1] consecutivas; el paso i1+1 es el arreglo
  const runs = []; for (let i = 0; i < full.length; i++) if (full[i].error) { let j = i; while (j + 1 < full.length && full[j + 1].error) j++; runs.push([i, j]); i = j; }
  let keep = runs.filter((r) => r[1] + 1 < full.length);
  if (keep.length > 2) { // se prefieren los fallos cuyo arreglo usó OTRA herramienta (más informativos); luego, los más tempranos
    const score = (r) => (full[r[1] + 1].tool !== full[r[1]].tool ? 0 : 1);
    keep = keep.map((r, i) => ({ r, i, s: score(r) })).sort((a, b) => a.s - b.s || a.i - b.i).slice(0, 2).map((x) => x.r).sort((a, b) => a[0] - b[0]);
  }
  const out = []; let cursor = 0; const groups = [];
  for (const [a, b] of keep) { if (a > cursor) groups.push({ type: 'run', steps: full.slice(cursor, a) }); groups.push({ type: 'pair', err: full[b], fix: full[b + 1], n: b - a + 1 }); cursor = b + 2; }
  if (cursor < full.length) groups.push({ type: 'run', steps: full.slice(cursor) });
  const runsG = groups.filter((g) => g.type === 'run'); const total = runsG.reduce((s, g) => s + g.steps.length, 0);
  // reparte los cupos entre tramos (al menos 1 por tramo no vacío), proporcional a su tamaño
  let quota = runsG.map((g) => Math.max(1, Math.round(maxNormal * g.steps.length / Math.max(1, total))));
  while (quota.reduce((a, b) => a + b, 0) > maxNormal && quota.some((q) => q > 1)) quota[quota.indexOf(Math.max(...quota))]--;
  let qi = 0;
  for (const g of groups) {
    if (g.type === 'pair') { out.push({ ...g.err, label: g.n > 1 ? g.n + ' fallos seguidos' : g.err.label }); out.push({ tool: g.fix.tool, label: g.fix.label }); continue; }
    const k = Math.min(quota[qi++], g.steps.length); const per = g.steps.length / k;
    for (let c = 0; c < k; c++) {
      const chunk = g.steps.slice(Math.round(c * per), Math.round((c + 1) * per)); if (!chunk.length) continue;
      const cnt = {}; chunk.forEach((s) => (cnt[s.tool] = (cnt[s.tool] || 0) + 1)); const ranked = Object.keys(cnt).sort((x, y) => cnt[y] - cnt[x]); const prev = out.length ? out[out.length - 1].tool : null; const tool = ranked.find((x) => x !== prev) || ranked[0]; // evita beats vecinos con la misma herramienta
      const mix = Object.keys(cnt).sort((x, y) => cnt[y] - cnt[x]).slice(0, 2).join('+');
      out.push({ tool, label: chunk.length === 1 ? chunk[0].label : chunk.length + ' pasos: ' + mix, group: chunk.length });
    }
  }
  return out;
}

if (require.main === module) {
  const file = process.argv[2] || latestLog();
  const full = readSteps(file);
  const task = 'Animar cómo trabaja un agente de IA';
  fs.writeFileSync('data.full.json', JSON.stringify({ task, steps: full }, null, 2));
  let best = null;
  for (let nn = 5; nn >= 1; nn--) { const steps = condense(full, nn); const tl = TL.build({ task, steps }); best = { steps, nn, dur: tl.duration }; if (tl.duration <= 59.6) break; }
  fs.writeFileSync('data.json', JSON.stringify({ task, steps: best.steps }, null, 2));
  console.log(`registro: ${path.basename(file)} (nombre del archivo no se publica)`); console.log(`pasos reales: ${full.length}; errores: ${full.filter((s) => s.error).length}; condensados: ${best.steps.length}; duración estimada ${best.dur.toFixed(1)} s`);
  console.log(best.steps.map((s, i) => `${i + 1}. ${s.tool}${s.error ? ' [ERROR: ' + s.errorText + ']' : ''} — ${s.label}`).join('\n'));
}
module.exports = { readSteps, condense };
