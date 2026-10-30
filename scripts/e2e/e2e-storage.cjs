// E2E: subida, descarga, URLs firmadas y borrado de recursos con la API real.
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
const suffix = Date.now();
const PASS = "Prueba-12345";
const mk = () => createClient(URL, KEY, { auth: { persistSession: false } });
const sql = (q) =>
  execSync(`npx supabase db query --linked "${q}"`, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const out = {};
const ok = (v) => (v ? "OK" : "FALLO");

async function user(role) {
  const sb = mk();
  const email = `${role}.${suffix}@example.com`;
  const { data, error } = await sb.auth.signUp({ email, password: PASS, options: { data: { role } } });
  if (error) throw new Error(`${role}: ${error.message}`);
  return { sb, id: data.user.id, email };
}

(async () => {
  const emails = [];
  try {
    const A = await user("instructor"); emails.push(A.email);
    // segundo instructor y dos estudiantes necesitan emails distintos
    const mkNamed = async (tag, role) => {
      const sb = mk();
      const email = `${tag}.${suffix}@example.com`;
      const { data, error } = await sb.auth.signUp({ email, password: PASS, options: { data: { role } } });
      if (error) throw new Error(`${tag}: ${error.message}`);
      emails.push(email);
      return { sb, id: data.user.id, email };
    };
    const B = await mkNamed("instructorb", "instructor");
    const E = await mkNamed("estinscrito", "student");
    const N = await mkNamed("estnoinscrito", "student");
    const anon = mk();

    const { data: course, error: ce } = await A.sb.from("courses")
      .insert({ instructor_id: A.id, title: "Curso storage", category: "seo", level: "basic" })
      .select("id").single();
    if (ce) throw new Error("curso: " + ce.message);
    const c = course.id;
    sql(`insert into public.enrollments (student_id, course_id) values ('${E.id}','${c}')`);

    const file = new Blob(["contenido del recurso"], { type: "text/plain" });
    const p = `${c}/guia.txt`;

    out.subida_dueno = ok(!(await A.sb.storage.from("lesson-resources").upload(p, file)).error);
    out.subida_otro_instructor_rechazada = ok((await B.sb.storage.from("lesson-resources").upload(`${c}/b.txt`, file)).error);
    out.subida_estudiante_rechazada = ok((await E.sb.storage.from("lesson-resources").upload(`${c}/e.txt`, file)).error);

    const dl = async (u) => (await u.sb.storage.from("lesson-resources").download(p));
    out.descarga_dueno = ok(!(await dl(A)).error);
    out.descarga_inscrito = ok(!(await dl(E)).error);
    out.descarga_no_inscrito_rechazada = ok((await dl(N)).error);
    out.descarga_otro_instructor_rechazada = ok((await dl(B)).error);
    out.descarga_anonimo_rechazada = ok((await anon.storage.from("lesson-resources").download(p)).error);

    out.url_firmada_inscrito = ok(!(await E.sb.storage.from("lesson-resources").createSignedUrl(p, 60)).error);
    out.url_firmada_no_inscrito_rechazada = ok((await N.sb.storage.from("lesson-resources").createSignedUrl(p, 60)).error);

    // Borrado: B y E no pueden; el archivo debe seguir ahí
    await B.sb.storage.from("lesson-resources").remove([p]);
    await E.sb.storage.from("lesson-resources").remove([p]);
    out.borrado_ajeno_no_elimina = ok(!(await dl(A)).error);
    const rm = await A.sb.storage.from("lesson-resources").remove([p]);
    out.borrado_dueno = ok(!rm.error && rm.data.length === 1);
  } catch (e) {
    out.error = e.message;
  } finally {
    const list = emails.map((e) => `'${e}'`).join(",");
    if (list) sql(`delete from auth.users where email in (${list})`);
    out.limpieza = sql("select (select count(*) from auth.users) as usuarios, (select count(*) from storage.objects) as objetos").match(/"usuarios": (\d+)[\s\S]*"objetos": (\d+)|"objetos": (\d+)[\s\S]*"usuarios": (\d+)/)?.[0].replace(/\s+/g, " ");
    console.log(JSON.stringify(out, null, 2));
  }
})();
