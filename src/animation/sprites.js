import species from "../species.js"

export const PALETTE = Object.freeze(/** @type {const} */ ({
	THEME_HIGHLIGHT: "theme-highlight",
	TRANSPARENT: "transparent",
	OUTLINE: "outline",
	BORDER: "border",
	FOOT: "foot",
	BEAK: "beak",
	EYE: "eye",
	FACE: "face",
	HOOD: "hood",
	EYEBROW: "eyebrow",
	UPPER_EYELID: "upper-eyelid",
	UPPER_CORNER_EYE: "upper-corner-eye",
	BEHIND_EYE: "behind-eye",
	CORNER_EYE: "corner-eye",
	TEMPLE: "temple",
	LOWER_EYELID: "lower-eyelid",
	NOSE: "nose",
	NOSE_TIP: "nose-tip",
	CHEEK: "cheek",
	SCRUFF: "scruff",
	CHIN: "chin",
	COLLAR: "collar",
	COLLAR_SCRUFF: "collar-scruff",
	BELLY: "belly",
	UNDERBELLY: "underbelly",
	WING: "wing",
	SHOULDER: "shoulder",
	WING_SPOTS: "wing-spots",
	WING_EDGE: "wing-edge",
	HEART: "heart",
	HEART_BORDER: "heart-border",
	HEART_SHINE: "heart-shine",
	FEATHER_SPINE: "feather-spine",
}));

/** @typedef {typeof PALETTE[keyof typeof PALETTE]} PaletteColor */

/**
 * Mapping of sprite sheet colors to palette colors
 * @type {Record<string, PaletteColor>} 
 */
export const SPRITE_SHEET_COLOR_MAP = {
	"transparent": PALETTE.TRANSPARENT,
	"#fff000": PALETTE.THEME_HIGHLIGHT,
	"#ffffff": PALETTE.BORDER,
	"#000000": PALETTE.OUTLINE,
	"#010a19": PALETTE.BEAK,
	"#190301": PALETTE.EYE,
	"#af8e75": PALETTE.FOOT,
	"#639bff": PALETTE.FACE,
	"#99e550": PALETTE.HOOD,
	"#ff5573": PALETTE.EYEBROW,
	"#ff768e": PALETTE.UPPER_EYELID,
	"#ff90a4": PALETTE.UPPER_CORNER_EYE,
	"#ff2c88": PALETTE.BEHIND_EYE,
	"#e34f9c": PALETTE.CORNER_EYE,
	"#b53477": PALETTE.TEMPLE,
	"#ae65f1": PALETTE.LOWER_EYELID,
	"#d95763": PALETTE.NOSE,
	"#b93844": PALETTE.NOSE_TIP,
	"#ff67a9": PALETTE.CHEEK,
	"#c5e550": PALETTE.SCRUFF,
	"#b87af1": PALETTE.CHIN,
	"#ffe955": PALETTE.COLLAR,
	"#f8ff55": PALETTE.COLLAR_SCRUFF,
	"#f8b143": PALETTE.BELLY,
	"#ec8637": PALETTE.UNDERBELLY,
	"#578ae6": PALETTE.WING,
	"#55d1f3": PALETTE.SHOULDER,
	"#90b0e8": PALETTE.WING_SPOTS,
	"#326ed9": PALETTE.WING_EDGE,
	"#c82e2e": PALETTE.HEART,
	"#501a1a": PALETTE.HEART_BORDER,
	"#ff6b6b": PALETTE.HEART_SHINE,
	"#373737": PALETTE.FEATHER_SPINE,
};

/**
 * @type {Partial<Record<PaletteColor, PaletteColor>>}
 */
