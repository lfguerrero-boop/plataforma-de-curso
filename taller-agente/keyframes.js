// node keyframes.js data.json out/ t1 t2 t3 ...  → PNG por cada instante (revisión visual)
'use strict';
const fs = require('fs');
const { createCanvas } = require('@napi-rs/canvas');
const TL = require('./timeline');
const { drawScene } = require('./scene');
const [, , dataFile, outDir, ...ts] = process.argv;
const tl = TL.build(JSON.parse(fs.readFileSync(dataFile, 'utf8')));
fs.mkdirSync(outDir, { recursive: true });
const cv = createCanvas(1920, 1080); const ctx = cv.getContext('2d');
console.log('duración', tl.duration.toFixed(2));
for (const t of ts.map(Number)) {
  const t0 = Date.now(); drawScene(ctx, 1920, 1080, t, tl);
  fs.writeFileSync(`${outDir}/f_${t.toFixed(1).padStart(5, '0')}.png`, cv.toBuffer('image/png'));
  console.log('t=' + t, (Date.now() - t0) + 'ms');
}
