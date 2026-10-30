import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, levelLabel } from "@/lib/courses";
import { ActionForm } from "@/components/action-form";
import { deleteReview, enroll, saveReview } from "@/app/cursos/actions";

type Params = Promise<{ id: string }>;

async function Course({ params }: { params: Params }) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();

  // RLS oculta los borradores ajenos; un id inexistente o ajeno da el mismo 404.
  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, title, description, category, level, status, instructor_id, instructor:profiles!courses_instructor_id_fkey(full_name), modules(id, title, position, lessons(id, title, position))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!course) notFound();

  const raw = course.instructor as unknown as
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
  const instructor = Array.isArray(raw) ? raw[0] : raw;
  const modules = [...course.modules].sort((a, b) => a.position - b.position);

  // Estado del visitante frente al curso.
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  let role: string | null = null;
  let enrolled = false;
  const done = new Set<string>();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;

    if (role === "student") {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("course_id", course.id)
        .maybeSingle();
      enrolled = !!enrollment;

      if (enrolled) {
        const { data: progress } = await supabase
          .from("lesson_progress")
          .select("lesson_id");
        progress?.forEach((p) => done.add(p.lesson_id));
      }
    }
  }

  // Reseñas públicas de cursos publicados (RLS) y calificación promedio.
  const { data: reviews } = await supabase
    .from("reviews")
    .select("student_id, rating, comment")
    .eq("course_id", course.id)
    .order("created_at", { ascending: false });
  const { data: ratingRow } = await supabase
    .from("course_ratings")
    .select("avg_rating, review_count")
    .eq("course_id", course.id)
    .maybeSingle();
  const myReview = reviews?.find((r) => r.student_id === user?.id);

  const isOwner = user?.id === course.instructor_id;
  const canRead = enrolled || isOwner;
  const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const completed = lessonIds.filter((l) => done.has(l)).length;
  const percent = lessonIds.length
    ? Math.round((completed / lessonIds.length) * 100)
    : 0;

  return (
    <>
      <header className="course-head">
        <h1>{course.title}</h1>
        <p className="meta">
          {categoryLabel(course.category)} · {levelLabel(course.level)}
          {instructor?.full_name ? ` · Por ${instructor.full_name}` : ""}
        </p>
        <p id="calificacion" className="rating">
          {ratingRow
            ? `Calificación: ${Number(ratingRow.avg_rating).toFixed(1)} / 5 (${ratingRow.review_count} ${ratingRow.review_count === 1 ? "reseña" : "reseñas"})`
            : "Sin calificar"}
        </p>
        {course.status === "draft" && (
          <p className="draft-note">(Borrador: solo tú puedes verlo)</p>
        )}
        {enrolled && (
          <div className="progress-row">
            <p id="progreso">
              Estás inscrito · Progreso: {percent}% ({completed}/{lessonIds.length})
            </p>
            <div className="progress" aria-hidden="true">
              <span style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}
      </header>

      <div className="layout-2">
        <div>
          {course.description && <p>{course.description}</p>}
      <h2 style={{ marginTop: course.description ? undefined : 0 }}>Temario</h2>
      <ol id="temario">
        {modules.map((m) => (
          <li key={m.id}>
            {m.title}
            <ul>
              {[...m.lessons]
                .sort((a, b) => a.position - b.position)
                .map((l) => (
                  <li key={l.id}>
                    {canRead ? (
                      <Link href={`/cursos/${course.id}/lecciones/${l.id}`}>
                        {l.title}
                      </Link>
                    ) : (
                      l.title
                    )}
                    {done.has(l.id) && (
                      <span className="chip-status live" style={{ marginLeft: 10 }}>Completada</span>
                    )}
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ol>

        </div>
        <aside className="enroll-box">
          {!user && (
            <p>
              <Link href="/login">Inicia sesión</Link> como estudiante para
              inscribirte.
            </p>
          )}
          {role === "student" && !enrolled && course.status === "published" && (
            <ActionForm action={enroll} submitLabel="Inscribirme">
              <input type="hidden" name="course_id" value={course.id} />
            </ActionForm>
          )}
          {role === "student" && enrolled && <p className="muted">Ya tienes acceso a todas las lecciones.</p>}
          {role === "instructor" && <p className="muted">Los instructores no se inscriben a cursos.</p>}
          <p className="muted">
            {lessonIds.length} {lessonIds.length === 1 ? "lección" : "lecciones"} · {modules.length} {modules.length === 1 ? "módulo" : "módulos"}
          </p>
        </aside>
      </div>

      <h2>Reseñas</h2>
      {enrolled && (
        <div className="review-form panel">
          <ActionForm
            action={saveReview}
            submitLabel={myReview ? "Actualizar mi reseña" : "Publicar reseña"}
          >
            <input type="hidden" name="course_id" value={course.id} />
            <label>
              Calificación
              <select name="rating" defaultValue={String(myReview?.rating ?? 5)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Comentario (opcional)
              <textarea name="comment" rows={3} defaultValue={myReview?.comment ?? ""} />
            </label>
          </ActionForm>
          {myReview && (
            <ActionForm action={deleteReview} submitLabel="Borrar mi reseña">
              <input type="hidden" name="course_id" value={course.id} />
            </ActionForm>
          )}
        </div>
      )}
      {!reviews?.length ? (
        <p id="sin-resenas" className="empty">Aún no hay reseñas.</p>
      ) : (
        <ul id="resenas">
          {reviews.map((r) => (
            <li key={r.student_id}>
              {r.rating}/5{r.comment ? ` — ${r.comment}` : ""}
              {r.student_id === user?.id ? " (tu reseña)" : ""}
            </li>
          ))}
        </ul>
      )}

      <Link href="/" className="back">
        ← Volver al catálogo
      </Link>
    </>
  );
}

export default function CursoPublicoPage({ params }: { params: Params }) {
  return (
    <main className="page">
      <Suspense fallback={<p className="muted">Cargando curso…</p>}>
        <Course params={params} />
      </Suspense>
    </main>
  );
}
