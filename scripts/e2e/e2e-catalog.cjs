// E2E: catálogo público, filtros, detalle y borradores ocultos.
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
const NF = /could not be found|not-found|404/i;

const cookieFor = (s) =>
  `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(s)).toString("base64url")}`;
async function get(p, cookie) {
  const r = await fetch(BASE + p, { redirect: "manual", headers: cookie ? { cookie } : {} });
  return { status: r.status, html: await r.text() };
}

(async () => {
  const emails = [];
  try {
    const sb = mk();
    const email = `catalogo.${suffix}@example.com`;
    emails.push(email);
    const { data: u, error: ue } = await sb.auth.signUp({
      email, password: PASS, options: { data: { role: "instructor", full_name: "Ines Catalogo" } },
    });
    if (ue) throw new Error(ue.message);
    const cookie = cookieFor((await sb.auth.getSession()).data.session);

    const mkCourse = async (title, category, level, publish) => {
      const { data: c } = await sb.from("courses")
        .insert({ instructor_id: u.user.id, title, description: "desc " + title, category, level })
        .select("id").single();
      const { data: m } = await sb.from("modules").insert({ course_id: c.id, title: "Modulo " + title }).select("id").single();
      const { data: l } = await sb.from("lessons").insert({ module_id: m.id, title: "Leccion " + title }).select("id").single();
      await sb.from("lesson_contents").insert({ lesson_id: l.id, body: "SECRETO " + title });
      if (publish) {
        const { error } = await sb.from("courses").update({ status: "published" }).eq("id", c.id);
        if (error) throw new Error(error.message);
      }
      return c.id;
    };
    const c1 = await mkCourse("SeoBasico", "seo", "basic", true);
    const c2 = await mkCourse("AnaliticaAvanzada", "analytics", "advanced", true);
    const c3 = await mkCourse("BorradorOculto", "seo", "basic", false);

    // Catálogo anónimo
    const all = await get("/");
    out.catalogo_publicados = ok(all.status === 200 && all.html.includes("SeoBasico") && all.html.includes("AnaliticaAvanzada"));
    out.catalogo_sin_borradores = ok(!all.html.includes("BorradorOculto"));
    out.catalogo_muestra_instructor = ok(all.html.includes("Ines Catalogo"));

    // Filtros
    const fCat = await get("/?category=seo");
    out.filtro_categoria = ok(fCat.html.includes("SeoBasico") && !fCat.html.includes("AnaliticaAvanzada"));
    const fLvl = await get("/?level=advanced");
    out.filtro_nivel = ok(fLvl.html.includes("AnaliticaAvanzada") && !fLvl.html.includes("SeoBasico"));
    const fBoth = await get("/?category=seo&level=basic");
    out.filtro_combinado = ok(fBoth.html.includes("SeoBasico") && !fBoth.html.includes("AnaliticaAvanzada"));
    const fNone = await get("/?category=seo&level=advanced");
    out.estado_vacio = ok(fNone.html.includes("sin-resultados") && !fNone.html.includes("SeoBasico"));

    // El dueño con sesión tampoco ve su borrador en el catálogo
    const own = await get("/", cookie);
    out.catalogo_dueno_sin_su_borrador = ok(own.html.includes("SeoBasico") && !own.html.includes("BorradorOculto"));

    // Detalle público: temario sin contenido
    const d1 = await get(`/cursos/${c1}`);
    out.detalle_publicado = ok(d1.status === 200 && d1.html.includes("SeoBasico") && d1.html.includes("Modulo SeoBasico") && d1.html.includes("Leccion SeoBasico"));
    out.detalle_sin_contenido = ok(!d1.html.includes("SECRETO"));

    // Borrador: anónimo y otro usuario no lo ven; el dueño sí
    const d3 = await get(`/cursos/${c3}`);
    out.borrador_anonimo_no_existe = ok(!d3.html.includes("BorradorOculto") && NF.test(d3.html));
    const sb2 = mk();
    const e2 = `catalogo2.${suffix}@example.com`;
    emails.push(e2);
    await sb2.auth.signUp({ email: e2, password: PASS, options: { data: { role: "student" } } });
    const c2cookie = cookieFor((await sb2.auth.getSession()).data.session);
    const d3s = await get(`/cursos/${c3}`, c2cookie);
    out.borrador_otro_usuario_no_existe = ok(!d3s.html.includes("BorradorOculto") && NF.test(d3s.html));
    const d3o = await get(`/cursos/${c3}`, cookie);
    out.borrador_dueno_lo_ve = ok(d3o.html.includes("BorradorOculto"));
  } catch (e) {
    out.error = e.message;
  } finally {
    const list = emails.map((e) => `'${e}'`).join(",");
    if (list) sql(`delete from auth.users where email in (${list})`);
    out.limpieza = sql("select (select count(*) from auth.users) as usuarios, (select count(*) from public.courses) as cursos").replace(/\s+/g, " ").match(/"cursos": \d+|"usuarios": \d+/g)?.join(", ");
    console.log(JSON.stringify(out, null, 2));
  }
})();
