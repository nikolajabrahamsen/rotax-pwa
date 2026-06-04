@echo off
title Rotax Danmark PWA
echo.
echo  ROTAX DANMARK - Starter PWA...
echo.

cd /d "D:\OneDrive\Motorsport\004 - App\rotax-pwa-docker"

if not exist "node_modules" (
    echo  Installerer pakker...
    npm install
)

echo  App starter - aaben paa:
echo.
echo  ** Din computer:  http://localhost:3000
echo  ** iPhone/iPad:   http://DIN-IP:3000
echo.
echo  Find din IP: Indstillinger - WiFi - (dit netvaerk) - IP-adresse
echo.
docker compose up --build

pause
