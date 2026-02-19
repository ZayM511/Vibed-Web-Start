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
New-Item -ItemType Directory -Path "temp-build\src" | Out-Null
New-Item -ItemType Directory -Path "temp-build\src\lib" | Out-Null

Write-Host "[3/4] Copying files..." -ForegroundColor Yellow

# Root files
Copy-Item "manifest.json" -Destination "temp-build\" -Force
Copy-Item "popup-v2.html" -Destination "temp-build\" -Force
if (Test-Path "settings.html") {
    Copy-Item "settings.html" -Destination "temp-build\" -Force
}

# Active source files only (no backups, old versions, or dead code)
$activeSourceFiles = @(
    "background.js",
    "content-linkedin-v3.js",
    "content-indeed-v3.js",
    "content-google-jobs.js",
    "ghost-detection-bundle.js",
    "linkedin-feature-flags.js",
    "linkedin-job-cache.js",
    "linkedin-badge-manager.js",
    "linkedin-api-interceptor.js",
    "indeed-mosaic-extractor.js",
    "popup-v2.js",
    "settings.js"
)

foreach ($file in $activeSourceFiles) {
    if (Test-Path "src\$file") {
        Copy-Item "src\$file" -Destination "temp-build\src\" -Force
        Write-Host "  + src\$file" -ForegroundColor DarkGray
    } else {
        Write-Host "  ! Missing: src\$file" -ForegroundColor Red
    }
}

# Bundled libraries
if (Test-Path "src\lib\chart.umd.min.js") {
    Copy-Item "src\lib\chart.umd.min.js" -Destination "temp-build\src\lib\" -Force
    Write-Host "  + src\lib\chart.umd.min.js" -ForegroundColor DarkGray
}

# Styles
Copy-Item "styles" -Destination "temp-build\styles" -Recurse -Force
Write-Host "  + styles\" -ForegroundColor DarkGray

# Icons
Copy-Item "icons" -Destination "temp-build\icons" -Recurse -Force
Write-Host "  + icons\" -ForegroundColor DarkGray

# Fonts
if (Test-Path "fonts") {
    Copy-Item "fonts" -Destination "temp-build\fonts" -Recurse -Force
    Write-Host "  + fonts\" -ForegroundColor DarkGray
}

Write-Host "[4/4] Creating ZIP package..." -ForegroundColor Yellow
Compress-Archive -Path "temp-build\*" -DestinationPath "dist\jobfiltr-extension.zip" -Force

# Clean up
Remove-Item "temp-build" -Recurse -Force

# Show package info
$zipSize = (Get-Item "dist\jobfiltr-extension.zip").Length
$zipSizeKB = [math]::Round($zipSize / 1024, 1)
$zipSizeMB = [math]::Round($zipSize / 1024 / 1024, 2)

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "   Build Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host "Package: dist\jobfiltr-extension.zip" -ForegroundColor White
Write-Host "Size: $zipSizeKB KB ($zipSizeMB MB)" -ForegroundColor White
Write-Host ""
Write-Host "Files included:" -ForegroundColor Yellow
Write-Host "  - manifest.json (root)" -ForegroundColor White
Write-Host "  - popup-v2.html, settings.html" -ForegroundColor White
Write-Host "  - $($activeSourceFiles.Count) active source files" -ForegroundColor White
Write-Host "  - Bundled Chart.js library" -ForegroundColor White
Write-Host "  - Styles, Icons, Fonts" -ForegroundColor White
Write-Host ""
Write-Host "Chrome Web Store submission ready!" -ForegroundColor Cyan
Write-Host ""
