
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

const CONTEXTS = [
	new UserScriptContext(),
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
	return CONTEXTS[0];
}