// E2E: reseñas y calificación promedio con las Server Actions reales.
// Requiere: servidor en E2E_BASE (por defecto http://localhost:3000), .env.local y SUPABASE_ACCESS_TOKEN.
// Crea usuarios de prueba con correos @example.com y los borra al terminar.
const { createRequire } = require("module");
const path = require("path");
const { execSync } = require("child_process");
const root = path.resolve(__dirname, "..", "..");
process.loadEnvFile(path.join(root, ".env.local"));
const req = createRequire(path.join(root, "package.json"));
const { createClient } = req("@supabase/supabase-js");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const REF = URL.split("//")[1].split(".")[0];
const BASE = (process.env.E2E_BASE || "http://localhost:3000");
const suffix = Date.now();
const PASS = "Prueba-12345";
const mk = () => createClient(URL, KEY, { auth: { persistSession: false } });
const sql = (q) =>
  execSync(`npx supabase db query --linked "${q}"`, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const out = {};
const ok = (v) => (v ? "OK" : "FALLO");
const clean = (h) => h.replace(/<!--.*?-->/g, "");

const cookieFor = (s) =>
  `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(s)).toString("base64url")}`;
async function get(p, cookie) {
  const r = await fetch(BASE + p, { redirect: "manual", headers: cookie ? { cookie } : {} });
  return { status: r.status, html: clean(await r.text()) };
}
async function user(tag, role) {
  const sb = mk();
  const email = `${tag}.${suffix}@example.com`;
  const { data, error } = await sb.auth.signUp({ email, password: PASS, options: { data: { role } } });
  if (error) throw new Error(`${tag}: ${error.message}`);
  return { sb, id: data.user.id, email, cookie: cookieFor((await sb.auth.getSession()).data.session) };
}
async function submit(pagePath, cookie, pick, values = {}) {
  const page = await get(pagePath, cookie);
  const form = [...page.html.matchAll(/<form[\s\S]*?<\/form>/g)].map((m) => m[0]).find(pick);
  if (!form) return { error: "formulario no encontrado" };
  const fd = new FormData();
  for (const m of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const name = m[0].match(/name="([^"]*)"/)?.[1];
    const value = (m[0].match(/value="([^"]*)"/)?.[1] ?? "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    if (name) fd.append(name, value);
  }
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  const r = await fetch(BASE + pagePath, { method: "POST", body: fd, redirect: "manual", headers: { cookie } });
  return { status: r.status, html: clean(await r.text()) };
}

(async () => {
  const emails = [];
  try {
    const I = await user("resinst", "instructor"); emails.push(I.email);
    const S1 = await user("resest1", "student"); emails.push(S1.email);
    const S2 = await user("resest2", "student"); emails.push(S2.email);
    const S3 = await user("resest3", "student"); emails.push(S3.email);

    const mkCourse = async (title) => {
      const { data: c } = await I.sb.from("courses")
        .insert({ instructor_id: I.id, title, category: "seo", level: "basic" }).select("id").single();
      const { data: m } = await I.sb.from("modules").insert({ course_id: c.id, title: "M" }).select("id").single();
      await I.sb.from("lessons").insert({ module_id: m.id, title: "L" });
      await I.sb.from("courses").update({ status: "published" }).eq("id", c.id);
      return c.id;
    };
    const c = await mkCourse("CursoConResenas");
    const cVacio = await mkCourse("CursoSinResenas");
    const page = `/cursos/${c}`;
    const hasRating = (f) => f.includes('name="rating"');
    const isDelete = (f) => f.includes('name="course_id"') && !f.includes('name="rating"') && !f.includes('name="lesson_id"') && f.includes("Borrar mi reseña");

    // Inscripciones (los estudiantes 1 y 2; el 3 no se inscribe)
    await S1.sb.from("enrollments").insert({ student_id: S1.id, course_id: c });
    await S2.sb.from("enrollments").insert({ student_id: S2.id, course_id: c });

    // Antes de reseñar
    let pg = await get(page, S3.cookie);
    out.no_inscrito_sin_formulario = ok(!pg.html.includes('name="rating"'));
    out.sin_resenas_sin_calificar = ok(pg.html.includes("Sin calificar") && pg.html.includes("Aún no hay reseñas"));
    pg = await get(page, S1.cookie);
    out.inscrito_ve_formulario = ok(pg.html.includes('name="rating"'));

    // Reseñas reales
    const r1 = await submit(page, S1.cookie, hasRating, { rating: "5", comment: "Excelente curso" });
    out.reseña_guardada = ok(r1.html.includes("Reseña guardada"));
    await submit(page, S2.cookie, hasRating, { rating: "4", comment: "Muy bueno" });

    const anon = await get(page);
    out.anonimo_lee_resenas = ok(anon.html.includes("Excelente curso") && anon.html.includes("Muy bueno"));
    out.promedio_4_5 = ok(anon.html.includes("4.5 / 5") && anon.html.includes("2 reseñas"));
    const cat = await get("/");
    out.catalogo_promedio = ok(cat.html.includes("4.5/5 (2)"));
    out.catalogo_sin_calificar = ok(cat.html.includes("Sin calificar"));
    void cVacio;

    // Rango inválido
    const bad = await submit(page, S1.cookie, hasRating, { rating: "9", comment: "x" });
    out.rango_invalido_rechazado = ok(bad.html.includes("entero de 1 a 5"));

    // Actualizar sin duplicar
    await submit(page, S1.cookie, hasRating, { rating: "2", comment: "Cambié de opinión" });
    pg = await get(page, S1.cookie);
    out.actualiza_sin_duplicar = ok(pg.html.includes("2/5") && pg.html.includes("Cambié de opinión") && !pg.html.includes("Excelente curso"));
    out.promedio_recalculado = ok(pg.html.includes("3.0 / 5") && pg.html.includes("2 reseñas"));
    out.una_sola_fila = ok(sql(`select count(*) as n from public.reviews where student_id='${S1.id}' and course_id='${c}'`).includes('"n": 1'));
    out.marca_tu_reseña = ok(pg.html.includes("(tu reseña)"));

    // Borrar la propia
    await submit(page, S1.cookie, isDelete);
    pg = await get(page, S1.cookie);
    out.borrar_resena = ok(!pg.html.includes("Cambié de opinión") && pg.html.includes("Muy bueno") && pg.html.includes("4.0 / 5") && pg.html.includes("1 reseña"));

    // Instructor: sin formulario
    const ins = await get(page, I.cookie);
    out.instructor_sin_formulario = ok(!ins.html.includes('name="rating"'));
  } catch (e) {
    out.error = e.message;
  } finally {
    const list = emails.map((e) => `'${e}'`).join(",");
    if (list) sql(`delete from auth.users where email in (${list})`);
    out.limpieza = sql("select (select count(*) from auth.users) as usuarios, (select count(*) from public.courses) as cursos, (select count(*) from public.reviews) as resenas").replace(/\s+/g, " ").match(/"(cursos|usuarios|resenas)": \d+/g)?.join(", ");
    console.log(JSON.stringify(out, null, 2));
  }
})();
