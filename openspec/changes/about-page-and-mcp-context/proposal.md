# Proposal

## Why

El sitio no explica qué es la plataforma ni para quién, y no hay forma de que un asistente consulte el sitio (páginas, assets y cursos publicados) sin acceso a la base. Una página «Quiénes somos» con datos reales y un servidor MCP de solo lectura resuelven ambas cosas.

## What Changes

- **Página `/quienes-somos`.** Presenta la plataforma, las áreas y niveles de los cursos, cómo funciona (roles, borrador, publicación, inscripción, reseñas) y los 3 cursos publicados más recientes con sus datos reales (título, descripción, categoría, nivel, instructor, fecha de publicación y calificación). Sin datos de ejemplo.
- **Enlace «Quiénes somos» en el menú** principal.
- **Servidor MCP local `mcp-server/`** (JavaScript, stdio, solo lectura) registrado en Claude como `marketing-academia-context` con alcance local. Cuatro herramientas: listar assets públicos, leer un asset sin salir de `public/`, mapa de páginas del App Router y cursos publicados vía Supabase con la anon key y solo columnas públicas.

## Capabilities

### New Capabilities
- `about-page`: página pública «Quiénes somos» con contenido institucional y los cursos publicados más recientes.

### Modified Capabilities
Ninguna. El servidor MCP es herramienta de desarrollo y no cambia el comportamiento del sitio, así que no tiene spec (ver `design.md`).

## Impact

- **App:** `src/app/quienes-somos/page.tsx`, `src/components/featured-courses.tsx`, `src/components/site-nav.tsx`, `src/app/globals.css`.
- **Servidor MCP:** `mcp-server/` (`index.js`, `package.json`, `.gitignore`; `.env` ignorado por git). Dependencias: `@modelcontextprotocol/sdk`, `@supabase/supabase-js`, `dotenv`, `zod`.
- **Configuración de Claude:** registro local `marketing-academia-context` en `~/.claude.json`; no se crea `.mcp.json` en el repositorio.
- **Documentación:** `CLAUDE.md` (servidor MCP y sus trampas).
