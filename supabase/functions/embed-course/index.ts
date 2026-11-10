// Calcula y guarda el embedding de un curso. La invoca el trigger
// courses_queue_embedding (migración 20261102000200) por pg_net cuando un curso se crea
// o pasa a 'published'; nadie más debería llamarla.
//
// Corre en el servidor y usa el service role (que Supabase inyecta como secreto de la
// función) porque no hay sesión de usuario: la escritura viene de la base, no de un
// instructor. Por eso NO verifica JWT (se despliega con --no-verify-jwt) y se autentica
// con un secreto compartido en la cabecera x-webhook-secret.
import { createClient } from "npm:@supabase/supabase-js@2";

const session = new Supabase.ai.Session("gte-small");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// Mismas etiquetas que src/lib/courses.ts; si cambian allí, cámbialas aquí.
const CATEGORIES: Record<string, string> = {
  seo: "SEO",
  paid_ads: "Publicidad paga",
  social_media: "Redes sociales",
  email_marketing: "Email marketing",
  analytics: "Analítica",
};
const LEVELS: Record<string, string> = {
  basic: "Básico",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

type Course = {
  title: string;
  description: string;
  category: string;
  level: string;
  modules: {
    title: string;
    position: number;
    lessons: { title: string; position: number }[];
  }[];
};

// Mismo texto que src/lib/course-text.ts (buildCourseText): título, categoría y nivel,
// descripción y temario. Nunca el cuerpo de las lecciones: es contenido protegido.
function courseText(c: Course): string {
  const parts = [
    c.title.trim(),
    `${CATEGORIES[c.category] ?? c.category} · ${LEVELS[c.level] ?? c.level}`,
    c.description.trim(),
  ];
  const modules = [...c.modules].sort((a, b) => a.position - b.position);
  if (modules.length) {
    const outline = modules.map((m) => {
      const lessons = [...m.lessons]
        .sort((a, b) => a.position - b.position)
        .map((l) => `- ${l.title.trim()}`);
      return [`${m.title.trim()}:`, ...lessons].join("\n");
    });
    parts.push(`Contenido:\n${outline.join("\n")}`);
  }
  return parts.filter(Boolean).join("\n\n");
}

// Comparación en tiempo constante para no filtrar el secreto por tiempos de respuesta.
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  const expected = Deno.env.get("EMBED_WEBHOOK_SECRET");
  const given = req.headers.get("x-webhook-secret") ?? "";
  if (req.method !== "POST" || !expected || !sameSecret(given, expected)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  let courseId: unknown;
  try {
    ({ course_id: courseId } = await req.json());
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (typeof courseId !== "string") {
    return Response.json({ error: "course_id requerido" }, { status: 400 });
  }

  const { data: course, error: readError } = await supabase
    .from("courses")
    .select(
      "status, title, description, category, level, modules(title, position, lessons(title, position))",
    )
    .eq("id", courseId)
    .maybeSingle();
  if (readError) {
    return Response.json({ error: readError.message }, { status: 500 });
  }
  // El curso pudo borrarse entre el aviso y esta llamada: no es un error.
  if (!course) return Response.json({ skipped: "curso inexistente" });
  // Defensa en profundidad: solo se indexan cursos publicados, aunque alguien llame a la
  // función con un id de borrador (el trigger ya solo avisa al publicar).
  if (course.status !== "published") {
    return Response.json({ skipped: "curso no publicado" });
  }

  const embedding = await session.run(courseText(course as Course), {
    mean_pool: true,
    normalize: true,
  });

  // Actualizar solo `embedding` no dispara courses_queue_embedding (escucha `status`).
  const { data: updated, error: writeError } = await supabase
    .from("courses")
    .update({ embedding: JSON.stringify(embedding) })
    .eq("id", courseId)
    .select("id");
  if (writeError || !updated?.length) {
    return Response.json(
      { error: writeError?.message ?? "no se actualizó ninguna fila" },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, dimensions: embedding.length });
});
