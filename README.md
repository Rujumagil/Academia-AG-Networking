# Academia AG Business Networking · v1.0

Plataforma académica web inspirada en la estructura de Aula Compás, adaptada a **AG Business Networking** y preparada para operar con Supabase, GitHub Pages, Cloudflare Pages u otro hosting estático compatible.

**Lema:** “Sueña, conéctate y triunfa”.

## Qué incluye

- Catálogo público de programas.
- Registro, inicio de sesión y recuperación de contraseña con Supabase Auth.
- Perfil de alumno e imagen de perfil.
- Roles separados: alumno, instructor y administrador.
- Estado de cuenta: activa, suspendida o inactiva.
- Espacios de trabajo para separar cursos y responsables.
- Constructor de cursos con módulos, lecciones y editor por bloques.
- Seguimiento de progreso y notas privadas del alumno.
- Biblioteca de libros, manuales y archivos privados.
- Evaluaciones protegidas: las respuestas correctas no se exponen al navegador y la calificación se realiza en Supabase.
- Intentos, porcentaje mínimo de aprobación y registro de resultados.
- Constancias digitales persistentes con folio verificable.
- Página pública para verificar folios.
- Centro de ayuda y tickets de soporte.
- Campana de avisos persistentes: mensajes generales o dirigidos a una cuenta, con control de lectura.
- Panel administrativo de usuarios, roles, suspensiones y reactivaciones.
- Asignación explícita de instructores por curso, sin otorgar privilegios administrativos globales.
- Centro de accesos y productos, preparado para integrar pagos posteriormente.
- Registro de consentimientos legales versionados.
- Aviso de privacidad, términos, reembolsos, código de conducta, propiedad intelectual y accesibilidad.
- PWA instalable y service worker.
- RLS (Row Level Security) en Supabase para separar información por usuario y función.
- Auditoría administrativa para cambios de estado de cuentas.

## Programas precargados

1. **Utah Driver Success Program™** — publicado como programa inicial.
2. **Emprende en Utah** — borrador.
3. **Finanzas para Emprendedores** — borrador.
4. **Marketing y Presencia Digital** — borrador.
5. **Inglés Práctico para la Vida y el Trabajo** — borrador.

El contenido inicial es una base de estructura. Antes de vender o publicar un programa regulado, debe revisarse y actualizarse con las fuentes oficiales aplicables.

## Identidad visual

La interfaz utiliza la identidad entregada para AG:

- Azul marino: `#1E293B`
- Gris: `#6B7280`
- Verde: `#005134`
- Blanco cálido: `#F9FAF9`

Se incluyen el monograma y el lockup de AG Business Networking. Las fuentes comerciales originales no se redistribuyen dentro del proyecto; la interfaz usa familias de respaldo compatibles y puede enlazarse posteriormente con las licencias tipográficas correspondientes.

## Instalación

Lee **`GUIA-INSTALACION.md`** antes de publicar.

Resumen:

1. Crea un proyecto nuevo de Supabase para Academia AG.
2. Ejecuta `01-esquema-base-academia-ag.sql`.
3. Coloca la URL y publishable key en `supabase-config.js`.
4. Publica temporalmente la academia y registra la cuenta que será administradora.
5. En `02-parche-seguridad-y-permisos.sql`, sustituye `TU_CORREO_ADMIN@EJEMPLO.COM` por el correo real de esa cuenta y ejecuta el archivo.
6. Ejecuta `03` a `15` en orden.
7. Configura en Supabase las URLs de autenticación y recuperación de contraseña.
8. Prueba cada rol antes del lanzamiento.

## Archivos SQL

- `01-esquema-base-academia-ag.sql` — esquema base y RLS.
- `02-parche-seguridad-y-permisos.sql` — bootstrap del administrador.
- `03-datos-iniciales.sql` — cursos y recursos iniciales.
- `04-corregir-rutas-imagenes.sql`
- `05-acceso-privado-libros-y-roles.sql`
- `06-plataforma-profesional-e-instructores.sql`
- `07-fotografias-perfil-storage.sql`
- `08-portadas-y-eliminacion-contenido.sql`
- `09-editor-profesional-por-bloques.sql`
- `10-archivos-directos-editor-bloques.sql`
- `11-espacios-de-trabajo-carpetas.sql`
- `12-reparar-administrador-espacios.sql`
- `13-centro-accesos-productos.sql`
- `14-evaluaciones-soporte-certificados-seguridad.sql`
- `15-evaluacion-inicial-utah-driver.sql`

## Seguridad

Nunca coloques en este repositorio:

- `service_role` de Supabase.
- contraseña de base de datos.
- secretos de webhooks.
- access tokens privados de Meta, Mercado Pago u otros proveedores.

El navegador solo debe recibir la **publishable/anon key** de Supabase. Las operaciones sensibles están protegidas por RLS y funciones `security definer` con validación de rol.

La eliminación permanente de una cuenta de **Supabase Auth** no se expone en el navegador. Desde el panel se puede suspender o inactivar una cuenta. Si se requiere borrado definitivo de Auth, debe realizarse desde un entorno servidor/Edge Function con credenciales privadas y un flujo de confirmación.

## Sobre “academia oficial”

La plataforma está construida con estructura, seguridad, administración y áreas propias de una academia profesional. Esto **no significa por sí mismo acreditación gubernamental**. Las constancias de Academia AG acreditan finalización interna de un programa, salvo que AG obtenga y documente una aprobación externa específica.

## Antes de lanzamiento

Revisa `CHECKLIST-LANZAMIENTO.md` y `MATRIZ-PERMISOS.md`.
