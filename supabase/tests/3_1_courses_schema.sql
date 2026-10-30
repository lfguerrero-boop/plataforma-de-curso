-- Verifica el esquema de cursos (tarea 3.1). Todo en una transacción con ROLLBACK.
begin;

do $$
declare
  ui uuid := gen_random_uuid();
  us uuid := gen_random_uuid();
  c uuid;
  m uuid;
  l uuid;
  failed boolean;
  b boolean;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (ui, 'i-' || ui || '@test.local', '{"role":"instructor"}'),
         (us, 's-' || us || '@test.local', '{"role":"student"}');

  insert into public.courses (instructor_id, title, category, level)
  values (ui, 'SEO desde cero', 'seo', 'basic') returning id into c;
  insert into public.modules (course_id, title) values (c, 'Fundamentos') returning id into m;
  insert into public.lessons (module_id, title) values (m, 'Qué es SEO') returning id into l;

  -- Estado por defecto: borrador
  assert (select status from public.courses where id = c) = 'draft', 'el curso nace en draft';

  -- Valores fuera del conjunto cerrado se rechazan en la base
  failed := false;
  begin
    insert into public.courses (instructor_id, title, category, level)
    values (ui, 'X', 'cocina', 'basic');
  exception when others then failed := true;
  end;
  assert failed, 'categoría inválida debe fallar';

  failed := false;
  begin
    insert into public.courses (instructor_id, title, category, level)
    values (ui, 'X', 'seo', 'experto');
  exception when others then failed := true;
  end;
  assert failed, 'nivel inválido debe fallar';

  -- Título vacío y video no http(s) se rechazan
  failed := false;
  begin
    insert into public.courses (instructor_id, title, category, level)
    values (ui, '   ', 'seo', 'basic');
  exception when others then failed := true;
  end;
  assert failed, 'título vacío debe fallar';

  failed := false;
  begin
    insert into public.lesson_contents (lesson_id, body, video_url)
    values (l, 'texto', 'javascript:alert(1)');
  exception when others then failed := true;
  end;
  assert failed, 'video_url no http(s) debe fallar';

  insert into public.lesson_contents (lesson_id, body, video_url)
  values (l, 'texto', 'https://www.youtube.com/watch?v=abc');

  -- Funciones auxiliares
  perform set_config('request.jwt.claims', json_build_object('sub', ui, 'role', 'authenticated')::text, true);
  assert public.is_instructor(), 'is_instructor true para el instructor';
  assert not public.is_student(), 'is_student false para el instructor';
  assert public.is_course_owner(c), 'is_course_owner true para el dueño';
  assert not public.is_enrolled(c), 'is_enrolled false sin inscripción';
  assert public.course_of_lesson(l) = c, 'course_of_lesson devuelve el curso';
  assert public.course_of_module(m) = c, 'course_of_module devuelve el curso';

  perform set_config('request.jwt.claims', json_build_object('sub', us, 'role', 'authenticated')::text, true);
  assert not public.is_course_owner(c), 'is_course_owner false para otro usuario';
  assert public.is_student(), 'is_student true para el estudiante';
  insert into public.enrollments (student_id, course_id) values (us, c);
  assert public.is_enrolled(c), 'is_enrolled true tras inscribirse';

  perform set_config('request.jwt.claims', '', true);
  assert not public.is_course_owner(c), 'visitante no es dueño';
  assert not public.is_instructor(), 'visitante no es instructor';

  -- Borrado en cascada: al borrar el curso desaparecen módulos, lecciones y contenido
  delete from public.courses where id = c;
  assert not exists (select 1 from public.lessons where id = l), 'cascada hasta lessons';
  assert not exists (select 1 from public.lesson_contents where lesson_id = l), 'cascada hasta contenido';
end $$;

rollback;
