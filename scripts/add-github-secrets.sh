#!/bin/bash

# Script to add PostHog secrets to GitHub repository
# You need to have GitHub CLI (gh) installed and authenticated

echo "Adding PostHog secrets to GitHub repository..."

# PostHog configuration from .env file
POSTHOG_KEY="phc_5oU45hfTNeqID7gvlrbxvQF3WZMDSLhoZzYvd45ZsBt"
POSTHOG_HOST="https://us.i.posthog.com"

# Add secrets to GitHub
echo "Adding VITE_PUBLIC_POSTHOG_KEY..."
gh secret set VITE_PUBLIC_POSTHOG_KEY --body "$POSTHOG_KEY"

echo "Adding VITE_PUBLIC_POSTHOG_HOST..."
gh secret set VITE_PUBLIC_POSTHOG_HOST --body "$POSTHOG_HOST"

echo "Done! Secrets have been added to your GitHub repository."
echo ""
echo "You can verify the secrets were added by visiting:"
echo "https://github.com/alexkroman/assembly-notes/settings/secrets/actions"
echo ""
echo "The following secrets should now be present:"
echo "  - VITE_PUBLIC_POSTHOG_KEY"
echo "  - VITE_PUBLIC_POSTHOG_HOST"