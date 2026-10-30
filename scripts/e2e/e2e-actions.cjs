// E2E: Server Actions reales del instructor y del estudiante (formularios sin JS).
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
  const { data, error } = await sb.auth.signUp({ email, password: PASS, options: { data: { role, full_name: tag } } });
  if (error) throw new Error(`${tag}: ${error.message}`);
  return { sb, id: data.user.id, email, cookie: cookieFor((await sb.auth.getSession()).data.session) };
}

async function submit(pagePath, cookie, pick, values = {}, file) {
  const page = await get(pagePath, cookie);
  const forms = [...page.html.matchAll(/<form[\s\S]*?<\/form>/g)].map((m) => m[0]);
  const form = forms.find(pick);
  if (!form) return { error: "formulario no encontrado en " + pagePath };
  const fd = new FormData();
  for (const m of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const name = m[0].match(/name="([^"]*)"/)?.[1];
    const value = (m[0].match(/value="([^"]*)"/)?.[1] ?? "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    if (name) fd.append(name, value);
  }
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  if (file) fd.set("file", file, "recurso.txt");
  const r = await fetch(BASE + pagePath, { method: "POST", body: fd, redirect: "manual", headers: { cookie } });
  return { status: r.status, location: r.headers.get("location"), html: clean(await r.text()) };
}

