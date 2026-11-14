import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, levelLabel } from "@/lib/courses";
import { CourseRows, type CourseRowData } from "@/components/course-rows";
import { toCourseRating } from "@/lib/ratings";

const FEATURED_COUNT = 3;

const publishedOn = new Intl.DateTimeFormat("es", { dateStyle: "long", timeZone: "UTC" });

// Los 3 cursos publicados más recientes, con los datos que hay en la base: nada de ejemplos.
export async function FeaturedCourses() {
  await connection();
  const supabase = await createClient();

  // Estado explícito: un instructor con sesión también vería sus borradores por RLS.
  const { data: courses, error } = await supabase
    .from("courses")
    .select(
      "id, title, description, category, level, created_at, instructor:profiles!courses_instructor_id_fkey(full_name)",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(FEATURED_COUNT);

  if (error) {
    return <p role="alert">No se pudieron cargar los cursos.</p>;
  }
  if (!courses?.length) {
    return <p className="empty">Todavía no hay cursos publicados.</p>;
  }

  // Un curso sin reseñas no tiene fila en la vista: queda como «Sin calificar».
  const { data: ratings } = await supabase
    .from("course_ratings")
    .select("course_id, avg_rating, review_count")
    .in("course_id", courses.map((c) => c.id));
  const ratingOf = new Map(ratings?.map((r) => [r.course_id, r] as const));

  const rows: CourseRowData[] = courses.map((c) => {
    const rating = ratingOf.get(c.id);
    // La relación llega como objeto, pero los tipos la infieren como arreglo.
    const raw = c.instructor as unknown as
      | { full_name: string | null }
      | { full_name: string | null }[]
      | null;
    const instructor = Array.isArray(raw) ? raw[0] : raw;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      meta: [
        categoryLabel(c.category),
        levelLabel(c.level),
        instructor?.full_name,
        `Publicado el ${publishedOn.format(new Date(c.created_at))}`,
      ]
        .filter(Boolean)
        .join(" · "),
      rating: toCourseRating(rating),
    };
  });

  return <CourseRows rows={rows} />;
}
