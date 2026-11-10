import type { SupabaseClient } from "@supabase/supabase-js";
import { categoryLabel, levelLabel } from "@/lib/courses";

// Texto que describe un curso para calcular su embedding. Solo usa datos del temario
// (títulos de módulos y lecciones), que son públicos para un curso publicado: el cuerpo
// de las lecciones (`lesson_contents`) es contenido protegido y no debe acabar en un
// índice que cualquiera pueda consultar.

type CourseTextInput = {
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

export function buildCourseText(course: CourseTextInput): string {
  const parts = [
    course.title.trim(),
    `${categoryLabel(course.category)} · ${levelLabel(course.level)}`,
    course.description.trim(),
  ];

  const modules = [...course.modules].sort((a, b) => a.position - b.position);
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

// Lee el curso con la sesión del cliente recibido, así que RLS decide si existe para él:
// devuelve null para un id inexistente o un borrador ajeno.
export async function getCourseText(
  supabase: SupabaseClient,
  courseId: string,
): Promise<string | null> {
  const { data: course } = await supabase
    .from("courses")
    .select(
      "title, description, category, level, modules(title, position, lessons(title, position))",
    )
    .eq("id", courseId)
    .maybeSingle();

  return course ? buildCourseText(course) : null;
}
