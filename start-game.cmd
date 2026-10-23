@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is needed to run Island Quest.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:8000/game/ in your browser.
node scripts\serve-game.mjs
