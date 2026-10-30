-- course-reviews: calificación promedio y número de reseñas por curso.
-- security_invoker hace que la vista respete la RLS de `reviews` del usuario que consulta;
-- sin esta opción la vista correría con los permisos de su propietario y saltaría RLS.
-- Un curso sin reseñas no tiene fila: se muestra como "sin calificar".

create view public.course_ratings
with (security_invoker = true) as
select
  course_id,
  round(avg(rating)::numeric, 1) as avg_rating,
  count(*)::int as review_count
from public.reviews
group by course_id;

grant select on public.course_ratings to anon, authenticated;
