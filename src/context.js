import { debug, log, error } from "./shared.js";

export const SAVE_KEY = "birbSaveData";
const ROOT_PATH = "";
const SET_CONTEXT = "__CONTEXT__"

/**
 * @typedef {import('./application.js').BirbSaveData} BirbSaveData
 */

/**
 * @abstract
 */
export class Context {

	/**
	 * @abstract
	 * @returns {Promise<BirbSaveData|{}>}
	 */
	async getSaveData() {
		throw new Error("Method not implemented");
	}

	/**
	 * @abstract
	 * @param {BirbSaveData} saveData
	 */
	async putSaveData(saveData) {
		throw new Error("Method not implemented");
	}

	/**
	 * @abstract
	 */
	resetSaveData() {
		throw new Error("Method not implemented");
	}

	/**
	 * @returns {string[]} A list of CSS selectors for focusable elements
	 */
	getFocusableElements() {
		return ["img", "video", ".birb-sticky-note"];
	}

	getFocusElementTopMargin() {
		return 80;
	}

	/**
	 * @returns {string} The current path of the active page in this context
	 */
	getPath() {
		// Default to website URL
		return window.location.href;
	}

	/**
	 * @returns {HTMLElement} The current active page element where sticky notes can be applied
	 */
	getActivePage() {
		// Default to root element
		return document.documentElement;
	}

	/**
	 * Checks if a path is applicable given the context
	 * @param {string} path Can be a site URL or another context-specific path
	 * @returns {boolean} Whether the path matches the current context state
	 */
	isPathApplicable(path) {
		// Default to website URL matching
		const currentUrl = window.location.href;
		const stickyNoteWebsite = path.split("?")[0];
		const currentWebsite = currentUrl.split("?")[0];

		if (stickyNoteWebsite !== currentWebsite) {
			return false;
		}

		const pathParams = parseUrlParams(path);
		const currentParams = parseUrlParams(currentUrl);

		if (window.location.hostname === "www.youtube.com") {
			if (currentParams.v !== undefined && currentParams.v !== pathParams.v) {
				return false;
			}
		}
		return true;
	}

	areStickyNotesEnabled() {
		return true;
	}
}

export class LocalContext extends Context {

	/**
	 * @override
	 * @returns {Promise<BirbSaveData|{}>}
	 */
	async getSaveData() {
		log("Loading save data from localStorage");
		return JSON.parse(localStorage.getItem(SAVE_KEY) ?? "{}");
	}

	/**
	 * @override
	 * @param {BirbSaveData} saveData
	 */
	async putSaveData(saveData) {
		log("Saving data to localStorage");
		localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
	}

	/** @override */
	resetSaveData() {
		log("Resetting save data in localStorage");
		localStorage.removeItem(SAVE_KEY);
	}
}

export class UserScriptContext extends Context {

	/**
	 * @override
	 * @returns {Promise<BirbSaveData|{}>}
	 */
	async getSaveData() {
		log("Loading save data from UserScript storage");
		/** @type {BirbSaveData|{}} */
		let saveData = {};
		// @ts-expect-error
		saveData = GM_getValue(SAVE_KEY, {}) ?? {};
		return saveData;
	}

	/**
	 * @override
	 * @param {BirbSaveData} saveData
	 */
	async putSaveData(saveData) {
		log("Saving data to UserScript storage");
		// @ts-expect-error
		GM_setValue(SAVE_KEY, saveData);
	}

	/** @override */
	resetSaveData() {
		log("Resetting save data in UserScript storage");
		// @ts-expect-error
		GM_deleteValue(SAVE_KEY);
	}
}

export class BrowserExtensionContext extends Context {

	/**
	 * @override
	 * @returns {Promise<BirbSaveData|{}>}
	 */
	async getSaveData() {
		log("Loading save data from browser extension storage");
		return new Promise((resolve) => {
			// @ts-expect-error
			chrome.storage.sync.get([SAVE_KEY], (result) => {
				resolve(result[SAVE_KEY] ?? {});
			});
		});
	}

	/**
	 * @override
	 * @param {BirbSaveData} saveData
	 */
	async putSaveData(saveData) {
		log("Saving data to browser extension storage");
		// @ts-expect-error
		chrome.storage.sync.set({ [SAVE_KEY]: saveData }, function () {
			// @ts-expect-error
			if (chrome.runtime.lastError) {
				// @ts-expect-error
				console.error(chrome.runtime.lastError);
			} else {
				console.log("Settings saved successfully");
			}
		});
	}

	/** @override */
	resetSaveData() {
		log("Resetting save data in browser extension storage");
		// @ts-expect-error
		chrome.storage.sync.clear();
	}
}

export class ObsidianContext extends Context {

	/**
	 * @override
	 * @returns {Promise<BirbSaveData|{}>}
	 */
	async getSaveData() {
		return new Promise((resolve) => {
			// @ts-expect-error
			OBSIDIAN_PLUGIN.loadData().then((data) => {
				resolve(data ?? {});
			});
		});
	}

	/**
	 * @override
	 * @param {BirbSaveData|{}} saveData
	 */
	async putSaveData(saveData) {
		// @ts-expect-error
		await OBSIDIAN_PLUGIN.saveData(saveData);
	}

	/** @override */
	resetSaveData() {
		this.putSaveData({});
	}

	/** @override */
	getFocusableElements() {
		const elements = [
			".workspace-leaf",
			".cm-callout",
			".HyperMD-codeblock-begin",
			".status-bar",
			".mobile-navbar"
		];
		return super.getFocusableElements().concat(elements);
	}

	/** @override */
	getPath() {
		// @ts-expect-error
		const file = app.workspace.getActiveFile();
		if (file && this.getActiveEditorElement()) {
			return file.path;
		} else {
			return ROOT_PATH;
		}
	}

	/** @override */
	getActivePage() {
		if (this.getPath() === ROOT_PATH) {
			// Root page, use document element
			return document.documentElement
		}
		return this.getActiveEditorElement() ?? document.documentElement;
	}

	/** @override */
	isPathApplicable(path) {
		return path === this.getPath();
	}

	/** @override */
	areStickyNotesEnabled() {
		return this.getPath() !== ROOT_PATH;
	}

	/** @returns {HTMLElement|null} */
	getActiveEditorElement() {
		// @ts-expect-error
		const activeLeaf = app.workspace.activeLeaf;
		const leafElement = activeLeaf?.view?.containerEl;
		return leafElement?.querySelector(".cm-scroller") ?? null;
	}
}

/**
 * Parse URL parameters into a key-value map
 * @param {string} url
 * @returns {Record<string, string>}
 */
function parseUrlParams(url) {
	const queryString = url.split("?")[1];
	if (!queryString) return {};

	return queryString.split("&").reduce((params, param) => {
		const [key, value] = param.split("=");
		return { ...params, [key]: value };
	}, {});
}