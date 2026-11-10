import type { SupabaseClient } from "@supabase/supabase-js";

// Búsqueda semántica del catálogo: la persona escribe lo que necesita con sus palabras
// ("quiero aprender a vender por redes") y se devuelven los cursos publicados más
// parecidos. La frase se convierte en embedding con la Edge Function `embed` (gte-small,
// el mismo modelo con que se indexan los cursos) y `match_courses` hace la comparación.

export type CourseMatch = {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  instructor_name: string | null;
  avg_rating: number | null;
  review_count: number | null;
  // 1 = idéntico. Con gte-small hasta lo poco relacionado puntúa alto: sirve para
  // ordenar, no como porcentaje de acierto.
  similarity: number;
};

// La Edge Function acepta hasta 8000 caracteres; una búsqueda no necesita tanto.
const MAX_QUERY_CHARS = 300;

// Similitud coseno mínima para que un curso aparezca en los resultados.
const MIN_SIMILARITY = 0.8;

export async function searchCourses(
  supabase: SupabaseClient,
  phrase: string,
  options: { limit?: number; category?: string; level?: string } = {},
): Promise<{ data: CourseMatch[]; error: string | null }> {
  const text = phrase.trim().slice(0, MAX_QUERY_CHARS);
  if (!text) return { data: [], error: null };

  // Con sesión viaja el token del usuario; sin ella, la clave publicable (la función
  // `embed` acepta ambas). No se escribe nada: solo se calcula el vector.
  const { data: embedded, error: embedError } = await supabase.functions.invoke<{
    embedding: number[];
  }>("embed", { body: { text } });
  if (embedError || !embedded?.embedding) {
    return { data: [], error: "No se pudo interpretar la búsqueda." };
  }

  // RLS decide qué ve quien busca; match_courses además filtra `status = 'published'`.
  const { data, error } = await supabase.rpc("match_courses", {
    query_embedding: JSON.stringify(embedded.embedding),
    match_count: options.limit ?? 10,
    min_similarity: MIN_SIMILARITY,
    // El filtro se aplica en la base, antes del tope; undefined = sin filtro.
    filter_category: options.category,
    filter_level: options.level,
  });
  if (error) return { data: [], error: "No se pudo completar la búsqueda." };

  return { data: data as CourseMatch[], error: null };
}
