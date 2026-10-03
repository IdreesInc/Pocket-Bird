const { Plugin, Notice, PluginSettingTab, Setting } = require('obsidian');

class PocketBirdSettingTab extends PluginSettingTab {
	/**
	 * @param {Plugin} plugin
	 * @param {import('../../context.js').EditableSettings} birdSettings
	 */
	constructor(plugin, birdSettings) {
		super(plugin.app, plugin);
		this.birdSettings = birdSettings;
	}

	display() {
		this.containerEl.empty();
		new Setting(this.containerEl)
			.setName("Extra perch selectors")
			.setDesc("CSS selectors for more elements the bird can land on, one per line (for example .my-plugin-card)")
			.addTextArea((text) => text
				.setPlaceholder(".my-plugin-card")
				.setValue(this.birdSettings.getPerchSelectors().join("\n"))
				.onChange((value) => {
					this.birdSettings.setPerchSelectors(value.split("\n").map((line) => line.trim()).filter(Boolean));
				}));
	}
}

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