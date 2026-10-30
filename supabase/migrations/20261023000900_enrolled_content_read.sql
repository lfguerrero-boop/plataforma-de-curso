-- course-enrollment: el contenido de las lecciones solo lo leen los estudiantes inscritos
-- (y el dueño, por su política de gestión). Sin inscripción no se devuelve ninguna fila.

create policy "lesson_contents: inscritos leen"
  on public.lesson_contents for select
  to authenticated
  using (public.is_enrolled(public.course_of_lesson(lesson_id)));

create policy "lesson_resources: inscritos leen"
  on public.lesson_resources for select
  to authenticated
  using (public.is_enrolled(public.course_of_lesson(lesson_id)));
