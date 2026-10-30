-- Verifica la lectura pública del catálogo (tarea 4.1). Todo con ROLLBACK.
begin;

do $$
declare
  ua uuid := gen_random_uuid();   -- instructor con un curso publicado y un borrador
  ub uuid := gen_random_uuid();   -- otro instructor, solo borradores
  us uuid := gen_random_uuid();   -- estudiante
  cp uuid; cd uuid; cb uuid;
  mp uuid; md uuid;
  lp uuid; ld uuid;
  n int;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (ua, 'a-' || ua || '@test.local', '{"role":"instructor","full_name":"Ana Instructora"}'),
         (ub, 'b-' || ub || '@test.local', '{"role":"instructor","full_name":"Beto Instructor"}'),
         (us, 's-' || us || '@test.local', '{"role":"student","full_name":"Sara Estudiante"}');

  insert into public.courses (instructor_id, title, category, level)
  values (ua, 'Publicado de A', 'seo', 'basic') returning id into cp;
  insert into public.courses (instructor_id, title, category, level)
  values (ua, 'Borrador de A', 'analytics', 'advanced') returning id into cd;
  insert into public.courses (instructor_id, title, category, level)
  values (ub, 'Borrador de B', 'seo', 'basic') returning id into cb;

  insert into public.modules (course_id, title) values (cp, 'Mod pub') returning id into mp;
  insert into public.modules (course_id, title) values (cd, 'Mod borrador') returning id into md;
  insert into public.lessons (module_id, title) values (mp, 'Lección pub') returning id into lp;
  insert into public.lessons (module_id, title) values (md, 'Lección borrador') returning id into ld;
  insert into public.lesson_contents (lesson_id, body) values (lp, 'secreto pub'), (ld, 'secreto borrador');
  insert into public.lesson_resources (lesson_id, file_path, file_name) values (lp, cp || '/a.pdf', 'a.pdf');

  update public.courses set status = 'published' where id = cp;

  ---------------------------------------------------------------- visitante anónimo
  set local role anon;
  perform set_config('request.jwt.claims', '', true);

  select count(*) into n from public.courses;
  assert n = 1, 'anónimo ve solo 1 curso (el publicado)';
  assert (select title from public.courses) = 'Publicado de A', 'es el publicado';
  assert not exists (select 1 from public.courses where id in (cd, cb)), 'no ve borradores';

  select count(*) into n from public.modules;
  assert n = 1, 'anónimo ve solo el módulo del curso publicado';
  select count(*) into n from public.lessons;
  assert n = 1, 'anónimo ve solo el título de la lección publicada';

  select count(*) into n from public.lesson_contents;
  assert n = 0, 'anónimo NO ve contenidos de lecciones';
  select count(*) into n from public.lesson_resources;
  assert n = 0, 'anónimo NO ve recursos';
  select count(*) into n from public.enrollments;
  assert n = 0, 'anónimo no ve inscripciones';

  -- Perfiles: solo instructores con curso publicado
  select count(*) into n from public.profiles;
  assert n = 1, 'anónimo ve solo 1 perfil';
  assert (select full_name from public.profiles) = 'Ana Instructora', 'es la instructora con curso publicado';

  -- Filtros por categoría y nivel
  select count(*) into n from public.courses where category = 'seo' and level = 'basic';
  assert n = 1, 'filtro combinado devuelve el publicado';
  select count(*) into n from public.courses where category = 'analytics';
  assert n = 0, 'filtro sin resultados (el de analytics es borrador)';

  ---------------------------------------------------------------- estudiante autenticado
  perform set_config('request.jwt.claims', json_build_object('sub', us, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.courses;
  assert n = 1, 'el estudiante ve solo el publicado';
  select count(*) into n from public.lesson_contents;
  assert n = 0, 'el estudiante no inscrito no ve contenidos';
  -- Su propio perfil + el de la instructora con curso publicado
  select count(*) into n from public.profiles;
  assert n = 2, 'el estudiante ve su perfil y el de la instructora publicada';
  assert not exists (select 1 from public.profiles where id = ub), 'no ve al instructor sin cursos publicados';

  ---------------------------------------------------------------- dueño y otro instructor
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  select count(*) into n from public.courses;
  assert n = 2, 'el dueño ve sus 2 cursos (publicado y borrador)';

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  select count(*) into n from public.courses;
  assert n = 2, 'B ve el publicado de A y su propio borrador, no el borrador de A';
  assert not exists (select 1 from public.courses where id = cd), 'B no ve el borrador de A';
end $$;

rollback;
