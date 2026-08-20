# Utah Driver Success Program™ V2 — Arquitectura limpia

## Fuente única de video

Cloudflare Stream es la única fuente oficial de video para esta versión del curso.

No se usan ni se deben volver a introducir:
- YouTube
- Google Drive
- Wix Video / wixstatic
- playlists externas
- mapeos por orden de reproducción

Cada lección de video debe quedar ligada directamente a un `stream_uid` de Cloudflare y a sus URLs HLS/DASH.

## Curso

UUID V2: `7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01`
Slug: `utah-driver-success-program`

## Estructura

La estructura académica se almacena explícitamente mediante `modules.section_type` y `modules.academic_number`.

1. Introducción — Bienvenida y cómo usar el curso
2. Módulo 1 — Licencias, permisos y documentación
3. Módulo 2 — Salud, exámenes y preparación del vehículo
4. Módulo 3 — Manejo básico
5. Módulo 4 — Reglas del camino y señales
6. Módulo 5 — Alcohol, drogas y retos al manejar
7. Módulo 6 — Emergencias, compartir el camino y tu récord
8. Cierre del curso

Introducción y Cierre son contenedores técnicos en la tabla `modules`, pero NO se numeran como módulos académicos.

## Regla de construcción

La reconstrucción se hará por fases:

1. Núcleo y secciones.
2. Lecciones y títulos definitivos.
3. Subida/mapeo individual de Cloudflare Stream.
4. Reproductor AG.
5. Progreso y reanudación.
6. Evaluaciones por módulo.
7. Promos y cierre.
8. QA de escritorio y móvil.
9. Publicación.

No se migrará contenido mediante orden de playlist. Cada video deberá asociarse por código de lección + `stream_uid` explícito.
