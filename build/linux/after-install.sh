#!/bin/bash

# Fix Chrome sandbox permissions for Electron apps on Linux
# This is required for the sandbox to work properly on Ubuntu/Debian systems

CHROME_SANDBOX="/opt/Assembly-Notes/chrome-sandbox"

if [ -f "$CHROME_SANDBOX" ]; then
    # Set the suid bit on chrome-sandbox
    chmod 4755 "$CHROME_SANDBOX"
    
    # Ensure proper ownership
    chown root:root "$CHROME_SANDBOX"
fi

# Create desktop file symlink for easier access
if [ ! -f "/usr/share/applications/assembly-notes.desktop" ]; then
    ln -s "/opt/Assembly-Notes/assembly-notes.desktop" "/usr/share/applications/assembly-notes.desktop" 2>/dev/null || true
fi

# Update desktop database
update-desktop-database 2>/dev/null || true