# Spec Delta

## Purpose

Da a cualquier visitante una página que explica qué es la plataforma y muestra los cursos publicados más recientes con sus datos reales.

## ADDED Requirements

### Requirement: Página pública «Quiénes somos»
El sistema SHALL ofrecer en `/quienes-somos` una página accesible a cualquier visitante, con o sin sesión, que explique qué es la plataforma, las áreas y niveles de los cursos y cómo funciona (elección de rol, publicación, inscripción y reseñas). El menú principal SHALL enlazarla.

#### Scenario: Visitante sin sesión
- **WHEN** un visitante sin sesión abre `/quienes-somos`
- **THEN** ve la página completa sin ser redirigido a iniciar sesión

#### Scenario: Áreas y niveles reales
- **WHEN** la página lista las áreas y niveles de los cursos
- **THEN** coinciden con las categorías y niveles que admite el catálogo

### Requirement: Cursos recientes con datos reales
La página SHALL mostrar los 3 cursos publicados más recientes, cada uno con título, descripción, categoría, nivel, nombre del instructor, fecha de publicación y calificación promedio (o «Sin calificar» si no tiene reseñas), y un enlace a su página. SHALL NOT mostrar cursos en borrador, ni siquiera a un instructor con sesión, ni datos de ejemplo.

#### Scenario: Hay al menos 3 cursos publicados
- **WHEN** existen 3 o más cursos publicados
- **THEN** la página muestra los 3 de publicación más reciente, del más nuevo al más antiguo

#### Scenario: Hay menos de 3 cursos publicados
- **WHEN** existen menos de 3 cursos publicados
- **THEN** la página muestra los que existan

#### Scenario: No hay cursos publicados
- **WHEN** no existe ningún curso publicado
- **THEN** la página indica que todavía no hay cursos publicados

#### Scenario: Curso sin reseñas
- **WHEN** uno de los cursos mostrados no tiene reseñas
- **THEN** aparece como «Sin calificar»

#### Scenario: Borrador del propio instructor
- **WHEN** un instructor con sesión tiene un borrador más reciente que los cursos publicados
- **THEN** el borrador no aparece en la página
