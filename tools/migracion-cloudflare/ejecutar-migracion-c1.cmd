@echo off
setlocal
cd /d "%~dp0"
echo.
echo Iniciando migracion de Academia AG...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0migrar-modulo1-cloudflare.ps1"
echo.
if errorlevel 1 (
  echo La migracion termino con un error. Revisa el mensaje anterior.
) else (
  echo Proceso terminado correctamente.
)
echo.
pause
endlocal
