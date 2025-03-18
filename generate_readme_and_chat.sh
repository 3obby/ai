#!/bin/bash

# Run the README generator
node app/usergroupchatcontext/utils/generateReadme.js

# Open a new Cursor chat
# This uses the keyboard shortcut method as a fallback
osascript -e 'tell application "System Events" to keystroke "k" using {command down}' 