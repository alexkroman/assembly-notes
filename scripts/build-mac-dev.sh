#!/bin/bash

# Build script for non-notarized macOS builds (development/testing)
# Usage: ./scripts/build-mac-dev.sh

set -e

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo "Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

echo "Building non-notarized macOS app for development/testing..."

# Build the app
npm run build:all
npm run build-icons

# Build with electron-builder (non-notarized)
electron-builder --mac --publish=never --config.mac.notarize=false

echo "✅ Non-notarized build complete!"