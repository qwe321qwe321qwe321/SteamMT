##############################################################################
# SteamMT Chrome Extension Installer (Windows)
#
# This script:
#   1. Copies the extension to a permanent location
#   2. Detects Chrome profiles and lists them
#   3. Opens Chrome to chrome://extensions for easy loading
##############################################################################

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$extensionSrc = Join-Path $scriptDir "chrome-extension"

# Where to install the extension permanently
$installDir = Join-Path $env:LOCALAPPDATA "SteamMT\chrome-extension"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SteamMT Chrome Extension Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---------- Step 1: Validate source ----------
if (-not (Test-Path (Join-Path $extensionSrc "manifest.json"))) {
    Write-Host "[ERROR] Cannot find chrome-extension/manifest.json" -ForegroundColor Red
    Write-Host "        Make sure you run this script from the SteamMT repository root." -ForegroundColor Red
    exit 1
}

# ---------- Step 2: Copy extension to permanent location ----------
Write-Host "[1/3] Copying extension files..." -ForegroundColor Yellow

if (Test-Path $installDir) {
    Remove-Item $installDir -Recurse -Force
}
Copy-Item $extensionSrc $installDir -Recurse -Force

Write-Host "      Installed to: $installDir" -ForegroundColor Green
Write-Host ""

# ---------- Step 3: Detect Chrome profiles ----------
Write-Host "[2/3] Detecting Chrome profiles..." -ForegroundColor Yellow

$chromeUserDataDir = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data"

if (Test-Path $chromeUserDataDir) {
    # Read Local State JSON to get profile names
    $localStatePath = Join-Path $chromeUserDataDir "Local State"
    $profiles = @()

    if (Test-Path $localStatePath) {
        try {
            $localState = Get-Content $localStatePath -Raw | ConvertFrom-Json
            $profileInfoMap = $localState.profile.info_cache

            foreach ($prop in $profileInfoMap.PSObject.Properties) {
                $dirName = $prop.Name
                $displayName = $prop.Value.name
                $profilePath = Join-Path $chromeUserDataDir $dirName

                if (Test-Path $profilePath) {
                    $profiles += [PSCustomObject]@{
                        Directory   = $dirName
                        DisplayName = $displayName
                        FullPath    = $profilePath
                    }
                }
            }
        } catch {
            Write-Host "      Could not parse profile data, falling back to directory scan." -ForegroundColor DarkYellow
        }
    }

    # Fallback: scan for profile directories
    if ($profiles.Count -eq 0) {
        $defaultProfile = Join-Path $chromeUserDataDir "Default"
        if (Test-Path $defaultProfile) {
            $profiles += [PSCustomObject]@{
                Directory   = "Default"
                DisplayName = "Default"
                FullPath    = $defaultProfile
            }
        }
        Get-ChildItem $chromeUserDataDir -Directory -Filter "Profile *" | ForEach-Object {
            $profiles += [PSCustomObject]@{
                Directory   = $_.Name
                DisplayName = $_.Name
                FullPath    = $_.FullName
            }
        }
    }

    if ($profiles.Count -gt 0) {
        Write-Host ""
        Write-Host "      Found $($profiles.Count) Chrome profile(s):" -ForegroundColor Green
        Write-Host ""
        for ($i = 0; $i -lt $profiles.Count; $i++) {
            $p = $profiles[$i]
            $marker = ""
            # Check if extension is already loaded in this profile
            $extDir = Join-Path $p.FullPath "Extensions"
            Write-Host "        [$($i+1)] $($p.DisplayName) ($($p.Directory))" -ForegroundColor White
        }
        Write-Host ""
    } else {
        Write-Host "      No Chrome profiles found." -ForegroundColor DarkYellow
    }
} else {
    Write-Host "      Chrome user data directory not found." -ForegroundColor DarkYellow
    Write-Host "      Expected: $chromeUserDataDir" -ForegroundColor DarkYellow
}

# ---------- Step 4: Open Chrome extensions page ----------
Write-Host "[3/3] Opening Chrome extensions page..." -ForegroundColor Yellow
Write-Host ""

# Find Chrome executable
$chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chromeExe = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromeExe = $path
        break
    }
}

if ($chromeExe) {
    Start-Process $chromeExe "chrome://extensions"
} else {
    Write-Host "      Could not find Chrome. Please open Chrome manually." -ForegroundColor DarkYellow
}

# ---------- Instructions ----------
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Almost done! Follow these steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host '  1. Enable "Developer mode" (toggle in the top-right corner)' -ForegroundColor White
Write-Host '  2. Click "Load unpacked"' -ForegroundColor White
Write-Host "  3. Select this folder:" -ForegroundColor White
Write-Host "     $installDir" -ForegroundColor Green
Write-Host ""
Write-Host "  NOTE: Do NOT delete the folder above — Chrome needs it" -ForegroundColor Yellow
Write-Host "        to keep the extension working." -ForegroundColor Yellow
Write-Host ""

# Copy path to clipboard for convenience
$installDir | Set-Clipboard
Write-Host "  (The path has been copied to your clipboard)" -ForegroundColor DarkGray
Write-Host ""
