-- Verifica las reseñas (tarea 6.1). Todo con ROLLBACK.
begin;

do $$
declare
  ui uuid := gen_random_uuid();   -- instructor dueño
  ue uuid := gen_random_uuid();   -- estudiante inscrito
  un uuid := gen_random_uuid();   -- estudiante no inscrito
  ux uuid := gen_random_uuid();   -- otro estudiante inscrito
  c uuid; cd uuid; m uuid;
  n int;
  failed boolean;
  r smallint;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (ui, 'i-' || ui || '@test.local', '{"role":"instructor"}'),
         (ue, 'e-' || ue || '@test.local', '{"role":"student"}'),
         (un, 'n-' || un || '@test.local', '{"role":"student"}'),
         (ux, 'x-' || ux || '@test.local', '{"role":"student"}');

  insert into public.courses (instructor_id, title, category, level)
  values (ui, 'Publicado', 'seo', 'basic') returning id into c;
  insert into public.courses (instructor_id, title, category, level)
  values (ui, 'Borrador', 'seo', 'basic') returning id into cd;
  insert into public.modules (course_id, title) values (c, 'M') returning id into m;
  insert into public.lessons (module_id, title) values (m, 'L');
  update public.courses set status = 'published' where id = c;
  insert into public.enrollments (student_id, course_id) values (ue, c), (ux, c), (ue, cd);

  ---------------------------------------------------------------- inscrito
  perform set_config('request.jwt.claims', json_build_object('sub', ue, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.reviews (student_id, course_id, rating, comment) values (ue, c, 4, 'Muy bueno');
  select count(*) into n from public.reviews where course_id = c;
  assert n = 1, 'el inscrito reseña y la ve';

  -- Rango 1-5
  failed := false;
  begin
    insert into public.reviews (student_id, course_id, rating) values (ue, cd, 0);
  exception when others then failed := true;
  end;
  assert failed, 'calificación 0 rechazada';
  failed := false;
  begin
    insert into public.reviews (student_id, course_id, rating) values (ue, cd, 6);
  exception when others then failed := true;
  end;
  assert failed, 'calificación 6 rechazada';

  -- Una reseña por estudiante y curso
  failed := false;
  begin
    insert into public.reviews (student_id, course_id, rating) values (ue, c, 5);
  exception when unique_violation then failed := true;
  end;
  assert failed, 'segunda reseña rechazada';

  -- Curso en borrador: aunque esté inscrito, no se reseña
  failed := false;
  begin
    insert into public.reviews (student_id, course_id, rating) values (ue, cd, 3);
  exception when others then failed := true;
  end;
  assert failed, 'no se reseña un borrador';

  -- No puede reseñar a nombre de otro
  failed := false;
  begin
    insert into public.reviews (student_id, course_id, rating) values (ux, c, 5);
  exception when others then failed := true;
  end;
  assert failed, 'no reseña a nombre de otro';

  -- Edita la propia
  update public.reviews set rating = 5 where student_id = ue and course_id = c;
  select rating into r from public.reviews where student_id = ue and course_id = c;
  assert r = 5, 'el autor edita su calificación';

  ---------------------------------------------------------------- no inscrito
  perform set_config('request.jwt.claims', json_build_object('sub', un, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    insert into public.reviews (student_id, course_id, rating) values (un, c, 5);
  exception when others then failed := true;
  end;
  assert failed, 'un no inscrito no reseña';

  -- Ve la reseña pública, pero no puede editarla ni borrarla
  select count(*) into n from public.reviews where course_id = c;
  assert n = 1, 'cualquier autenticado lee reseñas de cursos publicados';
  update public.reviews set rating = 1 where course_id = c;
  get diagnostics n = row_count;
  assert n = 0, 'no edita reseñas ajenas';
  delete from public.reviews where course_id = c;
  get diagnostics n = row_count;
  assert n = 0, 'no borra reseñas ajenas';

  ---------------------------------------------------------------- instructor
  perform set_config('request.jwt.claims', json_build_object('sub', ui, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    insert into public.reviews (student_id, course_id, rating) values (ui, c, 5);
  exception when others then failed := true;
  end;
  assert failed, 'un instructor no reseña';

  ---------------------------------------------------------------- anónimo
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  select count(*) into n from public.reviews where course_id = c;
  assert n = 1, 'el anónimo lee reseñas de cursos publicados';
  failed := false;
  begin
    insert into public.reviews (student_id, course_id, rating) values (ux, c, 5);
  exception when others then failed := true;
  end;
  assert failed, 'el anónimo no reseña';

  ---------------------------------------------------------------- el autor borra la suya
  perform set_config('request.jwt.claims', json_build_object('sub', ue, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.reviews where course_id = c;
  get diagnostics n = row_count;
  assert n = 1, 'el autor borra su reseña';
end $$;

rollback;
