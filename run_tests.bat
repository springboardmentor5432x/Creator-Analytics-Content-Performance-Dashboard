@echo off
title CreatorIQ Automated Test Suite
echo ===================================================
echo Running CreatorIQ Test Suite and Production Build
echo ===================================================

cd /d "%~dp0"

echo.
echo [1/2] Running Backend Pytest Suite...
cd backend
call .\.venv\Scripts\Activate.bat
python -m pytest -v
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend tests failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Running Frontend Production Build...
cd ..\frontend
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo SUCCESS: All tests passed and production build is complete!
echo ===================================================
pause
