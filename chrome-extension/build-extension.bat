@echo off
echo ====================================
echo   JobFiltr Extension Builder
echo ====================================
echo.

REM Check if zip is available
where zip >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: 'zip' command not found. Please install zip utility.
    echo You can install it via: winget install GnuWin32.Zip
    pause
    exit /b 1
)

REM Create dist directory if it doesn't exist
if not exist "dist" mkdir dist

echo [1/4] Cleaning previous builds...
if exist "dist\jobfiltr-extension.zip" del "dist\jobfiltr-extension.zip"

echo [2/4] Creating package structure...

REM Create temporary build directory
if exist "temp-build" rmdir /s /q "temp-build"
mkdir temp-build

REM Copy necessary files
echo [3/4] Copying files...
xcopy /E /I /Y "src" "temp-build\src"
xcopy /E /I /Y "styles" "temp-build\styles"
xcopy /E /I /Y "icons" "temp-build\icons"
copy /Y "manifest.json" "temp-build\"
copy /Y "popup-v2.html" "temp-build\"
copy /Y "settings.html" "temp-build\" 2>nul

REM Create ZIP package
echo [4/4] Creating ZIP package...
cd temp-build
zip -r ..\dist\jobfiltr-extension.zip * -x "*.DS_Store" "*__MACOSX*" "*.git*"
cd ..

REM Clean up temp directory
rmdir /s /q "temp-build"

echo.
echo ====================================
echo   Build Complete!
echo ====================================
echo Package created: dist\jobfiltr-extension.zip
echo.
echo Next steps:
echo 1. Go to chrome://extensions/
echo 2. Enable "Developer mode"
echo 3. Click "Load unpacked" and select the chrome-extension folder
echo    OR
echo 4. Drag and drop the ZIP file (after extracting)
echo.
pause
