#!/usr/bin/env bash
# Un ciclo de verificación de un arreglo: pruebas -> build -> servidor -> Lighthouse -> comparación.
# Uso: [RUNS=5] scripts/perf/cycle.sh <nombre-carpeta> <ids-de-página, p. ej. 01,02> [carpeta-base]
set -u
NAME=$1; ONLY_IDS=$2; BASE=${3:-reports/perf/antes}; OUT=reports/perf/$NAME
cd "$(dirname "$0")/../.."
echo "== pruebas"; npm run test:unit 2>&1 | grep -E "Tests|FAIL|failed"
npm run test:integration 2>&1 | grep -E "Tests|FAIL|failed"
npx tsc --noEmit 2>&1 | tail -3; echo "tsc exit: ${PIPESTATUS[0]}"
npx eslint src 2>&1 | tail -4
echo "== build"
PID=$(netstat -ano | grep ":3123 " | grep LISTENING | awk '{print $5}' | head -1); [ -n "$PID" ] && taskkill //F //PID "$PID" >/dev/null 2>&1
npm run build > "$TEMP/build.log" 2>&1 || { tail -30 "$TEMP/build.log"; echo BUILD FALLO; exit 1; }
(npx next start -p 3123 > "$TEMP/next-start.log" 2>&1 &)
for i in $(seq 1 30); do curl -s -o /dev/null localhost:3123/ && break; sleep 1; done
echo "== lighthouse ($ONLY_IDS)"
rm -rf "$OUT"; ONLY=$ONLY_IDS node scripts/perf/lighthouse-audit.mjs "$OUT" http://localhost:3123 2>&1 | grep -E "run|OK|Error|borrados"
node scripts/perf/compare.mjs "$OUT" "$BASE"
