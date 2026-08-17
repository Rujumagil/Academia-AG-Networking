# Academia AG Business Networking · v1.0

Plataforma académica web inspirada en la estructura de Aula Compás, adaptada a **AG Business Networking** y preparada para operar con Supabase y GitHub Pages.

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

## Supabase y despliegue

El repositorio ya usa la estructura oficial de Supabase:

```text
supabase/
├── config.toml
└── migrations/
```

La integración GitHub ↔ Supabase está configurada para desplegar las migraciones de `main` al proyecto de producción conectado.

La URL pública del proyecto Supabase ya está configurada en `supabase-config.js`. Falta colocar únicamente la **publishable key** pública del proyecto para activar el frontend.

### Primer administrador

Las migraciones pueden desplegarse aunque todavía no exista ningún usuario.

Después de registrar la primera cuenta que será administradora, ejecuta desde Supabase SQL Editor:

```sql
select private.bootstrap_admin_by_email('correo-real@ejemplo.com');
```

Ese bootstrap:

- promueve el perfil a `admin`;
- activa la cuenta;
- crea o recupera el workspace `AG Business Networking`;
- asigna al administrador como `owner`;
- organiza el contenido existente dentro del workspace.

También se incluye el archivo `16-bootstrap-admin-workspace.sql` como guía manual.

## Migraciones

Las migraciones productivas se encuentran en `supabase/migrations/` y se ejecutan en orden:

1. esquema base;
2. seguridad y permisos;
3. datos iniciales;
4. rutas de imágenes;
5. acceso privado y roles;
6. plataforma e instructores;
7. fotografías y Storage;
8. portadas y eliminación de contenido;
9. editor profesional por bloques;
10. archivos directos del editor;
11. espacios de trabajo;
12. políticas administrativas y bootstrap diferido;
13. centro de accesos y productos;
14. evaluaciones, soporte, certificados y seguridad;
15. evaluación inicial Utah Driver;
16. bootstrap automatizado de administrador + workspace.

## Seguridad

Nunca coloques en este repositorio:

- `service_role` de Supabase;
- contraseña de base de datos;
- secretos de webhooks;
- access tokens privados de Meta, Mercado Pago u otros proveedores.

El navegador solo debe recibir la **publishable key** de Supabase. Las operaciones sensibles están protegidas por RLS y funciones `security definer` con validación de rol.

La eliminación permanente de una cuenta de **Supabase Auth** no se expone en el navegador. Desde el panel se puede suspender o inactivar una cuenta. Si se requiere borrado definitivo de Auth, debe realizarse desde un entorno servidor/Edge Function con credenciales privadas y un flujo de confirmación.

## Sobre “academia oficial”

La plataforma está construida con estructura, seguridad, administración y áreas propias de una academia profesional. Esto **no significa por sí mismo acreditación gubernamental**. Las constancias de Academia AG acreditan finalización interna de un programa, salvo que AG obtenga y documente una aprobación externa específica.

## Antes de lanzamiento

Lee `GUIA-INSTALACION.md`, `CHECKLIST-LANZAMIENTO.md` y `MATRIZ-PERMISOS.md`.
