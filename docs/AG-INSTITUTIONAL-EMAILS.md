# AG · Correos institucionales de autenticación

**Objetivo**: toda alta de alumno y toda recuperación de contraseña de Academia AG debe usar **Academia AG Business Networking <soporte@agbusinessnetworking.com>**, nunca la identidad global de Compás One.

## Arquitectura segura

La academia comparte Auth con otras marcas en `qwxydjotwhniahaovrff`. **No cambiar el SMTP/From global de Supabase**, porque afectaría otros proyectos. El flujo de AG se enruta a la Edge Function `ag-branded-auth` (signup/recovery), que genera un enlace de autenticación con `auth.admin.generateLink()` y lo envía a través de Resend con un remitente verificado.

## Prerrequisitos para activar

1. Confirmar la verificación del dominio `agbusinessnetworking.com` y la habilitación de `soporte@agbusinessnetworking.com` en Resend.
2. Guardar `AG_RESEND_API_KEY` **únicamente como secreto de Supabase** (no subir a GitHub). Nunca guardarlo en JS público. Mantener el proyecto `compas-one`, porque ese es el Auth real de AG.
3. Ejecutar el SQL de `supabase/sql/ag-auth-email-rate-limits.sql` usando una migración auditable y validar que solo `service_role` pueda insertar. No modificar el resto de tablas.
4. Desplegar `supabase/functions/ag-branded-auth/index.ts` a `compas-one`, con `verify_jwt=false` ya que el registro de alumnos es público. La función comprueba Origin, limita peticiones por email y no expone secretos.
5. **Solo cuando los pasos anteriores estén verificados**, publicar la actualización de `app.js` que usa esa función. No habilitar un fallback a `db.auth.signUp` ni `resetPasswordForEmail`, porque volvería a enviar desde Compás One.

## Pruebas de aceptación

- Alumno nuevo recibe `Confirma tu cuenta — Academia AG` desde `soporte@agbusinessnetworking.com`.
- Enlace abre `https://agbusinessnetworking.com/academia.html` y confirma usuario sin redirección a otra marca.
- Cuenta confirmada inicia sesión en la academia y permanece en el workspace AG.
- Recuperación devuelve `Recupera tu acceso — Academia AG` desde la misma cuenta institucional.
- Cuenta ya existente/no existente no se divulga desde el endpoint.
- Un correo repetido muy rápido se bloquea (429).
- Sin `AG_RESEND_API_KEY`, el flujo responde error explícito; no recurre al correo de Compás One.
- Ningún cliente de otro workspace ve cambios en la identidad de sus propios emails.

## Alcance de captación CRM

Los formularios `crm-public-capture.js` y `registrocurso/registrocurso.js` hoy registran **prospectos**, no crean cuentas ni envían autenticación. Si se habilitan acuses de recibo automáticos para esos formularios, deberán reutilizar la identidad institucional de AG desde un servicio **backend** con consentimiento y límites; nunca mandar correos autenticados desde el navegador.
