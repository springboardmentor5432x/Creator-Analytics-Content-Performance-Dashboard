 @echo off
title CreatorIQ Dashboard Launcher
echo ===================================================
echo Starting CreatorIQ Dashboard (Backend + Frontend)
echo ===================================================

cd /d "%~dp0"

echo [1/2] Starting FastAPI Backend on port 8001...
start "CreatorIQ Backend (FastAPI)" cmd /k "cd /d %~dp0backend && .\.venv\Scripts\Activate.bat && python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"

echo [2/2] Starting Vite Frontend on port 5173...
start "CreatorIQ Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are starting up in separate windows.
echo - Web Dashboard: http://localhost:5173
echo - API Server:    http://127.0.0.1:8001
echo - API Docs:      http://127.0.0.1:8001/docs
echo.
timeout /t 3 /nobreak >nul
start http://localhost:5173
echo Done!
