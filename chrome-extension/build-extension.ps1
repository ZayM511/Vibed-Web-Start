# JobFiltr Extension Builder (PowerShell)

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   JobFiltr Extension Builder" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Create dist directory
if (!(Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist" | Out-Null
}

Write-Host "[1/4] Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist\jobfiltr-extension.zip") {
    Remove-Item "dist\jobfiltr-extension.zip" -Force
}

Write-Host "[2/4] Creating package structure..." -ForegroundColor Yellow
if (Test-Path "temp-build") {
    Remove-Item "temp-build" -Recurse -Force
}
New-Item -ItemType Directory -Path "temp-build" | Out-Null

Write-Host "[3/4] Copying files..." -ForegroundColor Yellow
Copy-Item "src" -Destination "temp-build\src" -Recurse -Force
Copy-Item "styles" -Destination "temp-build\styles" -Recurse -Force
Copy-Item "icons" -Destination "temp-build\icons" -Recurse -Force
Copy-Item "manifest.json" -Destination "temp-build\" -Force
Copy-Item "popup-v2.html" -Destination "temp-build\" -Force
if (Test-Path "settings.html") {
    Copy-Item "settings.html" -Destination "temp-build\" -Force
}

Write-Host "[4/4] Creating ZIP package..." -ForegroundColor Yellow
Compress-Archive -Path "temp-build\*" -DestinationPath "dist\jobfiltr-extension.zip" -Force

# Clean up
Remove-Item "temp-build" -Recurse -Force

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "   Build Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host "Package created: dist\jobfiltr-extension.zip" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Extract the ZIP file" -ForegroundColor White
Write-Host "2. Go to chrome://extensions/" -ForegroundColor White
Write-Host "3. Enable 'Developer mode'" -ForegroundColor White
Write-Host "4. Click 'Load unpacked' and select the extracted folder" -ForegroundColor White
Write-Host ""
