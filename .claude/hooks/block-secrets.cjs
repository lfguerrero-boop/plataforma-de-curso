#!/usr/bin/env node
// Hook PreToolUse (Write|Edit|NotebookEdit): bloquea editar .env* y escribir llaves de API.
// Salida con código 2 = bloquea la herramienta; stderr se le muestra a Claude.
const path = require('path');

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }
  const ti = input.tool_input || {};
  const file = ti.file_path || ti.notebook_path || '';
  const base = path.basename(file);

  // 1) Archivos .env (se permiten plantillas sin secretos reales)
  const isEnv = /^\.env(\..+)?$/i.test(base) && !/\.(example|sample|template|dist)$/i.test(base);
  if (isEnv) {
    block(`Edición bloqueada: «${base}» es un archivo de entorno y contiene secretos. ` +
      `Este repositorio es público y la política del proyecto es no tocar .env* desde el agente. ` +
      `Pide al usuario que lo edite a mano, o usa un .env.example con valores de ejemplo.`);
  }

  // 2) Contenido que parece una llave de API
  const text = [ti.content, ti.new_string, ti.new_source].filter((x) => typeof x === 'string').join('\n');
  const patterns = [
    ['JWT (p. ej. clave anon/service_role de Supabase)', /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{0,}/],
    ['clave secreta de Supabase (sb_secret_/sbp_)', /\b(sb_secret_|sbp_)[A-Za-z0-9_-]{16,}/],
    ['clave estilo OpenAI/Anthropic (sk-…)', /\bsk-[A-Za-z0-9_-]{20,}/],
    ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
    ['token de GitHub', /\bgh[pousr]_[A-Za-z0-9]{30,}/],
    ['clave de Google API', /\bAIza[0-9A-Za-z_-]{35}\b/],
    ['token de Slack', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
    ['clave privada PEM', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
    ['asignación de secreto con valor largo (api_key/secret/token/password = "…")',
      /\b(api[_-]?key|secret|token|password|passwd)\b["']?\s*[:=]\s*["'][A-Za-z0-9_\-\/+=]{24,}["']/i],
  ];
  for (const [name, re] of patterns) {
    if (re.test(text)) {
      block(`Edición bloqueada en «${file || 'archivo'}»: el contenido parece una llave de API (${name}). ` +
        `No se deben escribir secretos en archivos del repositorio (es público). ` +
        `Usa variables de entorno (.env.local, ignorado por git) o Supabase Vault, y deja en el código solo process.env.NOMBRE.`);
    }
  }
  process.exit(0);
});

function block(msg) {
  process.stderr.write(msg + '\n');
  process.exit(2);
}
