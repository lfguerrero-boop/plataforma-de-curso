# course-catalog Specification

## Purpose

Define el catálogo público de cursos publicados de marketing digital, con detalle de curso y filtros por categoría y nivel.

## Requirements

### Requirement: Listado público de cursos publicados
El sistema SHALL mostrar a cualquier visitante, con o sin sesión, el listado de cursos con estado `published`, y SHALL excluir los cursos en borrador.

#### Scenario: Visitante ve el catálogo
- **WHEN** un visitante sin sesión abre el catálogo
- **THEN** ve solo los cursos publicados

#### Scenario: Curso en borrador oculto
- **WHEN** existe un curso en borrador
- **THEN** no aparece en el catálogo para ningún visitante ni estudiante

### Requirement: Categorías y niveles fijos
El sistema SHALL clasificar cada curso con una categoría de un conjunto cerrado (SEO, publicidad paga, redes sociales, email marketing, analítica) y un nivel (`basic`, `intermediate`, `advanced`).

#### Scenario: Valor fuera del conjunto
- **WHEN** se intenta guardar un curso con una categoría o nivel fuera del conjunto permitido
- **THEN** el sistema rechaza el guardado

### Requirement: Filtros del catálogo
El sistema SHALL permitir filtrar el catálogo por categoría, por nivel o por ambos.

#### Scenario: Filtro por categoría
- **WHEN** un visitante filtra por la categoría SEO
- **THEN** ve solo cursos publicados de SEO

#### Scenario: Filtro combinado
- **WHEN** un visitante filtra por SEO y nivel `basic`
- **THEN** ve solo cursos publicados que cumplen ambos criterios

#### Scenario: Sin resultados
- **WHEN** ningún curso publicado cumple los filtros
- **THEN** el sistema muestra un estado vacío

### Requirement: Detalle público del curso
El sistema SHALL mostrar el detalle de un curso publicado con título, descripción, instructor, categoría, nivel, temario de módulos y lecciones por título, y calificación promedio. SHALL NOT revelar el contenido de las lecciones a quien no esté inscrito.

#### Scenario: Visitante abre un curso publicado
- **WHEN** un visitante abre el detalle de un curso publicado
- **THEN** ve la información general y el temario, sin el contenido de las lecciones

#### Scenario: Curso en borrador por URL directa
- **WHEN** un usuario distinto del instructor dueño abre la URL de un curso en borrador
- **THEN** el sistema responde como si el curso no existiera
