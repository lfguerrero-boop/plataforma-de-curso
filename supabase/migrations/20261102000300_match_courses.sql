-- course-search: búsqueda de cursos por similitud semántica.
-- Recibe el embedding de lo que la persona escribió (384 dimensiones, gte-small) y
-- devuelve los cursos publicados más parecidos, de más a menos similar, solo con datos
-- que se pueden mostrar al público.
--
-- SECURITY INVOKER (el valor por defecto, a propósito): corre con los permisos de quien
-- llama, así que RLS de courses, profiles y reviews sigue aplicando y esta función no
-- puede enseñar nada que el catálogo no enseñe ya. Por eso no se declara SECURITY DEFINER
-- como las funciones auxiliares de las políticas.

create function public.match_courses(
  query_embedding public.vector(384),
  match_count int default 10,
  min_similarity float default 0
)
returns table (
  id uuid,
  title text,
  description text,
  category public.course_category,
  level public.course_level,
  instructor_name text,
  avg_rating numeric,
  review_count int,
  similarity float
)
language sql stable
set search_path = ''
as $$
  select
    c.id,
    c.title,
    c.description,
    c.category,
    c.level,
    p.full_name,
    r.avg_rating,
    r.review_count,
    -- <=> es la distancia coseno: similitud = 1 - distancia (1 = idéntico).
    (1 - (c.embedding operator(public.<=>) query_embedding))::float
  from public.courses c
  -- El filtro de estado es explícito: un instructor con sesión también vería sus
  -- borradores por RLS, y la búsqueda pública solo debe devolver cursos publicados.
  left join public.profiles p on p.id = c.instructor_id
  -- Un curso sin reseñas no tiene fila en la vista: queda en null ("sin calificar").
  left join public.course_ratings r on r.course_id = c.id
  where c.status = 'published'
    and c.embedding is not null
    and 1 - (c.embedding operator(public.<=>) query_embedding) >= min_similarity
  order by c.embedding operator(public.<=>) query_embedding
  -- Tope para que nadie pida el catálogo entero de golpe.
  limit least(greatest(match_count, 1), 50);
$$;

-- Se devuelven solo campos públicos: nunca el embedding, el estado ni instructor_id.
grant execute on function public.match_courses(public.vector, int, float)
  to anon, authenticated;
