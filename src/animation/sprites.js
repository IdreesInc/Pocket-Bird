import { TAG } from "./layer.js";

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
export const SPECIES = {
	bluebird: new BirdType("Eastern Bluebird",
		"Native to North American and very social, though can be timid around people.", {
		[PALETTE.FOOT]: "#af8e75",
		[PALETTE.FACE]: "#639bff",
		[PALETTE.BELLY]: "#f8b143",
		[PALETTE.UNDERBELLY]: "#ec8637",
		[PALETTE.WING]: "#578ae6",
		[PALETTE.WING_EDGE]: "#326ed9",
	}),
	shimaEnaga: new BirdType("Shima Enaga",
		"Small, fluffy birds found in the snowy regions of Japan, these birds are highly sought after by ornithologists and nature photographers.", {
		[PALETTE.FOOT]: "#af8e75",
		[PALETTE.FACE]: "#ffffff",
		[PALETTE.BELLY]: "#ebe9e8",
		[PALETTE.UNDERBELLY]: "#ebd9d0",
		[PALETTE.WING]: "#f3d3c1",
		[PALETTE.WING_EDGE]: "#2d2d2d",
		[PALETTE.THEME_HIGHLIGHT]: "#d7ac93",
	}),
	tuftedTitmouse: new BirdType("Tufted Titmouse",
		"Native to the eastern United States, full of personality, and notably my wife's favorite bird.", {
		[PALETTE.FOOT]: "#af8e75",
		[PALETTE.FACE]: "#c7cad7",
		[PALETTE.BELLY]: "#e4e5eb",
		[PALETTE.UNDERBELLY]: "#d7cfcb",
		[PALETTE.WING]: "#b1b5c5",
		[PALETTE.WING_EDGE]: "#9d9fa9",
		[PALETTE.THEME_HIGHLIGHT]: "#b9abcf",
	}, [TAG.TUFT]),
	europeanRobin: new BirdType("European Robin",
		"Native to western Europe, this is the quintessential robin. Quite friendly, you'll often find them searching for worms.", {
		[PALETTE.FOOT]: "#af8e75",
		[PALETTE.FACE]: "#ffaf34",
		[PALETTE.HOOD]: "#aaa094",
		[PALETTE.BELLY]: "#ffaf34",
		[PALETTE.UNDERBELLY]: "#babec2",
		[PALETTE.WING]: "#aaa094",
		[PALETTE.WING_EDGE]: "#888580",
		[PALETTE.THEME_HIGHLIGHT]: "#ffaf34",
	}),
	redCardinal: new BirdType("Red Cardinal",
		"Native to the eastern United States, this strikingly red bird is hard to miss.", {
		[PALETTE.BEAK]: "#d93619",
		[PALETTE.FOOT]: "#af8e75",
		[PALETTE.FACE]: "#31353d",
		[PALETTE.HOOD]: "#e83a1b",
		[PALETTE.BELLY]: "#e83a1b",
		[PALETTE.UNDERBELLY]: "#dc3719",
		[PALETTE.WING]: "#d23215",
		[PALETTE.WING_EDGE]: "#b1321c",
	}, [TAG.TUFT]),
	americanGoldfinch: new BirdType("American Goldfinch",
		"Coloured a brilliant yellow, this bird feeds almost entirely on the seeds of plants such as thistle, sunflowers, and coneflowers.", {
		[PALETTE.BEAK]: "#ffaf34",
		[PALETTE.FOOT]: "#af8e75",
		[PALETTE.FACE]: "#fff255",
		[PALETTE.NOSE]: "#383838",
		[PALETTE.HOOD]: "#383838",
		[PALETTE.BELLY]: "#fff255",
		[PALETTE.UNDERBELLY]: "#f5ea63",
		[PALETTE.WING]: "#e8e079",
		[PALETTE.WING_EDGE]: "#191919",
		[PALETTE.THEME_HIGHLIGHT]: "#ffcc00"
	}),
	barnSwallow: new BirdType("Barn Swallow",
		"Agile birds that often roost in man-made structures, these birds are known to build nests near Ospreys for protection.", {
		[PALETTE.FOOT]: "#af8e75",
		[PALETTE.FACE]: "#db7c4d",
		[PALETTE.BELLY]: "#f7e1c9",
		[PALETTE.UNDERBELLY]: "#ebc9a3",
		[PALETTE.WING]: "#2252a9",
		[PALETTE.WING_EDGE]: "#1c448b",
		[PALETTE.HOOD]: "#2252a9",
	}),
	mistletoebird: new BirdType("Mistletoebird",
		"Native to Australia, these birds eat mainly mistletoe and in turn spread the seeds far and wide.", {
		[PALETTE.FOOT]: "#6c6a7c",
		[PALETTE.FACE]: "#352e6d",
		[PALETTE.BELLY]: "#fd6833",
		[PALETTE.UNDERBELLY]: "#e6e1d8",
		[PALETTE.WING]: "#342b7c",
		[PALETTE.WING_EDGE]: "#282065",
	}),
	redAvadavat: new BirdType("Red Avadavat",
		"Native to India and southeast Asia, these birds are also known as Strawberry Finches due to their speckled plumage.", {
		[PALETTE.BEAK]: "#f71919",
		[PALETTE.FOOT]: "#af7575",
		[PALETTE.FACE]: "#cb092b",
		[PALETTE.BELLY]: "#ae1724",
		[PALETTE.UNDERBELLY]: "#831b24",
		[PALETTE.WING]: "#7e3030",
		[PALETTE.WING_EDGE]: "#490f0f",
	}),
	scarletRobin: new BirdType("Scarlet Robin",
		"Native to Australia, this striking robin can be found in Eucalyptus forests.", {
		[PALETTE.FOOT]: "#494949",
		[PALETTE.FACE]: "#3d3d3d",
		[PALETTE.BELLY]: "#fc5633",
		[PALETTE.UNDERBELLY]: "#dcdcdc",
		[PALETTE.WING]: "#2b2b2b",
		[PALETTE.WING_EDGE]: "#ebebeb",
		[PALETTE.THEME_HIGHLIGHT]: "#fc5633",
	}),
	americanRobin: new BirdType("American Robin",
		"While not a true robin, this social North American bird is so named due to its orange coloring. It seems unbothered by nearby humans.", {
		[PALETTE.BEAK]: "#e89f30",
		[PALETTE.FOOT]: "#9f8075",
		[PALETTE.FACE]: "#2d2d2d",
		[PALETTE.BELLY]: "#eb7a3a",
		[PALETTE.UNDERBELLY]: "#eb7a3a",
		[PALETTE.WING]: "#444444",
		[PALETTE.WING_EDGE]: "#232323",
		[PALETTE.THEME_HIGHLIGHT]: "#eb7a3a",
	}),
	carolinaWren: new BirdType("Carolina Wren",
		"Native to the eastern United States, these little birds are known for their curious and energetic nature.", {
		[PALETTE.FOOT]: "#af8e75",
		[PALETTE.FACE]: "#edc7a9",
		[PALETTE.NOSE]: "#f7eee5",
		[PALETTE.HOOD]: "#c58a5b",
		[PALETTE.BELLY]: "#e1b796",
		[PALETTE.UNDERBELLY]: "#c79e7c",
		[PALETTE.WING]: "#c58a5b",
		[PALETTE.WING_EDGE]: "#866348",
	}),
};