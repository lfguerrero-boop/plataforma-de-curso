// E2E: inscripción, lectura de lecciones, recursos y progreso del estudiante.
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

const cookieFor = (s) =>
  `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(s)).toString("base64url")}`;
async function get(p, cookie) {
  const r = await fetch(BASE + p, { redirect: "manual", headers: cookie ? { cookie } : {} });
  return { status: r.status, html: (await r.text()).replace(/<!--.*?-->/g, "") };
}
async function user(tag, role) {
  const sb = mk();
  const email = `${tag}.${suffix}@example.com`;
  const { data, error } = await sb.auth.signUp({ email, password: PASS, options: { data: { role, full_name: tag } } });
  if (error) throw new Error(`${tag}: ${error.message}`);
  return { sb, id: data.user.id, email, cookie: cookieFor((await sb.auth.getSession()).data.session) };
}

(async () => {
  const emails = [];
  try {
    const I = await user("instruct", "instructor"); emails.push(I.email);
    const S = await user("alumno", "student"); emails.push(S.email);
    const S2 = await user("alumno2", "student"); emails.push(S2.email);

    const { data: c } = await I.sb.from("courses")
      .insert({ instructor_id: I.id, title: "CursoFlujo", category: "seo", level: "basic" }).select("id").single();
    const { data: m } = await I.sb.from("modules").insert({ course_id: c.id, title: "Mod" }).select("id").single();
    const mkLesson = async (title, body, pos) => {
      const { data: l } = await I.sb.from("lessons").insert({ module_id: m.id, title, position: pos }).select("id").single();
      await I.sb.from("lesson_contents").insert({ lesson_id: l.id, body, video_url: "https://youtu.be/zzz" });
      return l.id;
    };
    const l1 = await mkLesson("LeccionUno", "CONTENIDO-SECRETO-UNO", 0);
    const l2 = await mkLesson("LeccionDos", "CONTENIDO-SECRETO-DOS", 1);

    // Recurso real en Storage
    const path1 = `${c.id}/plantilla.txt`;
    await I.sb.storage.from("lesson-resources").upload(path1, new Blob(["hola"]), { contentType: "text/plain" });
    await I.sb.from("lesson_resources").insert({ lesson_id: l1, file_path: path1, file_name: "plantilla.txt" });
    await I.sb.from("courses").update({ status: "published" }).eq("id", c.id);

    // --- Antes de inscribirse
    const vis = await get(`/cursos/${c.id}`);
    out.visitante_ve_invitacion = ok(vis.html.includes("Inicia sesión") && !vis.html.includes("Inscribirme"));
    const stu = await get(`/cursos/${c.id}`, S.cookie);
    out.estudiante_ve_boton_inscribirme = ok(stu.html.includes("Inscribirme"));
    out.estudiante_temario_sin_enlaces = ok(!stu.html.includes(`/cursos/${c.id}/lecciones/${l1}`));
    const ins = await get(`/cursos/${c.id}`, I.cookie);
    out.instructor_sin_boton_inscribirme = ok(!ins.html.includes("Inscribirme"));

    const noAcc = await get(`/cursos/${c.id}/lecciones/${l1}`, S.cookie);
    out.leccion_sin_inscripcion_bloqueada = ok(noAcc.html.includes("sin-acceso") && !noAcc.html.includes("CONTENIDO-SECRETO-UNO") && !noAcc.html.includes("plantilla.txt"));
    const anonL = await get(`/cursos/${c.id}/lecciones/${l1}`);
    out.leccion_anonimo_bloqueada = ok(!anonL.html.includes("CONTENIDO-SECRETO-UNO"));

    // --- Inscripción (misma operación que la acción, con la sesión del estudiante)
    const e1 = await S.sb.from("enrollments").insert({ student_id: S.id, course_id: c.id });
    out.inscripcion = ok(!e1.error);
    const e2 = await S.sb.from("enrollments").insert({ student_id: S.id, course_id: c.id });
    out.inscripcion_duplicada_rechazada = ok(e2.error?.code === "23505");

    const after = await get(`/cursos/${c.id}`, S.cookie);
    out.curso_muestra_inscrito_0pct = ok(after.html.includes("Estás inscrito") && after.html.includes("0%"));
    out.curso_temario_con_enlaces = ok(after.html.includes(`/cursos/${c.id}/lecciones/${l1}`));
    out.curso_sin_boton_tras_inscribirse = ok(!after.html.includes("Inscribirme"));

    // --- Lectura de lección
    const les = await get(`/cursos/${c.id}/lecciones/${l1}`, S.cookie);
    out.leccion_muestra_contenido = ok(les.html.includes("CONTENIDO-SECRETO-UNO"));
    out.leccion_muestra_video = ok(les.html.includes("https://youtu.be/zzz"));
    const link = les.html.match(/href="([^"]*plantilla\.txt[^"]*)"/)?.[1]?.replace(/&amp;/g, "&");
    out.leccion_enlace_firmado = ok(!!link && link.includes("token="));
    if (link) {
      const file = await fetch(link);
      out.recurso_descargable = ok(file.status === 200 && (await file.text()) === "hola");
    }
    const otro = await get(`/cursos/${c.id}/lecciones/${l1}`, S2.cookie);
    out.otro_estudiante_bloqueado = ok(otro.html.includes("sin-acceso") && !otro.html.includes("CONTENIDO-SECRETO-UNO"));

    // --- Progreso
    const p1 = await S.sb.from("lesson_progress").insert({ student_id: S.id, lesson_id: l1 });
    out.marcar_completada = ok(!p1.error);
    const p0 = await S2.sb.from("lesson_progress").insert({ student_id: S2.id, lesson_id: l1 });
    out.marcar_sin_inscripcion_rechazada = ok(!!p0.error);

    let pg = await get(`/cursos/${c.id}`, S.cookie);
    out.progreso_curso_50 = ok(pg.html.includes("50%") && pg.html.includes("1/2"));
    let mc = await get("/mis-cursos", S.cookie);
    out.mis_cursos_50 = ok(mc.html.includes("CursoFlujo") && mc.html.includes("50%"));
    const lp = await get(`/cursos/${c.id}/lecciones/${l1}`, S.cookie);
    out.leccion_muestra_completada = ok(lp.html.includes("completada") && lp.html.includes("Marcar como pendiente"));

    await S.sb.from("lesson_progress").insert({ student_id: S.id, lesson_id: l2 });
    mc = await get("/mis-cursos", S.cookie);
    out.mis_cursos_100 = ok(mc.html.includes("100%"));

    await S.sb.from("lesson_progress").delete().eq("lesson_id", l2);
    mc = await get("/mis-cursos", S.cookie);
    out.desmarcar_baja_a_50 = ok(mc.html.includes("50%"));

    const empty = await get("/mis-cursos", S2.cookie);
    out.mis_cursos_vacio = ok(empty.html.includes("sin-inscripciones") && !empty.html.includes("CursoFlujo"));
    const priv = await get("/mis-cursos", S.cookie);
    out.mis_cursos_privado = ok(!priv.html.includes("alumno2"));

    // --- Navegación
    out.nav_estudiante = ok(mc.html.includes("Mis cursos") && mc.html.includes("Salir") && !mc.html.includes("Panel del instructor"));
    const navI = await get("/", I.cookie);
    out.nav_instructor = ok(navI.html.includes("Panel del instructor") && !navI.html.includes("Mis cursos"));
    const navV = await get("/");
    out.nav_visitante = ok(navV.html.includes("Entrar") && navV.html.includes("Registrarse"));

    // limpieza del archivo
    await I.sb.storage.from("lesson-resources").remove([path1]);
  } catch (e) {
    out.error = e.message;
  } finally {
    const list = emails.map((e) => `'${e}'`).join(",");
    if (list) sql(`delete from auth.users where email in (${list})`);
    out.limpieza = sql("select (select count(*) from auth.users) as usuarios, (select count(*) from public.courses) as cursos, (select count(*) from storage.objects) as objetos").replace(/\s+/g, " ").match(/"(cursos|usuarios|objetos)": \d+/g)?.join(", ");
    console.log(JSON.stringify(out, null, 2));
  }
})();
