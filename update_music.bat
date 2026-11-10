
@echo off
cd /d "%~dp0"

echo ========================================
echo   Project SEKAI Music Data Update
echo ========================================
echo.

echo [1/2] Refreshing Excel data...

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0refresh_excel.ps1"

if errorlevel 1 (
    echo.
    echo ERROR: Excel refresh failed.
    echo JSON generation was cancelled.
    pause
    exit /b 1
)

echo.
echo [2/2] Generating music_auto.json...

node "%~dp0excel_to_json.js" "%~dp0prsk_music_list.xlsx"

if errorlevel 1 (
    echo.
    echo ERROR: JSON generation failed.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Update completed successfully!
echo ========================================
echo.

pause

