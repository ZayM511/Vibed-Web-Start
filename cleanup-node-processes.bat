@echo off
echo Cleaning up orphaned Node.js processes...
taskkill //F //IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Successfully cleaned up Node.js processes
) else (
    echo No Node.js processes to clean up
)
pause
