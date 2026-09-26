@echo off
chcp 65001 >nul
title Walton TMS Bridge Auto-Startup Remover
color 0C
echo ======================================================================
echo    WALTON TMS BRIDGE - REMOVE FROM WINDOWS STARTUP
echo ======================================================================
echo.
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

del /f /q "%STARTUP_FOLDER%\Walton_TMS_Sync_Bridge.lnk" 2>nul
del /f /q "%STARTUP_FOLDER%\Run_TMS_Sync_Bridge_Silent.vbs" 2>nul

echo [OK] Successfully removed Walton TMS Bridge from Windows Startup!
echo.
pause
