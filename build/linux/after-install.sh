#!/bin/bash

# Fix Chrome sandbox permissions for Electron apps on Linux
# This is required for the sandbox to work properly on Ubuntu/Debian systems

CHROME_SANDBOX="/opt/Assembly-Notes/chrome-sandbox"
EXECUTABLE="/opt/Assembly-Notes/assembly-notes"

# Fix chrome-sandbox permissions
if [ -f "$CHROME_SANDBOX" ]; then
    echo "Setting chrome-sandbox permissions..."
    # Ensure proper ownership and permissions
    chown root:root "$CHROME_SANDBOX" || echo "Warning: Could not change chrome-sandbox ownership"
    chmod 4755 "$CHROME_SANDBOX" || echo "Warning: Could not set chrome-sandbox permissions"
fi

# Create symlink for command-line access
if [ -f "$EXECUTABLE" ]; then
    echo "Creating command-line symlink..."
    ln -sf "$EXECUTABLE" "/usr/bin/assembly-notes" 2>/dev/null || echo "Warning: Could not create /usr/bin symlink"
fi

# Create desktop file symlink for easier access
if [ ! -f "/usr/share/applications/assembly-notes.desktop" ]; then
    ln -s "/opt/Assembly-Notes/assembly-notes.desktop" "/usr/share/applications/assembly-notes.desktop" 2>/dev/null || true
fi

# Update desktop database
update-desktop-database 2>/dev/null || true