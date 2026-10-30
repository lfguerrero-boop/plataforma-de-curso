-- user-roles: perfil con rol único (student | instructor) asignado al registrarse.

create type public.user_role as enum ('student', 'instructor');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text,
  created_at timestamptz not null default now()
);

-- Sin políticas todavía = nadie accede; las políticas llegan en la migración siguiente.
alter table public.profiles enable row level security;

-- Alta del perfil al registrarse. El rol viaja en raw_user_meta_data y debe ser
-- exactamente 'student' o 'instructor'; cualquier otro valor aborta el registro.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
begin
  if requested is null or requested not in ('student', 'instructor') then
    raise exception 'Rol inválido: %', coalesce(requested, '(vacío)')
      using errcode = '22023';
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, requested::public.user_role, new.raw_user_meta_data ->> 'full_name');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un usuario autenticado no puede cambiar su rol. Las operaciones sin usuario
-- (auth.uid() nulo: service_role o el propietario de la base) quedan fuera de esta regla.
create function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'El rol no se puede cambiar'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();
