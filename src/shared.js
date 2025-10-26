export const Directions = {
	LEFT: -1,
	RIGHT: 1,
};

let debug = location.hostname === "127.0.0.1";

/**
 * @returns {boolean} Whether debug mode is enabled
 */
export function isDebug() {
	return debug;
}

/**
 * @param {boolean} debugMode
 */
export function setDebug(debugMode) {
	debug = debugMode;
}