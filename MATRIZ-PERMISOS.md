# Matriz de accesos y permisos · Academia AG

| Área | Público | Alumno | Instructor | Administrador |
|---|---:|---:|---:|---:|
| Catálogo público | Sí | Sí | Sí | Sí |
| Documentos legales | Sí | Sí | Sí | Sí |
| Verificar constancia por folio | Sí | Sí | Sí | Sí |
| Registro / inicio de sesión | Sí | Sí | Sí | Sí |
| Perfil propio | — | Editar datos propios | Editar datos propios | Editar datos propios |
| Ver cursos | — | Solo asignados | Cursos autorizados | Todos |
| Crear/editar cursos | — | No | Sí, autorizados | Sí |
| Módulos y lecciones | — | Lectura asignada | Gestión autorizada | Gestión total |
| Progreso | — | Propio | No modifica progreso del alumno | Consulta administrativa según políticas |
| Notas de lección | — | Propias | No | No salvo administración prevista |
| Biblioteca privada | — | Solo autorizada | Recursos de cursos administrados | Total |
| Evaluaciones | — | Resolver asignadas | Crear/administrar las de sus cursos | Total |
| Ver respuestas correctas | — | **No** | Sí, para sus evaluaciones | Sí |
| Intentos de evaluación | — | Propios | De cursos administrados | Todos autorizados |
| Certificados | Verificar folio | Propios | Según curso administrado | Todos autorizados |
| Tickets de soporte | — | Crear/ver propios | Crear/ver propios | Ver y cambiar estado |
| Avisos/notificaciones | — | Ver avisos propios/globales | Ver avisos propios/globales | Crear avisos globales o dirigidos |
| Roles de usuario | — | No | No | Sí |
| Suspender/reactivar cuentas | — | No | No | Sí |
| Inscripciones | — | Consulta propia | Consulta según gestión | Sí |
| Productos y accesos | — | Consulta propia | No | Sí |
| Órdenes/ventas | — | No | No | Sí |
| Asignación de instructores por curso | — | No | Solo consulta de sus asignaciones | Sí |
| Workspaces | — | No | Solo asignados | Total |
| Auditoría administrativa | — | No | No | Sí |
| Borrado definitivo de Supabase Auth | — | No | No | **Solo servidor/Edge Function**, no navegador |

## Principio de seguridad

La interfaz visual no es la barrera de seguridad. Los permisos importantes se aplican en Supabase mediante RLS y funciones seguras. Aunque una persona intente llamar manualmente a la API desde el navegador, las políticas deben impedir acceso no autorizado.

- Al asignar un curso a un instructor, el sistema también le da visibilidad del espacio correspondiente; esto no amplía por sí solo la edición de otros cursos.
