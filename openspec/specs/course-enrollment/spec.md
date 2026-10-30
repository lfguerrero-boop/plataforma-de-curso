# course-enrollment Specification

## Purpose

Define la inscripción de estudiantes a cursos publicados, el acceso al contenido de las lecciones y el seguimiento de su progreso.

## Requirements

### Requirement: Inscripción a cursos publicados
El sistema SHALL permitir a un estudiante inscribirse a un curso publicado, una sola vez por curso.

#### Scenario: Inscripción exitosa
- **WHEN** un estudiante autenticado se inscribe a un curso publicado
- **THEN** se crea su inscripción a ese curso

#### Scenario: Inscripción duplicada
- **WHEN** un estudiante ya inscrito intenta inscribirse de nuevo al mismo curso
- **THEN** el sistema rechaza la operación y mantiene una sola inscripción

#### Scenario: Curso en borrador
- **WHEN** un estudiante intenta inscribirse a un curso en borrador
- **THEN** la base de datos rechaza la inscripción

#### Scenario: Instructor intenta inscribirse
- **WHEN** un usuario con rol `instructor` intenta inscribirse a un curso
- **THEN** la base de datos rechaza la inscripción

### Requirement: Acceso al contenido solo para inscritos
El sistema SHALL mostrar el contenido de las lecciones únicamente a estudiantes inscritos en el curso y a su instructor dueño.

#### Scenario: Estudiante inscrito lee una lección
- **WHEN** un estudiante inscrito abre una lección del curso
- **THEN** ve su texto, su enlace de video y sus recursos

#### Scenario: Estudiante no inscrito lee una lección
- **WHEN** un estudiante no inscrito solicita el contenido de una lección
- **THEN** la base de datos no devuelve el contenido

### Requirement: Privacidad de inscripciones
El sistema SHALL permitir a cada estudiante ver solo sus propias inscripciones y progreso, y a cada instructor ver las inscripciones de sus propios cursos.

#### Scenario: Estudiante consulta inscripciones ajenas
- **WHEN** un estudiante consulta inscripciones
- **THEN** solo recibe las suyas

#### Scenario: Instructor consulta sus inscritos
- **WHEN** un instructor consulta las inscripciones de uno de sus cursos
- **THEN** ve los estudiantes inscritos en ese curso y no los de cursos ajenos

### Requirement: Progreso por lecciones
El sistema SHALL permitir al estudiante inscrito marcar y desmarcar lecciones como completadas, y SHALL mostrar el progreso del curso como porcentaje de lecciones completadas.

#### Scenario: Marcar lección completada
- **WHEN** un estudiante inscrito marca una lección como completada
- **THEN** el progreso del curso aumenta en proporción

#### Scenario: Marcar sin inscripción
- **WHEN** un usuario no inscrito intenta marcar una lección como completada
- **THEN** la base de datos rechaza la operación

#### Scenario: Curso terminado
- **WHEN** un estudiante completa todas las lecciones
- **THEN** su progreso muestra 100%

### Requirement: Mis cursos del estudiante
El sistema SHALL mostrar al estudiante la lista de sus cursos inscritos con su progreso.

#### Scenario: Estudiante abre sus cursos
- **WHEN** un estudiante abre la sección de sus cursos
- **THEN** ve cada curso inscrito con su porcentaje de progreso
