// E2E: el embedding de un curso se calcula solo al publicarlo, y solo el servidor lo escribe
// (trigger courses_queue_embedding -> Edge Function embed-course).
// Requiere: .env.local y SUPABASE_ACCESS_TOKEN; los secretos del Vault y de la función ya creados.
// Crea un instructor @example.com y lo borra al terminar (con sus cursos, por cascada).
const { createRequire } = require("module");
const path = require("path");
const { execSync } = require("child_process");
const root = path.resolve(__dirname, "..", "..");
process.loadEnvFile(path.join(root, ".env.local"));
const req = createRequire(path.join(root, "package.json"));
const { createClient } = req("@supabase/supabase-js");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const sql = (q) =>
  execSync(`npx supabase db query --linked "${q}"`, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const out = {};
const ok = (v) => (v ? "OK" : "FALLO");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Huella del embedding (null si aún no hay): evita imprimir 384 números.
const fingerprint = (id) =>
  JSON.parse(sql(`select md5(embedding::text) as h, vector_dims(embedding) as d from public.courses where id = '${id}'`)).rows[0];

async function waitFor(id, different) {
  for (let i = 0; i < 20; i++) {
    const row = fingerprint(id);
    if (row.h && row.h !== different) return row;
    await sleep(2000);
  }
  return null;
}

(async () => {
  const email = `embed.${Date.now()}@example.com`;
  try {
    const sb = createClient(URL, KEY, { auth: { persistSession: false } });
    const { data: auth, error: signErr } = await sb.auth.signUp({
      email, password: "Prueba-12345", options: { data: { role: "instructor" } },
    });
    if (signErr) throw new Error(signErr.message);

    const { data: course, error } = await sb.from("courses")
      .insert({ instructor_id: auth.user.id, title: "Embudos de venta para tiendas online", description: "Convierte visitas en compradores", category: "social_media", level: "basic" })
      .select("id").single();
    if (error) throw new Error(error.message);

    // 1) Al crear (borrador) NO se calcula: un borrador no se busca y aún no tiene lecciones.
    await sleep(8000);
    out["crear un borrador no genera embedding"] = ok(fingerprint(course.id).h === null);

    // 2) Un instructor con sesión no puede fijar el embedding de su curso (índice envenenado).
    const fake = JSON.stringify(Array.from({ length: 384 }, (_, i) => (i === 0 ? 1 : 0)));
    const upd = await sb.from("courses").update({ embedding: fake }).eq("id", course.id);
    out["el instructor no puede escribir embedding"] = ok(upd.error && upd.error.code === "42501");
    const ins = await sb.from("courses").insert({ instructor_id: auth.user.id, title: "Envenenado", category: "seo", level: "basic", embedding: fake });
    out["el instructor no puede insertar con embedding"] = ok(ins.error && ins.error.code === "42501");
    out["el vector del instructor no quedó guardado"] = ok(fingerprint(course.id).h === null);

    // 3) Al publicar (con lecciones) se calcula con el servidor.
    const { data: mod } = await sb.from("modules").insert({ course_id: course.id, title: "Anuncios y retargeting" }).select("id").single();
    await sb.from("lessons").insert({ module_id: mod.id, title: "Remarketing en Instagram" });
    const { error: pubErr } = await sb.from("courses").update({ status: "published" }).eq("id", course.id);
    if (pubErr) throw new Error(pubErr.message);
    const published = await waitFor(course.id, null);
    out["publicar genera embedding de 384 dims"] = ok(published && published.d === 384);

    // 4) Editar el título de un curso publicado NO lo regenera (solo al publicar).
    await sb.from("courses").update({ title: "Título nuevo" }).eq("id", course.id);
    await sleep(6000);
    out["editar título no regenera"] = ok(published && fingerprint(course.id).h === published.h);
  } catch (e) {
    out.error = String(e.message || e);
  } finally {
    sql(`delete from auth.users where email = '${email}'`);
    out.limpieza = sql("select (select count(*) from auth.users where email like 'embed.%') as usuarios").replace(/\s+/g, " ").match(/"usuarios": \d+/)?.[0];
  }
  console.log(JSON.stringify(out, null, 2));
})();