(async () => {
  const emails = [];
  try {
    const I = await user("accinst", "instructor"); emails.push(I.email);
    const S = await user("accest", "student"); emails.push(S.email);
    const hasName = (n) => (f) => f.includes(`name="${n}"`);

    // ---- Instructor: crear curso (acción real) → redirige al detalle
    const created = await submit("/instructor/cursos/nuevo", I.cookie, hasName("title"),
      { title: "CursoPorAccion", description: "desc", category: "seo", level: "basic" });
    out.crear_curso_redirige = ok(created.status === 303 && /\/instructor\/cursos\/[0-9a-f-]{36}/.test(created.location || ""));
    const courseId = (created.location || "").match(/cursos\/([0-9a-f-]{36})/)?.[1];
    const coursePath = `/instructor/cursos/${courseId}`;

    const vacio = await submit("/instructor/cursos/nuevo", I.cookie, hasName("title"),
      { title: "  ", category: "seo", level: "basic" });
    out.crear_curso_titulo_vacio_error = ok(vacio.html.includes("El título es obligatorio"));

    // ---- Publicar sin lecciones → mensaje de error de la regla
    const pubVacio = await submit(coursePath, I.cookie, (f) => f.includes('value="published"'));
    out.publicar_vacio_muestra_error = ok(pubVacio.html.includes("al menos una lección"));

    // ---- Editar datos del curso (acción real)
    const edited = await submit(coursePath, I.cookie,
      (f) => f.includes('name="description"') && f.includes('name="title"') && f.includes('name="course_id"'),
      { title: "CursoPorAccion", description: "descripcion editada", category: "analytics", level: "advanced" });
    out.editar_curso = ok(edited.html.includes("Curso guardado"));
    const afterEdit = await get(coursePath, I.cookie);
    out.edicion_persiste = ok(afterEdit.html.includes("descripcion editada"));

    // ---- Módulo y lección
    await submit(coursePath, I.cookie, (f) => f.includes('placeholder="Título del módulo"'), { title: "ModuloAccion" });
    let pg = await get(coursePath, I.cookie);
    out.agregar_modulo = ok(pg.html.includes("ModuloAccion"));
    await submit(coursePath, I.cookie, (f) => f.includes('placeholder="Título de la lección"'), { title: "LeccionAccion" });
    pg = await get(coursePath, I.cookie);
    out.agregar_leccion = ok(pg.html.includes("LeccionAccion"));
    const lessonId = pg.html.match(/lecciones\/([0-9a-f-]{36})/)?.[1];
    const lessonPath = `${coursePath}/lecciones/${lessonId}`;

    // ---- Contenido, video y recurso
    const saved = await submit(lessonPath, I.cookie, hasName("video_url"),
      { body: "TextoPorAccion", video_url: "https://youtu.be/accion" });
    out.guardar_leccion = ok(saved.html.includes("Lección guardada"));
    const badVideo = await submit(lessonPath, I.cookie, hasName("video_url"),
      { body: "x", video_url: "javascript:alert(1)" });
    out.video_invalido_rechazado = ok(badVideo.html.includes("http://"));
    const up = await submit(lessonPath, I.cookie, hasName("file"), {}, new Blob(["archivo por accion"], { type: "text/plain" }));
    out.subir_recurso = ok(up.html.includes("Recurso subido"));
    pg = await get(lessonPath, I.cookie);
    out.recurso_listado = ok(pg.html.includes("recurso.txt") && pg.html.includes("TextoPorAccion"));

    // ---- Publicar con lección → estado publicado
    await submit(coursePath, I.cookie, (f) => f.includes('value="published"'));
    pg = await get(coursePath, I.cookie);
    out.publicar_ok = ok(pg.html.includes("Estado: Publicado"));
    const cat = await get("/");
    out.aparece_en_catalogo = ok(cat.html.includes("CursoPorAccion"));

    // ---- Estudiante: inscribirse (acción real)
    const coursePub = `/cursos/${courseId}`;
    const enr = await submit(coursePub, S.cookie, hasName("course_id"));
    out.inscribirse_redirige = ok(enr.status === 303);
    pg = await get(coursePub, S.cookie);
    out.inscrito_en_pagina = ok(pg.html.includes("Estás inscrito"));
    const again = await submit(coursePub, S.cookie, hasName("course_id"));
    out.doble_inscripcion_sin_duplicar = ok(
      sql(`select count(*) as n from public.enrollments where course_id = '${courseId}'`).includes('"n": 1'),
    );
    void again;

    // ---- Estudiante: marcar y desmarcar lección (acción real)
    const stuLesson = `/cursos/${courseId}/lecciones/${lessonId}`;
    await submit(stuLesson, S.cookie, hasName("completed"));
    pg = await get(coursePub, S.cookie);
    out.marcar_completada = ok(pg.html.includes("100%"));
    await submit(stuLesson, S.cookie, hasName("completed"));
    pg = await get(coursePub, S.cookie);
    out.desmarcar = ok(pg.html.includes("0%"));

    // ---- Instructor: borrar lección, módulo y curso (también limpia Storage)
    await submit(coursePath, I.cookie, hasName("lesson_id"));
    pg = await get(coursePath, I.cookie);
    out.borrar_leccion = ok(!pg.html.includes("LeccionAccion"));
    await submit(coursePath, I.cookie, hasName("module_id") && ((f) => f.includes('name="module_id"') && !f.includes('name="title"')));
    pg = await get(coursePath, I.cookie);
    out.borrar_modulo = ok(!pg.html.includes("ModuloAccion"));
    const del = await submit(coursePath, I.cookie, (f) => f.includes('name="course_id"') && !f.includes('name="status"') && !f.includes('name="title"'));
    out.borrar_curso_redirige = ok(del.status === 303 && del.location === "/instructor");
    out.objetos_storage_limpios = ok(sql("select count(*) as n from storage.objects").includes('"n": 0'));
  } catch (e) {
    out.error = e.message;
  } finally {
    const list = emails.map((e) => `'${e}'`).join(",");
    if (list) sql(`delete from auth.users where email in (${list})`);
    out.limpieza = sql("select (select count(*) from auth.users) as usuarios, (select count(*) from public.courses) as cursos, (select count(*) from storage.objects) as objetos").replace(/\s+/g, " ").match(/"(cursos|usuarios|objetos)": \d+/g)?.join(", ");
    console.log(JSON.stringify(out, null, 2));
  }
})();
