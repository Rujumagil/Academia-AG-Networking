@echo off
setlocal
title Academia AG - Migracion Cloudflare Modulo 1
color 0A
echo.
echo ============================================================
echo  ACADEMIA AG - MIGRACION CLOUDFLARE STREAM - MODULO 1
echo ============================================================
echo.
echo Descargando el migrador oficial desde GitHub...
echo.
set "SCRIPT=%TEMP%\academia-ag-migrar-modulo1-cloudflare.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/Rujumagil/Academia-AG-Networking/main/tools/migracion-cloudflare/migrar-modulo1-cloudflare.ps1' -OutFile '%SCRIPT%' } catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }"
if errorlevel 1 (
  echo.
  echo No se pudo descargar el migrador. Verifica tu conexion a Internet.
  echo.
  pause
  exit /b 1
)

copy /Y "%SCRIPT%" "%~dp0migrar-modulo1-cloudflare.ps1" >nul
del /Q "%SCRIPT%" >nul 2>&1

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0migrar-modulo1-cloudflare.ps1"
set "EXITCODE=%ERRORLEVEL%"
echo.
if "%EXITCODE%"=="0" (
  echo Migracion completa. En esta misma carpeta encontraras el SQL FINAL para Supabase.
) else if "%EXITCODE%"=="2" (
  echo Migracion parcial completada.
  echo Los videos correctos quedaron guardados y NO se duplicaran.
  echo Revisa utah-c1-cloudflare-errors.json y vuelve a ejecutar este lanzador para reintentar solo los pendientes.
  echo NO borres c1-cloudflare-checkpoint.json.
) else (
  echo La migracion encontro un error general.
  echo NO borres el archivo checkpoint; puedes volver a ejecutar este lanzador.
)
echo.
pause
exit /b %EXITCODE%
