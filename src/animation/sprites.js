/** Indicators for parts of the base bird sprite sheet */
export const Sprite = {
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
	"transparent": Sprite.TRANSPARENT,
	"#ffffff": Sprite.BORDER,
	"#000000": Sprite.OUTLINE,
	"#010a19": Sprite.BEAK,
	"#190301": Sprite.EYE,
	"#af8e75": Sprite.FOOT,
	"#639bff": Sprite.FACE,
	"#99e550": Sprite.HOOD,
	"#d95763": Sprite.NOSE,
	"#f8b143": Sprite.BELLY,
	"#ec8637": Sprite.UNDERBELLY,
	"#578ae6": Sprite.WING,
	"#326ed9": Sprite.WING_EDGE,
	"#c82e2e": Sprite.HEART,
	"#501a1a": Sprite.HEART_BORDER,
	"#ff6b6b": Sprite.HEART_SHINE,
	"#373737": Sprite.FEATHER_SPINE,
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
			[Sprite.TRANSPARENT]: "transparent",
			[Sprite.OUTLINE]: "#000000",
			[Sprite.BORDER]: "#ffffff",
			[Sprite.BEAK]: "#000000",
			[Sprite.EYE]: "#000000",
			[Sprite.HEART]: "#c82e2e",
			[Sprite.HEART_BORDER]: "#501a1a",
			[Sprite.HEART_SHINE]: "#ff6b6b",
			[Sprite.FEATHER_SPINE]: "#373737",
			[Sprite.HOOD]: colors.face,
			[Sprite.NOSE]: colors.face,
		};
		/** @type {Record<string, string>} */
		this.colors = { ...defaultColors, ...colors, [Sprite.THEME_HIGHLIGHT]: colors[Sprite.THEME_HIGHLIGHT] ?? colors.hood ?? colors.face };
		this.tags = tags;
	}
}

