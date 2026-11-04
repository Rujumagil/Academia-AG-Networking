# CRM de AG Networking — publicación independiente en Cloudflare Pages

Esta publicación mantiene **la academia y la web principal en su dominio actual**. Solo el CRM administrativo se publica en Cloudflare Pages; ambos consumen el **mismo Supabase maestro** y mantienen las reglas RLS.

## Configurar desde el navegador

1. En Cloudflare Dashboard: Workers & Pages > Create application > Pages > Connect to Git.
2. Seleccionar GitHub: `Rujumagil/Academia-AG-Networking`.
3. Nombre sugerido del nuevo proyecto: `ag-networking-crm` (la disponibilidad la confirma Cloudflare).
4. Production branch: `main`.
5. Framework preset: `None` (o `No framework`).
6. Root directory: dejar en raíz.
7. Build command: `bash scripts/build-ag-crm-cloudflare.sh`.
8. Build output directory: `dist-ag-crm`.
9. Guardar y desplegar. El resultado será una URL `*.pages.dev`; abrir `/crm/admin.html`.
10. Entrar con una cuenta **administradora** de AG y verificar la sección Alumnos.

No introducir `service_role`, contraseñas, ni otras claves secretas en Cloudflare Pages: el frontend usa la **publishable key** pública y los permisos de Supabase.

## Validación obligatoria

- El usuario `gallardoyair18@gmail.com` debe aparecer como alumno activo **con cero inscripciones**, sin recrear su cuenta.
- El total debe corresponder a los alumnos vinculados al workspace de AG; no incluir alumnos de otras academias.
- El botón Actualizar debe volver a consultar Supabase.
- Un usuario no administrador no debe poder ver el CRM ni sus datos.
- Inscripciones, accesos y pagos son datos distintos: no se crean automáticamente por haber registrado una cuenta.
- Verificar que las pantallas de Candidatos y Seguimientos abran correctamente desde `/crm/`.

## Dominio

Mantener `agbusinessnetworking.com` con GitHub Pages durante las pruebas. **No cambiar ni eliminar DNS.** Cuando la versión Cloudflare esté probada, se puede vincular un subdominio como `crm.agbusinessnetworking.com` desde Cloudflare Pages > Custom domains, siempre que el DNS del dominio pueda administrarse desde la cuenta correspondiente.

## Contenido del despliegue

`scripts/build-ag-crm-cloudflare.sh` genera solo:
- HTML, CSS y JavaScript del CRM (administrador y candidatos).
- Configuración pública del Supabase compartido.
- Iconos y logotipo.
- Una redirección hacia la academia original para accesos que salen del CRM.

No publica archivos SQL, migraciones, workflows, configuraciones privadas ni documentos del repositorio.

**No publicar una segunda base de datos** y no ejecutar migraciones de usuarios.
