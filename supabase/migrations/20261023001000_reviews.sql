-- course-reviews: reseñas de cursos, solo de estudiantes inscritos en cursos publicados.

create table public.reviews (
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  -- Una reseña por estudiante y curso.
  primary key (student_id, course_id)
);
create index reviews_course_idx on public.reviews (course_id);

alter table public.reviews enable row level security;

-- Lectura pública de las reseñas de cursos publicados; el autor siempre ve la suya.
create policy "reviews: lectura pública de cursos publicados"
  on public.reviews for select
  to anon, authenticated
  using (public.is_course_published(course_id));

create policy "reviews: el autor ve la suya"
  on public.reviews for select
  to authenticated
  using (student_id = (select auth.uid()));

-- Reseña: solo un estudiante, a su nombre, inscrito y en un curso publicado.
create policy "reviews: inscrito reseña"
  on public.reviews for insert
  to authenticated
  with check (
    student_id = (select auth.uid())
    and public.is_student()
    and public.is_enrolled(course_id)
    and public.is_course_published(course_id)
  );

create policy "reviews: el autor edita la suya"
  on public.reviews for update
  to authenticated
  using (student_id = (select auth.uid()))
  with check (
    student_id = (select auth.uid())
    and public.is_enrolled(course_id)
  );

create policy "reviews: el autor borra la suya"
  on public.reviews for delete
  to authenticated
  using (student_id = (select auth.uid()));
