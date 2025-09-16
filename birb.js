// @ts-check

// @ts-ignore
const SHARED_CONFIG = {
	birbCssScale: 1,
	uiCssScale: 1,
	canvasPixelSize: 1,
	hopSpeed: 0.07,
	hopDistance: 45,
};


const DESKTOP_CONFIG = {
	flySpeed: 0.2,
};

const MOBILE_CONFIG = {
	uiCssScale: 0.9,
	flySpeed: 0.125,
};

const CONFIG = { ...SHARED_CONFIG, ...isMobile() ? MOBILE_CONFIG : DESKTOP_CONFIG };

let debugMode = location.hostname === "127.0.0.1";
let frozen = false;

const BIRB_CSS_SCALE = CONFIG.birbCssScale;
const UI_CSS_SCALE = CONFIG.uiCssScale;
const CANVAS_PIXEL_SIZE = CONFIG.canvasPixelSize;
const WINDOW_PIXEL_SIZE = CANVAS_PIXEL_SIZE * BIRB_CSS_SCALE;
const HOP_SPEED = CONFIG.hopSpeed;
const FLY_SPEED = CONFIG.flySpeed;
const HOP_DISTANCE = CONFIG.hopDistance;
// Time in milliseconds until the user is considered AFK
const AFK_TIME = debugMode ? 0 : 1000 * 30;
const SPRITE_HEIGHT = 32;
const MENU_ID = "birb-menu";
const MENU_EXIT_ID = "birb-menu-exit";
const FIELD_GUIDE_ID = "birb-field-guide";
const FEATHER_ID = "birb-feather";


const DEFAULT_SETTINGS = {
	birbMode: false
};

/**
 * @typedef {typeof DEFAULT_SETTINGS} Settings
 */

/** @type {Partial<Settings>} */
let userSettings = {};

const STYLESHEET = `___STYLESHEET___`;

class Layer {
	/**
	 * @param {string[][]} pixels
	 * @param {string} [tag]
	 */
	constructor(pixels, tag = "default") {
		this.pixels = pixels;
		this.tag = tag;
	}
}

class Frame {

	/** @type {{ [tag: string]: string[][] }} */
	#pixelsByTag = {};

	/**
	 * @param {Layer[]} layers
	 */
	constructor(layers) {
		/** @type {Set<string>} */
		let tags = new Set();
		for (let layer of layers) {
			tags.add(layer.tag);
		}
		tags.add("default");
		for (let tag of tags) {
			let maxHeight = layers.reduce((max, layer) => Math.max(max, layer.pixels.length), 0);
			if (layers[0].tag !== "default") {
				throw new Error("First layer must have the 'default' tag");
			}
			this.pixels = layers[0].pixels.map(row => row.slice());
			// Pad from top with transparent pixels
			while (this.pixels.length < maxHeight) {
				this.pixels.unshift(new Array(this.pixels[0].length).fill(TRANSPARENT));
			}
			// Combine layers
			for (let i = 1; i < layers.length; i++) {
				if (layers[i].tag === "default" || layers[i].tag === tag) {
					let layerPixels = layers[i].pixels;
					let topMargin = maxHeight - layerPixels.length;
					for (let y = 0; y < layerPixels.length; y++) {
						for (let x = 0; x < layerPixels[y].length; x++) {
							this.pixels[y + topMargin][x] = layerPixels[y][x] !== TRANSPARENT ? layerPixels[y][x] : this.pixels[y + topMargin][x];
						}
					}
				}
			}
			this.#pixelsByTag[tag] = this.pixels.map(row => row.slice());
		}
	}

	/**
	 * @param {string} [tag]
	 * @returns {string[][]}
	 */
	getPixels(tag = "default") {
		return this.#pixelsByTag[tag] ?? this.#pixelsByTag["default"];
	}

	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} direction
	 * @param {BirdType} [species]
	 */
	draw(ctx, direction, species) {
		const pixels = this.getPixels(species?.tags[0]);
		for (let y = 0; y < pixels.length; y++) {
			const row = pixels[y];
			for (let x = 0; x < pixels[y].length; x++) {
				const cell = direction === Directions.LEFT ? row[x] : row[pixels[y].length - x - 1];
				ctx.fillStyle = species?.colors[cell] ?? cell;
				ctx.fillRect(x * CANVAS_PIXEL_SIZE, y * CANVAS_PIXEL_SIZE, CANVAS_PIXEL_SIZE, CANVAS_PIXEL_SIZE);
			};
		};
	}
}

class Anim {
	/**
	 * @param {Frame[]} frames
	 * @param {number[]} durations
	 * @param {boolean} loop
	 */
	constructor(frames, durations, loop = true) {
		this.frames = frames;
		this.durations = durations;
		this.loop = loop;
	}

	getAnimationDuration() {
		return this.durations.reduce((a, b) => a + b, 0);
	}

	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} direction
	 * @param {number} timeStart The start time of the animation in milliseconds
	 * @param {BirdType} [species] The species to use for the animation
	 * @returns {boolean} Whether the animation is complete
	 */
	draw(ctx, direction, timeStart, species) {
		let time = Date.now() - timeStart;
		const duration = this.getAnimationDuration();
		if (this.loop) {
			time %= duration;
		}
		let totalDuration = 0;
		for (let i = 0; i < this.durations.length; i++) {
			totalDuration += this.durations[i];
			if (time < totalDuration) {
				this.frames[i].draw(ctx, direction, species);
				return false;
			}
		}
		// Draw the last frame if the animation is complete
		this.frames[this.frames.length - 1].draw(ctx, direction, species);
		return true;
	}
}

const THEME_HIGHLIGHT = "theme-highlight";
const TRANSPARENT = "transparent";
const OUTLINE = "outline";
const BORDER = "border";
const FOOT = "foot";
const BEAK = "beak";
const EYE = "eye";
const FACE = "face";
const HOOD = "hood";
const NOSE = "nose";
const BELLY = "belly";
const UNDERBELLY = "underbelly";
const WING = "wing";
const WING_EDGE = "wing-edge";
const HEART = "heart";
const HEART_BORDER = "heart-border";
const HEART_SHINE = "heart-shine";
const FEATHER_SPINE = "feather-spine";

