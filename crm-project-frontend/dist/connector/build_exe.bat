@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo Building Tally Connector Windows Executable (.exe)
echo ========================================================

:: Check for PyInstaller in backend .venv first
set "PYINSTALLER_EXE=..\..\crm-project-backend\.venv\Scripts\pyinstaller.exe"

if not exist "%PYINSTALLER_EXE%" (
    set "PYINSTALLER_EXE=..\crm-project-backend\.venv\Scripts\pyinstaller.exe"
)

if not exist "%PYINSTALLER_EXE%" (
    where pyinstaller >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set "PYINSTALLER_EXE=pyinstaller"
    ) else (
        echo [!] PyInstaller not found. Attempting pip install...
        pip install pyinstaller
        set "PYINSTALLER_EXE=pyinstaller"
    )
)

echo [*] Using PyInstaller: %PYINSTALLER_EXE%

:: Clean up previous builds
if exist "build" rmdir /s /q "build"
if exist "dist" rmdir /s /q "dist"
if exist "TallyConnector.spec" del /f /q "TallyConnector.spec"

echo [*] Compiling standalone --onefile executable...
"%PYINSTALLER_EXE%" --onefile --clean --name="TallyConnector" --icon=NONE tally_connector.py

if not exist "dist\TallyConnector.exe" (
    echo [✗] Build FAILED! dist\TallyConnector.exe was not created.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo Build complete! Executable is ready:
echo dist\TallyConnector.exe
echo ========================================================
pause
