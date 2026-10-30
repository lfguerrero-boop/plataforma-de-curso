-- course-enrollment: inscripciones y progreso por lección.

-- Progreso: una fila por (estudiante, lección completada). Desmarcar = borrar la fila.
create table public.lesson_progress (
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);
create index lesson_progress_lesson_idx on public.lesson_progress (lesson_id);

alter table public.lesson_progress enable row level security;

-- enrollments -----------------------------------------------------------------------

-- Cada estudiante ve las suyas; el instructor ve las de sus cursos.
create policy "enrollments: estudiante ve las suyas"
  on public.enrollments for select
  to authenticated
  using (student_id = (select auth.uid()));

create policy "enrollments: instructor ve las de sus cursos"
  on public.enrollments for select
  to authenticated
  using (public.is_course_owner(course_id));

-- Solo un estudiante se inscribe, a su nombre y a un curso publicado.
-- La clave primaria (student_id, course_id) impide inscribirse dos veces.
create policy "enrollments: estudiante se inscribe"
  on public.enrollments for insert
  to authenticated
  with check (
    student_id = (select auth.uid())
    and public.is_student()
    and public.is_course_published(course_id)
  );

-- lesson_progress -------------------------------------------------------------------

create policy "lesson_progress: estudiante ve el suyo"
  on public.lesson_progress for select
  to authenticated
  using (student_id = (select auth.uid()));

-- Solo marca quien está inscrito en el curso de esa lección.
create policy "lesson_progress: inscrito marca completada"
  on public.lesson_progress for insert
  to authenticated
  with check (
    student_id = (select auth.uid())
    and public.is_enrolled(public.course_of_lesson(lesson_id))
  );

create policy "lesson_progress: estudiante desmarca"
  on public.lesson_progress for delete
  to authenticated
  using (student_id = (select auth.uid()));
