// Auditoría de rendimiento con Lighthouse (perfil móvil por defecto), 3 corridas por página.
// Uso: node scripts/perf/lighthouse-audit.mjs <carpeta-de-salida> [BASE_URL]
//   p. ej. node scripts/perf/lighthouse-audit.mjs reports/perf/antes http://localhost:3123
// Requiere la app en producción (npm run build && npx next start -p 3123) y .env.local con
// SUPABASE_SERVICE_ROLE_KEY. Crea usuarios @example.com y un curso de prueba en el Supabase
// remoto SOLO para medir las rutas con sesión, y los borra al terminar (bloque finally).
// Las sesiones por rol se guardan en playwright/.auth/ (ignorado por git).
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import { createClient } from "@supabase/supabase-js";

const OUT = process.argv[2] ?? "reports/perf/antes";
const BASE = process.argv[3] ?? "http://localhost:3123";
const RUNS = Number(process.env.RUNS ?? 3);
const ONLY = process.env.ONLY; // p. ej. ONLY=01 para medir una sola página
const PASSWORD = "Prueba-12345";
const PORT = 9333;

try { process.loadEnvFile(".env.local"); } catch {}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

async function newUser(role) {
  const email = `perf-${role}.${Date.now()}.${randomUUID().slice(0, 6)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true, user_metadata: { role },
  });
  if (error) throw new Error(error.message);
  return { id: data.user.id, email };
}

async function saveSession(browser, user, file) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }), page.click('button[type="submit"]')]);
  await ctx.storageState({ path: file });
  await ctx.close();
}

const created = [];
mkdirSync(join(OUT, "raw"), { recursive: true });
mkdirSync("playwright/.auth", { recursive: true });
let browser;
try {
  // --- datos de prueba (solo para rutas con sesión) ---
  const instructor = await newUser("instructor"); created.push(instructor.id);
  const student = await newUser("student"); created.push(student.id);
  const courseId = randomUUID(), moduleId = randomUUID(), lessonId = randomUUID();
  must(await admin.from("courses").insert({ id: courseId, instructor_id: instructor.id, title: "Curso de medición de rendimiento", description: "Curso temporal para auditoría", category: "seo", level: "basic" }), "curso");
  must(await admin.from("modules").insert({ id: moduleId, course_id: courseId, title: "Módulo 1" }), "módulo");
  must(await admin.from("lessons").insert({ id: lessonId, module_id: moduleId, title: "Lección 1" }), "lección");
  must(await admin.from("lesson_contents").insert({ lesson_id: lessonId, body: "Texto de la lección. ".repeat(150) }), "contenido");
  must(await admin.from("courses").update({ status: "published" }).eq("id", courseId), "publicar");
  must(await admin.from("enrollments").insert({ student_id: student.id, course_id: courseId }), "inscripción");
  // curso público real para la ficha del visitante
  const pub = must(await admin.from("courses").select("id,title").eq("status", "published").neq("id", courseId).order("created_at").limit(1), "curso público");
  const publicCourse = pub[0]?.id ?? courseId;

  // --- Chromium propio (Playwright) con depuración remota para Lighthouse ---
  const loginBrowser = await chromium.launch();
  await saveSession(loginBrowser, student, "playwright/.auth/student.json");
  await saveSession(loginBrowser, instructor, "playwright/.auth/instructor.json");
  await loginBrowser.close();
  // Contexto persistente = contexto por defecto del navegador, el que Lighthouse usa por CDP.
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  browser = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "lh-")), { channel: "chrome", headless: false, args: [`--remote-debugging-port=${PORT}`] });
  const { readFileSync } = await import("node:fs");
  const cookiesOf = (f) => JSON.parse(readFileSync(f, "utf8")).cookies;

  const pages = [
    { id: "01-portada", path: "/", role: "visitante" },
    { id: "02-busqueda", path: "/?q=seo", role: "visitante" },
    { id: "03-curso", path: `/cursos/${publicCourse}`, role: "visitante" },
    { id: "03b-curso-estudiante", path: `/cursos/${courseId}`, role: "estudiante" },
    { id: "04-leccion-estudiante", path: `/cursos/${courseId}/lecciones/${lessonId}`, role: "estudiante" },
    { id: "05-leccion-instructor", path: `/instructor/cursos/${courseId}/lecciones/${lessonId}`, role: "instructor" },
  ];
  const cookieFile = { visitante: null, estudiante: "playwright/.auth/student.json", instructor: "playwright/.auth/instructor.json" };

  const summary = [];
  for (const p of pages.filter((x) => !ONLY || ONLY.split(",").some((o) => x.id.startsWith(o)))) {
    const rows = [];
    for (let i = 1; i <= RUNS; i++) {
      // Contexto por corrida: solo las cookies del rol, sin caché previa.
      const ctx = browser;
      await ctx.clearCookies();
      if (cookieFile[p.role]) await ctx.addCookies(cookiesOf(cookieFile[p.role]));
      const res = await lighthouse(`${BASE}${p.path}`, { port: PORT, output: "json", logLevel: "error", onlyCategories: ["performance"] });
      writeFileSync(join(OUT, "raw", `${p.id}-run${i}.json`), res.report);
      const lhr = res.lhr;
      if (lhr.runtimeError) throw new Error(`${p.id}: ${lhr.runtimeError.message}`);
      const a = lhr.audits;
      rows.push({
        score: Math.round(lhr.categories.performance.score * 100),
        lcp: a["largest-contentful-paint"].numericValue,
        cls: a["cumulative-layout-shift"].numericValue,
        bytes: a["total-byte-weight"].numericValue,
        finalUrl: lhr.finalDisplayedUrl,
      });
      console.error(`${p.id} run${i}: score ${rows.at(-1).score}, LCP ${Math.round(rows.at(-1).lcp)} ms`);
    }
    summary.push({
      ...p,
      runs: rows,
      median: {
        score: median(rows.map((r) => r.score)),
        lcp: median(rows.map((r) => r.lcp)),
        cls: median(rows.map((r) => r.cls)),
        bytes: median(rows.map((r) => r.bytes)),
      },
      finalUrl: rows[0].finalUrl,
    });
  }
  writeFileSync(join(OUT, "summary.json"), JSON.stringify({ base: BASE, runs: RUNS, date: new Date().toISOString(), pages: summary }, null, 2));
  console.log("OK");
} finally {
  await browser?.close();
  for (const id of created) await admin.auth.admin.deleteUser(id).catch((e) => console.error("limpieza:", e.message));
  console.error(`usuarios de prueba borrados: ${created.length}`);
}
