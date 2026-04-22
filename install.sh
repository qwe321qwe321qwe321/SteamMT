#!/bin/bash
##############################################################################
# SteamMT Chrome Extension Installer (macOS)
#
# This script:
#   1. Copies the extension to a permanent location
#   2. Detects Chrome profiles and lists them
#   3. Opens Chrome to chrome://extensions for easy loading
##############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXTENSION_SRC="$SCRIPT_DIR/chrome-extension"
INSTALL_DIR="$HOME/Library/Application Support/SteamMT/chrome-extension"

echo ""
echo "========================================"
echo "  SteamMT Chrome Extension Installer"
echo "========================================"
echo ""

# ---------- Step 1: Validate source ----------
if [ ! -f "$EXTENSION_SRC/manifest.json" ]; then
    echo "[ERROR] Cannot find chrome-extension/manifest.json"
    echo "        Make sure you run this script from the SteamMT repository root."
    exit 1
fi

# ---------- Step 2: Copy extension to permanent location ----------
echo "[1/3] Copying extension files..."

if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
fi
mkdir -p "$(dirname "$INSTALL_DIR")"
cp -R "$EXTENSION_SRC" "$INSTALL_DIR"

echo "      Installed to: $INSTALL_DIR"
echo ""

# ---------- Step 3: Detect Chrome profiles ----------
echo "[2/3] Detecting Chrome profiles..."

CHROME_USER_DATA="$HOME/Library/Application Support/Google/Chrome"
LOCAL_STATE="$CHROME_USER_DATA/Local State"

if [ -d "$CHROME_USER_DATA" ]; then
    if [ -f "$LOCAL_STATE" ] && command -v python3 &>/dev/null; then
        # Use python3 to parse JSON (available by default on macOS)
        PROFILE_INFO=$(python3 -c "
import json, os, sys
try:
    with open(sys.argv[1], 'r') as f:
        data = json.load(f)
    profiles = data.get('profile', {}).get('info_cache', {})
    for dir_name, info in profiles.items():
        full_path = os.path.join(sys.argv[2], dir_name)
        if os.path.isdir(full_path):
            display_name = info.get('name', dir_name)
            print(f'{dir_name}\t{display_name}')
except Exception:
    pass
" "$LOCAL_STATE" "$CHROME_USER_DATA" 2>/dev/null)

        if [ -n "$PROFILE_INFO" ]; then
            PROFILE_COUNT=$(echo "$PROFILE_INFO" | wc -l | tr -d ' ')
            echo ""
            echo "      Found $PROFILE_COUNT Chrome profile(s):"
            echo ""
            INDEX=1
            while IFS=$'\t' read -r dir_name display_name; do
                echo "        [$INDEX] $display_name ($dir_name)"
                INDEX=$((INDEX + 1))
            done <<< "$PROFILE_INFO"
            echo ""
        else
            echo "      No Chrome profiles found."
        fi
    else
        # Fallback: check for Default and Profile directories
        echo ""
        INDEX=1
        if [ -d "$CHROME_USER_DATA/Default" ]; then
            echo "        [$INDEX] Default"
            INDEX=$((INDEX + 1))
        fi
        for profile_dir in "$CHROME_USER_DATA"/Profile\ *; do
            if [ -d "$profile_dir" ]; then
                echo "        [$INDEX] $(basename "$profile_dir")"
                INDEX=$((INDEX + 1))
            fi
        done
        echo ""
    fi
else
    echo "      Chrome user data directory not found."
    echo "      Expected: $CHROME_USER_DATA"
fi

# ---------- Step 4: Open Chrome extensions page ----------
echo "[3/3] Opening Chrome extensions page..."
echo ""

CHROME_APP="/Applications/Google Chrome.app"
if [ -d "$CHROME_APP" ]; then
    open -a "Google Chrome" "chrome://extensions"
else
    echo "      Could not find Chrome. Please open Chrome manually."
fi

# ---------- Instructions ----------
echo "========================================"
echo "  Almost done! Follow these steps:"
echo "========================================"
echo ""
echo '  1. Enable "Developer mode" (toggle in the top-right corner)'
echo '  2. Click "Load unpacked"'
echo "  3. Select this folder:"
echo "     $INSTALL_DIR"
echo ""
echo "  NOTE: Do NOT delete the folder above — Chrome needs it"
echo "        to keep the extension working."
echo ""

# Copy path to clipboard for convenience
if command -v pbcopy &>/dev/null; then
    echo -n "$INSTALL_DIR" | pbcopy
    echo "  (The path has been copied to your clipboard)"
    echo ""
fi
