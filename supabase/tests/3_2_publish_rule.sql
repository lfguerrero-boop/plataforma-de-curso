-- Verifica la regla de publicación (tarea 3.2). Todo en una transacción con ROLLBACK.
begin;

do $$
declare
  ui uuid := gen_random_uuid();
  c uuid;
  m uuid;
  failed boolean;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (ui, 'i-' || ui || '@test.local', '{"role":"instructor"}');

  insert into public.courses (instructor_id, title, category, level)
  values (ui, 'Curso vacío', 'seo', 'basic') returning id into c;

  -- Publicar sin lecciones falla
  failed := false;
  begin
    update public.courses set status = 'published' where id = c;
  exception when others then failed := true;
  end;
  assert failed, 'publicar sin lecciones debe fallar';
  assert (select status from public.courses where id = c) = 'draft', 'sigue en draft';

  -- Un módulo sin lecciones tampoco basta
  insert into public.modules (course_id, title) values (c, 'Vacío') returning id into m;
  failed := false;
  begin
    update public.courses set status = 'published' where id = c;
  exception when others then failed := true;
  end;
  assert failed, 'publicar con módulo sin lecciones debe fallar';

  -- Con una lección se puede publicar
  insert into public.lessons (module_id, title) values (m, 'Primera');
  update public.courses set status = 'published' where id = c;
  assert (select status from public.courses where id = c) = 'published', 'publica con una lección';

  -- Volver a borrador siempre es posible
  update public.courses set status = 'draft' where id = c;
  assert (select status from public.courses where id = c) = 'draft', 'vuelve a draft';

  -- INSERT directo como publicado (sin lecciones) también falla
  failed := false;
  begin
    insert into public.courses (instructor_id, title, category, level, status)
    values (ui, 'Directo', 'seo', 'basic', 'published');
  exception when others then failed := true;
  end;
  assert failed, 'insertar ya publicado sin lecciones debe fallar';
end $$;

rollback;
