-- course-search: match_courses filtra por categoría y nivel dentro de la consulta.
-- Antes el catálogo traía los 50 más parecidos y filtraba después en la app: si ninguno
-- de los 50 tenía el nivel pedido decía "ningún curso" aunque existieran. Ahora el filtro
-- se aplica antes del tope, y los parámetros nuevos son opcionales (null = sin filtro).

-- Cambia la firma, así que hay que quitar la anterior: dos versiones a la vez harían
-- ambigua la llamada desde PostgREST.
drop function public.match_courses(public.vector, int, float);

create function public.match_courses(
  query_embedding public.vector(384),
  match_count int default 10,
  min_similarity float default 0,
  filter_category public.course_category default null,
  filter_level public.course_level default null
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
  left join public.profiles p on p.id = c.instructor_id
  -- Un curso sin reseñas no tiene fila en la vista: queda en null ("sin calificar").
  left join public.course_ratings r on r.course_id = c.id
  -- El filtro de estado es explícito: un instructor con sesión también vería sus
  -- borradores por RLS, y la búsqueda pública solo debe devolver cursos publicados.
  where c.status = 'published'
    and c.embedding is not null
    and (filter_category is null or c.category = filter_category)
    and (filter_level is null or c.level = filter_level)
    and 1 - (c.embedding operator(public.<=>) query_embedding) >= min_similarity
  order by c.embedding operator(public.<=>) query_embedding
  -- Tope para que nadie pida el catálogo entero de golpe.
  limit least(greatest(match_count, 1), 50);
$$;

-- Se devuelven solo campos públicos: nunca el embedding, el estado ni instructor_id.
grant execute on function public.match_courses(public.vector, int, float, public.course_category, public.course_level)
  to anon, authenticated;
