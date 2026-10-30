-- course-management: un curso solo puede estar publicado si tiene al menos una lección.
-- Se aplica con trigger (no con política) porque depende de otras tablas y también
-- cubre el INSERT directo con status = 'published'.

create function public.enforce_publish_requires_lesson()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if not exists (
      select 1
      from public.modules m
      join public.lessons l on l.module_id = m.id
      where m.course_id = new.id
    ) then
      raise exception 'Un curso necesita al menos una lección para publicarse'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger courses_enforce_publish
  before insert or update of status on public.courses
  for each row execute function public.enforce_publish_requires_lesson();
