// The module 'vscode' contains the VS Code extensibility API
const vscode = require("vscode");

module.exports = {
  activate,
  deactivate,
};

function activate(context) {
	console.log("Loading Pocket Bird...");
	__CODE__
	console.log("Pocket Bird loaded!");
}

function deactivate() {}

