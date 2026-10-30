-- course-management: solo el instructor dueño crea, lee, edita y borra sus cursos y
-- todo lo que cuelga de ellos. La lectura pública de cursos publicados se añade en la
-- migración del catálogo; las políticas se suman (OR) entre sí.

-- courses ---------------------------------------------------------------------------

create policy "courses: dueño lee los suyos"
  on public.courses for select
  to authenticated
  using (instructor_id = (select auth.uid()));

-- Solo un instructor crea cursos, a su nombre y siempre como borrador.
create policy "courses: instructor crea los suyos"
  on public.courses for insert
  to authenticated
  with check (
    instructor_id = (select auth.uid())
    and public.is_instructor()
    and status = 'draft'
  );

-- El dueño edita su curso, pero no puede traspasarlo a otro instructor.
create policy "courses: dueño edita los suyos"
  on public.courses for update
  to authenticated
  using (public.is_course_owner(id))
  with check (instructor_id = (select auth.uid()));

create policy "courses: dueño borra los suyos"
  on public.courses for delete
  to authenticated
  using (public.is_course_owner(id));

-- modules ---------------------------------------------------------------------------

create policy "modules: dueño del curso gestiona"
  on public.modules for all
  to authenticated
  using (public.is_course_owner(course_id))
  with check (public.is_course_owner(course_id));

-- lessons ---------------------------------------------------------------------------

create policy "lessons: dueño del curso gestiona"
  on public.lessons for all
  to authenticated
  using (public.is_course_owner(public.course_of_module(module_id)))
  with check (public.is_course_owner(public.course_of_module(module_id)));

-- lesson_contents -------------------------------------------------------------------

create policy "lesson_contents: dueño del curso gestiona"
  on public.lesson_contents for all
  to authenticated
  using (public.is_course_owner(public.course_of_lesson(lesson_id)))
  with check (public.is_course_owner(public.course_of_lesson(lesson_id)));

-- lesson_resources ------------------------------------------------------------------

create policy "lesson_resources: dueño del curso gestiona"
  on public.lesson_resources for all
  to authenticated
  using (public.is_course_owner(public.course_of_lesson(lesson_id)))
  with check (public.is_course_owner(public.course_of_lesson(lesson_id)));
