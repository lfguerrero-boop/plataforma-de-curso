"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCategory, isLevel } from "@/lib/courses";
import type { FormState } from "@/components/action-form";

const BUCKET = "lesson-resources";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

// Las Server Functions son alcanzables por POST directo: cada una exige sesión.
// Quién puede qué lo decide RLS en la base; aquí solo se traducen los errores.
async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function refresh() {
  revalidatePath("/instructor", "layout");
}

function fail(error: { message: string; code?: string } | null, fallback: string) {
  if (!error) return {};
  if (error.code === "23514") return { error: error.message };
  if (error.code === "42501") return { error: "No tienes permiso para hacer esto." };
  return { error: fallback };
}

// --- Cursos -------------------------------------------------------------------------

export async function createCourse(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const title = text(formData, "title");
  const category = text(formData, "category");
  const level = text(formData, "level");

  if (!title) return { error: "El título es obligatorio." };
  if (!isCategory(category)) return { error: "Elige una categoría válida." };
  if (!isLevel(level)) return { error: "Elige un nivel válido." };

  const { data, error } = await supabase
    .from("courses")
    .insert({
      instructor_id: user.id,
      title,
      description: text(formData, "description"),
      category,
      level,
    })
    .select("id")
    .single();

  if (error || !data) return fail(error, "No se pudo crear el curso.");
  refresh();
  redirect(`/instructor/cursos/${data.id}`);
}

export async function updateCourse(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const title = text(formData, "title");
  const category = text(formData, "category");
  const level = text(formData, "level");

  if (!title) return { error: "El título es obligatorio." };
  if (!isCategory(category)) return { error: "Elige una categoría válida." };
  if (!isLevel(level)) return { error: "Elige un nivel válido." };

  const { error } = await supabase
    .from("courses")
    .update({ title, description: text(formData, "description"), category, level })
    .eq("id", text(formData, "course_id"));

  if (error) return fail(error, "No se pudo guardar el curso.");
  refresh();
  return { message: "Curso guardado." };
}

export async function setCourseStatus(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const status = text(formData, "status");
  if (status !== "draft" && status !== "published") {
    return { error: "Estado no válido." };
  }

  const { error } = await supabase
    .from("courses")
    .update({ status })
    .eq("id", text(formData, "course_id"));

  if (error) return fail(error, "No se pudo cambiar el estado.");
  refresh();
  return {
    message: status === "published" ? "Curso publicado." : "Curso en borrador.",
  };
}

export async function deleteCourse(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const courseId = text(formData, "course_id");

  // Los archivos viven en Storage y no se borran en cascada con las filas.
  const { data: files } = await supabase.storage.from(BUCKET).list(courseId);
  if (files?.length) {
    await supabase.storage
      .from(BUCKET)
      .remove(files.map((f) => `${courseId}/${f.name}`));
  }

  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) return fail(error, "No se pudo borrar el curso.");
  refresh();
  redirect("/instructor");
}

// --- Módulos ------------------------------------------------------------------------

export async function addModule(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const title = text(formData, "title");
  const courseId = text(formData, "course_id");
  if (!title) return { error: "El título del módulo es obligatorio." };

  const { count } = await supabase
    .from("modules")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { error } = await supabase
    .from("modules")
    .insert({ course_id: courseId, title, position: count ?? 0 });

  if (error) return fail(error, "No se pudo agregar el módulo.");
  refresh();
  return {};
}

export async function deleteModule(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("modules")
    .delete()
    .eq("id", text(formData, "module_id"));

  if (error) return fail(error, "No se pudo borrar el módulo.");
  refresh();
  return {};
}

// --- Lecciones ----------------------------------------------------------------------

export async function addLesson(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const title = text(formData, "title");
  const moduleId = text(formData, "module_id");
  if (!title) return { error: "El título de la lección es obligatorio." };

  const { count } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);

  const { data, error } = await supabase
    .from("lessons")
    .insert({ module_id: moduleId, title, position: count ?? 0 })
    .select("id")
    .single();

  if (error || !data) return fail(error, "No se pudo agregar la lección.");

  const { error: contentError } = await supabase
    .from("lesson_contents")
    .insert({ lesson_id: data.id });
  if (contentError) return fail(contentError, "No se pudo preparar la lección.");

  refresh();
  return {};
}

export async function deleteLesson(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const lessonId = text(formData, "lesson_id");

  await removeLessonFiles(supabase, lessonId);
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);

  if (error) return fail(error, "No se pudo borrar la lección.");
  refresh();
  return {};
}

export async function saveLessonContent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const videoUrl = text(formData, "video_url");

  if (videoUrl && !/^https?:\/\//i.test(videoUrl)) {
    return { error: "El enlace de video debe empezar con http:// o https://." };
  }

  const { error } = await supabase.from("lesson_contents").upsert({
    lesson_id: text(formData, "lesson_id"),
    body: String(formData.get("body") ?? ""),
    video_url: videoUrl || null,
  });

  if (error) return fail(error, "No se pudo guardar la lección.");
  refresh();
  return { message: "Lección guardada." };
}

// --- Recursos descargables ----------------------------------------------------------

export async function uploadResource(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const lessonId = text(formData, "lesson_id");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elige un archivo." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "El archivo supera los 8 MB." };
  }

  // El id del curso sale de la base, no del formulario: la ruta del archivo
  // debe empezar por él para que las políticas de Storage lo autoricen.
  const courseId = await courseIdOfLesson(supabase, lessonId);
  if (!courseId) return { error: "Lección no encontrada." };

  const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
  const path = `${courseId}/${randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined });
  if (uploadError) return { error: "No se pudo subir el archivo." };

  const { error } = await supabase
    .from("lesson_resources")
    .insert({ lesson_id: lessonId, file_path: path, file_name: file.name });

  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return fail(error, "No se pudo registrar el recurso.");
  }
  refresh();
  return { message: "Recurso subido." };
}

export async function deleteResource(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const id = text(formData, "resource_id");

  const { data: resource } = await supabase
    .from("lesson_resources")
    .select("file_path")
    .eq("id", id)
    .single();
  if (!resource) return { error: "Recurso no encontrado." };

  const { error } = await supabase.from("lesson_resources").delete().eq("id", id);
  if (error) return fail(error, "No se pudo borrar el recurso.");

  await supabase.storage.from(BUCKET).remove([resource.file_path]);
  refresh();
  return {};
}

// --- Auxiliares ---------------------------------------------------------------------

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function courseIdOfLesson(supabase: Supabase, lessonId: string) {
  const { data } = await supabase
    .from("lessons")
    .select("modules(course_id)")
    .eq("id", lessonId)
    .single();
  const modules = data?.modules as { course_id: string } | { course_id: string }[] | null | undefined;
  return Array.isArray(modules) ? modules[0]?.course_id : modules?.course_id;
}

async function removeLessonFiles(supabase: Supabase, lessonId: string) {
  const { data } = await supabase
    .from("lesson_resources")
    .select("file_path")
    .eq("lesson_id", lessonId);
  if (data?.length) {
    await supabase.storage.from(BUCKET).remove(data.map((r) => r.file_path));
  }
}
