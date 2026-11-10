-- course-search: endurece el embedding de los cursos (hallazgos de la revisión).

-- 1) Solo el servidor escribe courses.embedding.
-- RLS filtra filas, no columnas: la política "dueño edita los suyos" también permitía a
-- un instructor enviar `embedding` por PostgREST y fijar un vector a su medida para salir
-- primero en cualquier búsqueda. Como en profiles_prevent_role_change, se permite la
-- escritura cuando no hay auth.uid(): es el caso de la Edge Function (service role) y de
-- las operaciones directas sobre la base, nunca el de un usuario con sesión.
create function public.protect_course_embedding()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.embedding is not null then
      raise exception 'El embedding de un curso solo lo calcula el servidor'
        using errcode = '42501';
    end if;
  elsif new.embedding is distinct from old.embedding then
    raise exception 'El embedding de un curso solo lo calcula el servidor'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger courses_protect_embedding
  before insert or update of embedding on public.courses
  for each row execute function public.protect_course_embedding();

-- 2) El embedding se calcula al PUBLICAR, no al crear.
-- Un borrador no aparece en la búsqueda y, recién creado, no tiene lecciones: su vector
-- se calculaba en el momento equivocado y se descartaba al publicar. Ahora el aviso sale
-- solo cuando el curso queda publicado (por UPDATE, o por INSERT directo ya publicado).
-- El trigger courses_queue_embedding no cambia; solo cambia esta función.
create or replace function public.queue_course_embedding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fn_url text;
  fn_secret text;
begin
  if not (new.status = 'published'
          and (tg_op = 'INSERT' or old.status is distinct from 'published')) then
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
