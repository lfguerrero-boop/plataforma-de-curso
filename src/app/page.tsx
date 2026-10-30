import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORIES,
  LEVELS,
  categoryLabel,
  isCategory,
  isLevel,
  levelLabel,
} from "@/lib/courses";
import { CourseRows, type CourseRowData } from "@/components/course-rows";
import { PostersGL } from "@/components/posters-gl";
import { Reveal } from "@/components/reveal";
import {
  FinalCta,
  Hero,
  HomeFooter,
  HowItWorks,
  Posters,
} from "@/components/home-sections";

type SearchParams = Promise<{ category?: string; level?: string }>;

async function Catalog({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { category, level } = await searchParams;
  const supabase = await createClient();

  // El filtro de estado es explícito: un instructor con sesión también vería sus
  // borradores por RLS, y el catálogo solo debe mostrar cursos publicados.
  let query = supabase
    .from("courses")
    .select(
      "id, title, description, category, level, instructor:profiles!courses_instructor_id_fkey(full_name)",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (category && isCategory(category)) query = query.eq("category", category);
  if (level && isLevel(level)) query = query.eq("level", level);

  const { data: courses, error } = await query;

  if (error) {
    return <p role="alert">No se pudo cargar el catálogo.</p>;
  }
  if (!courses?.length) {
    return (
      <p id="sin-resultados" className="empty">
        No hay cursos que coincidan con los filtros.
      </p>
    );
  }

  // Promedios de los cursos listados; un curso sin reseñas no tiene fila.
  const { data: ratings } = await supabase
    .from("course_ratings")
    .select("course_id, avg_rating, review_count")
    .in("course_id", courses.map((c) => c.id));
  const ratingOf = new Map(ratings?.map((r) => [r.course_id, r] as const));

  const rows: CourseRowData[] = courses.map((c) => {
    const rating = ratingOf.get(c.id);
    const raw = c.instructor as unknown as
      | { full_name: string | null }
      | { full_name: string | null }[]
      | null;
    const instructor = Array.isArray(raw) ? raw[0] : raw;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      meta: `${categoryLabel(c.category)} · ${levelLabel(c.level)}${instructor?.full_name ? ` · ${instructor.full_name}` : ""}`,
      rating: rating
        ? { avg: Number(rating.avg_rating), count: rating.review_count }
        : null,
    };
  });

  return <CourseRows rows={rows} />;
}

function hrefFor(category?: string, level?: string) {
  const q = new URLSearchParams();
  if (category) q.set("category", category);
  if (level) q.set("level", level);
  const s = q.toString();
  return `/${s ? `?${s}` : ""}#catalogo-seccion`;
}

async function Filters({ searchParams }: { searchParams: SearchParams }) {
  const { category, level } = await searchParams;
  const cat = category && isCategory(category) ? category : undefined;
  const lvl = level && isLevel(level) ? level : undefined;

  return (
    <nav aria-label="Filtros del catálogo">
      <ul className="cat-list" data-reveal>
        <li>
          <Link href={hrefFor(undefined, lvl)} aria-current={!cat}>
            Todas
          </Link>
        </li>
        {CATEGORIES.map((c) => (
          <li key={c.value}>
            <Link href={hrefFor(c.value, lvl)} aria-current={cat === c.value}>
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
      <ul className="level-list">
        <li>
          <Link href={hrefFor(cat, undefined)} aria-current={!lvl}>
            Todos los niveles
          </Link>
        </li>
        {LEVELS.map((l) => (
          <li key={l.value}>
            <Link href={hrefFor(cat, l.value)} aria-current={lvl === l.value}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function HomePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <Reveal />
      <PostersGL />
      <main className="home" id="top">
        <Hero />
        <Posters />
        <section id="catalogo-seccion" className="catalog" aria-labelledby="catalogo-titulo">
          <div className="catalog-side">
            <h2 id="catalogo-titulo" data-reveal>Catálogo</h2>
            <Suspense fallback={null}>
              <Filters searchParams={searchParams} />
            </Suspense>
          </div>
          <Suspense fallback={<p className="muted">Cargando cursos…</p>}>
            <Catalog searchParams={searchParams} />
          </Suspense>
        </section>
        <HowItWorks />
        <FinalCta />
      </main>
      <HomeFooter />
    </>
  );
}
