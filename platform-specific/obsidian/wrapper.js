const { Plugin, Notice } = require('obsidian');
module.exports = class PocketBird extends Plugin {
	onload() {
		console.log("Loading Pocket Bird version __VERSION__...");
		const OBSIDIAN_PLUGIN = this;
		__CODE__
		console.log("Pocket Bird loaded!");
	}

	onunload() {
		// Remove the birb when the plugin is unloaded
		document.getElementById('birb')?.remove();
		console.log('Pocket Bird unloaded!');
	}
};