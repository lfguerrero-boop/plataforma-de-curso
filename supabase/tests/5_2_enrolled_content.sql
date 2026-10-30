-- Verifica que el contenido solo lo ven los inscritos (tarea 5.2). Todo con ROLLBACK.
begin;

do $$
declare
  ui uuid := gen_random_uuid();   -- instructor dueño
  uo uuid := gen_random_uuid();   -- otro instructor
  ue uuid := gen_random_uuid();   -- estudiante inscrito
  un uuid := gen_random_uuid();   -- estudiante no inscrito
  c uuid; m uuid; l uuid;
  n int;
  b text;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (ui, 'i-' || ui || '@test.local', '{"role":"instructor"}'),
         (uo, 'o-' || uo || '@test.local', '{"role":"instructor"}'),
         (ue, 'e-' || ue || '@test.local', '{"role":"student"}'),
         (un, 'n-' || un || '@test.local', '{"role":"student"}');

  insert into public.courses (instructor_id, title, category, level)
  values (ui, 'Curso', 'seo', 'basic') returning id into c;
  insert into public.modules (course_id, title) values (c, 'M') returning id into m;
  insert into public.lessons (module_id, title) values (m, 'L') returning id into l;
  insert into public.lesson_contents (lesson_id, body, video_url)
  values (l, 'contenido protegido', 'https://youtu.be/x');
  insert into public.lesson_resources (lesson_id, file_path, file_name)
  values (l, c || '/guia.pdf', 'guia.pdf');
  update public.courses set status = 'published' where id = c;
  insert into public.enrollments (student_id, course_id) values (ue, c);

  -- Inscrito: ve texto, video y recursos
  perform set_config('request.jwt.claims', json_build_object('sub', ue, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select body into b from public.lesson_contents where lesson_id = l;
  assert b = 'contenido protegido', 'el inscrito lee el contenido';
  assert (select video_url from public.lesson_contents where lesson_id = l) = 'https://youtu.be/x', 'y el video';
  select count(*) into n from public.lesson_resources where lesson_id = l;
  assert n = 1, 'y los recursos';

  -- No inscrito: cero filas
  perform set_config('request.jwt.claims', json_build_object('sub', un, 'role', 'authenticated')::text, true);
  select count(*) into n from public.lesson_contents;
  assert n = 0, 'el no inscrito no recibe contenido';
  select count(*) into n from public.lesson_resources;
  assert n = 0, 'ni recursos';
  -- ...pero sí ve el temario público
  select count(*) into n from public.lessons where id = l;
  assert n = 1, 'el no inscrito sí ve el título de la lección';

  -- Otro instructor: nada
  perform set_config('request.jwt.claims', json_build_object('sub', uo, 'role', 'authenticated')::text, true);
  select count(*) into n from public.lesson_contents;
  assert n = 0, 'otro instructor no recibe contenido';

  -- Dueño: sí
  perform set_config('request.jwt.claims', json_build_object('sub', ui, 'role', 'authenticated')::text, true);
  select count(*) into n from public.lesson_contents;
  assert n = 1, 'el dueño lee su contenido';

  -- Anónimo: nada
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  select count(*) into n from public.lesson_contents;
  assert n = 0, 'el anónimo no recibe contenido';
end $$;

rollback;
