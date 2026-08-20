# Academia AG · Migración Módulo 1 a Cloudflare Stream

Esta herramienta importa en lote los videos restantes del Módulo 1 del Utah Driver Success Program V2 directamente desde Wix hacia Cloudflare Stream.

## Seguridad

- El API token se solicita en PowerShell como entrada oculta.
- El token no se escribe en archivos ni se guarda en GitHub.
- `C1-01` y `C1-02` conservan los UID ya validados.
- `C1-03` a `C1-13` se importan desde los MP4 720p de Wix.
- `C1-PROMO` no se toca hasta localizar el archivo correcto.
- El checkpoint local permite reanudar sin volver a importar videos ya enviados.

## Cómo ejecutarlo

1. Descarga esta carpeta a tu PC.
2. Conserva juntos `ejecutar-migracion-c1.cmd` y `migrar-modulo1-cloudflare.ps1`.
3. Haz doble clic en `ejecutar-migracion-c1.cmd`.
4. Cuando se solicite, pega el API token temporal de Cloudflare y presiona Enter. No se mostrará en pantalla.
5. Espera a que los 13 videos del módulo queden listos.
6. Al terminar se generan:
   - `utah-c1-cloudflare-map.csv`
   - `utah-c1-cloudflare-report.json`
   - `utah-c1-cloudflare-map.sql`
   - `c1-cloudflare-checkpoint.json`
7. Abre `utah-c1-cloudflare-map.sql`, copia todo y ejecútalo una vez en Supabase.
8. La verificación final debe indicar:
   - `c1_con_stream = 13`
   - `promo_con_stream = 0`
   - `legacy_restante = 0`

## Si se interrumpe

No borres `c1-cloudflare-checkpoint.json`. Ejecuta de nuevo `ejecutar-migracion-c1.cmd`; la herramienta reutilizará los UID ya creados para evitar duplicados.

## Al finalizar

Revoca el API token temporal de Cloudflare cuando termine la migración que necesites realizar.
