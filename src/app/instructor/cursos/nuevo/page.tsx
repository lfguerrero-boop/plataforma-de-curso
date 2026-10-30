import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { createCourse } from "@/app/instructor/actions";
import { CourseFields } from "@/app/instructor/course-fields";

export default function NuevoCursoPage() {
  return (
    <main className="page app">
      <div className="page-head">
        <h1>Nuevo curso</h1>
        <p>Empieza con lo básico; luego agregas módulos y lecciones.</p>
      </div>
      <div className="panel form-card">
        <ActionForm action={createCourse} submitLabel="Crear curso">
          <CourseFields />
        </ActionForm>
      </div>
      <Link href="/instructor" className="back">
        ← Volver al panel
      </Link>
    </main>
  );
}
