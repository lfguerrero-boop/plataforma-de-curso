-- course-catalog: lectura pública de cursos publicados y de su temario.
-- El contenido de las lecciones (lesson_contents) y los recursos NO se exponen aquí.
-- Estas políticas se suman (OR) a las del dueño: el instructor sigue viendo sus borradores.

create policy "courses: lectura pública de publicados"
  on public.courses for select
  to anon, authenticated
  using (status = 'published');

create policy "modules: lectura pública del temario publicado"
  on public.modules for select
  to anon, authenticated
  using (public.is_course_published(course_id));

create policy "lessons: lectura pública de títulos publicados"
  on public.lessons for select
  to anon, authenticated
  using (public.is_course_published(public.course_of_module(module_id)));

-- El detalle del curso muestra el nombre del instructor: solo si tiene al menos un
-- curso publicado. Un estudiante o un instructor sin cursos publicados siguen privados.
create policy "profiles: instructores con cursos publicados"
  on public.profiles for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.instructor_id = profiles.id and c.status = 'published'
    )
  );
