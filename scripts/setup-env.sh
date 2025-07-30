#!/bin/bash

# Setup script for environment variables
# Usage: ./scripts/setup-env.sh

echo "Setting up environment variables for Assembly Notes..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Apple Notarization Credentials
# Fill in your actual values below
APPLE_ID=your-apple-id@example.com
APPLE_APP_SPECIFIC_PASSWORD=your-app-specific-password
APPLE_TEAM_ID=your-team-id
CSC_LINK=path/to/your/certificate.p12
CSC_KEY_PASSWORD=your-certificate-password

# Development Environment Variables
FRESH_MODE=false
FRESH_ID=
EOF
    echo "✅ Created .env file"
    echo "📝 Please edit .env with your actual values"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "To use notarized builds:"
echo "1. Edit .env with your Apple credentials"
echo "2. Run: npm run build:mac:notarized"
echo ""
echo "To use regular builds:"
echo "Run: npm run build:mac" 