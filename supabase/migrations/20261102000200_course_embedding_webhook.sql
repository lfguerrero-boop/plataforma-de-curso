-- course-search: el embedding de un curso se calcula solo.
-- Cuando un curso se crea o pasa a 'published', un trigger avisa por HTTP a la Edge
-- Function embed-course, que lo calcula con gte-small y lo guarda en courses.embedding.
-- El aviso es asíncrono (pg_net lo envía después del COMMIT): nunca frena ni rompe la
-- creación o publicación del curso, y si la función falla el curso queda sin embedding.

-- pg_net envía peticiones HTTP desde la base sin bloquear la transacción.
create extension if not exists pg_net with schema extensions;

-- La URL de la función y el secreto compartido NO van aquí (el repositorio es público):
-- viven en Supabase Vault con los nombres 'embed_course_url' y 'embed_course_secret' y
-- se crean a mano una vez por proyecto (ver README). El mismo secreto se registra en la
-- función como EMBED_WEBHOOK_SECRET para que rechace llamadas ajenas.

-- SECURITY DEFINER para poder leer el Vault; search_path fijo como las demás funciones.
create function public.queue_course_embedding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fn_url text;
  fn_secret text;
begin
  -- Al crear siempre se avisa; al actualizar, solo en la transición a 'published'
  -- (en ese momento el curso ya tiene lecciones, ver enforce_publish_requires_lesson).
  if tg_op = 'UPDATE'
     and not (new.status = 'published' and old.status is distinct from 'published') then
    return new;
  end if;

  select decrypted_secret into fn_url
  from vault.decrypted_secrets where name = 'embed_course_url';
  select decrypted_secret into fn_secret
  from vault.decrypted_secrets where name = 'embed_course_secret';

  -- Sin configurar (proyecto nuevo, pruebas): se omite el aviso sin afectar al curso.
  if fn_url is null or fn_secret is null then
    raise warning 'Embedding omitido para el curso %: faltan secretos en el Vault', new.id;
    return new;
  end if;

  perform net.http_post(
    url := fn_url,
    body := jsonb_build_object('course_id', new.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', fn_secret
    )
  );
  return new;
exception when others then
  -- Un fallo al avisar jamás debe impedir guardar el curso.
  raise warning 'No se pudo encolar el embedding del curso %: %', new.id, sqlerrm;
  return new;
end;
$$;

-- AFTER: el aviso solo sale si la fila quedó guardada. Escribir courses.embedding no
-- toca la columna `status`, así que la propia función no vuelve a disparar el trigger.
create trigger courses_queue_embedding
  after insert or update of status on public.courses
  for each row execute function public.queue_course_embedding();
