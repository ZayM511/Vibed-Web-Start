@echo off
echo ============================================
echo   Launching YOUR Chrome with Debug Mode
echo ============================================
echo.
echo IMPORTANT: Close ALL Chrome windows first!
echo (Check Task Manager for any chrome.exe processes)
echo.
echo This will open YOUR real Chrome with your
echo existing logins, cookies, and the extension.
echo.
pause

echo.
echo Starting Chrome with remote debugging...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --load-extension="%~dp0chrome-extension" ^
  https://www.indeed.com/jobs?q=software+engineer

echo.
echo ============================================
echo   Chrome launched successfully!
echo ============================================
echo.
echo Your Chrome opened with:
echo   - Remote debugging on port 9222
echo   - JobFiltr extension loaded
echo   - Indeed job search page
echo.
echo NOW: Login to Indeed if needed, then tell Claude!
echo.
pause
