import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/action-form";
import { setLessonCompleted } from "@/app/cursos/actions";

type Params = Promise<{ id: string; lessonId: string }>;
type Content = { body: string; video_url: string | null };

async function Lesson({ params }: { params: Params }) {
  await connection();
  const { id, lessonId } = await params;
  const supabase = await createClient();

  // El título es público; el contenido solo llega si el usuario está inscrito o es el
  // dueño (RLS). Sin inscripción, lesson_contents viene vacío.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, lesson_contents(body, video_url), lesson_resources(id, file_name, file_path)")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) notFound();

  const rawContent = lesson.lesson_contents as unknown as Content | Content[] | null;
  const content = Array.isArray(rawContent) ? (rawContent[0] ?? null) : rawContent;

  if (!content) {
    return (
      <>
        <h1>{lesson.title}</h1>
        <p id="sin-acceso">
          Inscríbete en el curso para ver el contenido de esta lección.
        </p>
        <Link href={`/cursos/${id}`} className="back">
          ← Ir al curso
        </Link>
      </>
    );
  }

  // Enlaces de descarga firmados y de corta duración (el bucket es privado).
  const resources = lesson.lesson_resources ?? [];
  const signed = resources.length
    ? await supabase.storage
        .from("lesson-resources")
        .createSignedUrls(
          resources.map((r) => r.file_path),
          300,
        )
    : { data: [] };
  const urlByPath = new Map(
    (signed.data ?? []).map((s) => [s.path, s.signedUrl] as const),
  );

  // Progreso: solo existe para estudiantes inscritos (el dueño no tiene fila).
  const { data: auth } = await supabase.auth.getUser();
  let isCompleted = false;
  let isStudent = false;
  if (auth.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .single();
    isStudent = profile?.role === "student";
    if (isStudent) {
      const { data: row } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("lesson_id", lesson.id)
        .maybeSingle();
      isCompleted = !!row;
    }
  }

  return (
    <>
      <h1>{lesson.title}</h1>
      <div id="contenido" style={{ whiteSpace: "pre-wrap" }}>
        {content.body}
      </div>
      {content.video_url && (
        <p>
          <a
            href={content.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="video-link"
          >
            ▶ Ver video
          </a>
        </p>
      )}

      {resources.length > 0 && (
        <>
          <h2>Recursos</h2>
          <ul id="recursos">
            {resources.map((r) => {
              const url = urlByPath.get(r.file_path);
              return (
                <li key={r.id}>
                  {url ? (
                    <a href={url} download={r.file_name}>
                      {r.file_name}
                    </a>
                  ) : (
                    r.file_name
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {isStudent && (
        <ActionForm
          action={setLessonCompleted}
          submitLabel={isCompleted ? "Marcar como pendiente" : "Marcar como completada"}
        >
          <input type="hidden" name="lesson_id" value={lesson.id} />
          <input type="hidden" name="completed" value={isCompleted ? "false" : "true"} />
        </ActionForm>
      )}
      {isStudent && isCompleted && <p id="completada">Lección completada</p>}

      <Link href={`/cursos/${id}`} className="back">
        ← Volver al curso
      </Link>
    </>
  );
}

export default function LeccionPublicaPage({ params }: { params: Params }) {
  return (
    <main className="page">
      <Suspense fallback={<p className="muted">Cargando lección…</p>}>
        <Lesson params={params} />
      </Suspense>
    </main>
  );
}
