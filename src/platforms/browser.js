import { Context, SAVE_KEY } from "../context.js";
import { log } from "../shared.js";
import { initializeApplication } from "../application";

/**
 * @typedef {import('../application.js').BirbSaveData} BirbSaveData
 */

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

initializeApplication(new LocalContext());