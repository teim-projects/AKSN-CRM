@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo Building Tally Connector Windows Executable (.exe)
echo ========================================================

:: Check for PyInstaller in backend venv or .venv
set "PYINSTALLER_EXE=..\crm-project-backend\venv\Scripts\pyinstaller.exe"
if not exist "%PYINSTALLER_EXE%" set "PYINSTALLER_EXE=..\crm-project-backend\.venv\Scripts\pyinstaller.exe"

if not exist "%PYINSTALLER_EXE%" (
    where pyinstaller >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set "PYINSTALLER_EXE=pyinstaller"
    ) else (
        echo [!] PyInstaller not found in backend venv. Attempting pip install into backend venv...
        if exist "..\crm-project-backend\venv\Scripts\python.exe" (
            ..\crm-project-backend\venv\Scripts\python.exe -m pip install pyinstaller
            set "PYINSTALLER_EXE=..\crm-project-backend\venv\Scripts\pyinstaller.exe"
        ) else (
            pip install pyinstaller
            set "PYINSTALLER_EXE=pyinstaller"
        )
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
echo [*] Copying built executable to frontend assets...
if exist "..\crm-project-frontend\public\connector" (
    copy /y "dist\TallyConnector.exe" "..\crm-project-frontend\public\connector\TallyConnector.exe"
    copy /y "tally_connector.py" "..\crm-project-frontend\public\connector\tally_connector.py"
    echo [✓] Copied to crm-project-frontend\public\connector\
)
if exist "..\crm-project-frontend\dist\connector" (
    copy /y "dist\TallyConnector.exe" "..\crm-project-frontend\dist\connector\TallyConnector.exe"
    copy /y "tally_connector.py" "..\crm-project-frontend\dist\connector\tally_connector.py"
    echo [✓] Copied to crm-project-frontend\dist\connector\
)

echo.
echo ========================================================
echo Build complete! Executable is ready:
echo dist\TallyConnector.exe
echo ========================================================
pause
