import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  STATUS_LABEL,
  categoryLabel,
  levelLabel,
  type CourseStatus,
} from "@/lib/courses";

async function Courses() {
  const supabase = await createClient();
  // RLS devuelve solo los cursos del instructor autenticado, en cualquier estado.
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, category, level, status")
    .order("created_at", { ascending: false });

  if (!courses?.length) {
    return (
      <p id="sin-cursos" className="empty">
        Todavía no has creado cursos.
      </p>
    );
  }

  return (
    <ul id="mis-cursos">
      {courses.map((c) => (
        <li key={c.id}>
          <span className="dot" aria-hidden="true" />
          <div className="row-main">
            <h3>
              <Link href={`/instructor/cursos/${c.id}`}>{c.title}</Link>
            </h3>
            <p>
              {categoryLabel(c.category)} · {levelLabel(c.level)} ·{" "}
              {STATUS_LABEL[c.status as CourseStatus]}
            </p>
          </div>
          <p className={c.status === "published" ? "row-value" : "row-value none"}>
            <span className={c.status === "published" ? "chip-status live" : "chip-status"}>
              {STATUS_LABEL[c.status as CourseStatus]}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function InstructorPage() {
  return (
    <main className="page app">
      <div className="toolbar">
        <div>
          <h1 style={{ marginBottom: 4 }}>Panel del instructor</h1>
          <p className="muted">Crea, edita y publica tus cursos.</p>
        </div>
        <Link href="/instructor/cursos/nuevo" className="btn">
          + Nuevo curso
        </Link>
      </div>
      <Suspense fallback={<p className="muted">Cargando cursos…</p>}>
        <Courses />
      </Suspense>
    </main>
  );
}
