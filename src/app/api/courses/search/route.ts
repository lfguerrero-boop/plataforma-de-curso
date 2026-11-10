import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchCourses } from "@/lib/course-search";

// API pública de búsqueda: GET /api/courses/search?q=...
// Usa el mismo cliente que la parte pública del sitio (clave publicable + sesión si la
// hay), así que RLS y el filtro `status = 'published'` de match_courses siguen aplicando.
// Solo se exponen id, título, descripción y enlace; nada de embedding, estado ni instructor_id.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json(
      { error: "Falta el parámetro q con lo que se quiere buscar." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await searchCourses(supabase, q);
  if (error) {
    return NextResponse.json({ error }, { status: 502 });
  }

  // searchCourses ya devuelve los resultados ordenados por relevancia.
  const courses = data.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    url: `${origin}/cursos/${c.id}`,
  }));

  return NextResponse.json({ query: q, courses });
}
