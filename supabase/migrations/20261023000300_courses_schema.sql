-- course-catalog / course-management: modelo de cursos, módulos, lecciones y recursos.
-- Todas las tablas nacen con RLS activa y sin políticas (acceso denegado) hasta que
-- las migraciones siguientes añaden las reglas de cada capacidad.

create type public.course_category as enum (
  'seo', 'paid_ads', 'social_media', 'email_marketing', 'analytics'
);
create type public.course_level as enum ('basic', 'intermediate', 'advanced');
create type public.course_status as enum ('draft', 'published');

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text not null default '',
  category public.course_category not null,
  level public.course_level not null,
  status public.course_status not null default 'draft',
  created_at timestamptz not null default now()
);
create index courses_instructor_idx on public.courses (instructor_id);
create index courses_catalog_idx on public.courses (status, category, level);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  position int not null default 0
);
create index modules_course_idx on public.modules (course_id, position);

-- Metadatos públicos de la lección (título y orden): forman el temario.
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  position int not null default 0
);
create index lessons_module_idx on public.lessons (module_id, position);

-- Contenido protegido: solo inscritos y dueño (ver design.md, decisión 2).
create table public.lesson_contents (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  body text not null default '',
  video_url text check (video_url is null or video_url ~* '^https?://')
);

create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  file_path text not null,
  file_name text not null
);
create index lesson_resources_lesson_idx on public.lesson_resources (lesson_id);

-- La tabla existe aquí porque is_enrolled() y las políticas de Storage la necesitan;
-- sus políticas RLS se añaden con la capacidad course-enrollment.
create table public.enrollments (
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, course_id)
);
create index enrollments_course_idx on public.enrollments (course_id);

alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_contents enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.enrollments enable row level security;

-- Funciones auxiliares para las políticas (ver design.md, decisión 3).
-- SECURITY DEFINER evita la recursión entre políticas; son de solo lectura y con
-- search_path fijo. Devuelven false/null para visitantes (auth.uid() nulo).

create function public.is_instructor()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'instructor'
  );
$$;

create function public.is_student()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'student'
  );
$$;

create function public.is_course_owner(p_course_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses
    where id = p_course_id and instructor_id = (select auth.uid())
  );
$$;

create function public.is_enrolled(p_course_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments
    where course_id = p_course_id and student_id = (select auth.uid())
  );
$$;

create function public.is_course_published(p_course_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses
    where id = p_course_id and status = 'published'
  );
$$;

create function public.course_of_module(p_module_id uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select course_id from public.modules where id = p_module_id;
$$;

create function public.course_of_lesson(p_lesson_id uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select m.course_id
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where l.id = p_lesson_id;
$$;
