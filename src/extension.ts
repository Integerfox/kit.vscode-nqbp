import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
	console.log('Explorer Context Menu extension is now active');

	// Create default .nqbp-configuration.json if it doesn't exist
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (workspaceFolder) {
		const configPath = path.join(workspaceFolder.uri.fsPath, '.nqbp-configuration.json');
		if (!fs.existsSync(configPath)) {
			const defaultConfig = {
				"active-projects": [],
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
			};
			try {
				fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
				console.log('.nqbp-configuration.json created');
			} catch (error) {
				console.error('Failed to create .nqbp-configuration.json:', error);
			}
		}
	}

	// Disable CMake automatic configuration prompt
	const config = vscode.workspace.getConfiguration('cmake');
	if (config.get('configureOnOpen') !== false) {
		config.update('configureOnOpen', false, vscode.ConfigurationTarget.Workspace);
	}

	// Register terminal profile provider
	const terminalProfileProvider = vscode.window.registerTerminalProfileProvider(
		'nqbp-integration.env-terminal',
		{
			provideTerminalProfile(token: vscode.CancellationToken): vscode.ProviderResult<vscode.TerminalProfile> {
				const isWindows = process.platform === 'win32';
				const scriptName = isWindows ? 'env.bat' : 'env.sh';
				
				// Get workspace folder
				const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
				const scriptPath = workspaceFolder ? path.join(workspaceFolder.uri.fsPath, scriptName) : scriptName;

				return new vscode.TerminalProfile({
					name: 'NQBP Terminal',
					shellPath: isWindows ? 'cmd.exe' : '/bin/bash',
					shellArgs: isWindows ? ['/k', scriptPath] : ['-c', `source "${scriptPath}" && exec bash`]
				});
			}
		}
	);
	context.subscriptions.push(terminalProfileProvider);

	// Set NQBP Terminal as the default terminal profile
	// Use a timeout to ensure the profile provider is fully registered
	setTimeout(() => {
		const terminalConfig = vscode.workspace.getConfiguration('terminal.integrated');
		const isWindows = process.platform === 'win32';
		const isMac = process.platform === 'darwin';
		const profileKey = isWindows ? 'defaultProfile.windows' : (isMac ? 'defaultProfile.osx' : 'defaultProfile.linux');
		
		if (terminalConfig.get(profileKey) !== 'NQBP Terminal') {
			terminalConfig.update(profileKey, 'NQBP Terminal', vscode.ConfigurationTarget.Workspace);
		}
	}, 1000);

	// Register the command that will be triggered from the context menu
	let disposable = vscode.commands.registerCommand(
		'nqbp-integration.selectNqbpBuild',
		async (uri: vscode.Uri) => {
			try {
				// Determine the directory path
				const filePath = uri.fsPath;
				const stats = fs.statSync(filePath);
				const dirPath = stats.isDirectory() ? filePath : path.dirname(filePath);

				// Find sancho.py in the workspace
				const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
				if (!workspaceFolder) {
					vscode.window.showErrorMessage('No workspace folder found');
					return;
				}

				const sanchoPath = await findSanchoPy(workspaceFolder.uri.fsPath);
				if (!sanchoPath) {
					vscode.window.showErrorMessage('sancho.py not found in workspace');
					return;
				}

				// Check for env script
				const isWindows = process.platform === 'win32';
				const pythonCmd = isWindows ? 'python' : 'python3';
				const scriptName = isWindows ? 'env.bat' : 'env.sh';
				const scriptPath = path.join(workspaceFolder.uri.fsPath, scriptName);
				
				if (!fs.existsSync(scriptPath)) {
					vscode.window.showErrorMessage(`${scriptName} not found in workspace root`);
					return;
				}

				// Run sancho.py build-dirs <dir> with environment from env.sh/env.bat
				let buildDirsOutput: string;
				try {
					if (isWindows) {
						buildDirsOutput = execSync(`"${scriptPath}" >nul && ${pythonCmd} "${sanchoPath}" build-dirs "${dirPath}"`, {
							encoding: 'utf-8',
							cwd: workspaceFolder.uri.fsPath,
							shell: 'cmd.exe',
							stdio: ['pipe', 'pipe', 'pipe']
						}).trim();
					} else {
						buildDirsOutput = execSync(`source "${scriptPath}" >/dev/null 2>&1 && ${pythonCmd} "${sanchoPath}" build-dirs "${dirPath}"`, {
							encoding: 'utf-8',
							cwd: workspaceFolder.uri.fsPath,
							shell: '/bin/bash',
							stdio: ['pipe', 'pipe', 'pipe']
						}).trim();
					}
				} catch (error: any) {
					const errorMsg = error.stderr || error.stdout || error.message;
					vscode.window.showErrorMessage(`sancho build-dirs failed: ${errorMsg}`);
					return;
				}

				// Parse the output into lines
				const lines = buildDirsOutput.split('\n').filter(line => line.trim() !== '');

				if (lines.length === 0) {
					const showNotifications = vscode.workspace.getConfiguration('nqbp-integration').get('showNotifications', false);
					if (showNotifications) {
						vscode.window.showInformationMessage('No build directories found');
					}
					return;
				}

				// Show QuickPick dropdown with the build directories
				const selectedLine = await vscode.window.showQuickPick(lines, {
					placeHolder: 'Select NQBP build directory'
				});

				if (!selectedLine) {
					return;
				}

				// Trim to remove any trailing newlines/whitespace
				const trimmedLine = selectedLine.trim();

				// Run sancho.py compiler <selected-line> with environment
				let compilerOutput: string;
				try {
					if (isWindows) {
						compilerOutput = execSync(`"${scriptPath}" >nul && ${pythonCmd} "${sanchoPath}" compiler "${trimmedLine}"`, {
							encoding: 'utf-8',
							cwd: workspaceFolder.uri.fsPath,
							shell: 'cmd.exe',
							stdio: ['pipe', 'pipe', 'pipe']
						}).trim();
					} else {
						compilerOutput = execSync(`source "${scriptPath}" >/dev/null 2>&1 && ${pythonCmd} "${sanchoPath}" compiler "${trimmedLine}"`, {
							encoding: 'utf-8',
							cwd: workspaceFolder.uri.fsPath,
							shell: '/bin/bash',
							stdio: ['pipe', 'pipe', 'pipe']
						}).trim();
					}
				} catch (error: any) {
					const errorMsg = error.stderr || error.stdout || error.message;
					vscode.window.showErrorMessage(`sancho compiler failed: ${errorMsg}`);
					return;
				}

				// Get or create terminal
				let terminal = vscode.window.activeTerminal;
				const isNewTerminal = !terminal;
				if (!terminal) {
					terminal = vscode.window.createTerminal('NQBP Build');
				}
				
				terminal.show();
				
				// If this is a new terminal, initialize it by running env script with NO arguments first
				if (isNewTerminal) {
					if (isWindows) {
						terminal.sendText(`call "${scriptPath}"`);
					} else {
						terminal.sendText(`source "${scriptName}"`);
					}
					// Wait for env script to complete before sending next commands
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
				
				// Run the env script with compiler output and change to build directory
				// First cd to NQBP_PKG_ROOT to ensure we're in the repo root
				if (isWindows) {
					terminal.sendText(`cd /d "%NQBP_PKG_ROOT%" && call "${scriptName}" ${compilerOutput} && cd /d "${trimmedLine}"`);
				} else {
					terminal.sendText(`cd "$NQBP_PKG_ROOT" && source "${scriptName}" ${compilerOutput} && cd "${trimmedLine}"`);
				}

				// Execute nqbp.py --vs and --vsgdb synchronously and wait for completion
				try {
					const showNotifications = vscode.workspace.getConfiguration('nqbp-integration').get('showNotifications', false);
					if (showNotifications) {
						vscode.window.showInformationMessage('Running nqbp.py --vs and --vsgdb...');
					}
					
					if (isWindows) {
						execSync(`"${scriptPath}" ${compilerOutput} >nul && cd /d "${trimmedLine}" && nqbp.py --vs && nqbp.py --vsgdb`, {
							encoding: 'utf-8',
							cwd: workspaceFolder.uri.fsPath,
							shell: 'cmd.exe'
						});
					} else {
						execSync(`source "${scriptPath}" ${compilerOutput} >/dev/null 2>&1 && cd "${trimmedLine}" && nqbp.py --vs && nqbp.py --vsgdb`, {
							encoding: 'utf-8',
							cwd: workspaceFolder.uri.fsPath,
							shell: '/bin/bash'
						});
					}

					// Reload clangd server after nqbp.py completes
					await vscode.commands.executeCommand('clangd.restart');
					if (showNotifications) {
						vscode.window.showInformationMessage('nqbp.py completed and clangd server reloaded');
					}
				} catch (error: any) {
					vscode.window.showErrorMessage(`nqbp.py failed: ${error.message}`);
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Error: ${error}`);
			}
		}
	);

	context.subscriptions.push(disposable);
}

/**
 * Recursively searches for sancho.py in the workspace
 * @param workspacePath Root path of the workspace
 * @returns Path to sancho.py or null if not found
 */
async function findSanchoPy(workspacePath: string): Promise<string | null> {
	const findCommand = process.platform === 'win32' 
		? `dir /s /b "${workspacePath}\\sancho.py"` 
		: `find "${workspacePath}" -name "sancho.py" -type f 2>/dev/null`;
	
	try {
		const result = execSync(findCommand, { encoding: 'utf-8' }).trim();
		const paths = result.split('\n').filter(p => p.trim() !== '');
		return paths.length > 0 ? paths[0] : null;
	} catch (error) {
		return null;
	}
}

export function deactivate() {}
