@echo off
REM JobFiltr Chrome Extension Packaging Script for Windows
REM This script packages the extension into a ZIP file for distribution

echo ===================================
echo JobFiltr Extension Packager
echo ===================================
echo.

REM Set variables
set EXTENSION_NAME=jobfiltr-extension
set VERSION=1.0.0
set OUTPUT_DIR=..\public
set TEMP_DIR=temp_package

REM Create output directory if it doesn't exist
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM Create temporary directory
echo Creating temporary packaging directory...
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

REM Copy extension files
echo Copying extension files...
copy manifest.json "%TEMP_DIR%\" >nul
copy popup.html "%TEMP_DIR%\" >nul
copy README.md "%TEMP_DIR%\" >nul
xcopy /E /I /Y src "%TEMP_DIR%\src" >nul
xcopy /E /I /Y styles "%TEMP_DIR%\styles" >nul
xcopy /E /I /Y icons "%TEMP_DIR%\icons" >nul

REM Create ZIP file (requires PowerShell)
echo Creating ZIP archive...
set ZIP_NAME=%EXTENSION_NAME%-v%VERSION%.zip
powershell -command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%OUTPUT_DIR%\%ZIP_NAME%' -Force"

REM Create a copy named chrome-extension.zip for the download button
copy "%OUTPUT_DIR%\%ZIP_NAME%" "%OUTPUT_DIR%\chrome-extension.zip" >nul

REM Clean up
echo Cleaning up temporary files...
rmdir /s /q "%TEMP_DIR%"

echo.
echo ===================================
echo Extension packaged successfully!
echo ===================================
echo.
echo Output files:
echo   - %OUTPUT_DIR%\%ZIP_NAME%
echo   - %OUTPUT_DIR%\chrome-extension.zip
echo.
echo To install the extension:
echo   1. Unzip the file
echo   2. Open Chrome and go to chrome://extensions/
echo   3. Enable 'Developer mode'
echo   4. Click 'Load unpacked'
echo   5. Select the unzipped folder
echo.
pause
