import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function MyCourses() {
  await connection();
  const supabase = await createClient();

  // RLS limita ambas consultas a las inscripciones y al progreso del propio estudiante.
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course:courses(id, title, modules(lessons(id)))")
    .order("created_at", { ascending: false });

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id");
  const done = new Set(progress?.map((p) => p.lesson_id));

  type CourseRow = { id: string; title: string; modules: { lessons: { id: string }[] }[] };
  const courses = (enrollments ?? [])
    .map((e) => {
      const raw = e.course as unknown as CourseRow | CourseRow[] | null;
      return Array.isArray(raw) ? raw[0] : raw;
    })
    .filter((c): c is CourseRow => !!c);

  if (!courses.length) {
    return (
      <p id="sin-inscripciones" className="empty">
        Aún no te has inscrito a ningún curso. <Link href="/">Explora el catálogo</Link>.
      </p>
    );
  }

  return (
    <ul id="mis-cursos-lista">
      {courses.map((c) => {
        const lessonIds = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
        const completed = lessonIds.filter((l) => done.has(l)).length;
        const percent = lessonIds.length
          ? Math.round((completed / lessonIds.length) * 100)
          : 0;
        return (
          <li key={c.id}>
            <span className="dot" aria-hidden="true" />
            <div className="row-main">
              <h3>
                <Link href={`/cursos/${c.id}`}>{c.title}</Link>
              </h3>
              <div className="progress-row">
                <p data-curso={c.id}>
                  Progreso: {percent}% ({completed}/{lessonIds.length})
                </p>
                <div className="progress" aria-hidden="true">
                  <span style={{ width: `${percent}%` }} />
                </div>
              </div>
            </div>
            <p className="row-value">{percent === 100 ? "Completado" : ""}</p>
          </li>
        );
      })}
    </ul>
  );
}

export default function MisCursosPage() {
  return (
    <main className="page app">
      <div className="page-head">
        <h1>Mis cursos</h1>
        <p>Continúa donde lo dejaste.</p>
      </div>
      <Suspense fallback={<p className="muted">Cargando tus cursos…</p>}>
        <MyCourses />
      </Suspense>
    </main>
  );
}
