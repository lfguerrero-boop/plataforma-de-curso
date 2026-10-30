-- Verifica las políticas del bucket de recursos (tarea 3.4). Todo con ROLLBACK.
begin;

do $$
declare
  ua uuid := gen_random_uuid();   -- instructor dueño
  ub uuid := gen_random_uuid();   -- otro instructor
  ue uuid := gen_random_uuid();   -- estudiante inscrito
  un uuid := gen_random_uuid();   -- estudiante no inscrito
  c uuid;
  p text;
  n int;
  failed boolean;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (ua, 'a-' || ua || '@test.local', '{"role":"instructor"}'),
         (ub, 'b-' || ub || '@test.local', '{"role":"instructor"}'),
         (ue, 'e-' || ue || '@test.local', '{"role":"student"}'),
         (un, 'n-' || un || '@test.local', '{"role":"student"}');

  insert into public.courses (instructor_id, title, category, level)
  values (ua, 'Curso A', 'seo', 'basic') returning id into c;
  insert into public.enrollments (student_id, course_id) values (ue, c);
  p := c || '/guia.pdf';

  assert exists (select 1 from storage.buckets where id = 'lesson-resources' and not public),
    'el bucket existe y es privado';

  -- El dueño sube
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into storage.objects (bucket_id, name, owner_id) values ('lesson-resources', p, ua::text);

  -- El dueño descarga (ve el objeto)
  select count(*) into n from storage.objects where bucket_id = 'lesson-resources' and name = p;
  assert n = 1, 'el dueño ve el recurso';

  -- Otro instructor: no sube a un curso ajeno, no ve ni borra
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values ('lesson-resources', c || '/intruso.pdf', ub::text);
  exception when others then failed := true;
  end;
  assert failed, 'B no sube a un curso ajeno';

  select count(*) into n from storage.objects where bucket_id = 'lesson-resources';
  assert n = 0, 'B no ve recursos de A';

  -- (El borrado no se prueba aquí: Storage prohíbe DELETE directo por SQL.
  --  Se verifica con la API real en scripts/verify-storage.cjs.)

  -- Estudiante inscrito: descarga, pero no sube ni borra
  perform set_config('request.jwt.claims', json_build_object('sub', ue, 'role', 'authenticated')::text, true);
  select count(*) into n from storage.objects where bucket_id = 'lesson-resources' and name = p;
  assert n = 1, 'el inscrito descarga';

  failed := false;
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values ('lesson-resources', c || '/estudiante.pdf', ue::text);
  exception when others then failed := true;
  end;
  assert failed, 'el inscrito no sube';

  -- Estudiante no inscrito: no ve el recurso
  perform set_config('request.jwt.claims', json_build_object('sub', un, 'role', 'authenticated')::text, true);
  select count(*) into n from storage.objects where bucket_id = 'lesson-resources';
  assert n = 0, 'el no inscrito no ve recursos';

  -- Visitante anónimo: nada
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  select count(*) into n from storage.objects where bucket_id = 'lesson-resources';
  assert n = 0, 'el anónimo no ve recursos';

  -- Ruta mal formada: se deniega sin error de cast
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  failed := false;
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values ('lesson-resources', 'no-es-uuid/x.pdf', ua::text);
  exception when others then failed := true;
  end;
  assert failed, 'una ruta sin id de curso válido se deniega';

  reset role;
  assert (select count(*) from storage.objects where bucket_id = 'lesson-resources' and name = p) = 1,
    'el recurso de A sigue intacto';
end $$;

rollback;
