import species from "../species.js"

/**
 * Palette color names
 * @type {Record<string, string>}
 */
export const PALETTE = {
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
	COLLAR: "collar",
	COLLAR_SCRUFF: "collar-scruff",
	BELLY: "belly",
	UNDERBELLY: "underbelly",
	WING: "wing",
	WING_EDGE: "wing-edge",
	HEART: "heart",
	HEART_BORDER: "heart-border",
	HEART_SHINE: "heart-shine",
	FEATHER_SPINE: "feather-spine",
};

/**
 * Mapping of sprite sheet colors to palette colors
 * @type {Record<string, string>} 
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
	"#ffe955": PALETTE.COLLAR,
	"#f8ff55": PALETTE.COLLAR_SCRUFF,
	"#f8b143": PALETTE.BELLY,
	"#ec8637": PALETTE.UNDERBELLY,
	"#578ae6": PALETTE.WING,
	"#326ed9": PALETTE.WING_EDGE,
	"#c82e2e": PALETTE.HEART,
	"#501a1a": PALETTE.HEART_BORDER,
	"#ff6b6b": PALETTE.HEART_SHINE,
	"#373737": PALETTE.FEATHER_SPINE,
};


/**
 * Bird species rarit
 * @type {Record<string, string>} 
 */
export const RARITY = {
	FAMILIAR: "familiar",
	UNCOMMON: "uncommon"
}

export class BirdType {
	/**
	 * @param {string} name
	 * @param {string} description
	 * @param {Record<string, string>} colors
	 * @param {string[]} [tags]
	 * @param {string} [rarity]
	 */
	constructor(name, description, colors, tags = [], rarity = RARITY.FAMILIAR) {
		this.name = name;
		this.description = description;
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
			[PALETTE.UPPER_EYELID]: colors.eyebrow,
			[PALETTE.UPPER_CORNER_EYE]: colors.eyebrow,
			[PALETTE.BEHIND_EYE]: colors.face,
			[PALETTE.CORNER_EYE]: colors.face,
			[PALETTE.TEMPLE]: colors.face,
			[PALETTE.LOWER_EYELID]: colors.face,
			[PALETTE.NOSE]: colors.face,
			[PALETTE.NOSE_TIP]: colors.nose,
			[PALETTE.CHEEK]: colors.face,
			[PALETTE.SCRUFF]: colors.face,
			[PALETTE.COLLAR]: colors.face,
			[PALETTE.COLLAR_SCRUFF]: colors.collar,
		};
		/** @type {Record<string, string>} */
		this.colors = { ...defaultColors, ...colors, [PALETTE.THEME_HIGHLIGHT]: colors[PALETTE.THEME_HIGHLIGHT] ?? colors.hood ?? colors.face };
		this.tags = tags;
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
						continue;
					}
					const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
					if (!templateColors) {
						row.push(hex);
						continue;
					}
					if (SPRITE_SHEET_COLOR_MAP[hex] === undefined) {
						row.push(hex);
						continue;
					}
					row.push(SPRITE_SHEET_COLOR_MAP[hex]);
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

/** @type {Record<string, BirdType>} */
export const SPECIES = Object.fromEntries(
	Object.entries(species).map(([id, data]) => [
		id,
		new BirdType(data.name, data.description, data.colors, data.tags, data.rarity)
	]),
);