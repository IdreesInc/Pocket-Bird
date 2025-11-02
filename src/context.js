
import { debug, log, error } from "./shared.js";

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
	 * @returns {BirbSaveData|{}}
	 */
	getSaveData() {
		throw new Error("Method not implemented");
	}

	/**
	 * @abstract
	 * @param {BirbSaveData} saveData
	 */
	putSaveData(saveData) {
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

	isContextActive() {
		return window.location.hostname === "127.0.0.1"
			|| window.location.hostname === "localhost"
			|| window.location.hostname.startsWith("192.168.");
	}

	getSaveData() {
		log("Loading save data from localStorage");
		return JSON.parse(localStorage.getItem("birbSaveData") ?? "{}");
	}

	/**
	 * @override
	 * @param {BirbSaveData} saveData
	 */
	putSaveData(saveData) {
		log("Saving data to localStorage");
		localStorage.setItem("birbSaveData", JSON.stringify(saveData));
	}

	resetSaveData() {
		log("Resetting save data in localStorage");
		localStorage.removeItem("birbSaveData");
	}
}

export class UserScriptContext extends Context {

	isContextActive() {
		// @ts-expect-error
		return typeof GM_getValue === "function";
	}

	getSaveData() {
		log("Loading save data from UserScript storage");
		/** @type {BirbSaveData|{}} */
		let saveData = {};
		// @ts-expect-error
		saveData = GM_getValue("birbSaveData", {}) ?? {};
		return saveData;
	}

	/**
	 * @override
	 * @param {BirbSaveData} saveData
	 */
	putSaveData(saveData) {
		log("Saving data to UserScript storage");
		// @ts-expect-error
		GM_setValue("birbSaveData", saveData);
	}

	resetSaveData() {
		log("Resetting save data in UserScript storage");
		// @ts-expect-error
		GM_deleteValue("birbSaveData");
	}
}

const CONTEXTS = [
	new LocalContext(),
	new UserScriptContext(),
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