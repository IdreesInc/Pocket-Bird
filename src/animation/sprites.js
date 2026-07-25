import species from "../species.js"


export const RARITY = Object.freeze(/** @type {const} */ ({
	COMMON: "common",
	UNCOMMON: "uncommon"
}));

/** @typedef {typeof RARITY[keyof typeof RARITY]} Rarity */

export class BirdType {
	/**
	 * @param {string} name
	 * @param {string} description
	 * @param {string} latinName
	 * @param {string} url
	 * @param {number} spriteIndex
	 * @param {string} highlightColor
	 * @param {string[]} [tags]
	 * @param {Rarity} [rarity]
	 */
	constructor(name, description, latinName, url, spriteIndex, highlightColor, tags = [], rarity = RARITY.COMMON) {
		this.name = name;
		this.description = description;
		this.latinName = latinName;
		this.url = url;
		this.spriteIndex = spriteIndex;
		this.highlightColor = highlightColor;
		this.tags = tags;
		/** @type {Rarity} */
		this.rarity = rarity;
	}

	/**
	 * @param {Object<string, string>} colorScheme
	 */
	setColorScheme(colorScheme) {
		this.colorScheme = colorScheme;
	}

	/**
	 * @returns {Object<string, string>}
	 */
	getColorScheme() {
		if (!this.colorScheme) {
			throw new Error("Color scheme requested before generation");
		}
		return this.colorScheme;
	}
}

/**
 * @param {string} src
 * @param {number} width
 */
export async function createTemplateMapping(src, width) {
	/** @type {{ [key: string]: string }} */
	let map = {};
	const imageData = await getImageData(src);
	const pixels = imageData.data;
	for (let row = 0; row < imageData.height; row++) {
		for (let col = 0; col < width; col++) {
			const index = (row * imageData.width + col) * 4;
			const r = pixels[index];
			const g = pixels[index + 1];
			const b = pixels[index + 2];
			const a = pixels[index + 3];
			if (a === 0) {
				 continue;
			}
			const color = rgbToHex(r, g, b);
			if (!map[color]) {
				map[color] = key(row, col);
			}
		}
	}
	return map;
}

/**
 * @param {string} src
 * @param {number} start
 * @param {number} width
 * @returns {Promise<{ [key: string]: string }>}
 */
export async function extractPalette(src, start, width) {
	/** @type {{ [key: string]: string }} */
	let map = {};
	const imageData = await getImageData(src);
	const pixels = imageData.data;
	for (let row = 0; row < imageData.height; row++) {
		for (let col = start; col < start + width; col++) {
			const index = (row * imageData.width + col) * 4;
			const r = pixels[index];
			const g = pixels[index + 1];
			const b = pixels[index + 2];
			const a = pixels[index + 3];
			const color = a === 0 ? "transparent" : rgbToHex(r, g, b);
			const id = key(row, col - start);
			if (!map[id]) {
				map[id] = color;
			}
		}
	}
	return map;
}



/**
 * @param {number} row
 * @param {number} col
 * @returns {string}
 */
function key(row, col) {
	return row + "x" + col;
}

/**
 * @param {string} src
 * @returns {Promise<ImageData>}
 */
function getImageData(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.src = src;
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				reject(new Error('Failed to get canvas context'));
				return;
			}
			ctx.drawImage(img, 0, 0);
			const imageData = ctx.getImageData(0, 0, img.width, img.height);
			resolve(imageData);
		};
		img.onerror = (err) => {
			reject(err);
		};
	});
}


/**
 * Load a sprite sheet image and convert it to a 2D array of palette color names
 * @param {string} src URL or data URI of the sprite sheet image
 * @param {Object<string, string>} templateMapping Mapping of template colors to location keys
 * @returns {Promise<string[][]>}
 */
export async function loadSpriteSheetPixels(src, templateMapping) {
	const imageData = await getImageData(src);
	const pixels = imageData.data;
	const hexArray = [];
	for (let y = 0; y < imageData.height; y++) {
		const row = [];
		for (let x = 0; x < imageData.width; x++) {
			const index = (y * imageData.width + x) * 4;
			const r = pixels[index];
			const g = pixels[index + 1];
			const b = pixels[index + 2];
			const a = pixels[index + 3];
			const color = a === 0 ? "transparent" : rgbToHex(r, g, b);
			row.push(templateMapping[color] || color);
		}
		hexArray.push(row);
	}
	return hexArray;
}

/**
 * @param {string} hex The hex color to convert
 * @returns {[number, number, number]} The RGB values as an array of [red, green, blue]
 */
function hexToRgb(hex) {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * @param {number} r Red channel value (0-255)
 * @param {number} g Green channel value (0-255)
 * @param {number} b Blue channel value (0-255)
 * @returns {string} The rgb color as a hex string
 */
function rgbToHex(r, g, b) {
	return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** @type {Record<string, BirdType>} */
export const SPECIES = Object.fromEntries(
	Object.entries(species).map(([id, data]) => [
		id,
		new BirdType(data.name, data.description, data.latinName, data.url, data.spriteIndex, data.highlightColor, data.tags, /** @type {Rarity|undefined} */ (data.rarity))
	]),
);