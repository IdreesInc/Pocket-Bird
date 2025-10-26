/** Indicators for parts of the base bird sprite sheet */
export const SPRITE = {
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

/** @type {Record<string, string>} */
export const SPRITE_SHEET_COLOR_MAP = {
	"transparent": SPRITE.TRANSPARENT,
	"#ffffff": SPRITE.BORDER,
	"#000000": SPRITE.OUTLINE,
	"#010a19": SPRITE.BEAK,
	"#190301": SPRITE.EYE,
	"#af8e75": SPRITE.FOOT,
	"#639bff": SPRITE.FACE,
	"#99e550": SPRITE.HOOD,
	"#d95763": SPRITE.NOSE,
	"#f8b143": SPRITE.BELLY,
	"#ec8637": SPRITE.UNDERBELLY,
	"#578ae6": SPRITE.WING,
	"#326ed9": SPRITE.WING_EDGE,
	"#c82e2e": SPRITE.HEART,
	"#501a1a": SPRITE.HEART_BORDER,
	"#ff6b6b": SPRITE.HEART_SHINE,
	"#373737": SPRITE.FEATHER_SPINE,
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
			[SPRITE.TRANSPARENT]: "transparent",
			[SPRITE.OUTLINE]: "#000000",
			[SPRITE.BORDER]: "#ffffff",
			[SPRITE.BEAK]: "#000000",
			[SPRITE.EYE]: "#000000",
			[SPRITE.HEART]: "#c82e2e",
			[SPRITE.HEART_BORDER]: "#501a1a",
			[SPRITE.HEART_SHINE]: "#ff6b6b",
			[SPRITE.FEATHER_SPINE]: "#373737",
			[SPRITE.HOOD]: colors.face,
			[SPRITE.NOSE]: colors.face,
		};
		/** @type {Record<string, string>} */
		this.colors = { ...defaultColors, ...colors, [SPRITE.THEME_HIGHLIGHT]: colors[SPRITE.THEME_HIGHLIGHT] ?? colors.hood ?? colors.face };
		this.tags = tags;
	}
}

