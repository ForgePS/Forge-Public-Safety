@echo off
title Forge website publish
cd /d "%~dp0"
echo.
echo  This builds the site and deploys to Firebase Hosting.
echo  You must be logged in: firebase login
echo.
set /p OK=Continue? (Y/N):
if /I not "%OK%"=="Y" exit /b 0
call npm run build
if errorlevel 1 (
  echo Build failed. Fix errors and try again.
  pause
  exit /b 1
)
call firebase deploy --only hosting:marketing
echo.
echo Done. Check Firebase Hosting for your live URL.
pause
