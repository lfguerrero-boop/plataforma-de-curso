// E2E: registro, rol en profiles, rol inválido, login y proxy por rol.
// Requiere: servidor en E2E_BASE (por defecto http://localhost:3000), .env.local y SUPABASE_ACCESS_TOKEN.
// Crea usuarios de prueba con correos @example.com y los borra al terminar.
const { createRequire } = require("module");
const { execSync } = require("child_process");
const path = require("path");
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

async function signUp(role) {
  const sb = createClient(URL, KEY, { auth: { persistSession: false } });
  const email = `${role}.${suffix}@example.com`;
  const { data, error } = await sb.auth.signUp({
    email,
    password: PASS,
    options: { data: { role, full_name: `Prueba ${role}` } },
  });
  return { sb, email, data, error };
}

function cookieFor(session) {
  const ref = REF;
  const value =
    "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  return `sb-${ref}-auth-token=${value}`;
}

async function status(p, cookie) {
  const r = await fetch(BASE + p, {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
  return `${r.status}${r.headers.get("location") ? " -> " + r.headers.get("location") : ""}`;
}

const sql = (q) =>
  execSync(`npx supabase db query --linked "${q}"`, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

(async () => {
  const out = {};
  const emails = [];
  try {
  const st = await signUp("student");
  const ins = await signUp("instructor");
  emails.push(st.email, ins.email);
  out.signup = {
    student: st.error?.message ?? (st.data.session ? "sesión inmediata" : "sin sesión"),
    instructor: ins.error?.message ?? (ins.data.session ? "sesión inmediata" : "sin sesión"),
  };

  // Rol guardado en profiles, leído con la propia sesión (RLS)
  for (const [k, u] of [["student", st], ["instructor", ins]]) {
    const { data, error } = await u.sb.from("profiles").select("role, full_name").single();
    out[`perfil_${k}`] = error ? error.message : data;
  }

  // Rol inválido: el registro debe fallar
  const bad = createClient(URL, KEY, { auth: { persistSession: false } });
  const badRes = await bad.auth.signUp({
    email: `admin.${suffix}@example.com`,
    password: PASS,
    options: { data: { role: "admin" } },
  });
  out.rol_invalido = badRes.error ? `rechazado (${badRes.error.message})` : "ACEPTADO (mal)";

  // Login incorrecto y correcto
  const wrong = await createClient(URL, KEY, { auth: { persistSession: false } })
    .auth.signInWithPassword({ email: st.email, password: "incorrecta" });
  out.login_incorrecto = wrong.error ? "rechazado" : "ACEPTADO (mal)";

  const sessS = (await st.sb.auth.getSession()).data.session;
  const sessI = (await ins.sb.auth.getSession()).data.session;

  // Proxy con sesiones reales
  for (const p of ["/estado", "/instructor"]) {
    out[`proxy ${p}`] = {
      visitante: await status(p),
      estudiante: await status(p, cookieFor(sessS)),
      instructor: await status(p, cookieFor(sessI)),
    };
  }

    // --- Formularios reales (Server Actions): registro, login y cierre de sesión
    const clean = (h) => h.replace(/<!--.*?-->/g, "");
    async function submitForm(pagePath, cookie, pick, values) {
      const page = await fetch(BASE + pagePath, { redirect: "manual", headers: cookie ? { cookie } : {} });
      const html = clean(await page.text());
      const form = [...html.matchAll(/<form[\s\S]*?<\/form>/g)].map((m) => m[0]).find(pick);
      if (!form) return { error: "formulario no encontrado en " + pagePath };
      const fd = new FormData();
      for (const m of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
        const name = m[0].match(/name="([^"]*)"/)?.[1];
        const value = (m[0].match(/value="([^"]*)"/)?.[1] ?? "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
        if (name) fd.append(name, value);
      }
      for (const [k, v] of Object.entries(values || {})) fd.set(k, v);
      const r = await fetch(BASE + pagePath, { method: "POST", body: fd, redirect: "manual", headers: cookie ? { cookie } : {} });
      const cookies = r.headers.getSetCookie().map((c) => c.split(";")[0]).filter((c) => !c.endsWith("="));
      return { status: r.status, location: r.headers.get("location"), html: clean(await r.text()), cookie: cookies.join("; ") };
    }
    const formEmail = `formulario.${suffix}@example.com`;
    emails.push(formEmail);
    const hasName = (n) => (f) => f.includes(`name="${n}"`);

    const badRole = await submitForm("/registro", null, hasName("role"),
      { email: formEmail, password: PASS, role: "admin", full_name: "X" });
    out.form_registro_rol_invalido = badRole.html?.includes("Elige un rol válido") ? "OK" : "FALLO";

    const reg = await submitForm("/registro", null, hasName("role"),
      { email: formEmail, password: PASS, role: "instructor", full_name: "Por Formulario" });
    out.form_registro_redirige = reg.status === 303 && reg.location === "/estado" && reg.cookie ? "OK" : "FALLO";
    const who = await fetch(BASE + "/estado", { headers: { cookie: reg.cookie }, redirect: "manual" });
    const whoHtml = clean(await who.text());
    out.form_registro_crea_sesion_con_rol = whoHtml.includes(formEmail) && whoHtml.includes("rol instructor") ? "OK" : "FALLO";

    const out1 = await submitForm("/estado", reg.cookie, (f) => f.includes("Cerrar sesión"));
    out.form_cerrar_sesion = out1.status === 303 && out1.location === "/login" ? "OK" : "FALLO";

    const wrongForm = await submitForm("/login", null, hasName("password"), { email: formEmail, password: "incorrecta" });
    out.form_login_incorrecto = wrongForm.html?.includes("Correo o contraseña incorrectos") && !wrongForm.cookie ? "OK" : "FALLO";
    const good = await submitForm("/login", null, hasName("password"), { email: formEmail, password: PASS });
    out.form_login_correcto = good.status === 303 && good.location === "/estado" && good.cookie ? "OK" : "FALLO";
    const again = await fetch(BASE + "/estado", { headers: { cookie: good.cookie }, redirect: "manual" });
    out.form_login_da_acceso = again.status === 200 ? "OK" : "FALLO";
  } catch (e) {
    out.error = e.message;
  } finally {
    const list = emails.map((e) => `'${e}'`).join(",");
    if (list) sql(`delete from auth.users where email in (${list})`);
    out.limpieza = sql("select count(*) as usuarios from auth.users").replace(/\s+/g, " ").match(/"usuarios": \d+/)?.[0];
    console.log(JSON.stringify(out, null, 2));
  }
})();