/** @type {Record<string, BirdType>} */
export const SPECIES = {
	bluebird: new BirdType("Eastern Bluebird",
		"Native to North American and very social, though can be timid around people.", {
		[Sprite.FOOT]: "#af8e75",
		[Sprite.FACE]: "#639bff",
		[Sprite.BELLY]: "#f8b143",
		[Sprite.UNDERBELLY]: "#ec8637",
		[Sprite.WING]: "#578ae6",
		[Sprite.WING_EDGE]: "#326ed9",
	}),
	shimaEnaga: new BirdType("Shima Enaga",
		"Small, fluffy birds found in the snowy regions of Japan, these birds are highly sought after by ornithologists and nature photographers.", {
		[Sprite.FOOT]: "#af8e75",
		[Sprite.FACE]: "#ffffff",
		[Sprite.BELLY]: "#ebe9e8",
		[Sprite.UNDERBELLY]: "#ebd9d0",
		[Sprite.WING]: "#f3d3c1",
		[Sprite.WING_EDGE]: "#2d2d2dff",
		[Sprite.THEME_HIGHLIGHT]: "#d7ac93",
	}),
	tuftedTitmouse: new BirdType("Tufted Titmouse",
		"Native to the eastern United States, full of personality, and notably my wife's favorite bird.", {
		[Sprite.FOOT]: "#af8e75",
		[Sprite.FACE]: "#c7cad7",
		[Sprite.BELLY]: "#e4e5eb",
		[Sprite.UNDERBELLY]: "#d7cfcb",
		[Sprite.WING]: "#b1b5c5",
		[Sprite.WING_EDGE]: "#9d9fa9",
	}, ["tuft"]),
	europeanRobin: new BirdType("European Robin",
		"Native to western Europe, this is the quintessential robin. Quite friendly, you'll often find them searching for worms.", {
		[Sprite.FOOT]: "#af8e75",
		[Sprite.FACE]: "#ffaf34",
		[Sprite.HOOD]: "#aaa094",
		[Sprite.BELLY]: "#ffaf34",
		[Sprite.UNDERBELLY]: "#babec2",
		[Sprite.WING]: "#aaa094",
		[Sprite.WING_EDGE]: "#888580",
		[Sprite.THEME_HIGHLIGHT]: "#ffaf34",
	}),
	redCardinal: new BirdType("Red Cardinal",
		"Native to the eastern United States, this strikingly red bird is hard to miss.", {
		[Sprite.BEAK]: "#d93619",
		[Sprite.FOOT]: "#af8e75",
		[Sprite.FACE]: "#31353d",
		[Sprite.HOOD]: "#e83a1b",
		[Sprite.BELLY]: "#e83a1b",
		[Sprite.UNDERBELLY]: "#dc3719",
		[Sprite.WING]: "#d23215",
		[Sprite.WING_EDGE]: "#b1321c",
	}, ["tuft"]),
	americanGoldfinch: new BirdType("American Goldfinch",
		"Coloured a brilliant yellow, this bird feeds almost entirely on the seeds of plants such as thistle, sunflowers, and coneflowers.", {
		[Sprite.BEAK]: "#ffaf34",
		[Sprite.FOOT]: "#af8e75",
		[Sprite.FACE]: "#fff255",
		[Sprite.NOSE]: "#383838",
		[Sprite.HOOD]: "#383838",
		[Sprite.BELLY]: "#fff255",
		[Sprite.UNDERBELLY]: "#f5ea63",
		[Sprite.WING]: "#e8e079",
		[Sprite.WING_EDGE]: "#191919",
		[Sprite.THEME_HIGHLIGHT]: "#ffcc00"
	}),
	barnSwallow: new BirdType("Barn Swallow",
		"Agile birds that often roost in man-made structures, these birds are known to build nests near Ospreys for protection.", {
		[Sprite.FOOT]: "#af8e75",
		[Sprite.FACE]: "#db7c4d",
		[Sprite.BELLY]: "#f7e1c9",
		[Sprite.UNDERBELLY]: "#ebc9a3",
		[Sprite.WING]: "#2252a9",
		[Sprite.WING_EDGE]: "#1c448b",
		[Sprite.HOOD]: "#2252a9",
	}),
	mistletoebird: new BirdType("Mistletoebird",
		"Native to Australia, these birds eat mainly mistletoe and in turn spread the seeds far and wide.", {
		[Sprite.FOOT]: "#6c6a7c",
		[Sprite.FACE]: "#352e6d",
		[Sprite.BELLY]: "#fd6833",
		[Sprite.UNDERBELLY]: "#e6e1d8",
		[Sprite.WING]: "#342b7c",
		[Sprite.WING_EDGE]: "#282065",
	}),
	redAvadavat: new BirdType("Red Avadavat",
		"Native to India and southeast Asia, these birds are also known as Strawberry Finches due to their speckled plumage.", {
		[Sprite.BEAK]: "#f71919",
		[Sprite.FOOT]: "#af7575",
		[Sprite.FACE]: "#cb092b",
		[Sprite.BELLY]: "#ae1724",
		[Sprite.UNDERBELLY]: "#831b24",
		[Sprite.WING]: "#7e3030",
		[Sprite.WING_EDGE]: "#490f0f",
	}),
	scarletRobin: new BirdType("Scarlet Robin",
		"Native to Australia, this striking robin can be found in Eucalyptus forests.", {
		[Sprite.FOOT]: "#494949",
		[Sprite.FACE]: "#3d3d3d",
		[Sprite.BELLY]: "#fc5633",
		[Sprite.UNDERBELLY]: "#dcdcdc",
		[Sprite.WING]: "#2b2b2b",
		[Sprite.WING_EDGE]: "#ebebeb",
		[Sprite.THEME_HIGHLIGHT]: "#fc5633",
	}),
	americanRobin: new BirdType("American Robin",
		"While not a true robin, this social North American bird is so named due to its orange coloring. It seems unbothered by nearby humans.", {
		[Sprite.BEAK]: "#e89f30",
		[Sprite.FOOT]: "#9f8075",
		[Sprite.FACE]: "#2d2d2d",
		[Sprite.BELLY]: "#eb7a3a",
		[Sprite.UNDERBELLY]: "#eb7a3a",
		[Sprite.WING]: "#444444",
		[Sprite.WING_EDGE]: "#232323",
		[Sprite.THEME_HIGHLIGHT]: "#eb7a3a",
	}),
	carolinaWren: new BirdType("Carolina Wren",
		"Native to the eastern United States, these little birds are known for their curious and energetic nature.", {
		[Sprite.FOOT]: "#af8e75",
		[Sprite.FACE]: "#edc7a9",
		[Sprite.NOSE]: "#f7eee5",
		[Sprite.HOOD]: "#c58a5b",
		[Sprite.BELLY]: "#e1b796",
		[Sprite.UNDERBELLY]: "#c79e7c",
		[Sprite.WING]: "#c58a5b",
		[Sprite.WING_EDGE]: "#866348",
	}),
};