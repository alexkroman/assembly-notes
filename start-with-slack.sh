#!/bin/bash

# Assembly Notes - Start with Slack Integration
# Usage: ./start-with-slack.sh

# Set your Slack credentials here
export SLACK_CLIENT_ID="YOUR_SLACK_CLIENT_ID_HERE"
export SLACK_CLIENT_SECRET="YOUR_SLACK_CLIENT_SECRET_HERE"

# Check if credentials are set
if [ "$SLACK_CLIENT_ID" = "YOUR_SLACK_CLIENT_ID_HERE" ] || [ "$SLACK_CLIENT_SECRET" = "YOUR_SLACK_CLIENT_SECRET_HERE" ]; then
    echo "❌ Please edit this script and add your actual Slack credentials"
    echo "Get them from: https://api.slack.com/apps"
    exit 1
fi

echo "🚀 Starting Assembly Notes with Slack integration..."
echo "📱 Client ID: ${SLACK_CLIENT_ID:0:20}..."

# Build and start the app
npm run build:all && cross-env DEV_MODE=true SLACK_CLIENT_ID="$SLACK_CLIENT_ID" SLACK_CLIENT_SECRET="$SLACK_CLIENT_SECRET" electron .