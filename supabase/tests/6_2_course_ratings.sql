-- Verifica la vista de calificaciones (tarea 6.2). Todo con ROLLBACK.
begin;

do $$
declare
  ui uuid := gen_random_uuid();
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  c uuid; c2 uuid; cd uuid; m uuid;
  avg_r numeric;
  cnt int;
  n int;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (ui, 'i-' || ui || '@test.local', '{"role":"instructor"}'),
         (u1, 'a-' || u1 || '@test.local', '{"role":"student"}'),
         (u2, 'b-' || u2 || '@test.local', '{"role":"student"}');

  insert into public.courses (instructor_id, title, category, level)
  values (ui, 'Con reseñas', 'seo', 'basic') returning id into c;
  insert into public.courses (instructor_id, title, category, level)
  values (ui, 'Sin reseñas', 'seo', 'basic') returning id into c2;
  insert into public.courses (instructor_id, title, category, level)
  values (ui, 'Borrador con reseña', 'seo', 'basic') returning id into cd;
  insert into public.modules (course_id, title) values (c, 'M') returning id into m;
  insert into public.lessons (module_id, title) values (m, 'L');
  update public.courses set status = 'published' where id = c;
  insert into public.modules (course_id, title) values (c2, 'M') returning id into m;
  insert into public.lessons (module_id, title) values (m, 'L');
  update public.courses set status = 'published' where id = c2;

  insert into public.enrollments (student_id, course_id) values (u1, c), (u2, c), (u1, cd);
  insert into public.reviews (student_id, course_id, rating, comment)
  values (u1, c, 5, 'ok'), (u2, c, 3, null), (u1, cd, 1, 'borrador');

  -- Anónimo: promedio 4.0 con 2 reseñas; sin fila para el curso sin reseñas;
  -- la reseña del borrador no aparece (la vista respeta RLS)
  set local role anon;
  perform set_config('request.jwt.claims', '', true);
  select avg_rating, review_count into avg_r, cnt from public.course_ratings where course_id = c;
  assert avg_r = 4.0 and cnt = 2, 'promedio 4.0 con 2 reseñas';
  select count(*) into n from public.course_ratings where course_id = c2;
  assert n = 0, 'curso sin reseñas no tiene fila';
  select count(*) into n from public.course_ratings where course_id = cd;
  assert n = 0, 'la reseña de un borrador no es pública';

  -- Redondeo a un decimal
  reset role;
  insert into public.enrollments (student_id, course_id)
  select gen_random_uuid(), c where false;  -- sin efecto: solo asegura la tabla
  update public.reviews set rating = 4 where student_id = u2 and course_id = c;  -- 5 y 4
  set local role anon;
  select avg_rating into avg_r from public.course_ratings where course_id = c;
  assert avg_r = 4.5, 'promedio 4.5';
end $$;

rollback;
