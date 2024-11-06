import * as vscode from 'vscode';
import * as fs from "fs";
import * as child from 'child_process';

export function activate(context: vscode.ExtensionContext) {
	let configuration = vscode.workspace.getConfiguration("sandbox");

	const SANDBOX_IDEAS=process.env.SANDBOX_IDEAS || configuration.get<string>("sandbox.sandbox_ideas", "");
	const SANDBOX_CONF=process.env.SANDBOX_CONF || configuration.get<string>("sandbox.sandbox_conf", "");
	const WORK_IDEA_PATH= configuration.get<string>("sandbox.work_idea_path", SANDBOX_IDEAS);
	
	function open_idea(idea: string) {
		vscode.workspace.openTextDocument(idea).then(doc => {
			vscode.window.showTextDocument(doc);
		});
	}

	function work_idea(){
		fs.readdir(WORK_IDEA_PATH, (_, files) => {
			files.forEach(file => {
				if (file.includes("main")){
					const idea = `${WORK_IDEA_PATH}/${file}`;
					if (idea){
						open_idea(idea);
					} else{
						vscode.window.showInformationMessage(`no work idea found on ${WORK_IDEA_PATH}`);
					}
				}
			})
		})
	}

	const reset = vscode.commands.registerCommand('sandbox-vscode.reset', () => {
		vscode.window.showQuickPick(['cpp', 'bash', 'python', 'markdown'], {
			placeHolder: 'cpp, bash, python or markdown',
		}).then(ret => {
			child.exec(`sandbox -c ${SANDBOX_CONF} -i ${SANDBOX_IDEAS} reset -e ${ret}`, (err:any, stdout:any, stderr:any) => {
				work_idea();
			});
		});
	});
	context.subscriptions.push(reset);

	const open = vscode.commands.registerCommand('sandbox-vscode.open', () => {
		const dirents = fs.readdirSync(SANDBOX_IDEAS, { withFileTypes: true, recursive: true });
		const files = dirents
			.filter(dirent => dirent.isFile())
			.map(dirent => `${dirent.parentPath.replace(SANDBOX_IDEAS, "")}/${dirent.name}`);

		vscode.window.showQuickPick(files, {
			placeHolder: 'idea',
		}).then(ret => {
			if (ret){
				open_idea(`${SANDBOX_IDEAS}/${ret}`);
			}
		});
	});
	context.subscriptions.push(open);

	const open_work_idea = vscode.commands.registerCommand('sandbox-vscode.open_work_idea', () => {
		work_idea();
	});
	context.subscriptions.push(open_work_idea);

	const execute = vscode.commands.registerCommand('sandbox-vscode.execute', () => { 
		const active_editor = vscode.window.activeTextEditor;
		if (active_editor){
			const file_name = active_editor.document.fileName;
			const terminal = get_terminal();
			if (terminal) {
				terminal.show();
				terminal.sendText(`sandbox -c ${SANDBOX_CONF} -i ${SANDBOX_IDEAS} execute -p ${file_name}`);
			}
		} else {
			vscode.window.showInformationMessage(`there is not idea opened`);
		}
	});
	context.subscriptions.push(execute);

	const save = vscode.commands.registerCommand('sandbox-vscode.save', () => { 
		const active_editor = vscode.window.activeTextEditor;
		if (active_editor){
			const file_name = active_editor.document.fileName;
			child.exec(`sandbox -c ${SANDBOX_CONF} -i ${SANDBOX_IDEAS} save -p ${file_name}`, (err:any, stdout:any, stderr:any) => {
				vscode.window.showInformationMessage(`${file_name} saved`);
			});
		
		} else {
			vscode.window.showInformationMessage(`there is not idea opened`);
		}
	});
	context.subscriptions.push(save);
}

function get_terminal(): vscode.Terminal | undefined {
	const terminal = vscode.window.terminals.find(e => e.name === "sandbox");
	return terminal ? terminal : vscode.window.createTerminal("sandbox", '/bin/bash');
}

export function deactivate() {}
