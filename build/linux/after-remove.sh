#!/bin/bash

# Clean up after uninstallation

# Remove desktop file symlink
if [ -L "/usr/share/applications/assembly-notes.desktop" ]; then
    rm -f "/usr/share/applications/assembly-notes.desktop"
fi

# Update desktop database
update-desktop-database 2>/dev/null || true