/** @type {Record<string, BirdType>} */
export const SPECIES = {
	bluebird: new BirdType("Eastern Bluebird",
		"Native to North American and very social, though can be timid around people.", {
		[SPRITE.FOOT]: "#af8e75",
		[SPRITE.FACE]: "#639bff",
		[SPRITE.BELLY]: "#f8b143",
		[SPRITE.UNDERBELLY]: "#ec8637",
		[SPRITE.WING]: "#578ae6",
		[SPRITE.WING_EDGE]: "#326ed9",
	}),
	shimaEnaga: new BirdType("Shima Enaga",
		"Small, fluffy birds found in the snowy regions of Japan, these birds are highly sought after by ornithologists and nature photographers.", {
		[SPRITE.FOOT]: "#af8e75",
		[SPRITE.FACE]: "#ffffff",
		[SPRITE.BELLY]: "#ebe9e8",
		[SPRITE.UNDERBELLY]: "#ebd9d0",
		[SPRITE.WING]: "#f3d3c1",
		[SPRITE.WING_EDGE]: "#2d2d2dff",
		[SPRITE.THEME_HIGHLIGHT]: "#d7ac93",
	}),
	tuftedTitmouse: new BirdType("Tufted Titmouse",
		"Native to the eastern United States, full of personality, and notably my wife's favorite bird.", {
		[SPRITE.FOOT]: "#af8e75",
		[SPRITE.FACE]: "#c7cad7",
		[SPRITE.BELLY]: "#e4e5eb",
		[SPRITE.UNDERBELLY]: "#d7cfcb",
		[SPRITE.WING]: "#b1b5c5",
		[SPRITE.WING_EDGE]: "#9d9fa9",
	}, ["tuft"]),
	europeanRobin: new BirdType("European Robin",
		"Native to western Europe, this is the quintessential robin. Quite friendly, you'll often find them searching for worms.", {
		[SPRITE.FOOT]: "#af8e75",
		[SPRITE.FACE]: "#ffaf34",
		[SPRITE.HOOD]: "#aaa094",
		[SPRITE.BELLY]: "#ffaf34",
		[SPRITE.UNDERBELLY]: "#babec2",
		[SPRITE.WING]: "#aaa094",
		[SPRITE.WING_EDGE]: "#888580",
		[SPRITE.THEME_HIGHLIGHT]: "#ffaf34",
	}),
	redCardinal: new BirdType("Red Cardinal",
		"Native to the eastern United States, this strikingly red bird is hard to miss.", {
		[SPRITE.BEAK]: "#d93619",
		[SPRITE.FOOT]: "#af8e75",
		[SPRITE.FACE]: "#31353d",
		[SPRITE.HOOD]: "#e83a1b",
		[SPRITE.BELLY]: "#e83a1b",
		[SPRITE.UNDERBELLY]: "#dc3719",
		[SPRITE.WING]: "#d23215",
		[SPRITE.WING_EDGE]: "#b1321c",
	}, ["tuft"]),
	americanGoldfinch: new BirdType("American Goldfinch",
		"Coloured a brilliant yellow, this bird feeds almost entirely on the seeds of plants such as thistle, sunflowers, and coneflowers.", {
		[SPRITE.BEAK]: "#ffaf34",
		[SPRITE.FOOT]: "#af8e75",
		[SPRITE.FACE]: "#fff255",
		[SPRITE.NOSE]: "#383838",
		[SPRITE.HOOD]: "#383838",
		[SPRITE.BELLY]: "#fff255",
		[SPRITE.UNDERBELLY]: "#f5ea63",
		[SPRITE.WING]: "#e8e079",
		[SPRITE.WING_EDGE]: "#191919",
		[SPRITE.THEME_HIGHLIGHT]: "#ffcc00"
	}),
	barnSwallow: new BirdType("Barn Swallow",
		"Agile birds that often roost in man-made structures, these birds are known to build nests near Ospreys for protection.", {
		[SPRITE.FOOT]: "#af8e75",
		[SPRITE.FACE]: "#db7c4d",
		[SPRITE.BELLY]: "#f7e1c9",
		[SPRITE.UNDERBELLY]: "#ebc9a3",
		[SPRITE.WING]: "#2252a9",
		[SPRITE.WING_EDGE]: "#1c448b",
		[SPRITE.HOOD]: "#2252a9",
	}),
	mistletoebird: new BirdType("Mistletoebird",
		"Native to Australia, these birds eat mainly mistletoe and in turn spread the seeds far and wide.", {
		[SPRITE.FOOT]: "#6c6a7c",
		[SPRITE.FACE]: "#352e6d",
		[SPRITE.BELLY]: "#fd6833",
		[SPRITE.UNDERBELLY]: "#e6e1d8",
		[SPRITE.WING]: "#342b7c",
		[SPRITE.WING_EDGE]: "#282065",
	}),
	redAvadavat: new BirdType("Red Avadavat",
		"Native to India and southeast Asia, these birds are also known as Strawberry Finches due to their speckled plumage.", {
		[SPRITE.BEAK]: "#f71919",
		[SPRITE.FOOT]: "#af7575",
		[SPRITE.FACE]: "#cb092b",
		[SPRITE.BELLY]: "#ae1724",
		[SPRITE.UNDERBELLY]: "#831b24",
		[SPRITE.WING]: "#7e3030",
		[SPRITE.WING_EDGE]: "#490f0f",
	}),
	scarletRobin: new BirdType("Scarlet Robin",
		"Native to Australia, this striking robin can be found in Eucalyptus forests.", {
		[SPRITE.FOOT]: "#494949",
		[SPRITE.FACE]: "#3d3d3d",
		[SPRITE.BELLY]: "#fc5633",
		[SPRITE.UNDERBELLY]: "#dcdcdc",
		[SPRITE.WING]: "#2b2b2b",
		[SPRITE.WING_EDGE]: "#ebebeb",
		[SPRITE.THEME_HIGHLIGHT]: "#fc5633",
	}),
	americanRobin: new BirdType("American Robin",
		"While not a true robin, this social North American bird is so named due to its orange coloring. It seems unbothered by nearby humans.", {
		[SPRITE.BEAK]: "#e89f30",
		[SPRITE.FOOT]: "#9f8075",
		[SPRITE.FACE]: "#2d2d2d",
		[SPRITE.BELLY]: "#eb7a3a",
		[SPRITE.UNDERBELLY]: "#eb7a3a",
		[SPRITE.WING]: "#444444",
		[SPRITE.WING_EDGE]: "#232323",
		[SPRITE.THEME_HIGHLIGHT]: "#eb7a3a",
	}),
	carolinaWren: new BirdType("Carolina Wren",
		"Native to the eastern United States, these little birds are known for their curious and energetic nature.", {
		[SPRITE.FOOT]: "#af8e75",
		[SPRITE.FACE]: "#edc7a9",
		[SPRITE.NOSE]: "#f7eee5",
		[SPRITE.HOOD]: "#c58a5b",
		[SPRITE.BELLY]: "#e1b796",
		[SPRITE.UNDERBELLY]: "#c79e7c",
		[SPRITE.WING]: "#c58a5b",
		[SPRITE.WING_EDGE]: "#866348",
	}),
};