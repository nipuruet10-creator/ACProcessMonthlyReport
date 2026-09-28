@echo off
chcp 65001 >nul
title Walton TMS Central Team Bridge - Sazzad's PC
color 0B
cls

echo ======================================================================
echo       WALTON Hi-Tech Industries PLC - AC Process Development
echo       Walton TMS Central Team Bridge Server (Port 3138)
echo ======================================================================
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please ensure Node.js is installed.
    pause
    exit /b
)

echo [*] Detecting Local Wi-Fi / LAN IP Address...
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0 ^| findstr /v "0.0.0.0.*0.0.0.0"') do (
    set "MY_IP=%%a"
)
if "%MY_IP%"=="" set "MY_IP=192.168.50.158"

echo.
echo ======================================================================
echo   [ACTIVE] Sazzad's PC is configured as the CENTRAL TMS BRIDGE!
echo.
echo   - Local PC Access    : http://localhost:3138
echo   - Team Wi-Fi Address : http://%MY_IP%:3138
echo   - Target Walton TMS  : http://192.168.118.138:80
echo.
echo   Team members using Vercel or their own PCs will route TMS
echo   submissions automatically through this central machine!
echo ======================================================================
echo.
echo Starting TMS Relay Engine...
node "%~dp0tms_relay.js"

pause
