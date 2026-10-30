"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/components/action-form";

// Cada Server Function exige sesión; quién puede qué lo decide RLS en la base.
async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function enroll(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const courseId = text(formData, "course_id");

  const { error } = await supabase
    .from("enrollments")
    .insert({ student_id: user.id, course_id: courseId });

  if (error) {
    if (error.code === "23505") return { message: "Ya estás inscrito en este curso." };
    if (error.code === "42501") {
      return { error: "Solo los estudiantes pueden inscribirse a cursos publicados." };
    }
    return { error: "No se pudo completar la inscripción." };
  }

  revalidatePath("/", "layout");
  redirect(`/cursos/${courseId}`);
}

export async function saveReview(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const courseId = text(formData, "course_id");
  const rating = Number(text(formData, "rating"));

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "La calificación debe ser un número entero de 1 a 5." };
  }

  // Una reseña por estudiante y curso: guardar de nuevo la actualiza.
  const { error } = await supabase.from("reviews").upsert({
    student_id: user.id,
    course_id: courseId,
    rating,
    comment: text(formData, "comment") || null,
  });

  if (error) {
    if (error.code === "42501") {
      return { error: "Solo los estudiantes inscritos pueden reseñar este curso." };
    }
    return { error: "No se pudo guardar tu reseña." };
  }

  revalidatePath("/", "layout");
  return { message: "Reseña guardada." };
}

export async function deleteReview(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("student_id", user.id)
    .eq("course_id", text(formData, "course_id"));

  if (error) return { error: "No se pudo borrar tu reseña." };
  revalidatePath("/", "layout");
  return {};
}

export async function setLessonCompleted(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const lessonId = text(formData, "lesson_id");
  const completed = text(formData, "completed") === "true";

  const { error } = completed
    ? await supabase
        .from("lesson_progress")
        .insert({ student_id: user.id, lesson_id: lessonId })
    : await supabase
        .from("lesson_progress")
        .delete()
        .eq("student_id", user.id)
        .eq("lesson_id", lessonId);

  // 23505: ya estaba marcada; el resultado es el mismo que se buscaba.
  if (error && error.code !== "23505") {
    return { error: "No se pudo actualizar tu progreso." };
  }

  revalidatePath("/", "layout");
  return {};
}
