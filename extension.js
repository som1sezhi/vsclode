const vscode = require('vscode');
const EventSource = require('eventsource');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('vsclode is now active!');
	let stream;
	let url, gameNum;
	let isActive = false;
	let lastMessage = '';

	vscode.workspace.onDidChangeConfiguration(() => {
		if (isActive) {
			closeStream();
			openStream();
		}
	});

	function fetchConfig() {
		url = vscode.workspace.getConfiguration('vsclode').endpoint;
		gameNum = vscode.workspace.getConfiguration('vsclode').gameNumber;
	}

	function openStream() {
		fetchConfig();
		lastMessage = '';
		stream = new EventSource(url);
		stream.onmessage = sendMessage;
		stream.onerror = () => {
			vscode.window.showErrorMessage(`Could not open connection to ${url}.`);
		};
	}

	function sendMessage(event) {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const document = editor.document;
			const games = JSON.parse(event.data).value?.games?.schedule;
			if (games && games[gameNum - 1]) {
				const msg = games[gameNum - 1].lastUpdate;
				if (msg != lastMessage) {
					lastMessage = msg;
					const edit = new vscode.WorkspaceEdit();
					edit.insert(document.uri, editor.selection.active, msg);
					vscode.workspace.applyEdit(edit);
				}
			} else {
				vscode.window.showErrorMessage(`Could not get data for game ${gameNum}.`);
			}
			//console.log(games);
		}
	}

	function closeStream() {
		if (stream) stream.close();
	}

	let d1 = vscode.commands.registerCommand('vsclode.enableLiveUpdates', function () {
		openStream();
		isActive = true;
		vscode.window.showInformationMessage('Live updates enabled!');
	});

	let d2 = vscode.commands.registerCommand('vsclode.disableLiveUpdates', function () {
		closeStream();
		isActive = false;
		vscode.window.showInformationMessage('Live updates disabled.');
	});

	context.subscriptions.push(d1, d2);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
