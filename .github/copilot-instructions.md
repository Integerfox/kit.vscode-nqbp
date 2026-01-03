# VS Code Extension Project Setup

## Project Overview
A TypeScript VS Code extension that:
1. Adds a context menu item to the Explorer view for files/directories
2. Generates a temporary file with 5 lines, shows them in a QuickPick dropdown, and echoes the selected line in a terminal
3. Automatically runs `env.sh` (Linux/Mac) or `env.bat` (Windows) when opening new terminals (if present in workspace root)

Note: env.sh and env.bat are NOT part of the extension - they are provided by workspaces using the extension.

## Setup Progress

- [x] Create copilot-instructions.md
- [x] Get project setup info
- [x] Scaffold extension project
- [x] Implement context menu feature
- [ ] Install dependencies and compile
- [ ] Test the extension

## Installation Required

**Node.js and npm need to be installed to continue.**

To install on Ubuntu/Debian:
```bash
sudo apt install nodejs npm
```

After installation, run:
```bash
npm install
npm run compile
```

Then press F5 to launch the extension in debug mode.
