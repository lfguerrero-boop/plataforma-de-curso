# course-management Specification

## Purpose

Define cómo un instructor crea, edita, organiza y publica sus cursos con módulos, lecciones y recursos descargables.

## Requirements

### Requirement: Creación de cursos por instructores
El sistema SHALL permitir a un instructor crear cursos con título, descripción, categoría y nivel, en estado `draft`, y SHALL registrarlo como dueño del curso.

#### Scenario: Instructor crea un curso
- **WHEN** un instructor envía un curso con datos válidos
- **THEN** el curso se crea en estado `draft` con ese instructor como dueño

#### Scenario: Estudiante intenta crear un curso
- **WHEN** un estudiante intenta crear un curso
- **THEN** la base de datos rechaza la operación

### Requirement: Solo el dueño edita sus cursos
El sistema SHALL permitir editar o eliminar un curso, y sus módulos, lecciones y recursos, únicamente a su instructor dueño.

#### Scenario: Dueño edita su curso
- **WHEN** el instructor dueño actualiza el título de su curso
- **THEN** el cambio se guarda

#### Scenario: Otro instructor edita un curso ajeno
- **WHEN** un instructor intenta modificar un curso de otro instructor
- **THEN** la base de datos rechaza la operación y el curso no cambia

### Requirement: Módulos y lecciones ordenados
El sistema SHALL permitir al dueño organizar el curso en módulos y lecciones con un orden definido, donde cada lección tiene título, contenido de texto y un enlace opcional a video externo.

#### Scenario: Agregar lección
- **WHEN** el dueño agrega una lección a un módulo con título y texto
- **THEN** la lección queda en la posición indicada dentro del módulo

#### Scenario: Enlace de video
- **WHEN** el dueño añade un enlace de video a una lección
- **THEN** la lección lo muestra a los estudiantes inscritos

### Requirement: Recursos descargables
El sistema SHALL permitir al dueño adjuntar archivos descargables a una lección, y SHALL permitir su descarga solo a estudiantes inscritos en el curso y al dueño.

#### Scenario: Estudiante inscrito descarga
- **WHEN** un estudiante inscrito solicita un recurso de una lección
- **THEN** puede descargarlo

#### Scenario: Usuario no inscrito descarga
- **WHEN** un usuario no inscrito solicita un recurso
- **THEN** el sistema niega el acceso

### Requirement: Publicación de cursos
El sistema SHALL permitir al dueño publicar un curso solo si tiene al menos un módulo con una lección, y SHALL permitirle volverlo a borrador.

#### Scenario: Publicar curso completo
- **WHEN** el dueño publica un curso con al menos una lección
- **THEN** el curso pasa a `published` y aparece en el catálogo

#### Scenario: Publicar curso vacío
- **WHEN** el dueño intenta publicar un curso sin lecciones
- **THEN** el sistema rechaza la publicación e indica el motivo

### Requirement: Vista de cursos propios
El sistema SHALL mostrar al instructor la lista de todos sus cursos, en borrador y publicados, y SHALL NOT mostrarle borradores de otros instructores.

#### Scenario: Instructor lista sus cursos
- **WHEN** un instructor abre su panel de cursos
- **THEN** ve sus cursos en cualquier estado y ningún borrador ajeno
