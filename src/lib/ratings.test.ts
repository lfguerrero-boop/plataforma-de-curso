// Pruebas derivadas de openspec/specs/course-reviews/spec.md, no del código: cada bloque
// nombra el requisito y el escenario que comprueba. Solo se cubre lo que es lógica pura;
// lo que decide la base de datos (inscripción, rol, una reseña por estudiante, edición
// ajena, lectura pública, el cálculo del promedio) lo cubren las pruebas SQL de RLS.
import { describe, expect, it } from "vitest";
import { formatRatingLong, formatRatingShort, parseRating, toCourseRating } from "@/lib/ratings";

describe("Requisito: Reseña por estudiantes inscritos (calificación entera de 1 a 5)", () => {
  it("Escenario «Reseña válida»: una calificación de 4 se acepta con ese valor", () => {
    const result = parseRating("4");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rating).toBe(4);
  });

  it.each([1, 2, 3, 4, 5])("acepta la calificación entera %i", (n) => {
    const result = parseRating(String(n));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rating).toBe(n);
  });

  it.each(["0", "6"])(
    "Escenario «Calificación fuera de rango»: rechaza %s",
    (raw) => {
      expect(parseRating(raw).ok).toBe(false);
    },
  );

  it.each(["-1", "7", "100"])("rechaza otros valores fuera de 1 a 5 (%s)", (raw) => {
    expect(parseRating(raw).ok).toBe(false);
  });

  it.each(["2.5", "4.9", "0.5"])("rechaza una calificación no entera (%s)", (raw) => {
    expect(parseRating(raw).ok).toBe(false);
  });

  it.each(["", "abc", "NaN", "Infinity"])("rechaza lo que no es un número (%j)", (raw) => {
    expect(parseRating(raw).ok).toBe(false);
  });

  it("al rechazar, explica el motivo", () => {
    const result = parseRating("6");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });
});

describe("Requisito: Calificación promedio, escenario «Curso con reseñas»", () => {
  // La base calcula el promedio de 5 y 3; la app recibe 4 y 2 y debe conservarlos.
  const row = { avg_rating: 4, review_count: 2 };

  it("conserva el promedio 4 y el número de reseñas 2", () => {
    expect(toCourseRating(row)).toEqual({ avg: 4, count: 2 });
  });

  it("conserva el promedio aunque llegue como texto", () => {
    expect(toCourseRating({ avg_rating: "4", review_count: 2 })).toEqual({ avg: 4, count: 2 });
  });

  it("en el catálogo muestra el promedio y el número de reseñas", () => {
    const text = formatRatingShort(toCourseRating(row));
    expect(text).toMatch(/\b4(\.0)?\b/);
    expect(text).toMatch(/\b2\b/);
  });

  it("en el detalle del curso muestra el promedio y el número de reseñas", () => {
    const text = formatRatingLong(toCourseRating(row));
    expect(text).toMatch(/\b4(\.0)?\b/);
    expect(text).toMatch(/\b2\b/);
  });
});

describe("Requisito: Calificación promedio, escenario «Curso sin reseñas»", () => {
  it("un curso sin fila de calificación no tiene calificación", () => {
    expect(toCourseRating(null)).toBeNull();
    expect(toCourseRating(undefined)).toBeNull();
  });

  it("en el catálogo se muestra como sin calificar", () => {
    expect(formatRatingShort(toCourseRating(null)).toLowerCase()).toBe("sin calificar");
  });

  it("en el detalle del curso se muestra como sin calificar", () => {
    expect(formatRatingLong(toCourseRating(null)).toLowerCase()).toBe("sin calificar");
  });

  it("un curso sin reseñas no se muestra como 0 ni con promedio inventado", () => {
    const text = formatRatingShort(toCourseRating(null));
    expect(text).not.toMatch(/\d/);
  });
});
