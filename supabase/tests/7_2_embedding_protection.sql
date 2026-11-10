-- Verifica que courses.embedding solo lo escribe el servidor (course-search). Todo con ROLLBACK.
begin;

do $$
declare
  ua uuid := gen_random_uuid();   -- instructor dueño
  c uuid; m uuid;
  e1 public.vector(384) := (select array_agg(case when i = 1 then 1 else 0 end)
                            from generate_series(1, 384) i)::public.vector;
  rejected boolean;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (ua, 'a-' || ua || '@test.local', '{"role":"instructor","full_name":"Ana"}');

  ---------------------------------------------------------------- instructor con sesión
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- Crear un curso sin embedding sigue funcionando.
  insert into public.courses (instructor_id, title, category, level)
  values (ua, 'Mi curso', 'seo', 'basic') returning id into c;

  -- Pero no puede crearlo con un vector a su medida...
  rejected := false;
  begin
    insert into public.courses (instructor_id, title, category, level, embedding)
    values (ua, 'Envenenado', 'seo', 'basic', e1);
  exception when insufficient_privilege then rejected := true;
  end;
  assert rejected, 'el instructor no puede insertar un curso con embedding';

  -- ...ni fijarlo después en su propio curso.
  rejected := false;
  begin
    update public.courses set embedding = e1 where id = c;
  exception when insufficient_privilege then rejected := true;
  end;
  assert rejected, 'el instructor no puede escribir embedding en su curso';

  -- Editar otras columnas no se ve afectado.
  update public.courses set title = 'Mi curso editado' where id = c;
  assert (select title from public.courses where id = c) = 'Mi curso editado',
    'editar otras columnas sigue permitido';

  -- Publicar tampoco toca el embedding del instructor.
  insert into public.modules (course_id, title) values (c, 'Mod') returning id into m;
  insert into public.lessons (module_id, title) values (m, 'Lección');
  update public.courses set status = 'published' where id = c;
  assert (select embedding from public.courses where id = c) is null,
    'publicar no deja un embedding fijado por el usuario';

  ---------------------------------------------------------------- servidor (sin auth.uid())
  reset role;
  perform set_config('request.jwt.claims', '', true);
  update public.courses set embedding = e1 where id = c;
  assert (select embedding from public.courses where id = c) is not null,
    'el servidor (sin auth.uid) sí escribe el embedding';
end;
$$;

rollback;
