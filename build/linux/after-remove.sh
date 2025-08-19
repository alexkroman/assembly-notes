#!/bin/bash

# Clean up after uninstallation

# Remove desktop file symlink
if [ -L "/usr/share/applications/assembly-notes.desktop" ]; then
    rm -f "/usr/share/applications/assembly-notes.desktop"
fi

# Remove command-line symlink
if [ -L "/usr/bin/assembly-notes" ]; then
    rm -f "/usr/bin/assembly-notes"
fi

# Update desktop database
update-desktop-database 2>/dev/null || true