-- Verifica las políticas del dueño (tarea 3.3). Todo en una transacción con ROLLBACK.
begin;

do $$
declare
  ua uuid := gen_random_uuid();   -- instructor dueño
  ub uuid := gen_random_uuid();   -- otro instructor
  us uuid := gen_random_uuid();   -- estudiante
  c uuid; m uuid; l uuid;
  ca uuid;
  n int;
  failed boolean;
  t text;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (ua, 'a-' || ua || '@test.local', '{"role":"instructor"}'),
         (ub, 'b-' || ub || '@test.local', '{"role":"instructor"}'),
         (us, 's-' || us || '@test.local', '{"role":"student"}');

  ---------------------------------------------------------------- dueño A
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.courses (instructor_id, title, category, level)
  values (ua, 'Curso de A', 'seo', 'basic') returning id into c;
  insert into public.modules (course_id, title) values (c, 'M1') returning id into m;
  insert into public.lessons (module_id, title) values (m, 'L1') returning id into l;
  insert into public.lesson_contents (lesson_id, body, video_url)
  values (l, 'contenido', 'https://youtu.be/x');
  insert into public.lesson_resources (lesson_id, file_path, file_name)
  values (l, c || '/guia.pdf', 'guia.pdf');

  update public.courses set title = 'Curso de A (v2)' where id = c;
  select title into t from public.courses where id = c;
  assert t = 'Curso de A (v2)', 'el dueño edita su curso';

  select count(*) into n from public.courses;
  assert n = 1, 'el dueño ve su curso';

  -- No puede crear un curso a nombre de otro, ni ya publicado, ni traspasar el suyo
  failed := false;
  begin
    insert into public.courses (instructor_id, title, category, level)
    values (ub, 'A a nombre de B', 'seo', 'basic');
  exception when others then failed := true;
  end;
  assert failed, 'no se puede crear un curso a nombre de otro';

  failed := false;
  begin
    insert into public.courses (instructor_id, title, category, level, status)
    values (ua, 'Ya publicado', 'seo', 'basic', 'published');
  exception when others then failed := true;
  end;
  assert failed, 'no se puede crear un curso ya publicado';

  failed := false;
  begin
    update public.courses set instructor_id = ub where id = c;
  exception when others then failed := true;
  end;
  assert failed, 'no se puede traspasar el curso a otro instructor';

  ---------------------------------------------------------------- otro instructor B
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);

  select count(*) into n from public.courses;
  assert n = 0, 'B no ve el curso de A';
  select count(*) into n from public.lesson_contents;
  assert n = 0, 'B no ve contenidos de A';

  update public.courses set title = 'hack' where id = c;
  get diagnostics n = row_count;
  assert n = 0, 'B no edita el curso de A';

  delete from public.courses where id = c;
  get diagnostics n = row_count;
  assert n = 0, 'B no borra el curso de A';

  failed := false;
  begin
    insert into public.modules (course_id, title) values (c, 'intruso');
  exception when others then failed := true;
  end;
  assert failed, 'B no agrega módulos al curso de A';

  failed := false;
  begin
    insert into public.lessons (module_id, title) values (m, 'intruso');
  exception when others then failed := true;
  end;
  assert failed, 'B no agrega lecciones al curso de A';

  failed := false;
  begin
    insert into public.lesson_resources (lesson_id, file_path, file_name)
    values (l, 'x/y.pdf', 'y.pdf');
  exception when others then failed := true;
  end;
  assert failed, 'B no agrega recursos al curso de A';

  update public.lesson_contents set body = 'hack' where lesson_id = l;
  get diagnostics n = row_count;
  assert n = 0, 'B no edita contenidos de A';

  ---------------------------------------------------------------- estudiante
  perform set_config('request.jwt.claims', json_build_object('sub', us, 'role', 'authenticated')::text, true);

  failed := false;
  begin
    insert into public.courses (instructor_id, title, category, level)
    values (us, 'Curso de estudiante', 'seo', 'basic');
  exception when others then failed := true;
  end;
  assert failed, 'un estudiante no crea cursos';

  ---------------------------------------------------------------- visitante anónimo
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  select count(*) into n from public.courses;
  assert n = 0, 'un anónimo no ve cursos (aún no hay lectura pública)';

  ---------------------------------------------------------------- el dueño sigue intacto
  reset role;
  select title into t from public.courses where id = c;
  assert t = 'Curso de A (v2)', 'el curso de A no cambió';
  assert exists (select 1 from public.lesson_contents where lesson_id = l and body = 'contenido'), 'contenido intacto';
end $$;

rollback;
