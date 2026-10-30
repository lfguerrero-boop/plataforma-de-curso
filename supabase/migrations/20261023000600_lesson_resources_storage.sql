-- course-management: recursos descargables en un bucket privado.
-- La ruta de cada objeto empieza por el id del curso: <course_id>/<archivo>.
-- Suben, cambian y borran solo el dueño; descargan el dueño y los estudiantes inscritos.

insert into storage.buckets (id, name, public)
values ('lesson-resources', 'lesson-resources', false)
on conflict (id) do nothing;

-- Extrae el id de curso del primer segmento de la ruta; null si no es un uuid,
-- así una ruta mal formada se deniega en lugar de provocar un error de cast.
create function public.course_id_from_path(p_path text)
returns uuid
language plpgsql immutable
set search_path = ''
as $$
begin
  return ((string_to_array(p_path, '/'))[1])::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create policy "lesson-resources: dueño sube"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lesson-resources'
    and public.is_course_owner(public.course_id_from_path(name))
  );

create policy "lesson-resources: dueño actualiza"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'lesson-resources'
    and public.is_course_owner(public.course_id_from_path(name))
  )
  with check (
    bucket_id = 'lesson-resources'
    and public.is_course_owner(public.course_id_from_path(name))
  );

create policy "lesson-resources: dueño borra"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'lesson-resources'
    and public.is_course_owner(public.course_id_from_path(name))
  );

create policy "lesson-resources: dueño e inscritos descargan"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lesson-resources'
    and (
      public.is_course_owner(public.course_id_from_path(name))
      or public.is_enrolled(public.course_id_from_path(name))
    )
  );
