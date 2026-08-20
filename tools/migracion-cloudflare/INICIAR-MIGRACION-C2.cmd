@echo off
setlocal
title Academia AG - Migracion Cloudflare Stream - Modulo 2
color 0A
echo.
echo ============================================================
echo  ACADEMIA AG - MIGRACION CLOUDFLARE STREAM - MODULO 2
echo ============================================================
echo.
echo Descargando la herramienta oficial desde GitHub...
echo.
set "SCRIPT=%~dp0migrar-modulo2-cloudflare.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/Rujumagil/Academia-AG-Networking/main/tools/migracion-cloudflare/migrar-modulo2-cloudflare.ps1' -OutFile '%SCRIPT%' } catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }"
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
if "%EXITCODE%"=="0" (
  echo Migracion completa. En esta misma carpeta encontraras el SQL FINAL para Supabase.
) else if "%EXITCODE%"=="2" (
  echo Migracion parcial. Los videos correctos quedaron guardados y NO se duplicaran.
  echo Revisa utah-c2-cloudflare-errors.json y vuelve a ejecutar este lanzador.
  echo NO borres c2-cloudflare-checkpoint.json.
) else (
  echo La migracion se detuvo por un error general.
  echo NO borres c2-cloudflare-checkpoint.json; puedes volver a ejecutar este lanzador.
)
echo.
pause
exit /b %EXITCODE%
