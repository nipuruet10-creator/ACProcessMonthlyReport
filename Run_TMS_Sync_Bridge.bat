@echo off
title Walton TMS Sync Bridge - Process Development
color 0A
cls
echo ===================================================================
echo     WALTON Hi-Tech Industries PLC - AC Process Development
echo         eService TMS Automated Integration Bridge (Port 3138)
echo ===================================================================
echo.
echo Connecting to Walton TMS (192.168.118.138:80)...
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b
)

echo Starting TMS Relay Server...
echo Keep this window OPEN while syncing tasks from the Monthly Report App.
echo.
node "%~dp0tms_relay.js"

pause
