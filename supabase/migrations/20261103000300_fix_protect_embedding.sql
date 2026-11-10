-- course-search: corrige la comparación en protect_course_embedding().
-- Con search_path vacío, `new.embedding is distinct from old.embedding` no encuentra el
-- operador = de vector (vive en public) y la función fallaba con "operator does not exist"
-- en lugar de decidir. Se compara la representación en texto, que no depende del esquema.
create or replace function public.protect_course_embedding()
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
  elsif new.embedding::text is distinct from old.embedding::text then
    raise exception 'El embedding de un curso solo lo calcula el servidor'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
