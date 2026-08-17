# Guía de instalación · Academia AG Business Networking

## 1. Estado actual

Academia AG ya utiliza un proyecto Supabase independiente y el repositorio `Rujumagil/Academia-AG-Networking` está conectado mediante la integración oficial de GitHub.

La rama de producción es `main` y las migraciones productivas viven en:

```text
supabase/migrations/
```

No ejecutes los SQL `01` a `16` manualmente si la integración GitHub ↔ Supabase ya está activa y el despliegue de `main` funciona. Los archivos SQL de la raíz se conservan como referencia/manual.

## 2. Conectar el frontend

`supabase-config.js` ya contiene la URL pública del proyecto Supabase de Academia AG.

Falta sustituir únicamente:

```js
publishableKey: "TU_SUPABASE_PUBLISHABLE_KEY"
```

por la **publishable key** del proyecto en Supabase → Settings → API Keys.

La publishable key puede estar en el navegador. Nunca agregues `service_role`, contraseña de base de datos ni secretos privados al repositorio.

Mientras la key siga como placeholder, la academia debe mostrar un estado de configuración pendiente en vez de intentar autenticarse con credenciales inválidas.

## 3. Crear el primer administrador

Las migraciones están preparadas para desplegarse aunque todavía no exista ningún usuario.

Cuando el frontend ya tenga la publishable key:

1. Abre `academia.html`.
2. Registra la cuenta que será administradora principal.
3. Confirma el correo si Auth lo requiere.
4. En Supabase SQL Editor ejecuta:

```sql
select private.bootstrap_admin_by_email('CORREO-REAL-DEL-ADMIN');
```

El bootstrap promueve la cuenta a `admin`, la activa, crea el workspace principal de AG, asigna al administrador como `owner` y organiza el contenido existente.

El archivo `16-bootstrap-admin-workspace.sql` contiene una plantilla de verificación.

## 4. Migraciones

La cadena productiva debe quedar registrada en Supabase en este orden:

`001` esquema base → `002` seguridad → `003` datos iniciales → `004` imágenes → `005` acceso privado → `006` instructores → `007` Storage de perfiles → `008` portadas → `009` editor → `010` archivos → `011` workspaces → `012` políticas administrativas → `013` productos/accesos → `014` evaluaciones/soporte/certificados → `015` evaluación Utah Driver → `016` bootstrap administrador/workspace.

Si una migración falla, no agregues manualmente las siguientes. Corrige primero el SQL en GitHub y deja que Supabase reintente desde la migración pendiente.

## 5. Configurar Auth

En Supabase configura:

- **Site URL:** `https://rujumagil.github.io/Academia-AG-Networking/` mientras usamos la página muestra.
- **Redirect URLs:** agrega la URL anterior y la ruta de `academia.html`.
- Recuperación de contraseña: valida que regrese a la academia.
- Confirmación de correo: actívala para producción y prueba altas reales.
- Política de contraseña: 8 caracteres o más como mínimo.
- Para producción comercial, configura SMTP propio y revisa SPF, DKIM y DMARC.

Cuando AG use su nuevo dominio oficial, sustituye las URLs de GitHub Pages por el dominio definitivo en Auth y en `supabase-config.js`.

## 6. Storage

Las migraciones crean/configuran los buckets necesarios para:

- contenido digital privado;
- fotografías de perfil;
- medios de curso/editor.

Verifica que los buckets privados continúen privados y que sus políticas no se hayan desactivado.

## 7. Hosting

La página muestra se publica actualmente con GitHub Pages desde `main`.

Arquitectura pública provisional:

```text
/                         → Landing oficial AG
/academia.html            → Academia AG
/academia.html#catalog    → Catálogo
/academia.html#verify     → Verificación de constancias
```

No agregues un `CNAME` hasta definir el dominio que sustituirá o complementará al sitio oficial actual.

## 8. Pruebas obligatorias

Crea tres cuentas de prueba:

- alumno;
- instructor;
- administrador.

Valida:

- alumno: solo sus cursos, intentos y recursos;
- instructor: solo cursos creados o asignados;
- administrador: usuarios, roles, accesos, soporte y productos;
- cuenta suspendida: sin acceso académico;
- evaluación: no expone `is_correct` al navegador;
- constancia: solo con lecciones y evaluaciones completas;
- folio: verificable públicamente;
- archivos privados: sin URL pública permanente;
- notificaciones: segmentación correcta;
- revocar instructor: elimina su permiso de gestión.

## 9. Integración con Compás One

La landing ya carga el agente web de Compás One. La academia debe mantener su base académica separada y sincronizar eventos relevantes con Compás One mediante API/eventos, por ejemplo:

- `student.created`;
- `enrollment.created`;
- `course.completed`;
- `event.registered`;
- `certificate.issued`;
- `support.created`.

No compartas claves `service_role` entre proyectos. La integración debe utilizar un endpoint privado o Edge Function con autenticación propia.

## 10. Verificación técnica

Usa:

- `diagnostico.html` para revisar Supabase y navegador;
- `verificar-imagenes.html` para recursos gráficos;
- `limpiar-cache.html` después de cambios importantes de PWA.
