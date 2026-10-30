// E2E: páginas del panel del instructor y aislamiento entre instructores.
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

async function user(tag, role) {
  const sb = mk();
  const email = `${tag}.${suffix}@example.com`;
  const { data, error } = await sb.auth.signUp({ email, password: PASS, options: { data: { role } } });
  if (error) throw new Error(`${tag}: ${error.message}`);
  return { sb, id: data.user.id, email, cookie: cookieFor((await sb.auth.getSession()).data.session) };
}
async function get(p, cookie) {
  const r = await fetch(BASE + p, { redirect: "manual", headers: cookie ? { cookie } : {} });
  return { status: r.status, html: await r.text() };
}

(async () => {
  const emails = [];
  try {
    const A = await user("panela", "instructor"); emails.push(A.email);
    const B = await user("panelb", "instructor"); emails.push(B.email);

    const mkCourse = async (u, title) => {
      const { data, error } = await u.sb.from("courses")
        .insert({ instructor_id: u.id, title, category: "seo", level: "basic" })
        .select("id").single();
      if (error) throw new Error(error.message);
      return data.id;
    };
    const cA = await mkCourse(A, "Curso de A");
    const cB = await mkCourse(B, "Curso de B");
    const { data: mod } = await A.sb.from("modules").insert({ course_id: cA, title: "Modulo uno" }).select("id").single();
    const { data: les } = await A.sb.from("lessons").insert({ module_id: mod.id, title: "Leccion uno" }).select("id").single();
    await A.sb.from("lesson_contents").insert({ lesson_id: les.id, body: "texto de la leccion", video_url: "https://youtu.be/abc" });
    await A.sb.from("lesson_resources").insert({ lesson_id: les.id, file_path: `${cA}/x.pdf`, file_name: "plantilla.pdf" });

    // Lista del instructor: solo sus cursos
    const list = await get("/instructor", A.cookie);
    out.lista_muestra_propio = ok(list.status === 200 && list.html.includes("Curso de A"));
    out.lista_oculta_ajeno = ok(!list.html.includes("Curso de B"));

    // Detalle del curso: propio sí, ajeno 404
    const own = await get(`/instructor/cursos/${cA}`, A.cookie);
    out.detalle_propio = ok(own.status === 200 && own.html.includes("Modulo uno") && own.html.includes("Leccion uno") && own.html.includes("Borrador"));
    const foreign = await get(`/instructor/cursos/${cB}`, A.cookie);
    out.detalle_ajeno_no_filtra = ok(!foreign.html.includes("Curso de B") && /could not be found|not-found|404/i.test(foreign.html));

    // Editor de lección: contenido, video y recursos
    const lp = await get(`/instructor/cursos/${cA}/lecciones/${les.id}`, A.cookie);
    out.leccion_propia = ok(lp.status === 200 && lp.html.includes("texto de la leccion") && lp.html.includes("https://youtu.be/abc") && lp.html.includes("plantilla.pdf"));
    const lf = await get(`/instructor/cursos/${cB}/lecciones/${les.id}`, B.cookie);
    out.leccion_ajena_no_filtra = ok(!lf.html.includes("texto de la leccion") && /could not be found|not-found|404/i.test(lf.html));

    // Publicación: vacío falla, con lección funciona (regla de la base que usa la acción)
    const empty = await B.sb.from("courses").update({ status: "published" }).eq("id", cB);
    out.publicar_vacio_rechazado = ok(empty.error?.code === "23514");
    const pub = await A.sb.from("courses").update({ status: "published" }).eq("id", cA);
    out.publicar_con_leccion = ok(!pub.error);
    const after = await get(`/instructor/cursos/${cA}`, A.cookie);
    out.detalle_muestra_publicado = ok(after.html.includes("Publicado"));
  } catch (e) {
    out.error = e.message;
  } finally {
    const list = emails.map((e) => `'${e}'`).join(",");
    if (list) sql(`delete from auth.users where email in (${list})`);
    out.limpieza = sql("select (select count(*) from auth.users) as usuarios, (select count(*) from public.courses) as cursos").replace(/\s+/g, " ").match(/"cursos": \d+|"usuarios": \d+/g)?.join(", ");
    console.log(JSON.stringify(out, null, 2));
  }
})();
