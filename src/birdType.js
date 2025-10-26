// @ts-check

import {
	THEME_HIGHLIGHT,
	OUTLINE,
	BORDER,
	BEAK,
	EYE,
	HEART,
	HEART_BORDER,
	HEART_SHINE,
	FEATHER_SPINE,
	TRANSPARENT,
	NOSE,
	HOOD
} from './constants.js';

class BirdType {
	/**
	 * @param {string} name
	 * @param {string} description
	 * @param {Record<string, string>} colors
	 * @param {string[]} [tags]
	 */
	constructor(name, description, colors, tags = []) {
		this.name = name;
		this.description = description;
		const defaultColors = {
			[TRANSPARENT]: "transparent",
			[OUTLINE]: "#000000",
			[BORDER]: "#ffffff",
			[BEAK]: "#000000",
			[EYE]: "#000000",
			[HEART]: "#c82e2e",
			[HEART_BORDER]: "#501a1a",
			[HEART_SHINE]: "#ff6b6b",
			[FEATHER_SPINE]: "#373737",
			[HOOD]: colors.face,
			[NOSE]: colors.face,
		};
		/** @type {Record<string, string>} */
		this.colors = { ...defaultColors, ...colors, [THEME_HIGHLIGHT]: colors[THEME_HIGHLIGHT] ?? colors.hood ?? colors.face };
		this.tags = tags;
	}
}

export default BirdType;