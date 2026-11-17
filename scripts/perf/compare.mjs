// Compara las medianas de una carpeta de resultados con la línea base (reports/perf/antes).
// Uso: node scripts/perf/compare.mjs reports/perf/<carpeta>
import { readFileSync } from "node:fs";
const dir = process.argv[2];
const BASE = process.argv[3] ?? "reports/perf/antes";
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const load = (d) => JSON.parse(readFileSync(`${d}/summary.json`, "utf8")).pages;
const base = Object.fromEntries(load(BASE).map((p) => [p.id, p]));
const raw = (d, id) => [1, 2, 3, 4, 5].map((i) => { try { return JSON.parse(readFileSync(`${d}/raw/${id}-run${i}.json`, "utf8")).audits; } catch { return null; } }).filter(Boolean);
const tbt = (d, id) => med(raw(d, id).map((a) => a["total-blocking-time"].numericValue));
console.log("| página | puntaje antes→después | LCP s | TBT ms | peso KiB | CLS |\n|---|---|---|---|---|---|");
for (const p of load(dir)) {
  const b = base[p.id] ?? p;
  console.log(`| ${p.id} | ${b.median.score}→${p.median.score} | ${(b.median.lcp / 1000).toFixed(2)}→${(p.median.lcp / 1000).toFixed(2)} | ${Math.round(tbt(BASE, p.id))}→${Math.round(tbt(dir, p.id))} | ${Math.round(b.median.bytes / 1024)}→${Math.round(p.median.bytes / 1024)} | ${b.median.cls.toFixed(3)}→${p.median.cls.toFixed(3)} |`);
  console.log(`|   corridas | ${b.runs.map((r) => r.score)}→${p.runs.map((r) => r.score)} | | | | |`);
}
