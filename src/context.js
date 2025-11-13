import { debug, log, error } from "./shared.js";

const SAVE_KEY = "birbSaveData";

/**
 * @typedef {import('./application.js').BirbSaveData} BirbSaveData
 */

/**
 * @abstract
 */
export class Context {

	/**
	 * @abstract
	 * @returns {boolean} Whether this context is applicable
	 */
	isContextActive() {
		throw new Error("Method not implemented");
	}

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
	 * @returns {string} The current path of the active page in this context
	 */
	getPath() {
		// Default to website URL
		return window.location.href;
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
}

export class LocalContext extends Context {

	/**
	 * @override
	 * @returns {boolean}
	 */
	isContextActive() {
		return window.location.hostname === "127.0.0.1"
			|| window.location.hostname === "localhost"
			|| window.location.hostname.startsWith("192.168.");
	}

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
	 * @returns {boolean}
	 */
	isContextActive() {
		// @ts-expect-error
		return typeof GM_getValue === "function";
	}

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

class BrowserExtensionContext extends Context {

	/**
	 * @override
	 * @returns {boolean}
	 */
	isContextActive() {
		// @ts-expect-error
		return typeof chrome !== "undefined";
	}

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

class ObsidianContext extends Context {

	/**
	 * @override
	 * @returns {boolean}
	 */
	isContextActive() {
		// @ts-expect-error
		return typeof app !== "undefined" && typeof app.vault !== "undefined";
	}

	/**
	 * @override
	 * @returns {Promise<BirbSaveData|{}>}
	 */
	async getSaveData() {
		log("Loading save data from Obsidian plugin storage unimplemented");
		return {};
	}

	/**
	 * @override
	 * @param {BirbSaveData} saveData
	 */
	async putSaveData(saveData) {
		log("Saving data to Obsidian plugin storage unimplemented");
	}

	/** @override */
	resetSaveData() {
		log("Resetting save data in Obsidian plugin storage unimplemented");
	}
}

const CONTEXTS = [
	new UserScriptContext(),
	new ObsidianContext(),
	new BrowserExtensionContext(),
	new LocalContext()
];

export function getContext() {
	for (const context of CONTEXTS) {
		if (context.isContextActive()) {
			return context;
		}
	}
	error("No applicable context found, defaulting to LocalContext");
	return new LocalContext();
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