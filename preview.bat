@echo off
title Forge website preview
cd /d "%~dp0"
echo.
echo  Forge Public Safety website - local preview
echo  --------------------------------------------
echo  Edit text in: content\site.json
echo  Browser opens at: http://localhost:5173
echo  Press Ctrl+C in this window to stop.
echo.
npm run dev
