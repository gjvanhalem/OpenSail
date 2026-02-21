# OpenSail Windows Quick Start Script
# Run this script in PowerShell to check your Windows setup

Write-Host "`n=== OpenSail Windows Setup Checker ===" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found. Install from https://nodejs.org/" -ForegroundColor Red
    $hasErrors = $true
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "  ✓ npm installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ npm not found" -ForegroundColor Red
    $hasErrors = $true
}

# Check Java
Write-Host "Checking Java..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "  ✓ Java installed: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Java not found. Install JDK 17 from https://adoptium.net/" -ForegroundColor Red
    $hasErrors = $true
}

# Check ANDROID_HOME
Write-Host "Checking ANDROID_HOME..." -ForegroundColor Yellow
$androidHome = [System.Environment]::GetEnvironmentVariable('ANDROID_HOME', 'User')
if ($androidHome) {
    Write-Host "  ✓ ANDROID_HOME set: $androidHome" -ForegroundColor Green
    
    # Check if SDK exists
    if (Test-Path $androidHome) {
        Write-Host "  ✓ Android SDK found" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Android SDK path doesn't exist" -ForegroundColor Red
        $hasErrors = $true
    }
} else {
    Write-Host "  ✗ ANDROID_HOME not set. Install Android Studio and set environment variable" -ForegroundColor Red
    $hasErrors = $true
}

# Check adb
Write-Host "Checking adb..." -ForegroundColor Yellow
try {
    $adbVersion = adb version 2>&1 | Select-String "Android Debug Bridge"
    Write-Host "  ✓ adb installed: $adbVersion" -ForegroundColor Green
    
    # Check for connected devices
    $devices = adb devices | Select-String "device$"
    if ($devices) {
        Write-Host "  ✓ Android device/emulator connected" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ No Android devices connected. Start an emulator or connect a device" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ adb not found. Make sure Android SDK platform-tools is in PATH" -ForegroundColor Red
    $hasErrors = $true
}

# Check if node_modules exists
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Dependencies not installed. Run: npm install" -ForegroundColor Yellow
}

# Check if native folders exist
Write-Host "Checking native folders..." -ForegroundColor Yellow
$androidExists = Test-Path "android"
$iosExists = Test-Path "ios"

if ($androidExists) {
    Write-Host "  ✓ android/ folder exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠ android/ folder missing. Run: npm run setup-native" -ForegroundColor Yellow
}

if ($iosExists) {
    Write-Host "  ✓ ios/ folder exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠ ios/ folder missing (not needed for Windows)" -ForegroundColor Gray
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($hasErrors) {
    Write-Host "Some requirements are missing. Please install them and try again." -ForegroundColor Red
    Write-Host "See WINDOWS_SETUP.md for detailed instructions." -ForegroundColor Yellow
} else {
    Write-Host "✓ All requirements met!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. npm install              (if not done)" -ForegroundColor White
    Write-Host "  2. npm run setup-native     (if android/ folder missing)" -ForegroundColor White
    Write-Host "  3. Start Android emulator   (from Android Studio)" -ForegroundColor White
    Write-Host "  4. npm start                (in one terminal)" -ForegroundColor White
    Write-Host "  5. npm run android          (in another terminal)" -ForegroundColor White
}

Write-Host ""
