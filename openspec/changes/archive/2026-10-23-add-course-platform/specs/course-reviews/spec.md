## Purpose

Define las reseñas de cursos, que solo pueden dejar estudiantes inscritos, y la calificación promedio que se muestra en el catálogo.

## ADDED Requirements

### Requirement: Reseña por estudiantes inscritos
El sistema SHALL permitir a un estudiante inscrito en un curso publicado dejar una reseña con calificación entera de 1 a 5 y un comentario opcional.

#### Scenario: Reseña válida
- **WHEN** un estudiante inscrito envía una calificación de 4 con un comentario
- **THEN** la reseña se guarda asociada al estudiante y al curso

#### Scenario: Calificación fuera de rango
- **WHEN** un estudiante envía una calificación de 0 o de 6
- **THEN** el sistema rechaza la reseña

#### Scenario: Estudiante no inscrito
- **WHEN** un usuario sin inscripción al curso intenta reseñarlo
- **THEN** la base de datos rechaza la reseña

#### Scenario: Instructor reseña un curso
- **WHEN** un instructor intenta reseñar un curso
- **THEN** la base de datos rechaza la reseña

### Requirement: Una reseña por estudiante y curso
El sistema SHALL permitir como máximo una reseña por estudiante en cada curso, y SHALL permitir al autor editarla o eliminarla.

#### Scenario: Segunda reseña
- **WHEN** un estudiante que ya reseñó un curso envía otra reseña para el mismo curso
- **THEN** el sistema rechaza la nueva reseña

#### Scenario: Editar reseña propia
- **WHEN** el autor modifica su calificación
- **THEN** la reseña se actualiza y el promedio se recalcula

#### Scenario: Editar reseña ajena
- **WHEN** un usuario intenta editar o eliminar la reseña de otro
- **THEN** la base de datos rechaza la operación

### Requirement: Lectura pública de reseñas
El sistema SHALL mostrar a cualquier visitante las reseñas de cursos publicados.

#### Scenario: Visitante lee reseñas
- **WHEN** un visitante abre el detalle de un curso publicado con reseñas
- **THEN** ve las calificaciones y comentarios

### Requirement: Calificación promedio
El sistema SHALL calcular y mostrar la calificación promedio y el número de reseñas de cada curso en el catálogo y en su detalle.

#### Scenario: Curso con reseñas
- **WHEN** un curso tiene reseñas de 5 y 3
- **THEN** su calificación promedio es 4 con 2 reseñas

#### Scenario: Curso sin reseñas
- **WHEN** un curso no tiene reseñas
- **THEN** se muestra como sin calificar
