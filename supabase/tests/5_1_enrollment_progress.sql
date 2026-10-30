-- Verifica inscripciones y progreso (tarea 5.1). Todo con ROLLBACK.
begin;

do $$
declare
  ui uuid := gen_random_uuid();   -- instructor dueño
  uo uuid := gen_random_uuid();   -- otro instructor
  ua uuid := gen_random_uuid();   -- estudiante A
  ub uuid := gen_random_uuid();   -- estudiante B
  cp uuid; cd uuid;
  mp uuid; md uuid;
  lp uuid; ld uuid;
  n int;
  failed boolean;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (ui, 'i-' || ui || '@test.local', '{"role":"instructor"}'),
         (uo, 'o-' || uo || '@test.local', '{"role":"instructor"}'),
         (ua, 'a-' || ua || '@test.local', '{"role":"student"}'),
         (ub, 'b-' || ub || '@test.local', '{"role":"student"}');

  insert into public.courses (instructor_id, title, category, level)
  values (ui, 'Publicado', 'seo', 'basic') returning id into cp;
  insert into public.courses (instructor_id, title, category, level)
  values (ui, 'Borrador', 'seo', 'basic') returning id into cd;
  insert into public.modules (course_id, title) values (cp, 'M') returning id into mp;
  insert into public.modules (course_id, title) values (cd, 'M') returning id into md;
  insert into public.lessons (module_id, title) values (mp, 'L1') returning id into lp;
  insert into public.lessons (module_id, title) values (md, 'L-borrador') returning id into ld;
  update public.courses set status = 'published' where id = cp;

  ---------------------------------------------------------------- estudiante A
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.enrollments (student_id, course_id) values (ua, cp);
  select count(*) into n from public.enrollments;
  assert n = 1, 'A se inscribió y ve su inscripción';

  failed := false;
  begin
    insert into public.enrollments (student_id, course_id) values (ua, cp);
  exception when unique_violation then failed := true;
  end;
  assert failed, 'inscripción duplicada rechazada';

  failed := false;
  begin
    insert into public.enrollments (student_id, course_id) values (ua, cd);
  exception when others then failed := true;
  end;
  assert failed, 'no se inscribe a un borrador';

  failed := false;
  begin
    insert into public.enrollments (student_id, course_id) values (ub, cp);
  exception when others then failed := true;
  end;
  assert failed, 'no inscribe a otro estudiante';

  -- Progreso
  insert into public.lesson_progress (student_id, lesson_id) values (ua, lp);
  select count(*) into n from public.lesson_progress;
  assert n = 1, 'A marcó la lección y la ve';

  delete from public.lesson_progress where lesson_id = lp;
  get diagnostics n = row_count;
  assert n = 1, 'A puede desmarcar';
  insert into public.lesson_progress (student_id, lesson_id) values (ua, lp);

  failed := false;
  begin
    insert into public.lesson_progress (student_id, lesson_id) values (ua, ld);
  exception when others then failed := true;
  end;
  assert failed, 'no marca lecciones de un curso en el que no está inscrito';

  ---------------------------------------------------------------- estudiante B (sin inscripción)
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);

  select count(*) into n from public.enrollments;
  assert n = 0, 'B no ve inscripciones ajenas';
  select count(*) into n from public.lesson_progress;
  assert n = 0, 'B no ve progreso ajeno';

  failed := false;
  begin
    insert into public.lesson_progress (student_id, lesson_id) values (ub, lp);
  exception when others then failed := true;
  end;
  assert failed, 'B no inscrito no marca lecciones';

  delete from public.lesson_progress where lesson_id = lp;
  get diagnostics n = row_count;
  assert n = 0, 'B no borra el progreso de A';

  ---------------------------------------------------------------- instructores
  perform set_config('request.jwt.claims', json_build_object('sub', ui, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    insert into public.enrollments (student_id, course_id) values (ui, cp);
  exception when others then failed := true;
  end;
  assert failed, 'un instructor no se inscribe';

  select count(*) into n from public.enrollments;
  assert n = 1, 'el dueño ve las inscripciones de su curso';
  select count(*) into n from public.lesson_progress;
  assert n = 0, 'el instructor no ve el progreso individual';

  perform set_config('request.jwt.claims', json_build_object('sub', uo, 'role', 'authenticated')::text, true);
  select count(*) into n from public.enrollments;
  assert n = 0, 'otro instructor no ve inscripciones de cursos ajenos';

  ---------------------------------------------------------------- anónimo
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  select count(*) into n from public.enrollments;
  assert n = 0, 'el anónimo no ve inscripciones';
end $$;

rollback;
