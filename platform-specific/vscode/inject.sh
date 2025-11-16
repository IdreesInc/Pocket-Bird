#!/bin/bash
# my-vscode
export NODE_OPTIONS="--require /Users/idrees/Documents/Programs/JavaScript/Birb/platform-specific/vscode/patch.js"
"/Applications/Visual Studio Code.app/Contents/MacOS/Electron" \
  "$@"