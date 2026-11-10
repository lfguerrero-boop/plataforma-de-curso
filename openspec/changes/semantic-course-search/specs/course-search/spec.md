# Spec Delta

## Purpose

Permite encontrar cursos publicados describiendo con palabras propias lo que se necesita, ordenándolos por parecido de significado, con un cálculo automático y protegido de la representación de cada curso.

## ADDED Requirements

### Requirement: Búsqueda por frase libre
El sistema SHALL permitir a cualquier visitante, con o sin sesión, buscar cursos escribiendo una frase libre, y SHALL devolver los cursos publicados más parecidos por significado, de más a menos relevante, aunque no compartan palabras exactas con la frase.

#### Scenario: Frase que describe una necesidad
- **WHEN** un visitante escribe «quiero aprender a vender por redes»
- **THEN** ve primero los cursos publicados cuyo tema se acerca a esa necesidad, ordenados del más parecido al menos parecido

#### Scenario: Visitante sin sesión
- **WHEN** un visitante sin sesión envía una frase de búsqueda
- **THEN** recibe resultados igual que un usuario con sesión

#### Scenario: Frase vacía
- **WHEN** se envía una frase vacía o solo con espacios
- **THEN** el sistema muestra el catálogo sin búsqueda

#### Scenario: Frase demasiado larga
- **WHEN** la frase supera los 300 caracteres
- **THEN** el sistema usa solo los primeros 300

### Requirement: Búsqueda combinada con los filtros
El sistema SHALL permitir combinar la búsqueda con los filtros de categoría y nivel, y SHALL aplicar esos filtros antes de limitar el número de resultados, de modo que un curso que cumple los filtros no se pierda por estar lejos en el orden de parecido.

#### Scenario: Búsqueda con categoría y nivel
- **WHEN** un visitante busca «ventas con inteligencia artificial» y filtra por Analítica y Avanzado
- **THEN** ve solo cursos publicados de esa categoría y nivel, ordenados por parecido

#### Scenario: Filtro que excluye a los más parecidos
- **WHEN** los cursos más parecidos a la frase no cumplen el nivel filtrado pero existen otros que sí
- **THEN** el sistema muestra esos otros cursos y no un estado vacío

#### Scenario: Ningún curso cumple los filtros
- **WHEN** ningún curso publicado cumple la categoría y el nivel elegidos
- **THEN** el sistema muestra un estado vacío con un mensaje que menciona la frase buscada

### Requirement: Alcance público de los resultados
El sistema SHALL devolver únicamente cursos con estado `published` y únicamente datos que ya son públicos en el catálogo: título, descripción, categoría, nivel, nombre del instructor, calificación promedio, número de reseñas y grado de parecido.

#### Scenario: Borradores excluidos
- **WHEN** existe un borrador muy parecido a la frase buscada
- **THEN** no aparece en los resultados para ningún visitante

#### Scenario: El dueño no recibe su borrador
- **WHEN** el instructor dueño de un borrador busca con sesión iniciada
- **THEN** su borrador tampoco aparece en los resultados de la búsqueda pública

#### Scenario: Datos internos no expuestos
- **WHEN** se consultan los resultados de una búsqueda
- **THEN** no incluyen la representación interna del curso, su estado ni el identificador del instructor

#### Scenario: Curso sin calificar
- **WHEN** un curso publicado no tiene reseñas
- **THEN** aparece en los resultados como «Sin calificar»

#### Scenario: Curso publicado sin representación calculada
- **WHEN** un curso publicado aún no tiene su representación de búsqueda
- **THEN** no aparece en los resultados de búsqueda, pero sigue visible en el catálogo normal

### Requirement: Umbral mínimo de similitud
El sistema SHALL mostrar en una búsqueda por frase solo los cursos cuya similitud con la frase sea de 0.8 o más, en una escala donde 1 es idéntico. La similitud SHALL servir para ordenar los resultados y SHALL NOT presentarse como porcentaje de acierto.

#### Scenario: Curso por debajo del umbral
- **WHEN** la similitud de un curso publicado con la frase es menor que 0.8
- **THEN** el curso no aparece en los resultados de la búsqueda

#### Scenario: Ningún curso alcanza el umbral
- **WHEN** ningún curso publicado alcanza 0.8 de similitud
- **THEN** el catálogo indica que ningún curso se parece a la frase y sugiere probar otras palabras

### Requirement: API pública de búsqueda
El sistema SHALL ofrecer una petición pública `GET /api/courses/search?q=…` que devuelva en JSON la frase buscada y los cursos publicados más parecidos, cada uno con id, título, descripción y enlace a su página. SHALL responder con error si falta la frase y SHALL NOT devolver el embedding, el estado ni el identificador del instructor.