/** @type {Record<string, string>} */
const SPRITE_SHEET_COLOR_MAP = {
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

/** @type {Record<string, BirdType>} */
const species = {
	bluebird: new BirdType("Eastern Bluebird",
		"Native to North American and very social, though can be timid around people.", {
		[FOOT]: "#af8e75",
		[FACE]: "#639bff",
		[BELLY]: "#f8b143",
		[UNDERBELLY]: "#ec8637",
		[WING]: "#578ae6",
		[WING_EDGE]: "#326ed9",
	}),
	shimaEnaga: new BirdType("Shima Enaga",
		"Small, fluffy birds found in the snowy regions of Japan, these birds are highly sought after by ornithologists and nature photographers.", {
		[FOOT]: "#af8e75",
		[FACE]: "#ffffff",
		[BELLY]: "#ebe9e8",
		[UNDERBELLY]: "#ebd9d0",
		[WING]: "#f3d3c1",
		[WING_EDGE]: "#2d2d2dff",
		[THEME_HIGHLIGHT]: "#d7ac93",
	}),
	tuftedTitmouse: new BirdType("Tufted Titmouse",
		"Native to the eastern United States, full of personality, and notably my wife's favorite bird.", {
		[FOOT]: "#af8e75",
		[FACE]: "#c7cad7",
		[BELLY]: "#e4e5eb",
		[UNDERBELLY]: "#d7cfcb",
		[WING]: "#b1b5c5",
		[WING_EDGE]: "#9d9fa9",
	}, ["tuft"]),
	europeanRobin: new BirdType("European Robin",
		"Native to western Europe, this is the quintessential robin. Quite friendly, you'll often find them searching for worms.", {
		[FOOT]: "#af8e75",
		[FACE]: "#ffaf34",
		[HOOD]: "#aaa094",
		[BELLY]: "#ffaf34",
		[UNDERBELLY]: "#babec2",
		[WING]: "#aaa094",
		[WING_EDGE]: "#888580",
		[THEME_HIGHLIGHT]: "#ffaf34",
	}),
	redCardinal: new BirdType("Red Cardinal",
		"Native to the eastern United States, this strikingly red bird is hard to miss.", {
		[BEAK]: "#d93619",
		[FOOT]: "#af8e75",
		[FACE]: "#31353d",
		[HOOD]: "#e83a1b",
		[BELLY]: "#e83a1b",
		[UNDERBELLY]: "#dc3719",
		[WING]: "#d23215",
		[WING_EDGE]: "#b1321c",
	}, ["tuft"]),
	americanGoldfinch: new BirdType("American Goldfinch",
		"Coloured a brilliant yellow, this bird feeds almost entirely on the seeds of plants such as thistle, sunflowers, and coneflowers.", {
		[BEAK]: "#ffaf34",
		[FOOT]: "#af8e75",
		[FACE]: "#fff255",
		[NOSE]: "#383838",
		[HOOD]: "#383838",
		[BELLY]: "#fff255",
		[UNDERBELLY]: "#f5ea63",
		[WING]: "#e8e079",
		[WING_EDGE]: "#191919",
		[THEME_HIGHLIGHT]: "#ffcc00"
	}),
	barnSwallow: new BirdType("Barn Swallow",
		"Agile birds that often roost in man-made structures, these birds are known to build nests near Ospreys for protection.", {
		[FOOT]: "#af8e75",
		[FACE]: "#db7c4d",
		[BELLY]: "#f7e1c9",
		[UNDERBELLY]: "#ebc9a3",
		[WING]: "#2252a9",
		[WING_EDGE]: "#1c448b",
		[HOOD]: "#2252a9",
	}),
	mistletoebird: new BirdType("Mistletoebird",
		"Native to Australia, these birds eat mainly mistletoe and in turn spread the seeds far and wide.", {
		[FOOT]: "#6c6a7c",
		[FACE]: "#352e6d",
		[BELLY]: "#fd6833",
		[UNDERBELLY]: "#e6e1d8",
		[WING]: "#342b7c",
		[WING_EDGE]: "#282065",
	}),
	redAvadavat: new BirdType("Red Avadavat",
		"Native to India and southeast Asia, these birds are also known as Strawberry Finches due to their speckled plumage.", {
		[BEAK]: "#f71919",
		[FOOT]: "#af7575",
		[FACE]: "#cb092b",
		[BELLY]: "#ae1724",
		[UNDERBELLY]: "#831b24",
		[WING]: "#7e3030",
		[WING_EDGE]: "#490f0f",
	}),
	scarletRobin: new BirdType("Scarlet Robin",
		"Native to Australia, this striking robin can be found in Eucalyptus forests.", {
		[FOOT]: "#494949",
		[FACE]: "#3d3d3d",
		[BELLY]: "#fc5633",
		[UNDERBELLY]: "#dcdcdc",
		[WING]: "#2b2b2b",
		[WING_EDGE]: "#ebebeb",
		[THEME_HIGHLIGHT]: "#fc5633",
	}),
	americanRobin: new BirdType("American Robin",
		"While not a true robin, this social North American bird is so named due to its orange coloring. It seems unbothered by nearby humans.", {
		[BEAK]: "#e89f30",
		[FOOT]: "#9f8075",
		[FACE]: "#2d2d2d",
		[BELLY]: "#eb7a3a",
		[UNDERBELLY]: "#eb7a3a",
		[WING]: "#444444",
		[WING_EDGE]: "#232323",
		[THEME_HIGHLIGHT]: "#eb7a3a",
	}),
	carolinaWren: new BirdType("Carolina Wren",
		"Native to the eastern United States, these little birds are known for their curious and energetic nature.", {
		[FOOT]: "#af8e75",
		[FACE]: "#edc7a9",
		[NOSE]: "#f7eee5",
		[HOOD]: "#c58a5b",
		[BELLY]: "#e1b796",
		[UNDERBELLY]: "#c79e7c",
		[WING]: "#c58a5b",
		[WING_EDGE]: "#866348",
	}),
};

const DEFAULT_BIRD = "bluebird";


const Directions = {
	LEFT: -1,
	RIGHT: 1,
};

const SPRITE_WIDTH = 32;
const DECORATIONS_SPRITE_WIDTH = 48;
const FEATHER_SPRITE_WIDTH = 32;

const SPRITE_SHEET = "__SPRITE_SHEET__";
const DECORATIONS_SPRITE_SHEET = "__DECORATIONS_SPRITE_SHEET__";
const FEATHER_SPRITE_SHEET = "__FEATHER_SPRITE_SHEET__";

/**
 * Load the sprite sheet and return the pixel-map template
 * @param {string} dataUri
 * @param {boolean} [templateColors]
 * @returns {Promise<string[][]>}
 */
function loadSpriteSheetPixels(dataUri, templateColors = true) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.src = dataUri;
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
						row.push(TRANSPARENT);
						continue;
					}
					const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
					if (!templateColors) {
						row.push(hex);
						continue;
					}
					if (SPRITE_SHEET_COLOR_MAP[hex] === undefined) {
						error(`Unknown color: ${hex}`);
						row.push(TRANSPARENT);
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

// @ts-ignore
Promise.all([loadSpriteSheetPixels(SPRITE_SHEET), loadSpriteSheetPixels(DECORATIONS_SPRITE_SHEET, false), loadSpriteSheetPixels(FEATHER_SPRITE_SHEET)]).then(([birbPixels, decorationPixels, featherPixels]) => {
	const SPRITE_SHEET = birbPixels;
	const DECORATIONS_SPRITE_SHEET = decorationPixels;
	const FEATHER_SPRITE_SHEET = featherPixels;

	const layers = {
		base: new Layer(getLayer(SPRITE_SHEET, 0)),
		down: new Layer(getLayer(SPRITE_SHEET, 1)),
		heartOne: new Layer(getLayer(SPRITE_SHEET, 2)),
		heartTwo: new Layer(getLayer(SPRITE_SHEET, 3)),
		heartThree: new Layer(getLayer(SPRITE_SHEET, 4)),
		tuftBase: new Layer(getLayer(SPRITE_SHEET, 5), "tuft"),
		tuftDown: new Layer(getLayer(SPRITE_SHEET, 6), "tuft"),
		wingsUp: new Layer(getLayer(SPRITE_SHEET, 7)),
		wingsDown: new Layer(getLayer(SPRITE_SHEET, 8)),
		happyEye: new Layer(getLayer(SPRITE_SHEET, 9)),
	};

	const decorationLayers = {
		mac: new Layer(getLayer(DECORATIONS_SPRITE_SHEET, 0, DECORATIONS_SPRITE_WIDTH)),
	};

	const featherLayers = {
		feather: new Layer(getLayer(FEATHER_SPRITE_SHEET, 0, FEATHER_SPRITE_WIDTH)),
	};

	const birbFrames = {
		base: new Frame([layers.base, layers.tuftBase]),
		headDown: new Frame([layers.down, layers.tuftDown]),
		wingsDown: new Frame([layers.base, layers.tuftBase, layers.wingsDown]),
		wingsUp: new Frame([layers.down, layers.tuftDown, layers.wingsUp]),
		heartOne: new Frame([layers.base, layers.tuftBase, layers.happyEye, layers.heartOne]),
		heartTwo: new Frame([layers.base, layers.tuftBase, layers.happyEye, layers.heartTwo]),
		heartThree: new Frame([layers.base, layers.tuftBase, layers.happyEye, layers.heartThree]),
		heartFour: new Frame([layers.base, layers.tuftBase, layers.happyEye, layers.heartTwo]),
	};

	const decorationFrames = {
		mac: new Frame([decorationLayers.mac]),
	};

	const featherFrames = {
		feather: new Frame([featherLayers.feather]),
	};

	const Animations = {
		STILL: new Anim([birbFrames.base], [1000]),
		BOB: new Anim([
			birbFrames.base,
			birbFrames.headDown
		], [
			420,
			420
		]),
		FLYING: new Anim([
			birbFrames.base,
			birbFrames.wingsUp,
			birbFrames.headDown,
			birbFrames.wingsDown,
		], [
			30,
			80,
			30,
			60,
		]),
		HEART: new Anim([
			birbFrames.heartOne,
			birbFrames.heartTwo,
			birbFrames.heartThree,
			birbFrames.heartFour,
			birbFrames.heartThree,
			birbFrames.heartFour,
			birbFrames.heartThree,
			birbFrames.heartFour,
		], [
			60,
			80,
			250,
			250,
			250,
			250,
			250,
			250,
		], false),
	};

	const DECORATION_ANIMATIONS = {
		mac: new Anim([
			decorationFrames.mac,
		], [
			1000,
		]),
	};

	const FEATHER_ANIMATIONS = {
		feather: new Anim([
			featherFrames.feather,
		], [
			1000,
		]),
	};

	class MenuItem {
		/**
		 * @param {string} text
		 * @param {() => void} action
		 * @param {boolean} [removeMenu]
		 * @param {boolean} [isDebug]
		 */
		constructor(text, action, removeMenu = true, isDebug = false) {
			this.text = text;
			this.action = action;
			this.removeMenu = removeMenu;
			this.isDebug = isDebug;
		}
	}

	class DebugMenuItem extends MenuItem {
		/**
		 * @param {string} text
		 * @param {() => void} action
		 */
		constructor(text, action, removeMenu = true) {
			super(text, action, removeMenu, true);
		}
	}

	class Separator extends MenuItem {
		constructor() {
			super("", () => { });
		}
	}

	class StickyNote {
		/**
		 * @param {string} id
		 * @param {string} [site]
		 * @param {string} [content]
		 * @param {number} [top]
		 * @param {number} [left]
		 */
		constructor(id, site = "", content = "", top = 0, left = 0) {
			this.id = id;
			this.site = site;
			this.content = content;
			this.top = top;
			this.left = left;
		}
	}

	const menuItems = [
		new MenuItem(`Pet ${birdBirb()}`, pet),
		new MenuItem("Field Guide", insertFieldGuide),
		// new MenuItem("Decorations", insertDecoration),
		new DebugMenuItem("Applications", () => switchMenuItems(otherItems), false),
		new MenuItem("Sticky Note", newStickyNote),
		new MenuItem(`Hide ${birdBirb()}`, hideBirb),
		new DebugMenuItem("Freeze/Unfreeze", () => {
			frozen = !frozen;
		}),
		new DebugMenuItem("Reset Data", resetSaveData),
		new DebugMenuItem("Unlock All", () => {
			for (let type in species) {
				unlockBird(type);
			}
		}),
		new DebugMenuItem("Disable Debug", () => {
			debugMode = false;
		}),
		new Separator(),
		new MenuItem("Settings", () => switchMenuItems(settingsItems), false),
	];

	const settingsItems = [
		new MenuItem("Go Back", () => switchMenuItems(menuItems), false),
		new Separator(),
		new MenuItem("Toggle Birb Mode", () => {
			userSettings.birbMode = !userSettings.birbMode;
			save();
			insertModal(`${birdBirb()} Mode`, `Your ${birdBirb().toLowerCase()} shall now be referred to as "${birdBirb()}"${userSettings.birbMode ? "\n\nWelcome back to 2012" : ""}`);
		})
	];

	const otherItems = [
		new MenuItem("Go Back", () => switchMenuItems(menuItems), false),
		new Separator(),
		new MenuItem("Video Games", () => switchMenuItems(gameItems), false),
		new MenuItem("Utilities", () => switchMenuItems(utilityItems), false),
		new MenuItem("Music Player", () => insertMusicPlayer(), false),
	];

	const gameItems = [
		new MenuItem("Go Back", () => switchMenuItems(otherItems), false),
		new Separator(),
		new MenuItem("Pinball", () => insertPico8("Terra Nova Pinball", "terra_nova_pinball")),
		new MenuItem("Pico Dino", () => insertPico8("Pico Dino", "picodino")),
		new MenuItem("Woodworm", () => insertPico8("Woodworm", "woodworm")),
		new MenuItem("Pico and Chill", () => insertPico8("Pico and Chill", "picochill")),
		new MenuItem("Lani's Trek", () => insertPico8("Celeste 2 Lani's Trek", "celeste_classic_2")),
		new MenuItem("Tetraminis", () => insertPico8("Tetraminis", "tetraminisdeffect")),
		// new MenuItem("Pool", () => insertPico8("Pool", "mot_pool")),
	];

	const utilityItems = [
		new MenuItem("Go Back", () => switchMenuItems(otherItems), false),
		new Separator(),
		new MenuItem("Pomodoro Timer", () => insertPico8("Pomodoro", "pomodorotimerv1")),
		new MenuItem("Ohm Calculator", () => insertPico8("Resistor Calculator", "picoohm")),
		new MenuItem("Wobblepaint	", () => insertPico8("Wobblepaint", "wobblepaint")),
	];

	const styleElement = document.createElement("style");
	const canvas = document.createElement("canvas");

	/** @type {CanvasRenderingContext2D} */
	// @ts-ignore
	const ctx = canvas.getContext("2d");

	const States = {
		IDLE: "idle",
		HOP: "hop",
		FLYING: "flying",
	};

	let stateStart = Date.now();
	let currentState = States.IDLE;
	let animStart = Date.now();
	let currentAnimation = Animations.BOB;
	let direction = Directions.RIGHT;
	let ticks = 0;
	// Bird's current position
	let birdY = 0;
	let birdX = 0;
	// Bird's starting position (when flying)
	let startX = 0;
	let startY = 0;
	// Bird's target position (when flying)
	let targetX = 0;
	let targetY = 0;
	/** @type {HTMLElement|null} */
	let focusedElement = null;
	let lastActionTimestamp = Date.now();
	/** @type {number[]} */
	let petStack = [];
	let currentSpecies = DEFAULT_BIRD;
	let unlockedSpecies = [DEFAULT_BIRD];
	let visible = true;
	let lastPetTimestamp = 0;
	/** @type {StickyNote[]} */
	let stickyNotes = [];


	/**
	 * @returns {boolean} Whether the script is running in a userscript extension context
	 */
	function isUserScript() {
		// @ts-ignore
		return typeof GM_getValue === "function";
	}

	function isTestEnvironment() {
		return window.location.hostname === "127.0.0.1"
			|| window.location.hostname === "localhost"
			|| window.location.hostname.startsWith("192.168.");
	}

	function load() {
		/** @type {Record<string, any>} */
		let saveData = {};
		if (isUserScript()) {
			log("Loading save data from UserScript storage");
			// @ts-ignore
			saveData = GM_getValue("birbSaveData", {}) ?? {};
		} else if (isTestEnvironment()) {
			log("Test environment detected, loading save data from localStorage");
			saveData = JSON.parse(localStorage.getItem("birbSaveData") ?? "{}");
		} else {
			log("Not a UserScript");
		}
		debug("Loaded data: " + JSON.stringify(saveData));
		if (!saveData.settings) {
			log("No user settings found in save data, starting fresh");
		}
		userSettings = saveData.settings ?? {};
		unlockedSpecies = saveData.unlockedSpecies ?? [DEFAULT_BIRD];
		currentSpecies = saveData.currentSpecies ?? DEFAULT_BIRD;
		stickyNotes = [];
		if (saveData.stickyNotes) {
			for (let note of saveData.stickyNotes) {
				if (note.id) {
					stickyNotes.push(new StickyNote(note.id, note.site, note.content, note.top, note.left));
				}
			}
		}
		log(stickyNotes.length + " sticky notes loaded");
		switchSpecies(currentSpecies);
	}

	function save() {
		/** @type {Record<string, any>} */
		let saveData = {
			unlockedSpecies: unlockedSpecies,
			currentSpecies: currentSpecies,
			settings: userSettings
		};
		if (stickyNotes.length > 0) {
			saveData.stickyNotes = stickyNotes.map(note => ({
				id: note.id,
				site: note.site,
				content: note.content,
				top: note.top,
				left: note.left
			}));
		}
		if (isUserScript()) {
			log("Saving data to UserScript storage");
			// @ts-ignore
			GM_setValue("birbSaveData", saveData);
		} else if (isTestEnvironment()) {
			log("Test environment detected, saving data to localStorage");
			localStorage.setItem("birbSaveData", JSON.stringify(saveData));
		} else {
			log("Not a UserScript");
		}
	}

	function resetSaveData() {
		if (isUserScript()) {
			log("Resetting save data in UserScript storage");
			// @ts-ignore
			GM_deleteValue("birbSaveData");
		} else if (isTestEnvironment()) {
			log("Test environment detected, resetting save data in localStorage");
			localStorage.removeItem("birbSaveData");
		} else {
			log("Not a UserScript");
		}
		load();
	}

	/**
	 * Get the user settings merged with default settings
	 * @returns {Settings} The merged settings
	 */
	function settings() {
		return { ...DEFAULT_SETTINGS, ...userSettings };
	}

	/**
	 * Bird or birb, you decide
	 */
	function birdBirb() {
		return settings().birbMode ? "Birb" : "Bird";
	}

	function init() {
		if (window !== window.top) {
			// Skip installation if within an iframe
			return;
		}

		// Preload font
		const MONOCRAFT_SRC = "https://cdn.jsdelivr.net/gh/idreesinc/Monocraft@99b32ab40612ff2533a69d8f14bd8b3d9e604456/dist/Monocraft.otf";
		const fontLink = document.createElement("link");
		fontLink.rel = "stylesheet";
		fontLink.href = `url(${MONOCRAFT_SRC}) format('opentype')`;
		document.head.appendChild(fontLink);

		// Add stylesheet font-face
		const fontFace = `
			@font-face {
				font-family: 'Monocraft';
				src: url(${MONOCRAFT_SRC}) format('opentype');
				font-weight: normal;
				font-style: normal;
			}
		`;
		const fontStyle = document.createElement("style");
		fontStyle.innerHTML = fontFace;
		document.head.appendChild(fontStyle);

		load();

		styleElement.innerHTML = STYLESHEET;
		document.head.appendChild(styleElement);

		canvas.id = "birb";
		canvas.width = birbFrames.base.getPixels()[0].length * CANVAS_PIXEL_SIZE;
		canvas.height = SPRITE_HEIGHT * CANVAS_PIXEL_SIZE;
		document.body.appendChild(canvas);

		/** @type {NodeJS.Timeout} */
		let scrollTimeout;
		window.addEventListener("scroll", () => {
			// TODO: Only do this if focused on the ground
			if (focusedElement === null && currentState !== States.FLYING) {
				canvas.style.transition = "opacity 0.2s";
				canvas.style.opacity = "0";
			}
			lastActionTimestamp = Date.now();
			clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(() => {
				canvas.style.transition = "opacity 0.4s";
				canvas.style.opacity = "1";
			}, 100);
		});

		onClick(document, (e) => {
			lastActionTimestamp = Date.now();
			if (e.target instanceof Node && document.querySelector("#" + MENU_EXIT_ID)?.contains(e.target)) {
				removeMenu();
			}
		});

		onClick(canvas, () => {
			insertMenu();
		});

		canvas.addEventListener("mouseover", () => {
			lastActionTimestamp = Date.now();
			if (currentState === States.IDLE) {
				petStack.push(Date.now());
				if (petStack.length > 10) {
					petStack.shift();
				}
				const pets = petStack.filter((time) => Date.now() - time < 1000).length;
				if (pets >= 3) {
					setAnimation(Animations.HEART);
					// Clear the stack
					petStack = [];
				}
			}
		});

		drawStickyNotes();

		let lastUrl = (window.location.href ?? "").split("?")[0];
		setInterval(() => {
			const currentUrl = (window.location.href ?? "").split("?")[0];
			if (currentUrl !== lastUrl) {
				log("URL changed, updating sticky notes");
				lastUrl = currentUrl;
				drawStickyNotes();
			}
		}, 500);

		setInterval(update, 1000 / 60);

		birdY = getWindowBottom();

		// TODO: For testing only
		hop();
	}

	function drawStickyNotes() {
		// Remove all existing sticky notes
		const existingNotes = document.querySelectorAll(".birb-sticky-note");
		existingNotes.forEach(note => note.remove());
		// Render all sticky notes
		for (let stickyNote of stickyNotes) {
			if (isStickyNoteApplicable(stickyNote)) {
				renderStickyNote(stickyNote);
			}
		}
	}

	/**
	 * Run the bird's behavior logic
	 */
	function update() {
		ticks++;

		// Hide bird if the browser is fullscreen
		if (document.fullscreenElement) {
			hideBirb();
			// Won't be restored on fullscreen exit
		}

		if (currentState === States.IDLE) {
			if (Math.random() < 1 / (60 * 3) && currentAnimation !== Animations.HEART && !isMenuOpen()) {
				hop();
			} else if (Math.random() < 1 / (60 * 20) && Date.now() - lastActionTimestamp > AFK_TIME && !isMenuOpen()) {
				focusOnElement();
				lastActionTimestamp = Date.now();
			}
		}

		const FEATHER_CHANCE = 1 / (60 * 60 * 60 * 2); // 1 every 2 hours (ticks * seconds * minutes * hours)
		// Double the chance of a feather if recently pet
		let petMod = Date.now() - lastPetTimestamp < 1000 * 60 * 5 ? 2 : 1;
		if (visible && Math.random() < FEATHER_CHANCE * petMod) {
			lastPetTimestamp = 0;
			activateFeather();
		}
		updateFeather();
	}

	/**
	 * Render the bird in the dom and update its position if necessary
	 */
	function draw() {
		requestAnimationFrame(draw);

		if (!visible) {
			return;
		}

		// Update the bird's position
		if (currentState === States.IDLE) {
			if (focusedElement !== null) {
				birdY = getFocusedElementY();
				if (!isWithinHorizontalBounds(birdX)) {
					focusOnGround();
				}
			} else {
				// Ground the bird
				birdY = getWindowBottom();
			}
		} else if (currentState === States.FLYING) {
			// Fly to target location (even if in the air)
			if (updateParabolicPath(FLY_SPEED)) {
				setState(States.IDLE);
			}
		} else if (currentState === States.HOP) {
			if (updateParabolicPath(HOP_SPEED)) {
				setState(States.IDLE);
			}
		}

		if (focusedElement === null) {
			if (Date.now() - lastActionTimestamp > AFK_TIME && !isMenuOpen()) {
				// Fly to an element if the user is AFK
				// focusOnElement();
				// lastActionTimestamp = Date.now();
			}
		} else if (focusedElement !== null) {
			targetY = getFocusedElementY();
			if (targetY < window.scrollY || targetY > window.scrollY + window.innerHeight) {
				// Fly to ground if the focused element moves out of bounds
				focusOnGround();
			}
		}

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (currentAnimation.draw(ctx, direction, animStart, species[currentSpecies])) {
			setAnimation(Animations.STILL);
		}

		// Update HTML element position
		setX(birdX);
		setY(birdY);
	}

	init();
	draw();

	function newStickyNote() {
		const id = Date.now().toString();
		const site = window.location.href;
		const stickyNote = new StickyNote(id, site, "");
		const element = renderStickyNote(stickyNote);
		element.style.left = `${window.innerWidth / 2 - element.offsetWidth / 2}px`;
		element.style.top = `${window.scrollY + window.innerHeight / 2 - element.offsetHeight / 2}px`;
		stickyNote.top = parseInt(element.style.top, 10);
		stickyNote.left = parseInt(element.style.left, 10);
		stickyNotes.push(stickyNote);
		save();
	}

	/**
	 * @param {StickyNote} stickyNote
	 * @returns {HTMLElement}
	 */
	function renderStickyNote(stickyNote) {
		let html = `
			<div class="birb-window-header">
				<div class="birb-window-title">Sticky Note</div>
				<div class="birb-window-close">x</div>
			</div>
			<div class="birb-window-content">
				<textarea class="birb-sticky-note-input" style="width: 150px;" placeholder="Write your notes here and they'll stick to the page!">${stickyNote.content}</textarea>
			</div>`
		const noteElement = makeElement("birb-window");
		noteElement.classList.add("birb-sticky-note");
		noteElement.innerHTML = html;

		noteElement.style.top = `${stickyNote.top}px`;
		noteElement.style.left = `${stickyNote.left}px`;
		document.body.appendChild(noteElement);

		makeDraggable(noteElement.querySelector(".birb-window-header"), true, (top, left) => {
			stickyNote.top = top;
			stickyNote.left = left;
			save();
		});

		const closeButton = noteElement.querySelector(".birb-window-close");
		if (closeButton) {
			makeClosable(() => {
				if (confirm("Are you sure you want to delete this sticky note?")) {
					deleteStickyNote(stickyNote);
					noteElement.remove();
				}
			}, closeButton);
		}

		const textarea = noteElement.querySelector(".birb-sticky-note-input");
		if (textarea && textarea instanceof HTMLTextAreaElement) {
			/** @type {NodeJS.Timeout | undefined} */
			let saveTimeout;
			// Save after debounce
			textarea.addEventListener("input", () => {
				stickyNote.content = textarea.value;
				if (saveTimeout) {
					clearTimeout(saveTimeout);
				}
				saveTimeout = setTimeout(() => {
					save();
				}, 250);
			});
		}

		// On window resize
		window.addEventListener("resize", () => {
			const modTop = `${stickyNote.top - Math.min(window.innerHeight - noteElement.offsetHeight, stickyNote.top)}px`;
			const modLeft = `${stickyNote.left - Math.min(window.innerWidth - noteElement.offsetWidth, stickyNote.left)}px`;
			noteElement.style.transform = `scale(var(--birb-ui-scale)) translate(-${modLeft}, -${modTop})`;
		});

		return noteElement;
	}

	/**
	 * @param {StickyNote} stickyNote
	 */
	function deleteStickyNote(stickyNote) {
		stickyNotes = stickyNotes.filter(note => note.id !== stickyNote.id);
		save();
	}

	/**
	 * @param {StickyNote} stickyNote
	 * @returns {boolean} Whether the given sticky note is applicable to the current site/page
	 */
	function isStickyNoteApplicable(stickyNote) {
		const stickyNoteUrl = stickyNote.site;
		const currentUrl = window.location.href;
		const stickyNoteWebsite = stickyNoteUrl.split("?")[0];
		const currentWebsite = currentUrl.split("?")[0];

		debug("Comparing " + stickyNoteUrl + " with " + currentUrl);

		if (stickyNoteWebsite !== currentWebsite) {
			return false;
		}

		/** @type {Record<string, string>} */
		const stickyNoteParams = stickyNoteUrl.split("?")[1]?.split("&").reduce((params, param) => {
			const [key, value] = param.split("=");
			return { ...params, [key]: value };
		}, {});

		/** @type {Record<string, string>} */
		const currentParams = currentUrl.split("?")[1]?.split("&").reduce((params, param) => {
			const [key, value] = param.split("=");
			return { ...params, [key]: value };
		}, {});

		debug("Comparing params: ", stickyNoteParams, currentParams);

		if (window.location.hostname === "www.youtube.com") {
			if (currentParams.v !== undefined && currentParams.v !== stickyNoteParams.v) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Create an HTML element with the specified parameters
	 * @param {string} className
	 * @param {string} [textContent]
	 * @param {string} [id]
	 * @returns {HTMLElement}
	 */
	function makeElement(className, textContent, id) {
		const element = document.createElement("div");
		element.classList.add(className);
		if (textContent) {
			element.textContent = textContent;
		}
		if (id) {
			element.id = id;
		}
		return element;
	}

	function insertDecoration() {
		// Create a canvas element for the decoration
		const decorationCanvas = document.createElement("canvas");
		decorationCanvas.classList.add("birb-decoration");
		decorationCanvas.width = DECORATIONS_SPRITE_WIDTH * CANVAS_PIXEL_SIZE;
		decorationCanvas.height = DECORATIONS_SPRITE_WIDTH * CANVAS_PIXEL_SIZE;
		const decorationCtx = decorationCanvas.getContext("2d");
		if (!decorationCtx) {
			return;
		}
		// Draw the decoration
		DECORATION_ANIMATIONS.mac.draw(decorationCtx, Directions.LEFT, Date.now());
		// Add the decoration to the page
		document.body.appendChild(decorationCanvas);
		makeDraggable(decorationCanvas, false);
	}

	function activateFeather() {
		if (document.querySelector("#" + FEATHER_ID)) {
			return;
		}
		const speciesToUnlock = Object.keys(species).filter((species) => !unlockedSpecies.includes(species));
		if (speciesToUnlock.length === 0) {
			// No more species to unlock
			return;
		}
		const birdType = speciesToUnlock[Math.floor(Math.random() * speciesToUnlock.length)];
		insertFeather(birdType);
	}

	/**
	 * @param {string} birdType
	 */
	function insertFeather(birdType) {
		let type = species[birdType];
		const featherCanvas = document.createElement("canvas");
		featherCanvas.id = FEATHER_ID;
		featherCanvas.classList.add("birb-decoration");
		featherCanvas.width = FEATHER_SPRITE_WIDTH * CANVAS_PIXEL_SIZE;
		featherCanvas.height = FEATHER_SPRITE_WIDTH * CANVAS_PIXEL_SIZE;
		const x = featherCanvas.width * 2 + Math.random() * (window.innerWidth - featherCanvas.width * 4);
		featherCanvas.style.marginLeft = `${x}px`;
		featherCanvas.style.top = `${-featherCanvas.height}px`;
		const featherCtx = featherCanvas.getContext("2d");
		if (!featherCtx) {
			return;
		}
		FEATHER_ANIMATIONS.feather.draw(featherCtx, Directions.LEFT, Date.now(), type);
		document.body.appendChild(featherCanvas);
		onClick(featherCanvas, () => {
			unlockBird(birdType);
			removeFeather();
			if (document.querySelector("#" + FIELD_GUIDE_ID)) {
				removeFieldGuide();
				insertFieldGuide();
			}
		});
	}

	function removeFeather() {
		const feather = document.querySelector("#" + FEATHER_ID);
		if (feather) {
			feather.remove();
		}
	}

	/**
	 * @param {string} birdType
	 */
	function unlockBird(birdType) {
		if (!unlockedSpecies.includes(birdType)) {
			unlockedSpecies.push(birdType);
			insertModal("New Bird Unlocked!", `You've found a <b>${species[birdType].name}</b> feather! Use the Field Guide to switch your bird's species.`);
		}
		save();
	}

	function updateFeather() {
		const feather = document.querySelector("#birb-feather");
		const featherGravity = 1;
		if (!feather || !(feather instanceof HTMLElement)) {
			return;
		}
		const y = parseInt(feather.style.top || "0") + featherGravity;
		feather.style.top = `${Math.min(y, window.innerHeight - feather.offsetHeight)}px`;
		if (y < window.innerHeight - feather.offsetHeight) {
			feather.style.left = `${Math.sin(3.14 * 2 * (ticks / 120)) * 25}px`;
		}
	}


	// insertDecoration();
	// insertFieldGuide();

	/**
	 * @param {HTMLElement} element
	 */
	function centerElement(element) {
		element.style.left = `${window.innerWidth / 2 - element.offsetWidth / 2}px`;
		element.style.top = `${window.innerHeight / 2 - element.offsetHeight / 2}px`;
	}

	/**
	 * @param {string} title
	 * @param {string} message
	 */
	function insertModal(title, message) {
		if (document.querySelector("#" + FIELD_GUIDE_ID)) {
			return;
		}
		let html = `
			<div class="birb-window-header">
				<div class="birb-window-title">${title}</div>
				<div class="birb-window-close">x</div>
			</div>
			<div class="birb-window-content">
				<div class="birb-message-content">
					${message}
				</div>
			</div>`
		const modal = makeElement("birb-window");
		modal.style.width = "270px";
		modal.innerHTML = html;
		document.body.appendChild(modal);
		makeDraggable(modal.querySelector(".birb-window-header"));

		const closeButton = modal.querySelector(".birb-window-close");
		if (closeButton) {
			makeClosable(() => {
				modal.remove();
			}, closeButton);
		}
		centerElement(modal);
	}

	function insertFieldGuide() {
		if (document.querySelector("#" + FIELD_GUIDE_ID)) {
			return;
		}
		let html = `
			<div class="birb-window-header">
				<div class="birb-window-title">Field Guide</div>
				<div class="birb-window-close">x</div>
			</div>
			<div class="birb-window-content">
				<div class="birb-grid-content"></div>
				<div class="birb-field-guide-description"></div>
			</div>`
		const fieldGuide = makeElement("birb-window", undefined, FIELD_GUIDE_ID);
		fieldGuide.innerHTML = html;
		document.body.appendChild(fieldGuide);
		makeDraggable(fieldGuide.querySelector(".birb-window-header"));

		const closeButton = fieldGuide.querySelector(".birb-window-close");
		if (closeButton) {
			makeClosable(() => {
				fieldGuide.remove();
			}, closeButton);
		}

		const content = fieldGuide.querySelector(".birb-grid-content");
		if (!content) {
			return;
		}
		content.innerHTML = "";

		const generateDescription = (/** @type {string} */ speciesId) => {
			const type = species[speciesId];
			const unlocked = unlockedSpecies.includes(speciesId);
			return "<b>" + type.name + "</b><div style='height: 0.3em'></div>" + (!unlocked ? "Not yet unlocked" : type.description);
		};

		const description = fieldGuide.querySelector(".birb-field-guide-description");
		if (!description) {
			return;
		}
		description.innerHTML = generateDescription(currentSpecies);
		for (const [id, type] of Object.entries(species)) {
			const unlocked = unlockedSpecies.includes(id);
			const speciesElement = makeElement("birb-grid-item");
			if (id === currentSpecies) {
				speciesElement.classList.add("birb-grid-item-selected");
			}
			const speciesCanvas = document.createElement("canvas");
			speciesCanvas.width = SPRITE_WIDTH * CANVAS_PIXEL_SIZE;
			speciesCanvas.height = SPRITE_HEIGHT * CANVAS_PIXEL_SIZE;
			const speciesCtx = speciesCanvas.getContext("2d");
			if (!speciesCtx) {
				return;
			}
			birbFrames.base.draw(speciesCtx, Directions.RIGHT, type);
			speciesElement.appendChild(speciesCanvas);
			content.appendChild(speciesElement);
			if (unlocked) {
				onClick(speciesElement, () => {
					switchSpecies(id);
					document.querySelectorAll(".birb-grid-item").forEach((element) => {
						element.classList.remove("birb-grid-item-selected");
					});
					speciesElement.classList.add("birb-grid-item-selected");
				});
			} else {
				speciesElement.classList.add("birb-grid-item-locked");
			}
			speciesElement.addEventListener("mouseover", () => {
				log("mouseover");
				description.innerHTML = generateDescription(id);
			});
			speciesElement.addEventListener("mouseout", () => {
				description.innerHTML = generateDescription(currentSpecies);
			});
		}
		centerElement(fieldGuide);
	}

	/**
	 * @param {() => void} func
	 * @param {Element} [closeButton]
	 */
	function makeClosable(func, closeButton) {
		if (closeButton) {
			onClick(closeButton, func);
		}
		document.addEventListener("keydown", (e) => {
			if (closeButton && !document.body.contains(closeButton)) {
				return;
			}
			if (e.key === "Escape") {
				func();
			}
		});
	}

	function removeFieldGuide() {
		const fieldGuide = document.querySelector("#" + FIELD_GUIDE_ID);
		if (fieldGuide) {
			fieldGuide.remove();
		}
	}

	// insertPico8();

	function isSafari() {
		return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
	}

	/**
	 * @param {string} name
	 * @param {string} pid
	 */
	function insertPico8(name, pid) {
		let html = `
			<div class="birb-window-header">
				<div class="birb-window-title">${name}</div>
				<div class="birb-window-close">x</div>
			</div>
			<div class="birb-window-content birb-pico-8-content">
				<iframe src="https://www.lexaloffle.com/bbs/widget.php?pid=${pid}" scrolling='${isSafari() ? "yes" : "no"}'></iframe>
			</div>`
		const pico8 = makeElement("birb-window");
		pico8.innerHTML = html;
		document.body.appendChild(pico8);
		makeDraggable(pico8.querySelector(".birb-window-header"));
		const close = pico8.querySelector(".birb-window-close");
		if (close) {
			makeClosable(() => {
				pico8.remove();
			}, close);
		}
		centerElement(pico8);
	}

	function insertMusicPlayer() {
		let html = `
			<div class="birb-window-header">
				<div class="birb-window-title">Music Player</div>
				<div class="birb-window-close">x</div>
			</div>
			<div class="birb-window-content birb-music-player-content">
			<iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/31FWVQBp3WQydWLNhO0ACi?utm_source=generator" width="250" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
		</div>`;
		const pico8 = makeElement("birb-window");
		pico8.innerHTML = html;
		document.body.appendChild(pico8);
		makeDraggable(pico8.querySelector(".birb-window-header"));
		const close = pico8.querySelector(".birb-window-close");
		if (close) {
			makeClosable(() => {
				pico8.remove();
			}, close);
		}
		centerElement(pico8);
	}

	/**
	 * @param {string} type
	 */
	function switchSpecies(type) {
		currentSpecies = type;
		// Update CSS variable --birb-highlight to be wing color
		document.documentElement.style.setProperty("--birb-highlight", species[type].colors[THEME_HIGHLIGHT]);
		save();
	}

	/**
	 * Add the menu to the page if it doesn't already exist
	 */
	function insertMenu() {
		if (document.querySelector("#" + MENU_ID)) {
			return;
		}
		let menu = makeElement("birb-window", undefined, MENU_ID);
		let header = makeElement("birb-window-header");
		header.innerHTML = `<div class="birb-window-title">${birdBirb().toLowerCase()}OS</div>`;
		let content = makeElement("birb-window-content");
		for (const item of menuItems) {
			if (!item.isDebug || debugMode) {
				content.appendChild(makeMenuItem(item));
			}
		}
		menu.appendChild(header);
		menu.appendChild(content);
		document.body.appendChild(menu);
		makeDraggable(document.querySelector(".birb-window-header"));

		let menuExit = makeElement("birb-window-exit", undefined, MENU_EXIT_ID);
		onClick(menuExit, () => {
			removeMenu();
		});
		document.body.appendChild(menuExit);
		makeClosable(removeMenu);

		updateMenuLocation(menu);
	}

	/**
	 * Update the menu's location based on the bird's position
	 * @param {HTMLElement} menu
	 */
	function updateMenuLocation(menu) {
		let x = birdX;
		let y = canvas.offsetTop + canvas.height / 2 + WINDOW_PIXEL_SIZE * 10;
		const offset = 20;
		if (x < window.innerWidth / 2) {
			// Left side
			x += offset;
		} else {
			// Right side
			x -= (menu.offsetWidth + offset) * UI_CSS_SCALE;
		}
		if (y > window.innerHeight / 2) {
			// Top side
			y -= (menu.offsetHeight + offset + 10) * UI_CSS_SCALE;
		} else {
			// Bottom side
			y += offset;
		}
		menu.style.left = `${x}px`;
		menu.style.top = `${y}px`;
	}

	/**
	 * @param {MenuItem[]} menuItems
	 */
	function switchMenuItems(menuItems) {
		const menu = document.querySelector("#" + MENU_ID);
		if (!menu || !(menu instanceof HTMLElement)) {
			return;
		}
		const content = menu.querySelector(".birb-window-content");
		if (!content) {
			error("Content not found");
			return;
		}
		content.innerHTML = "";
		for (const item of menuItems) {
			if (!item.isDebug || debugMode) {
				content.appendChild(makeMenuItem(item));
			}
		}
		updateMenuLocation(menu);
	}

	/**
	 * @param {MenuItem} item
	 * @returns {HTMLElement}
	 */
	function makeMenuItem(item) {
		if (item instanceof Separator) {
			return makeElement("birb-window-separator");
		}
		let menuItem = makeElement("birb-menu-item", item.text);
		onClick(menuItem, () => {
			if (item.removeMenu) {
				removeMenu();
			}
			item.action();
		});
		return menuItem;
	}

	/**
	 * @param {Document|Element} element
	 * @param {(e: Event) => void} action
	 */
	function onClick(element, action) {
		element.addEventListener("click", (e) => action(e));
		element.addEventListener("touchstart", (e) => action(e));
	}

	/**
	 * Remove the menu from the page
	 */
	function removeMenu() {
		const menu = document.querySelector("#" + MENU_ID);
		if (menu) {
			menu.remove();
		}
		const exitMenu = document.querySelector("#" + MENU_EXIT_ID);
		if (exitMenu) {
			exitMenu.remove();
		}
	}

	/**
	 * @returns {boolean} Whether the menu element is on the page
	 */
	function isMenuOpen() {
		return document.querySelector("#" + MENU_ID) !== null;
	}

	/**
	 * @param {HTMLElement|null} element The element to detect drag events on
	 * @param {boolean} [parent] Whether to move the parent element when the child is dragged
	 * @param {(top: number, left: number) => void} [callback] Callback for when element is moved
	 */
	function makeDraggable(element, parent = true, callback = () => { }) {
		if (!element) {
			return;
		}

		let isMouseDown = false;
		let offsetX = 0;
		let offsetY = 0;
		let elementToMove = parent ? element.parentElement : element;

		if (!elementToMove) {
			error("Parent element not found");
			return;
		}

		element.addEventListener("mousedown", (e) => {
			isMouseDown = true;
			offsetX = e.clientX - elementToMove.offsetLeft;
			offsetY = e.clientY - elementToMove.offsetTop;
		});

		element.addEventListener("touchstart", (e) => {
			isMouseDown = true;
			const touch = e.touches[0];
			offsetX = touch.clientX - elementToMove.offsetLeft;
			offsetY = touch.clientY - elementToMove.offsetTop;
			e.preventDefault();
		});

		document.addEventListener("mouseup", (e) => {
			if (isMouseDown) {
				callback(elementToMove.offsetTop, elementToMove.offsetLeft);
				e.preventDefault();
			}
			isMouseDown = false;
		});

		document.addEventListener("touchend", (e) => {
			if (isMouseDown) {
				callback(elementToMove.offsetTop, elementToMove.offsetLeft);
				e.preventDefault();
			}
			isMouseDown = false;
		});

		document.addEventListener("mousemove", (e) => {
			if (isMouseDown) {
				elementToMove.style.left = `${Math.max(0, e.clientX - offsetX)}px`;
				elementToMove.style.top = `${Math.max(0, e.clientY - offsetY)}px`;
			}
		});

		document.addEventListener("touchmove", (e) => {
			if (isMouseDown) {
				const touch = e.touches[0];
				elementToMove.style.left = `${Math.max(0, touch.clientX - offsetX)}px`;
				elementToMove.style.top = `${Math.max(0, touch.clientY - offsetY)}px`;
			}
		});
	}

	/**
	 * @param {string[][]} array
	 * @param {number} sprite
	 * @param {number} [width]
	 * @returns {string[][]}
	 */
	function getLayer(array, sprite, width = SPRITE_WIDTH) {
		// From an array of a horizontal sprite sheet, get the layer for a specific sprite
		const layer = [];
		for (let y = 0; y < width; y++) {
			layer.push(array[y].slice(sprite * width, (sprite + 1) * width));
		}
		return layer;
	}

	/**
	 * Update the birds location from the start to the target location on a parabolic path
	 * @param {number} speed The speed of the bird along the path
	 * @param {number} [intensity] The intensity of the parabolic path
	 * @returns {boolean} Whether the bird has reached the target location
	 */
	function updateParabolicPath(speed, intensity = 2.5) {
		const dx = targetX - startX;
		const dy = targetY - startY;
		const distance = Math.sqrt(dx * dx + dy * dy);
		const time = Date.now() - stateStart;
		if (distance > Math.max(window.innerWidth, window.innerHeight) / 2) {
			speed *= 1.3;
		}
		const amount = Math.min(1, time / (distance / speed));
		const { x, y } = parabolicLerp(startX, startY, targetX, targetY, amount, intensity);
		birdX = x;
		birdY = y;
		const complete = Math.abs(birdX - targetX) < 1 && Math.abs(birdY - targetY) < 1;
		if (complete) {
			birdX = targetX;
			birdY = targetY;
		} else {
			direction = targetX > birdX ? Directions.RIGHT : Directions.LEFT;
		}
		return complete;
	}

	function getFocusedElementRandomX() {
		if (focusedElement === null) {
			return Math.random() * window.innerWidth;
		}
		const rect = focusedElement.getBoundingClientRect();
		return Math.random() * (rect.right - rect.left) + rect.left + window.scrollX;
	}

	function getFocusedElementY() {
		if (focusedElement === null) {
			return getWindowBottom();
		}
		const rect = focusedElement.getBoundingClientRect();
		return rect.top + window.scrollY;
	}

	/**
	 * @param {number} x 
	 * @returns {boolean} Whether the x coordinate is within the horizontal bounds of the focused element
	 */
	function isWithinHorizontalBounds(x) {
		if (focusedElement === null) {
			return true;
		}
		const rect = focusedElement.getBoundingClientRect();
		return x >= rect.left && x <= rect.right;
	}

	function focusOnGround() {
		if (focusedElement === null) {
			// Already focused on ground
			return;
		}
		console.log("Focusing on ground");
		focusedElement = null;
		flyTo(Math.random() * window.innerWidth, getWindowBottom());
	}

	function focusOnElement() {
		if (frozen) {
			return;
		}
		console.log("Focusing on element");
		const elements = document.querySelectorAll("img, video");
		const inWindow = Array.from(elements).filter((img) => {
			const rect = img.getBoundingClientRect();
			return rect.left >= 0 && rect.top >= 80 && rect.right <= window.innerWidth && rect.top <= window.innerHeight;
		});
		const MIN_WIDTH = 100;
		/** @type {HTMLElement[]} */
		// @ts-ignore
		const largeElements = Array.from(inWindow).filter((img) => img instanceof HTMLElement && img !== focusedElement && img.offsetWidth >= MIN_WIDTH);
		if (largeElements.length === 0) {
			return;
		}
		const randomElement = largeElements[Math.floor(Math.random() * largeElements.length)];
		focusedElement = randomElement;
		flyTo(getFocusedElementRandomX(), getFocusedElementY());
	}

	function getCanvasWidth() {
		return canvas.width * BIRB_CSS_SCALE
	}

	function getCanvasHeight() {
		return canvas.height * BIRB_CSS_SCALE
	}

	function getWindowBottom() {
		return window.scrollY + window.innerHeight;
	}

	function hop() {
		if (frozen) {
			return;
		}
		if (currentState === States.IDLE) {
			// Determine bounds for hopping
			let minX = 0;
			let maxX = window.innerWidth;
			let y = getWindowBottom();
			if (focusedElement !== null) {
				// Hop on the element
				const rect = focusedElement.getBoundingClientRect();
				minX = rect.left;
				maxX = rect.right;
				y = window.innerHeight - rect.top;
			}
			setState(States.HOP);
			setAnimation(Animations.FLYING);
			if ((Math.random() < 0.5 && birdX - HOP_DISTANCE > minX) || birdX + HOP_DISTANCE > maxX) {
				targetX = birdX - HOP_DISTANCE;
			} else {
				targetX = birdX + HOP_DISTANCE;
			}
			targetY = y;
			console.log("hopping from", birdX, birdY, "to", targetX, targetY);
		}
	}

	function pet() {
		if (currentState === States.IDLE) {
			setAnimation(Animations.HEART);
			lastPetTimestamp = Date.now();
		}
	}

	function hideBirb() {
		canvas.style.display = "none";
		visible = false;
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 */
	function flyTo(x, y) {
		console.log("Flying to", x, y);
		targetX = x;
		targetY = y;
		setState(States.FLYING);
		setAnimation(Animations.FLYING);
	}

	/**
	 * Set the current animation and reset the animation timer
	 * @param {Anim} animation
	 */
	function setAnimation(animation) {
		currentAnimation = animation;
		animStart = Date.now();
	}

	/**
	 * Set the current state and reset the state timer
	 * @param {string} state
	 */
	function setState(state) {
		console.log("State:", state);
		stateStart = Date.now();
		startX = birdX;
		startY = birdY;
		currentState = state;
		if (state === States.IDLE) {
			setAnimation(Animations.BOB);
		}
	}

	/**
	 * Set the bird element's X position, with the element origin at the center of the bird
	 * @param {number} x
	 */
	function setX(x) {
		const mod = getCanvasWidth() / -2 - (WINDOW_PIXEL_SIZE * (direction === Directions.RIGHT ? 2 : -2));
		canvas.style.left = `${x + mod}px`;
	}

	/**
	 * Set the bird element's Y position, with the element origin at the bottom of the bird
	 * @param {number} y
	 */
	function setY(y) {
		const mod = getCanvasHeight() + WINDOW_PIXEL_SIZE;
		canvas.style.top = `${y - mod}px`;
	}
});

/**
 * @param {number} start
 * @param {number} end
 * @param {number} amount
 * @returns {number}
 */
function linearLerp(start, end, amount) {
	return start + (end - start) * amount;
}

/**
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 * @param {number} amount
 * @param {number} [intensity]
 * @returns {{x: number, y: number}}
 */
function parabolicLerp(startX, startY, endX, endY, amount, intensity = 1.2) {
	const dx = endX - startX;
	const dy = endY - startY;
	const distance = Math.sqrt(dx * dx + dy * dy);
	const angle = Math.atan2(dy, dx);
	const midX = startX + Math.cos(angle) * distance / 2;
	const midY = startY + Math.sin(angle) * distance / 2 - distance / 4 * intensity;
	const t = amount;
	const x = (1 - t) ** 2 * startX + 2 * (1 - t) * t * midX + t ** 2 * endX;
	const y = (1 - t) ** 2 * startY + 2 * (1 - t) * t * midY + t ** 2 * endY;
	return { x, y };
}

/**
 * @param {number} value
 */
function roundToPixel(value) {
	return Math.round(value / WINDOW_PIXEL_SIZE) * WINDOW_PIXEL_SIZE;
}

/**
 * @returns {boolean} Whether the user is on a mobile device
 */
function isMobile() {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function log() {
	console.log("Birb: ", ...arguments);
}

function debug() {
	if (debugMode) {
		console.debug("Birb: ", ...arguments);
	}
}

function error() {
	console.error("Birb: ", ...arguments);
}