#!/bin/bash

# Build script for notarized macOS builds
# Usage: ./scripts/build-mac-notarized.sh

set -e

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo "Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

# Check if required environment variables are set
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
    echo "Error: Required environment variables not set."
    echo "Please set the following variables:"
    echo "  APPLE_ID"
    echo "  APPLE_APP_SPECIFIC_PASSWORD"
    echo "  APPLE_TEAM_ID"
    echo "  CSC_LINK (optional, for code signing)"
    echo "  CSC_KEY_PASSWORD (optional, for code signing)"
    exit 1
fi

echo "Building notarized macOS app..."

# Build the app
npm run build:all
npm run build-icons

# Build with electron-builder
electron-builder --mac --publish=never

echo "✅ Notarized build complete!" 