#### Scenario: Búsqueda con frase
- **WHEN** se pide `/api/courses/search?q=quiero aprender a vender por redes`
- **THEN** responde con éxito y la lista de cursos publicados ordenada por parecido

#### Scenario: Falta la frase
- **WHEN** se pide `/api/courses/search` sin `q` o con `q` vacío
- **THEN** responde con error de petición incorrecta y un mensaje que indica que falta la frase

### Requirement: Límite de resultados
El sistema SHALL mostrar como máximo 8 cursos en la página del catálogo para una búsqueda, y SHALL limitar a 50 cualquier petición de más resultados.

#### Scenario: Más coincidencias que el tope
- **WHEN** hay más de 8 cursos publicados que encajan con la frase
- **THEN** el catálogo muestra los 8 más parecidos

#### Scenario: Petición de un número inválido
- **WHEN** se pide un número de resultados menor que 1 o mayor que 50
- **THEN** el sistema lo ajusta a 1 o a 50 respectivamente

### Requirement: Representación del curso calculada al publicar
El sistema SHALL calcular automáticamente la representación de búsqueda de un curso cuando pasa a estar publicado, sin intervención manual, a partir de su título, categoría, nivel, descripción y los títulos de sus módulos y lecciones.

#### Scenario: Publicar un curso
- **WHEN** un instructor publica un curso con lecciones
- **THEN** el curso queda disponible para la búsqueda sin ninguna otra acción

#### Scenario: Borrador recién creado
- **WHEN** un instructor crea un curso en borrador
- **THEN** no se calcula su representación de búsqueda

#### Scenario: Editar un curso ya publicado
- **WHEN** un instructor edita el título o la descripción de un curso ya publicado
- **THEN** su representación de búsqueda no se recalcula (limitación conocida de esta versión)

### Requirement: El contenido de las lecciones nunca se indexa
El sistema SHALL NOT usar el texto, el video ni los recursos de las lecciones para la representación de búsqueda, porque ese contenido solo lo ven los inscritos y el dueño.

#### Scenario: Contenido distinto en una lección
- **WHEN** se cambia el contenido protegido de una lección sin cambiar su título
- **THEN** la búsqueda devuelve los mismos resultados y el mismo orden

### Requirement: El cálculo no bloquea la gestión del curso
El sistema SHALL NOT impedir crear, editar ni publicar un curso si el cálculo de su representación falla o no está configurado.

#### Scenario: Cálculo no configurado
- **WHEN** faltan los secretos que conectan la base con el servicio de cálculo y un instructor publica un curso
- **THEN** el curso se publica con normalidad y solo queda sin representación de búsqueda

### Requirement: Solo el servidor escribe la representación
El sistema SHALL impedir que un usuario con sesión, incluido el instructor dueño del curso, escriba o modifique la representación de búsqueda de un curso, tanto al crearlo como al editarlo, y SHALL permitirlo solo al proceso del servidor.

#### Scenario: Instructor intenta fijar la representación
- **WHEN** un instructor intenta escribir la representación de búsqueda de su propio curso
- **THEN** el sistema rechaza la operación y no se guarda ningún valor

#### Scenario: Instructor crea un curso con representación
- **WHEN** un instructor intenta crear un curso incluyendo una representación de búsqueda
- **THEN** el sistema rechaza la creación

#### Scenario: Edición de otros campos
- **WHEN** un instructor edita el título de su curso
- **THEN** la edición se guarda con normalidad

#### Scenario: Proceso del servidor
- **WHEN** el proceso del servidor calcula la representación de un curso publicado
- **THEN** el valor se guarda

### Requirement: Acceso a los servicios de cálculo
El sistema SHALL rechazar las peticiones al servicio que guarda la representación de un curso si no presentan el secreto compartido, SHALL ignorar cursos que no estén publicados, y SHALL rechazar las peticiones al servicio que convierte una frase en vector si no traen ninguna credencial.

#### Scenario: Petición sin secreto
- **WHEN** alguien llama al servicio de guardado sin el secreto compartido
- **THEN** recibe un rechazo de autorización y no se modifica ningún curso

#### Scenario: Id de un borrador
- **WHEN** el servicio de guardado recibe el identificador de un curso en borrador con el secreto correcto
- **THEN** no calcula ni guarda nada

#### Scenario: Conversión de una frase sin credenciales
- **WHEN** alguien pide convertir una frase en vector sin enviar ninguna credencial
- **THEN** recibe un rechazo de autorización
