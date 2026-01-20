# Launch Chrome with remote debugging
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$userDataDir = "$env:LOCALAPPDATA\Google\Chrome\User Data"
$extensionPath = "C:\Users\isaia\OneDrive\Documents\2025 Docs\Claude Copy\Vibed-Web-Start-1\chrome-extension"

# Kill existing Chrome
Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Launch Chrome with remote debugging
& $chromePath `
    --user-data-dir="$userDataDir" `
    --profile-directory="Default" `
    --remote-debugging-port=9222 `
    --load-extension="$extensionPath" `
    --start-maximized `
    "https://www.linkedin.com/jobs/search/?keywords=software%20engineer"

Write-Host "Chrome launched with remote debugging on port 9222"
