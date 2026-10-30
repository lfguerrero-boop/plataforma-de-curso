-- user-roles: cada usuario lee y edita solo su perfil. No hay política de INSERT ni
-- de DELETE: el perfil lo crea el trigger de registro y se borra en cascada con la cuenta.
-- El cambio de `role` lo bloquea el trigger profiles_prevent_role_change.

create policy "profiles: leer el propio"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles: editar el propio"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
