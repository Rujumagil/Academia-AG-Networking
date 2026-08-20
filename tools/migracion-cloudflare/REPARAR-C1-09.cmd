@echo off
setlocal
title Academia AG - Rescate Cloudflare C1-09
color 0A
echo.
echo ============================================================
echo  ACADEMIA AG - RESCATE CLOUDFLARE - C1-09
echo ============================================================
echo.
echo Descargando la herramienta de rescate desde GitHub...
echo.
set "SCRIPT=%~dp0reparar-c1-09-cloudflare.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/Rujumagil/Academia-AG-Networking/main/tools/migracion-cloudflare/reparar-c1-09-cloudflare.ps1' -OutFile '%SCRIPT%' } catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }"
if errorlevel 1 (
  echo.
  echo No se pudo descargar la herramienta de rescate. Verifica tu conexion a Internet.
  echo.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "EXITCODE=%ERRORLEVEL%"
echo.
if not "%EXITCODE%"=="0" (
  echo El rescate de C1-09 no se completo. Copia el error mostrado y envialo para revisarlo.
) else (
  echo C1-09 quedo incorporado al checkpoint.
  echo Ahora ejecuta INICIAR-MIGRACION-C1.cmd para generar el SQL completo.
)
echo.
pause
exit /b %EXITCODE%
