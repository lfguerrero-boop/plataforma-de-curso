-- Verifica la búsqueda semántica match_courses (course-search). Todo con ROLLBACK.
begin;

do $$
declare
  ua uuid := gen_random_uuid();   -- instructor con cursos publicados y un borrador
  us uuid := gen_random_uuid();   -- estudiante
  ca uuid; cb uuid; cc uuid; cd uuid;
  ma uuid;
  -- Vectores unitarios sobre ejes distintos: e1 es idéntico a la consulta, e2 es
  -- ortogonal (similitud 0).
  e1 public.vector(384) := (select array_agg(case when i = 1 then 1 else 0 end)
                            from generate_series(1, 384) i)::public.vector;
  e2 public.vector(384) := (select array_agg(case when i = 2 then 1 else 0 end)
                            from generate_series(1, 384) i)::public.vector;
  r record;
  n int;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (ua, 'a-' || ua || '@test.local', '{"role":"instructor","full_name":"Ana Instructora"}'),
         (us, 's-' || us || '@test.local', '{"role":"student","full_name":"Sara Estudiante"}');

  insert into public.courses (instructor_id, title, category, level)
  values (ua, 'Publicado cercano', 'social_media', 'basic') returning id into ca;
  insert into public.courses (instructor_id, title, category, level)
  values (ua, 'Publicado lejano', 'seo', 'basic') returning id into cb;
  insert into public.courses (instructor_id, title, category, level)
  values (ua, 'Borrador idéntico', 'seo', 'basic') returning id into cc;
  insert into public.courses (instructor_id, title, category, level)
  values (ua, 'Publicado sin embedding', 'seo', 'basic') returning id into cd;

  insert into public.modules (course_id, title) values (ca, 'Mod') returning id into ma;
  insert into public.lessons (module_id, title) values (ma, 'Lección');
  insert into public.modules (course_id, title) select id, 'Mod' from public.courses where id in (cb, cd);
  insert into public.lessons (module_id, title)
    select m.id, 'Lección' from public.modules m where m.course_id in (cb, cd);

  update public.courses set status = 'published' where id in (ca, cb, cd);
  update public.courses set embedding = e1 where id in (ca, cc);
  update public.courses set embedding = e2 where id = cb;

  ---------------------------------------------------------------- visitante anónimo
  set local role anon;
  perform set_config('request.jwt.claims', '', true);

  select count(*) into n from public.match_courses(e1);
  assert n = 2, 'devuelve solo los publicados con embedding (2)';
  assert not exists (select 1 from public.match_courses(e1) where id in (cc, cd)),
    'no devuelve el borrador (aunque sea idéntico a la consulta) ni el curso sin embedding';

  select * into r from public.match_courses(e1) limit 1;
  assert r.id = ca, 'el más parecido va primero';
  assert round(r.similarity::numeric, 3) = 1.000, 'idéntico: similitud 1';
  assert r.instructor_name = 'Ana Instructora', 'trae el nombre del instructor';
  assert r.avg_rating is null and r.review_count is null, 'sin reseñas: sin calificar';

  assert (select id from public.match_courses(e1) offset 1 limit 1) = cb, 'el lejano va segundo';
  assert round((select similarity from public.match_courses(e1) offset 1 limit 1)::numeric, 3) = 0.000,
    'ortogonal: similitud 0';

  -- Solo campos públicos
  assert not (to_jsonb(r) ?| array['embedding', 'status', 'instructor_id']),
    'no expone embedding, estado ni instructor_id';

  -- Umbral y tope
  select count(*) into n from public.match_courses(e1, 10, 0.5);
  assert n = 1, 'min_similarity descarta el curso lejano';
  select count(*) into n from public.match_courses(e1, 1);
  assert n = 1, 'match_count limita los resultados';
  select count(*) into n from public.match_courses(e1, -5);
  assert n = 1, 'match_count se acota a 1 como mínimo';

  -- Filtros dentro de la consulta (antes del tope, no después)
  select count(*) into n from public.match_courses(e1, 10, 0, 'seo', null);
  assert n = 1 and (select id from public.match_courses(e1, 10, 0, 'seo', null)) = cb,
    'filtra por categoría: solo el publicado de SEO';
  select count(*) into n from public.match_courses(e1, 10, 0, null, 'advanced');
  assert n = 0, 'filtra por nivel: ninguno es avanzado';
  select count(*) into n from public.match_courses(e1, 10, 0, 'social_media', 'basic');
  assert n = 1 and (select id from public.match_courses(e1, 10, 0, 'social_media', 'basic')) = ca,
    'categoría y nivel combinados';
  -- El tope se aplica DESPUÉS del filtro: con match_count 1 y filtro SEO igual aparece cb,
  -- aunque ca esté más cerca de la consulta.
  assert (select id from public.match_courses(e1, 1, 0, 'seo', null)) = cb,
    'el filtro se aplica antes del tope';

  ---------------------------------------------------------------- el dueño tampoco ve su borrador
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  assert not exists (select 1 from public.match_courses(e1) where id = cc),
    'ni el dueño recibe su borrador en la búsqueda pública';

  ---------------------------------------------------------------- estudiante autenticado
  perform set_config('request.jwt.claims', json_build_object('sub', us, 'role', 'authenticated')::text, true);
  select count(*) into n from public.match_courses(e1);
  assert n = 2, 'el estudiante ve los mismos 2 resultados';
end;
$$;

rollback;
