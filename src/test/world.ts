// Ayuda para pruebas de integración: monta un instructor, un curso publicado suyo, un
// estudiante inscrito y otro sin inscribir, cada uno con su propia sesión real, y lo borra
// todo al terminar. Los datos van en el proyecto Supabase remoto: siempre llama a `cleanup()`.
//
// El acceso de administrador usa SUPABASE_SERVICE_ROLE_KEY, que solo se lee aquí, del
// entorno o de .env.local (ignorado por git), nunca de código de la app. Con él se crean y
// borran los usuarios y se siembran los datos saltándose RLS; después cada persona inicia
// sesión con la clave publicable, así que lo que probemos con su `client` sí pasa por RLS.
//
//   let world: TestWorld;
//   beforeEach(async () => { world = await createTestWorld(); });
//   afterEach(async () => { await world.cleanup(); });
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const PASSWORD = "Prueba-12345";

export type TestUser = {
  id: string;
  email: string;
  /** Cliente con la sesión de esta persona: todo lo que haga pasa por RLS. */
  client: SupabaseClient;
};

export type TestWorld = {
  instructor: TestUser;
  enrolledStudent: TestUser;
  otherStudent: TestUser;
  course: { id: string; title: string; moduleId: string; lessonId: string; lessonBody: string };
  /** Borra los usuarios (y por cascada curso, inscripciones y contenido) y comprueba que no quedó nada. */
  cleanup: () => Promise<void>;
};

function env(name: string): string {
  if (!process.env[name]) {
    try {
      process.loadEnvFile(join(root, ".env.local"));
    } catch {
      // Sin .env.local: se usa lo que ya haya en el entorno.
    }
  }
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name}: defínela en .env.local o en el entorno.`);
  return value;
}

/** Cliente de administrador (service role). Se salta RLS: solo para montar y limpiar datos de prueba. */
export function adminClient(): SupabaseClient {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function publicClient(): SupabaseClient {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    auth: { persistSession: false },
  });
}

async function createTestUser(
  admin: SupabaseClient,
  tag: string,
  role: "student" | "instructor",
): Promise<TestUser> {
  const email = `${tag}.${Date.now()}.${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role },
  });
  if (error || !data.user) throw new Error(`No se pudo crear a ${tag}: ${error?.message}`);

  // Sesión propia con la clave publicable: así hay un JWT de usuario de verdad.
  const client = publicClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw new Error(`${tag} no pudo iniciar sesión: ${signInError.message}`);
  return { id: data.user.id, email, client };
}

function must<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

export async function createTestWorld(): Promise<TestWorld> {
  const admin = adminClient();
  const created: string[] = []; // ids de usuarios, para limpiar aunque falle a medias
  let cleaned = false;
  const courseId = randomUUID();
  const moduleId = randomUUID();
  const lessonId = randomUUID();
  const title = `Curso de prueba ${courseId.slice(0, 8)}`;
  const lessonBody = `Contenido protegido ${courseId.slice(0, 8)}`;

  const cleanup = async () => {
    if (cleaned || !created.length) return;
    // auth.users -> profiles -> courses -> módulos, lecciones, contenido e inscripciones: todo en cascada.
    for (const id of created) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error && !/not found/i.test(error.message)) {
        throw new Error(`No se pudo borrar al usuario ${id}: ${error.message}`);
      }
    }
    const left = {
      profiles: (await admin.from("profiles").select("id", { count: "exact", head: true }).in("id", created)).count,
      courses: (await admin.from("courses").select("id", { count: "exact", head: true }).eq("id", courseId)).count,
      enrollments: (await admin.from("enrollments").select("course_id", { count: "exact", head: true }).eq("course_id", courseId)).count,
    };
    if (Object.values(left).some((n) => n !== 0)) {
      throw new Error(`La limpieza dejó datos: ${JSON.stringify(left)}`);
    }
    cleaned = true;
  };

  try {
    const instructor = await createTestUser(admin, "inst", "instructor");
    created.push(instructor.id);
    const enrolledStudent = await createTestUser(admin, "inscrito", "student");
    created.push(enrolledStudent.id);
    const otherStudent = await createTestUser(admin, "libre", "student");
    created.push(otherStudent.id);

    // Un curso solo se publica con al menos una lección: se crea en borrador y luego se publica.
    must(
      await admin.from("courses").insert({
        id: courseId,
        instructor_id: instructor.id,
        title,
        description: "Curso creado por la ayuda de pruebas",
        category: "seo",
        level: "basic",
      }),
      "curso",
    );
    must(await admin.from("modules").insert({ id: moduleId, course_id: courseId, title: "Módulo de prueba" }), "módulo");
    must(await admin.from("lessons").insert({ id: lessonId, module_id: moduleId, title: "Lección de prueba" }), "lección");
    must(await admin.from("lesson_contents").insert({ lesson_id: lessonId, body: lessonBody }), "contenido");
    must(await admin.from("courses").update({ status: "published" }).eq("id", courseId), "publicar");
    must(
      await admin.from("enrollments").insert({ student_id: enrolledStudent.id, course_id: courseId }),
      "inscripción",
    );

    return {
      instructor,
      enrolledStudent,
      otherStudent,
      course: { id: courseId, title, moduleId, lessonId, lessonBody },
      cleanup,
    };
  } catch (error) {
    await cleanup().catch(() => undefined);
    throw error;
  }
}
