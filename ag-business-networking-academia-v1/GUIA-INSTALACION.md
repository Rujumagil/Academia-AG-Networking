# Guía de instalación · Academia AG Business Networking

## 1. Crear Supabase

Crea un proyecto **nuevo** y exclusivo para Academia AG. No reutilices el proyecto de Aula Compás ni el de otra academia.

En **SQL Editor**, ejecuta primero:

`01-esquema-base-academia-ag.sql`

Esto crea perfiles, cursos, módulos, lecciones, inscripciones, progreso, notas, recursos, funciones de seguridad y las políticas RLS base.

## 2. Conectar el frontend

Abre `supabase-config.js` y sustituye únicamente los valores públicos:

```js
window.SUPABASE_CONFIG = {
  url: "https://TU-PROYECTO.supabase.co",
  publishableKey: "TU_SUPABASE_PUBLISHABLE_KEY",
  adminEmail: "correo@agbusinessnetworking.com",
  whatsappNumber: "",
  publicSiteUrl: "https://tu-sitio.com/",
  academyUrl: "https://academia.tu-sitio.com/",
  legalVersion: "2026-08",
  organizationName: "AG Business Networking"
};
```

No agregues `service_role`.

## 3. Publicar temporalmente y crear al primer administrador

Publica los archivos en el hosting elegido. Entra a la academia y crea la cuenta que será administradora.

Después abre `02-parche-seguridad-y-permisos.sql`, cambia:

`TU_CORREO_ADMIN@EJEMPLO.COM`

por el correo que acabas de registrar y ejecuta el SQL.

## 4. Ejecutar el resto de la base

Ejecuta los archivos siguientes, en orden:

`03` → `04` → `05` → `06` → `07` → `08` → `09` → `10` → `11` → `12` → `13` → `14` → `15`.

Si una migración indica un error, detén el proceso y corrige antes de continuar.

## 5. Configurar Auth

En Supabase configura:

- Site URL: la URL pública de Academia AG.
- Redirect URLs: agrega la URL de la academia y sus variantes de producción necesarias.
- Recuperación de contraseña: valida que el enlace regrese al dominio de la academia.
- Confirmación de correo: actívala para producción y prueba altas reales.
- Política de contraseña: configura en Supabase una longitud mínima coherente con la interfaz (8 caracteres o más).
- Correo: para producción conviene usar un proveedor SMTP propio y revisar remitente, SPF, DKIM y DMARC.

## 6. Storage

Las migraciones crean/configuran los buckets que necesita el proyecto, entre ellos:

- contenido digital privado;
- fotografías de perfil;
- medios de curso/editor.

Verifica que los buckets privados continúen privados y que las políticas RLS no hayan sido desactivadas.

## 7. Hosting

La aplicación es estática. Puede publicarse desde GitHub y Cloudflare Pages. Mantén todos los archivos del paquete en la raíz del proyecto para conservar las rutas de imágenes tal como están configuradas.

No agregues un `CNAME` hasta conocer el dominio definitivo.

## 8. Pruebas obligatorias

Crea tres cuentas de prueba:

- alumno;
- instructor;
- administrador.

Valida con cada una:

- que el alumno solo vea sus cursos, intentos y recursos;
- que el instructor solo gestione contenido autorizado y únicamente los cursos que creó o que un administrador le asignó;
- que el administrador gestione usuarios, roles, accesos, soporte y productos;
- que una cuenta suspendida pierda acceso académico;
- que una evaluación no revele `is_correct` en el navegador;
- que la constancia solo se emita con lecciones completas y evaluaciones aprobadas;
- que el folio pueda verificarse desde `#verify`;
- que los archivos privados no tengan una URL pública permanente;
- que un aviso global y uno dirigido aparezcan solo a quienes corresponda;
- que retirar una asignación de instructor elimine su permiso de gestión del curso.

## 9. Personalización antes de producción

Actualiza:

- teléfono/WhatsApp;
- dominio principal y dominio de academia;
- correo de soporte;
- datos legales definitivos;
- reglas de reembolso;
- fechas de eventos de ejemplo;
- contenido oficial de cada curso;
- precios y enlaces de pago cuando corresponda.

## 10. Verificación técnica

Usa:

- `diagnostico.html` para revisar Supabase y el navegador;
- `verificar-imagenes.html` para validar recursos gráficos;
- `limpiar-cache.html` después de actualizaciones importantes de la PWA.
