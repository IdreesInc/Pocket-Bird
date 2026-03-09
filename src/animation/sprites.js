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
	NOSE: "nose",
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
	"#d95763": PALETTE.NOSE,
	"#f8b143": PALETTE.BELLY,
	"#ec8637": PALETTE.UNDERBELLY,
	"#578ae6": PALETTE.WING,
	"#326ed9": PALETTE.WING_EDGE,
	"#c82e2e": PALETTE.HEART,
	"#501a1a": PALETTE.HEART_BORDER,
	"#ff6b6b": PALETTE.HEART_SHINE,
	"#373737": PALETTE.FEATHER_SPINE,
};

export class BirdType {
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
			[PALETTE.NOSE]: colors.face,
		};
		/** @type {Record<string, string>} */
		this.colors = { ...defaultColors, ...colors, [PALETTE.THEME_HIGHLIGHT]: colors[PALETTE.THEME_HIGHLIGHT] ?? colors.hood ?? colors.face };
		this.tags = tags;
	}
}

/** @type {Record<string, BirdType>} */
export const SPECIES = Object.fromEntries(
	Object.entries(species).map(([id, data]) => [
		id,
		new BirdType(data.name, data.description, data.colors, data.tags ?? []),
	]),
);