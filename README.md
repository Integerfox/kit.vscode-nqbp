# NQBP Integration Extension

This extension adds NQBP build system integration to VS Code.

1. Right-click on any file or directory in the Explorer
2. Select "Show Lines" from the context menu
3. A temporary file with 5 lines is generated
4. A QuickPick dropdown appears with the lines
5. Select a line and it will be echoed in the terminal

## Features

- **NQBP Build Selection** - Right-click files/folders in Explorer to select NQBP build configurations
- **Integration with sancho.py** - Automatically discovers build directories and configures compilers
- **Terminal integration** - Executes environment setup with selected build configuration
- **Automatic environment setup** - Every new terminal automatically runs `env.sh` (Linux/Mac) or `env.bat` (Windows)
- **Custom terminal profile** - Launch terminals with pre-configured environment

## Requirements

- VS Code 1.85.0 or higher

## Installation & Development

1. Install Node.js and npm
2. Run `npm install` to install dependencies
3. Run `npm run compile` to compile TypeScript
4. Press F5 to launch the extension in debug mode

## Usage

### NQBP Build Selection
1. Open a workspace in VS Code that contains NQBP projects
2. Right-click any file or folder in the Explorer view
3. Click "Select NQBP Build..." from the context menu
4. Select a build directory from the dropdown (provided by `sancho.py builddirs`)
5. The extension runs `sancho.py compiler` with your selection
6. The compiler output is passed as an argument to `env.sh` or `env.bat`
7. The terminal remains open with the configured build environment

### Environment Configuration
The extension automatically runs environment setup scripts when opening new terminals:
- **Linux/Mac**: Runs `source env.sh` if present in the workspace root
- **Windows**: Runs `call env.bat` if present in the workspace root

To set up automatic environment configuration:
1. Create `env.sh` (Linux/Mac) or `env.bat` (Windows) in your workspace root
2. Add environment variables, PATH modifications, or other setup commands
3. All new terminals will automatically execute this script without arguments

**Example env.sh:**
```bash
#!/bin/bash
export MY_VAR="value"
export PATH="$PATH:/custom/path"
echo "Environment loaded"
```

**Example env.bat:**
```batch
@echo off
set MY_VAR=value
set PATH=%PATH%;C:\custom\path
echo Environment loaded
```
