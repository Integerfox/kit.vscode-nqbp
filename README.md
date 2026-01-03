# NQBP Integration Extension

This extension adds NQBP build system integration to VS Code.

## Features

- **NQBP Build Selection** - Right-click files/folders in Explorer to select NQBP build configuration
- **Automatic environment setup** - Every new terminal automatically runs `env.sh` (Linux/Mac) or `env.bat` (Windows)

## Requirements

- [NQBP2 1.1.1](https://github.com/johnttaylor/nqbp2) or higher
  - Note: The extension make use of the `sancho.py` script that is
          contained in the NQBP repository.
- Your local repo uses the NQBP2 build system and has `env.sh` or `env.bat`
  scripts in the repo root.  These scripts are responsible for configuring
  the compiler toolchain environment.  Example repos that use NQBP
  - [kit.core](https://github.com/Integerfox/kit.core)
  - [epc](https://github.com/johnttaylor/epc)

- VS Code 1.85.0 or higher

## Usage

### NQBP Build Selection

1. Right-click on any file or directory in the Explorer
2. Select "Select NQBP Build..." from the context menu
3. A QuickPick dropdown appears list of NQBP build directories. The most
   *relevant* build directories are listed first.
4. When a build directory is selected, VSCode is *configured* for the selected
   NQBP build project.  This includes tasks such as:
   - Updating the `compiler_flags.txt` for the Clangd language server
     - And then restarts the Clangd language server
   - Creating GDB debugger configurations for the build project

### Customization

You can customize the behavior extension via the file `.nqbp-configuration.json`
stored in the root of your repository.  It recommended that this file be checked
into your repository, i.e. is *shared* by all developers using the repository.
The extension provides a default configuration file is configure for use by the
[kit.core](https://github.com/Integerfox/kit.core) repository.  Below is example file:

```json
{
    "active-projects": [
        "projects/MyProject"
    ],
    "exclude-list": [
        "xpkgs"
    ],
    "build-naming": [
        {
            "windows": {
                "msvc": 1,
                "clang-host": 3,
                "gcc-arm-mcu": 5
            }
        },
        {
            "linux": {
                "gcc-host": 1,
                "gcc-arm-mcu": 2
            }
        }
    ]
}
```
