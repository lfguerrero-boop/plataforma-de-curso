// node render.js data.json out/ [workers]  → out/video.mp4 (con audio), out/fx.wav, out/music.wav
// Cada worker renderiza un rango de frames y los pasa en bruto a su propio ffmpeg; luego se concatenan y se mezcla el audio.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const FFMPEG = require('ffmpeg-static');
const FPS = 30, W = 1920, H = 1080;

async function worker(dataFile, chunk, a, b) {
  const { createCanvas } = require('@napi-rs/canvas');
  const TL = require('./timeline'); const { drawScene } = require('./scene');
  const tl = TL.build(JSON.parse(fs.readFileSync(dataFile, 'utf8')));
  const cv = createCanvas(W, H), ctx = cv.getContext('2d');
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', chunk], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = a; f < b; f++) {
    drawScene(ctx, W, H, f / FPS, tl);
    const buf = Buffer.from(cv.data()); // copia: el canvas se reutiliza
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 30 === 0) process.stderr.write(`[${a}-${b}] frame ${f}\n`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
}

async function main() {
  const [, , dataFile, outDir, nw] = process.argv;
  if (process.env.WORKER) { const [a, b] = process.env.WORKER.split(',').map(Number); return worker(dataFile, process.env.CHUNK, a, b); }
  const TL = require('./timeline'); const tl = TL.build(JSON.parse(fs.readFileSync(dataFile, 'utf8')));
  fs.mkdirSync(outDir, { recursive: true });
  const total = Math.floor(tl.duration * FPS), workers = Number(nw) || 4;
  console.log(`duración ${tl.duration.toFixed(2)} s, ${total} frames, ${workers} procesos`);
  const t0 = Date.now();
  // audio (en paralelo con los frames)
  const audioP = new Promise((res) => { const p = spawn(process.execPath, ['audio.js', dataFile, outDir], { stdio: 'inherit' }); p.on('close', res); });
  const per = Math.ceil(total / workers), chunks = [], procs = [];
  for (let i = 0; i < workers; i++) {
    const a = i * per, b = Math.min(total, a + per); if (a >= b) break;
    const chunk = path.join(outDir, `chunk_${i}.mp4`); chunks.push(chunk);
    procs.push(new Promise((res, rej) => { const p = spawn(process.execPath, [__filename, dataFile, outDir], { env: { ...process.env, WORKER: `${a},${b}`, CHUNK: chunk }, stdio: ['ignore', 'inherit', 'inherit'] }); p.on('close', (c) => (c ? rej(new Error('worker ' + i + ' falló')) : res())); }));
  }
  await Promise.all(procs.concat(audioP));
  console.log('frames y audio listos en', ((Date.now() - t0) / 1000).toFixed(0), 's; uniendo…');
  const list = path.join(outDir, 'chunks.txt'); fs.writeFileSync(list, chunks.map((c) => `file '${path.resolve(c).replace(/\\/g, '/')}'`).join('\n'));
  const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', path.join(outDir, 'mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', path.join(outDir, 'video.mp4')], { stdio: 'inherit' });
  if (r.status) throw new Error('ffmpeg final falló');
  for (const c of chunks) fs.unlinkSync(c); fs.unlinkSync(list);
  console.log('listo', path.join(outDir, 'video.mp4'), ((Date.now() - t0) / 1000).toFixed(0) + ' s totales');
}
main().catch((e) => { console.error(e); process.exit(1); });
