@echo off
chcp 65001 >nul
title Walton TMS Bridge Auto-Startup Setup
color 0A
echo ======================================================================
echo    WALTON TMS AUTO-SYNC BRIDGE - AUTOMATIC STARTUP INSTALLER
echo ======================================================================
echo.
set "CURRENT_DIR=%~dp0"
set "TARGET_VBS=%CURRENT_DIR%Run_TMS_Sync_Bridge_Silent.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\Walton_TMS_Sync_Bridge.lnk"

echo [*] Registering Windows Startup Shortcut...
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\MakeTmsShortcut.vbs"
echo sLinkFile = "%SHORTCUT_PATH%" >> "%TEMP%\MakeTmsShortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\MakeTmsShortcut.vbs"
echo oLink.TargetPath = "wscript.exe" >> "%TEMP%\MakeTmsShortcut.vbs"
echo oLink.Arguments = """%TARGET_VBS%""" >> "%TEMP%\MakeTmsShortcut.vbs"
echo oLink.WorkingDirectory = "%CURRENT_DIR%" >> "%TEMP%\MakeTmsShortcut.vbs"
echo oLink.Description = "Walton TMS Relay Bridge" >> "%TEMP%\MakeTmsShortcut.vbs"
echo oLink.Save >> "%TEMP%\MakeTmsShortcut.vbs"

cscript //nologo "%TEMP%\MakeTmsShortcut.vbs" 2>nul
del /f /q "%TEMP%\MakeTmsShortcut.vbs" 2>nul

if exist "%SHORTCUT_PATH%" (
    echo [OK] Startup shortcut registered successfully:
    echo      %SHORTCUT_PATH%
) else (
    echo [*] Direct copy fallback to Startup folder...
    copy /Y "%TARGET_VBS%" "%STARTUP_FOLDER%\Run_TMS_Sync_Bridge_Silent.vbs" >nul
)

echo.
echo [*] Launching Walton TMS Bridge in silent background mode now...
start "" wscript.exe "%TARGET_VBS%"

echo.
echo ======================================================================
echo  [SUCCESS] Walton TMS Auto-Sync Bridge is now configured to start
echo  automatically whenever Windows boots up!
echo.
echo  - Runs silently in the background (No black console window).
echo  - Port 3138 is active on 0.0.0.0 (LAN Accessible).
echo  - Team Members can sync from any PC: http://192.168.50.158:3138
echo ======================================================================
echo.
pause
