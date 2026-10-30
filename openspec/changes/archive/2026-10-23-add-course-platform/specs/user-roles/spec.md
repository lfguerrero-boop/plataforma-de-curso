## Purpose

Define el registro, el inicio de sesión y la asignación de un rol único (instructor o estudiante) a cada usuario, base de la autorización de toda la plataforma.

## ADDED Requirements

### Requirement: Registro con rol
El sistema SHALL permitir registrarse con correo y contraseña eligiendo el rol `instructor` o `student`, y SHALL crear un perfil con ese rol.

#### Scenario: Registro como estudiante
- **WHEN** un visitante se registra con credenciales válidas y el rol `student`
- **THEN** se crea la cuenta y su perfil con rol `student`

#### Scenario: Registro como instructor
- **WHEN** un visitante se registra con credenciales válidas y el rol `instructor`
- **THEN** se crea la cuenta y su perfil con rol `instructor`

#### Scenario: Rol inválido
- **WHEN** el registro incluye un rol distinto de `instructor` o `student`
- **THEN** el sistema rechaza el registro

### Requirement: Inicio y cierre de sesión
El sistema SHALL permitir iniciar y cerrar sesión, y SHALL identificar al usuario autenticado con su rol en cada solicitud.

#### Scenario: Credenciales correctas
- **WHEN** un usuario registrado inicia sesión con credenciales correctas
- **THEN** obtiene una sesión activa asociada a su rol

#### Scenario: Credenciales incorrectas
- **WHEN** un usuario inicia sesión con credenciales incorrectas
- **THEN** el sistema rechaza el acceso y no crea sesión

### Requirement: Rol inmutable por el usuario
El sistema SHALL impedir que un usuario cambie su propio rol después del registro.

#### Scenario: Intento de elevar el rol
- **WHEN** un estudiante intenta actualizar su perfil con el rol `instructor`
- **THEN** la base de datos rechaza el cambio y el rol permanece `student`

### Requirement: Acceso restringido a páginas de instructor
El sistema SHALL permitir el área de gestión de cursos solo a usuarios con rol `instructor`.

#### Scenario: Estudiante en el área de gestión
- **WHEN** un estudiante abre la página de gestión de cursos
- **THEN** el sistema niega el acceso o lo redirige

#### Scenario: Visitante sin sesión
- **WHEN** un visitante sin sesión abre una página que requiere autenticación
- **THEN** el sistema lo redirige al inicio de sesión
