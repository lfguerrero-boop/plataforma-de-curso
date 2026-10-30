// Ejecuta todas las pruebas SQL de RLS (supabase/tests/*.sql) contra el proyecto enlazado.
// Cada archivo corre dentro de una transacción que termina en ROLLBACK, así que no deja datos.
// Requiere SUPABASE_ACCESS_TOKEN (o `npx supabase login`) y `npx supabase link` hechos.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "supabase", "tests");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

let failed = 0;
for (const file of files) {
  try {
    execFileSync(
      "npx",
      ["supabase", "db", "query", "--linked", "-f", join("supabase", "tests", file)],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" },
    );
    console.log(`  OK     ${file}`);
  } catch (error) {
    failed++;
    const detail = String(error.stdout ?? "") + String(error.stderr ?? "");
    const message = detail.match(/ERROR:[^\\"]*|"message":"[^"]*"/)?.[0] ?? detail.slice(0, 300);
    console.log(`  FALLO  ${file}\n         ${message.trim()}`);
  }
}

console.log(`\n${files.length - failed}/${files.length} archivos de prueba RLS pasaron`);
process.exit(failed ? 1 : 0);
