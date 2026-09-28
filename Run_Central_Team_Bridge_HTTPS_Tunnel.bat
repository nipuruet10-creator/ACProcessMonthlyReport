@echo off
chcp 65001 >nul
title Walton TMS Central Team Bridge with HTTPS Tunnel (Vercel Ready)
color 0A
cls

echo ======================================================================
echo    WALTON TMS CENTRAL BRIDGE + SECURE HTTPS TUNNEL (VERCEL READY)
echo ======================================================================
echo.
echo Starting Walton TMS Relay Server on Port 3138...
start "TMS Relay Server" /min node "%~dp0tms_relay.js"

timeout /t 2 /nobreak >nul

echo.
echo Starting Secure HTTPS Tunnel for Vercel...
echo (Allows Vercel HTTPS web app to reach Walton TMS via this PC)
echo.
echo ======================================================================
echo When the URL appears below, team members on Vercel can sync TMS directly!
echo ======================================================================
echo.

npx --yes localtunnel --port 3138 --subdomain walton-pd-tms

pause
