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
if not "%EXITCODE%"=="0" (
  echo La migracion se detuvo. No borres el archivo checkpoint; puedes volver a ejecutar este lanzador.
) else (
  echo Migracion finalizada. En esta misma carpeta encontraras el SQL para Supabase.
)
echo.
pause
exit /b %EXITCODE%
