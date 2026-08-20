@echo off
setlocal
title Academia AG - Finalizar Migracion Cloudflare - Modulo 2
color 0A
echo.
echo ============================================================
echo  ACADEMIA AG - FINALIZAR MIGRACION CLOUDFLARE - MODULO 2
echo ============================================================
echo.
echo Este paso NO vuelve a subir videos.
echo Usa los UID ya guardados en c2-cloudflare-checkpoint.json.
echo.
set "SCRIPT=%~dp0finalizar-modulo2-cloudflare.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/Rujumagil/Academia-AG-Networking/main/tools/migracion-cloudflare/finalizar-modulo2-cloudflare.ps1' -OutFile '%SCRIPT%' } catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }"
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
  echo Finalizacion completa. Ya tienes utah-c2-cloudflare-map.sql listo para Supabase.
) else if "%EXITCODE%"=="2" (
  echo Aun hay algun video pendiente de procesamiento. Vuelve a intentarlo en unos minutos.
) else (
  echo El proceso encontro un error. No borres c2-cloudflare-checkpoint.json.
)
echo.
pause
exit /b %EXITCODE%
