// @ts-check

// Theme color indicators
export const THEME_HIGHLIGHT = "theme-highlight";
export const TRANSPARENT = "transparent";
export const OUTLINE = "outline";
export const BORDER = "border";
export const FOOT = "foot";
export const BEAK = "beak";
export const EYE = "eye";
export const FACE = "face";
export const HOOD = "hood";
export const NOSE = "nose";
export const BELLY = "belly";
export const UNDERBELLY = "underbelly";
export const WING = "wing";
export const WING_EDGE = "wing-edge";
export const HEART = "heart";
export const HEART_BORDER = "heart-border";
export const HEART_SHINE = "heart-shine";
export const FEATHER_SPINE = "feather-spine";

/** @type {Record<string, string>} */
export const SPRITE_SHEET_COLOR_MAP = {
	"transparent": TRANSPARENT,
	"#ffffff": BORDER,
	"#000000": OUTLINE,
	"#010a19": BEAK,
	"#190301": EYE,
	"#af8e75": FOOT,
	"#639bff": FACE,
	"#99e550": HOOD,
	"#d95763": NOSE,
	"#f8b143": BELLY,
	"#ec8637": UNDERBELLY,
	"#578ae6": WING,
	"#326ed9": WING_EDGE,
	"#c82e2e": HEART,
	"#501a1a": HEART_BORDER,
	"#ff6b6b": HEART_SHINE,
	"#373737": FEATHER_SPINE,
};

export const Directions = {
	LEFT: -1,
	RIGHT: 1,
};