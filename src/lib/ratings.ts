// Calificaciones de los cursos: reglas y formato como funciones puras.
// Reciben datos ya cargados y no llaman a la red. El promedio y el conteo los calcula la
// vista `course_ratings` en la base (ver migración course_ratings); aquí solo se validan,
// se normalizan y se muestran.

export const MIN_RATING = 1;
export const MAX_RATING = 5;

// De la más alta a la más baja, como se ofrecen en el formulario de reseña.
export const RATING_OPTIONS = Array.from(
  { length: MAX_RATING - MIN_RATING + 1 },
  (_, i) => MAX_RATING - i,
);

export const NO_RATING_LABEL = "Sin calificar";

export type CourseRating = { avg: number; count: number };

// Fila de `course_ratings` (o los campos equivalentes de `match_courses`). El promedio
// llega como número o como texto según el cliente, y puede faltar.
export type RatingRow = {
  avg_rating: number | string | null;
  review_count: number | null;
};

export type RatingValidation =
  | { ok: true; rating: number }
  | { ok: false; error: string };

// Valida la calificación que escribe una persona: un entero de 1 a 5.
export function parseRating(raw: string): RatingValidation {
  const rating = Number(raw);
  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    return {
      ok: false,
      error: `La calificación debe ser un número entero de ${MIN_RATING} a ${MAX_RATING}.`,
    };
  }
  return { ok: true, rating };
}

// Un curso sin reseñas no tiene fila en la vista: queda en null («sin calificar»).
export function toCourseRating(row: RatingRow | null | undefined): CourseRating | null {
  if (!row || row.avg_rating === null || row.review_count === null) return null;
  return { avg: Number(row.avg_rating), count: row.review_count };
}

// Texto corto de las filas del catálogo: «4.5/5 (2)».
export function formatRatingShort(rating: CourseRating | null): string {
  return rating ? `${rating.avg.toFixed(1)}/5 (${rating.count})` : NO_RATING_LABEL;
}

// Texto de la cabecera del curso: «Calificación: 4.5 / 5 (2 reseñas)».
export function formatRatingLong(rating: CourseRating | null): string {
  if (!rating) return NO_RATING_LABEL;
  const reviews = rating.count === 1 ? "reseña" : "reseñas";
  return `Calificación: ${rating.avg.toFixed(1)} / ${MAX_RATING} (${rating.count} ${reviews})`;
}
