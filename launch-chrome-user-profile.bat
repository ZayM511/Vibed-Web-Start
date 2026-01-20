@echo off
echo ============================================
echo   Launching Chrome with YOUR Profile
echo ============================================
echo.
echo IMPORTANT: Close ALL other Chrome windows first!
echo (Check Task Manager for any chrome.exe processes)
echo.
pause

echo.
echo Starting Chrome with your profile and extension...
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
echo   - YOUR logged-in profile (cookies, sessions)
echo   - Remote debugging on port 9222
echo   - JobFiltr extension loaded
echo   - Indeed job search page
echo.
echo NOW: Navigate to a job posting and test the Scanner!
echo.
pause
