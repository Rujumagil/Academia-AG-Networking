@echo off
setlocal
title Academia AG - Introduccion y Contenido Especial a Cloudflare
color 0A
echo.
echo ============================================================
echo  ACADEMIA AG - INTRODUCCION + CONTENIDO ESPECIAL
echo ============================================================
echo.
echo Descargando la herramienta oficial desde GitHub...
echo.
set "SCRIPT=%~dp0migrar-intro-promo-cloudflare.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/Rujumagil/Academia-AG-Networking/main/tools/migracion-cloudflare/migrar-intro-promo-cloudflare.ps1' -OutFile '%SCRIPT%' } catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }"
if errorlevel 1 (
  echo.
  echo No se pudo descargar la herramienta. Verifica tu conexion a Internet.
  echo.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "EXITCODE=%ERRORLEVEL%"
echo.
if not "%EXITCODE%"=="0" (
  echo El proceso no se completo. No borres el checkpoint de introduccion y promo.
  echo Vuelve a ejecutar este archivo para continuar sin duplicar lo ya subido.
) else (
  echo Introduccion y contenido especial quedaron listos en Cloudflare.
  echo En esta misma carpeta encontraras utah-intro-promo-cloudflare.sql para Supabase.
)
echo.
pause
exit /b %EXITCODE%
