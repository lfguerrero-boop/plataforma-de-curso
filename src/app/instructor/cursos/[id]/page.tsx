import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, type CourseStatus } from "@/lib/courses";
import { ActionForm } from "@/components/action-form";
import { CourseFields } from "@/app/instructor/course-fields";
import {
  addLesson,
  addModule,
  deleteCourse,
  deleteLesson,
  deleteModule,
  setCourseStatus,
  updateCourse,
} from "@/app/instructor/actions";

async function Course({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Si el curso es de otro instructor, RLS no devuelve nada y se muestra 404.
  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, title, description, category, level, status, modules(id, title, position, lessons(id, title, position))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!course) notFound();

  const status = course.status as CourseStatus;
  const modules = [...course.modules].sort((a, b) => a.position - b.position);
  const nextStatus: CourseStatus = status === "published" ? "draft" : "published";

  return (
    <>
      <h1>{course.title}</h1>
      <p id="estado-curso">Estado: {STATUS_LABEL[status]}</p>

      <div style={{ margin: "16px 0" }}>
      <ActionForm
        action={setCourseStatus}
        submitLabel={status === "published" ? "Volver a borrador" : "Publicar"}
      >
        <input type="hidden" name="course_id" value={course.id} />
        <input type="hidden" name="status" value={nextStatus} />
      </ActionForm>
      </div>

      <h2>Datos del curso</h2>
      <div className="panel form-card">
        <ActionForm action={updateCourse} submitLabel="Guardar curso">
          <input type="hidden" name="course_id" value={course.id} />
          <CourseFields course={course} />
        </ActionForm>
      </div>

      <h2>Temario</h2>
      {modules.length === 0 && <p className="empty">Aún no hay módulos.</p>}
      {modules.map((m) => (
        <section key={m.id} className="module">
          <h3>{m.title}</h3>
          <ul>
            {[...m.lessons]
              .sort((a, b) => a.position - b.position)
              .map((l) => (
                <li key={l.id}>
                  <Link href={`/instructor/cursos/${course.id}/lecciones/${l.id}`}>
                    {l.title}
                  </Link>
                  <ActionForm action={deleteLesson} submitLabel="Borrar lección">
                    <input type="hidden" name="lesson_id" value={l.id} />
                  </ActionForm>
                </li>
              ))}
          </ul>
          <ActionForm action={addLesson} submitLabel="Agregar lección">
            <input type="hidden" name="module_id" value={m.id} />
            <input name="title" placeholder="Título de la lección" required />
          </ActionForm>
          <ActionForm action={deleteModule} submitLabel="Borrar módulo">
            <input type="hidden" name="module_id" value={m.id} />
          </ActionForm>
        </section>
      ))}

      <ActionForm action={addModule} submitLabel="Agregar módulo">
        <input type="hidden" name="course_id" value={course.id} />
        <input name="title" placeholder="Título del módulo" required />
      </ActionForm>

      <h2 className="danger-title">Zona de peligro</h2>
      <ActionForm action={deleteCourse} submitLabel="Borrar curso">
        <input type="hidden" name="course_id" value={course.id} />
      </ActionForm>

      <Link href="/instructor" className="back">
        ← Volver al panel
      </Link>
    </>
  );
}

export default function CursoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="page app">
      <Suspense fallback={<p className="muted">Cargando curso…</p>}>
        <Course params={params} />
      </Suspense>
    </main>
  );
}