export const DEFAULT_COLOR_OVERRIDES = {
	[PALETTE.HOOD]: PALETTE.FACE,
	[PALETTE.EYEBROW]: PALETTE.FACE,
	[PALETTE.UPPER_EYELID]: PALETTE.EYEBROW,
	[PALETTE.UPPER_CORNER_EYE]: PALETTE.EYEBROW,
	[PALETTE.BEHIND_EYE]: PALETTE.FACE,
	[PALETTE.CORNER_EYE]: PALETTE.FACE,
	[PALETTE.TEMPLE]: PALETTE.FACE,
	[PALETTE.LOWER_EYELID]: PALETTE.FACE,
	[PALETTE.NOSE]: PALETTE.FACE,
	[PALETTE.NOSE_TIP]: PALETTE.NOSE,
	[PALETTE.CHEEK]: PALETTE.FACE,
	[PALETTE.SCRUFF]: PALETTE.FACE,
	[PALETTE.CHIN]: PALETTE.FACE,
	[PALETTE.COLLAR]: PALETTE.FACE,
	[PALETTE.COLLAR_SCRUFF]: PALETTE.COLLAR,
	[PALETTE.WING_SPOTS]: PALETTE.WING,
	[PALETTE.SHOULDER]: PALETTE.WING,
};

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
	 * @param {Record<string, string>} colors
	 * @param {string[]} [tags]
	 * @param {Rarity} [rarity]
	 */
	constructor(name, description, latinName, url, colors, tags = [], rarity = RARITY.COMMON) {
		this.name = name;
		this.description = description;
		this.latinName = latinName;
		this.url = url;
		const defaultColors = {
			[PALETTE.TRANSPARENT]: "transparent",
			[PALETTE.OUTLINE]: "#000000",
			[PALETTE.BORDER]: "#ffffff",
			[PALETTE.BEAK]: "#000000",
			[PALETTE.EYE]: "#000000",
			[PALETTE.HEART]: "#c82e2e",
			[PALETTE.HEART_BORDER]: "#501a1a",
			[PALETTE.HEART_SHINE]: "#ff6b6b",
			[PALETTE.FEATHER_SPINE]: "#373737",
			[PALETTE.HOOD]: colors.face,
			[PALETTE.EYEBROW]: colors.face,
			[PALETTE.UPPER_EYELID]: colors.eyebrow || colors.face,
			[PALETTE.UPPER_CORNER_EYE]: colors.eyebrow || colors.face,
			[PALETTE.BEHIND_EYE]: colors.face,
			[PALETTE.CORNER_EYE]: colors.face,
			[PALETTE.TEMPLE]: colors.face,
			[PALETTE.LOWER_EYELID]: colors.face,
			[PALETTE.NOSE]: colors.face,
			[PALETTE.NOSE_TIP]: colors.nose || colors.face,
			[PALETTE.CHEEK]: colors.face,
			[PALETTE.SCRUFF]: colors.face,
			[PALETTE.CHIN]: colors.face,
			[PALETTE.COLLAR]: colors.face,
			[PALETTE.COLLAR_SCRUFF]: colors.collar || colors.face,
			[PALETTE.SHOULDER]: colors.wing,
		};
		/** @type {Record<string, string>} */
		this.colors = { ...defaultColors, ...colors, [PALETTE.THEME_HIGHLIGHT]: colors[PALETTE.THEME_HIGHLIGHT] ?? colors.hood ?? colors.face };
		this.tags = tags;
		/** @type {Rarity} */
		this.rarity = rarity;
	}
}

/**
 * Load a sprite sheet image and convert it to a 2D array of palette color names
 * @param {string} src URL or data URI of the sprite sheet image
 * @param {boolean} [templateColors] Whether to map pixel colors to palette names
 * @returns {Promise<string[][]>}
 */
export function loadSpriteSheetPixels(src, templateColors = true) {
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
			const pixels = imageData.data;
			const hexArray = [];
			for (let y = 0; y < img.height; y++) {
				const row = [];
				for (let x = 0; x < img.width; x++) {
					const index = (y * img.width + x) * 4;
					const r = pixels[index];
					const g = pixels[index + 1];
					const b = pixels[index + 2];
					const a = pixels[index + 3];
					if (a === 0) {
						row.push(PALETTE.TRANSPARENT);
					} else if (!templateColors) {
						row.push(rgbToHex(r, g, b));
					} else {
						row.push(getTemplateColorMatch(r, g, b));
					}
				}
				hexArray.push(row);
			}
			resolve(hexArray);
		};
		img.onerror = (err) => {
			reject(err);
		};
	});
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

/**
 * Get the euclidean distance between two colors in RGB space
 * @param {[number, number, number]} colorA The first color as [r, g, b]
 * @param {[number, number, number]} colorB The second color as [r, g, b]
 * @returns {number} The distance between the two colors, where 0 is an exact match
 */
function colorDistance(colorA, colorB) {
	return Math.abs(colorA[0] - colorB[0]) + Math.abs(colorA[1] - colorB[1]) + Math.abs(colorA[2] - colorB[2]);
}

const SPRITE_SHEET_RGB = Object.entries(SPRITE_SHEET_COLOR_MAP)
    .filter(([hex]) => hex !== "transparent")
    .map(([hex, palette]) => ({ rgb: hexToRgb(hex), palette }));

/**
 * Get the closest sprite sheet color that matches the given color within a tolerance, or return the original color if no match is found
 * @param {number} red The red channel value (0-255)
 * @param {number} green The green channel value (0-255)
 * @param {number} blue The blue channel value (0-255)
 * @returns {PaletteColor | string} The name of the matching palette color, or the original color as a hex string if no match is found
 */
function getTemplateColorMatch(red, green, blue) {
	const hex = rgbToHex(red, green, blue);
	if (SPRITE_SHEET_COLOR_MAP[hex]) {
		// Exact match
		return SPRITE_SHEET_COLOR_MAP[hex];
	}
	// Rarely, certain platforms like Linux Mint do not properly convert colors requiring this fuzzy matching fallback
	const TOLERANCE = 50;
	let closestMatch = null;
	let minDistance = 256;
	for (const { rgb, palette } of SPRITE_SHEET_RGB) {
		const distance = colorDistance([red, green, blue], rgb);
		if (distance <= TOLERANCE && distance < minDistance) {
			minDistance = distance;
			closestMatch = palette;
		}
	}
	if (!closestMatch) {
		return rgbToHex(red, green, blue);
	}
	console.log("Fuzzy match of color", hex, "to palette color", closestMatch, "with distance", minDistance);
	return closestMatch;
}


/** @type {Record<string, BirdType>} */
export const SPECIES = Object.fromEntries(
	Object.entries(species).map(([id, data]) => [
		id,
		new BirdType(data.name, data.description, data.latinName, data.url, data.colors, data.tags, data.rarity)
	]),
);