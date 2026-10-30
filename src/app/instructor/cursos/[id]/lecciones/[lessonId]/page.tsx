import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/action-form";
import {
  deleteResource,
  saveLessonContent,
  uploadResource,
} from "@/app/instructor/actions";

type Params = Promise<{ id: string; lessonId: string }>;

async function Lesson({ params }: { params: Params }) {
  const { id, lessonId } = await params;
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "id, title, lesson_contents(body, video_url), lesson_resources(id, file_name)",
    )
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) notFound();

  // Relación 1-1: PostgREST la devuelve como objeto (o null); los tipos sin
  // esquema generado la infieren como arreglo, así que se aceptan ambas formas.
  type Content = { body: string; video_url: string | null };
  const raw = lesson.lesson_contents as unknown as Content | Content[] | null;
  const content = Array.isArray(raw) ? (raw[0] ?? null) : raw;

  return (
    <>
      <h1>{lesson.title}</h1>

      <div className="panel form-card" style={{ maxWidth: 760 }}>
      <ActionForm action={saveLessonContent} submitLabel="Guardar lección">
        <input type="hidden" name="lesson_id" value={lesson.id} />
        <label>
          Contenido
          <textarea name="body" rows={10} defaultValue={content?.body ?? ""} />
        </label>
        <label>
          Enlace de video (YouTube o Vimeo, opcional)
          <input
            name="video_url"
            type="url"
            defaultValue={content?.video_url ?? ""}
          />
        </label>
      </ActionForm>
      </div>

      <h2>Recursos descargables</h2>
      {lesson.lesson_resources.length === 0 && <p className="muted">Sin recursos.</p>}
      <ul className="resource-list">
        {lesson.lesson_resources.map((r) => (
          <li key={r.id}>
            {r.file_name}
            <ActionForm action={deleteResource} submitLabel="Borrar">
              <input type="hidden" name="resource_id" value={r.id} />
            </ActionForm>
          </li>
        ))}
      </ul>

      <div className="panel form-card">
        <ActionForm action={uploadResource} submitLabel="Subir recurso">
          <input type="hidden" name="lesson_id" value={lesson.id} />
          <input name="file" type="file" required />
        </ActionForm>
      </div>

      <Link href={`/instructor/cursos/${id}`} className="back">
        ← Volver al curso
      </Link>
    </>
  );
}

export default function LeccionPage({ params }: { params: Params }) {
  return (
    <main className="page app">
      <Suspense fallback={<p className="muted">Cargando lección…</p>}>
        <Lesson params={params} />
      </Suspense>
    </main>
  );
}
