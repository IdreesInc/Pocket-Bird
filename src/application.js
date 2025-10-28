import Frame from './frame.js';
import Layer from './layer.js';
import Anim from './anim.js';
import { Birb, Animations } from './birb.js';

import {
	Directions,
	isDebug,
	setDebug,
	makeElement,
	onClick,
	makeDraggable,
	makeClosable,
	isMobile,
	log,
	debug,
	error,
	getLayer
} from './shared.js';
import {
	Sprite,
	SPRITE_SHEET_COLOR_MAP,
	SPECIES
} from './sprites.js';
import {
	StickyNote,
	createNewStickyNote,
	drawStickyNotes
} from './stickyNotes.js';
import {
	MenuItem,
	DebugMenuItem,
	Separator,
	insertMenu,
	removeMenu,
	isMenuOpen,
	switchMenuItems,
	MENU_EXIT_ID
} from './menu.js';


/**
 * @typedef {import('./stickyNotes.js').SavedStickyNote} SavedStickyNote
 */

/**
 * @typedef {Object} BirbSaveData
 * @property {string[]} unlockedSpecies
 * @property {string} currentSpecies
 * @property {Partial<Settings>} settings
 * @property {SavedStickyNote[]} [stickyNotes]
 */

/**
 * @typedef {typeof DEFAULT_SETTINGS} Settings
 */
const DEFAULT_SETTINGS = {
	birbMode: false
};

// Rendering constants
const SPRITE_WIDTH = 32;
const SPRITE_HEIGHT = 32;
const FEATHER_SPRITE_WIDTH = 32;
const BIRB_CSS_SCALE = 1;
const UI_CSS_SCALE = isMobile() ? 0.9 : 1;
const CANVAS_PIXEL_SIZE = 1;
const WINDOW_PIXEL_SIZE = CANVAS_PIXEL_SIZE * BIRB_CSS_SCALE;

// Build-time assets
const STYLESHEET = `___STYLESHEET___`;
const SPRITE_SHEET = "__SPRITE_SHEET__";
const FEATHER_SPRITE_SHEET = "__FEATHER_SPRITE_SHEET__";

// Element IDs
const FIELD_GUIDE_ID = "birb-field-guide";
const FEATHER_ID = "birb-feather";

const DEFAULT_BIRD = "bluebird";

// Birb movement
const HOP_SPEED = 0.07;
const FLY_SPEED = isMobile() ? 0.125 : 0.25;
const HOP_DISTANCE = 45;

// Timing constants (in milliseconds)
const UPDATE_INTERVAL = 1000 / 60; // 60 FPS
const AFK_TIME = isDebug() ? 0 : 1000 * 30;
const PET_BOOST_DURATION = 1000 * 60 * 5;
const PET_MENU_COOLDOWN = 1000;
const URL_CHECK_INTERVAL = 500;

// Random event chances per tick
const HOP_CHANCE = 1 / (60 * 3); // Every 3 seconds
const FOCUS_SWITCH_CHANCE = 1 / (60 * 20); // Every 20 seconds
const FEATHER_CHANCE = 1 / (60 * 60 * 60 * 2); // Every 2 hours

// Feathers
const FEATHER_FALL_SPEED = 1;
const PET_FEATHER_BOOST = 2;

// Focus element constraints
const MIN_FOCUS_ELEMENT_WIDTH = 100;
const MIN_FOCUS_ELEMENT_TOP = 40;

/** @type {Partial<Settings>} */
let userSettings = {};

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
						row.push(Sprite.TRANSPARENT);
						continue;
					}
					const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
					if (!templateColors) {
						row.push(hex);
						continue;
					}
					if (SPRITE_SHEET_COLOR_MAP[hex] === undefined) {
						error(`Unknown color: ${hex}`);
						row.push(Sprite.TRANSPARENT);
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

log("Loading sprite sheets...");

Promise.all([
	loadSpriteSheetPixels(SPRITE_SHEET),
	loadSpriteSheetPixels(FEATHER_SPRITE_SHEET)
]).then(([birbPixels, featherPixels]) => {

	const SPRITE_SHEET = birbPixels;
	const FEATHER_SPRITE_SHEET = featherPixels;

	const featherLayers = {
		feather: new Layer(getLayer(FEATHER_SPRITE_SHEET, 0, FEATHER_SPRITE_WIDTH)),
	};

	const featherFrames = {
		feather: new Frame([featherLayers.feather]),
	};

	const FEATHER_ANIMATIONS = {
		feather: new Anim([
			featherFrames.feather,
		], [
			1000,
		]),
	};

	const menuItems = [
		new MenuItem(`Pet ${birdBirb()}`, pet),
		new MenuItem("Field Guide", insertFieldGuide),
		new MenuItem("Sticky Note", () => createNewStickyNote(stickyNotes, save, deleteStickyNote)),
		new MenuItem(`Hide ${birdBirb()}`, () => birb.setVisible(false)),
		new DebugMenuItem("Freeze/Unfreeze", () => {
			frozen = !frozen;
		}),
		new DebugMenuItem("Reset Data", resetSaveData),
		new DebugMenuItem("Unlock All", () => {
			for (let type in SPECIES) {
				unlockBird(type);
			}
		}),
		new DebugMenuItem("Disable Debug", () => {
			setDebug(false);
		}),
		new Separator(),
		new MenuItem("Settings", () => switchMenuItems(settingsItems, updateMenuLocation), false),
	];

	const settingsItems = [
		new MenuItem("Go Back", () => switchMenuItems(menuItems, updateMenuLocation), false),
		new Separator(),
		new MenuItem("Toggle Birb Mode", () => {
			userSettings.birbMode = !userSettings.birbMode;
			save();
			const message = makeElement("birb-message-content");
			message.appendChild(document.createTextNode(`Your ${birdBirb().toLowerCase()} shall now be referred to as "${birdBirb()}"`));
			if (userSettings.birbMode) {
				message.appendChild(document.createElement("br"));
				message.appendChild(document.createElement("br"));
				message.appendChild(document.createTextNode("Welcome back to 2012"));
			}
			insertModal(`${birdBirb()} Mode`, message);
		}),
		new Separator(),
		new MenuItem("__VERSION__", () => { alert("Thank you for using Pocket Bird! You are on version: __VERSION__") }, false),
	];

	const styleElement = document.createElement("style");

	/** @type {Birb} */
	let birb;

	const States = {
		IDLE: "idle",
		HOP: "hop",
		FLYING: "flying",
	};

	let frozen = false;
	let stateStart = Date.now();
	let currentState = States.IDLE;
	let ticks = 0;
	// Bird's current position
	let birdY = 0;
	let birdX = 40;
	// Bird's starting position (when flying)
	let startX = 0;
	let startY = 0;
	// Bird's target position (when flying)
	let targetX = 0;
	let targetY = 0;
	/** @type {HTMLElement|null} */
	let focusedElement = null;
	let focusedBounds = { left: 0, right: 0, top: 0 };
	let lastActionTimestamp = Date.now();
	/** @type {number[]} */
	let petStack = [];
	let currentSpecies = DEFAULT_BIRD;
	let unlockedSpecies = [DEFAULT_BIRD];
	// let visible = true;
	let lastPetTimestamp = 0;
	/** @type {StickyNote[]} */
	let stickyNotes = [];

	/**
	 * @returns {boolean} Whether the script is running in a userscript extension context
	 */
	function isUserScript() {
		// @ts-expect-error
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
			// @ts-expect-error
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
		/** @type {BirbSaveData} */
		const saveData = {
			unlockedSpecies,
			currentSpecies,
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
			// @ts-expect-error
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
			// @ts-expect-error
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
		log("Sprite sheets loaded successfully, initializing bird...");

		if (window !== window.top) {
			// Skip installation if within an iframe
			log("In iframe, skipping Birb script initialization");
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

		try {
			const fontStyle = document.createElement("style");
			fontStyle.textContent = fontFace;
			document.head.appendChild(fontStyle);
		} catch (e) {
			error("Failed to load font: " + e);
		}

		load();

		styleElement.textContent = STYLESHEET;
		document.head.appendChild(styleElement);

		birb = new Birb(BIRB_CSS_SCALE, CANVAS_PIXEL_SIZE, SPRITE_SHEET, SPRITE_WIDTH, SPRITE_HEIGHT);
		birb.setAnimation(Animations.BOB);

		window.addEventListener("scroll", () => {
			lastActionTimestamp = Date.now();
		});

		onClick(document, (e) => {
			lastActionTimestamp = Date.now();
			if (e.target instanceof Node && document.querySelector("#" + MENU_EXIT_ID)?.contains(e.target)) {
				removeMenu();
			}
		});

		const birbElement = birb.getElement();

		onClick(birbElement, () => {
			if (birb.getCurrentAnimation() === Animations.HEART && (Date.now() - lastPetTimestamp < PET_MENU_COOLDOWN)) {
				// Currently being pet, don't open menu
				return;
			}
			insertMenu(menuItems, `${birdBirb().toLowerCase()}OS`, updateMenuLocation);
		});

		birbElement.addEventListener("mouseover", () => {
			lastActionTimestamp = Date.now();
			if (currentState === States.IDLE) {
				petStack.push(Date.now());
				if (petStack.length > 10) {
					petStack.shift();
				}
				const pets = petStack.filter((time) => Date.now() - time < 1000).length;
				if (pets >= 3) {
					pet();
					// Clear the stack
					petStack = [];
				}
			}
		});

		birbElement.addEventListener("touchmove", (e) => {
			pet();
		});

		drawStickyNotes(stickyNotes, save, deleteStickyNote);

		let lastUrl = (window.location.href ?? "").split("?")[0];
		setInterval(() => {
			const currentUrl = (window.location.href ?? "").split("?")[0];
			if (currentUrl !== lastUrl) {
				log("URL changed, updating sticky notes");
				lastUrl = currentUrl;
				drawStickyNotes(stickyNotes, save, deleteStickyNote);
			}
		}, URL_CHECK_INTERVAL);

		setInterval(update, UPDATE_INTERVAL);

		focusOnElement(true);
	}

	function update() {
		ticks++;

		// Hide bird if the browser is fullscreen
		if (document.fullscreenElement) {
			birb.setVisible(false);
			// Won't be restored on fullscreen exit
		}

		if (currentState === States.IDLE && !frozen && !isMenuOpen()) {
			if (Math.random() < HOP_CHANCE && birb.getCurrentAnimation() !== Animations.HEART) {
				hop();
			} else if (Date.now() - lastActionTimestamp > AFK_TIME) {
				// Idle for a while, do something
				if (focusedElement === null) {
					// Fly to an element
					focusOnElement();
					lastActionTimestamp = Date.now();
				} else if (Math.random() < FOCUS_SWITCH_CHANCE) {
					// Fly to another element if idle for a longer while
					focusOnElement();
					lastActionTimestamp = Date.now();
				}
			}
		} else if (currentState === States.HOP) {
			if (updateParabolicPath(HOP_SPEED)) {
				setState(States.IDLE);
			}
		}

		// Double the chance of a feather if recently pet
		const petMod = Date.now() - lastPetTimestamp < PET_BOOST_DURATION ? PET_FEATHER_BOOST : 1;
		if (birb.isVisible() && Math.random() < FEATHER_CHANCE * petMod) {
			lastPetTimestamp = 0;
			activateFeather();
		}
		updateFeather();
	}

	function draw() {
		requestAnimationFrame(draw);

		if (!birb || !birb.isVisible()) {
			return;
		}

		updateFocusedElementBounds();

		// Update the bird's position
		if (currentState === States.IDLE) {
			if (focusedElement && !isWithinHorizontalBounds()) {
				flySomewhere();
			}
			birdY = getFocusedY();
		} else if (currentState === States.FLYING) {
			// Fly to target location (even if in the air)
			if (updateParabolicPath(FLY_SPEED)) {
				setState(States.IDLE);
			}
		}

		const oldTargetY = targetY;
		targetY = getFocusedY();
		// Adjust startY to account for scrolling
		startY += targetY - oldTargetY;
		if (targetY < 0 || targetY > window.innerHeight) {
			// Fly to another element or the ground if the focused element moves out of bounds
			flySomewhere();
		}

		if (birb.draw(SPECIES[currentSpecies])) {
			birb.setAnimation(Animations.STILL);
		}

		// Update HTML element position
		birb.setX(birdX);
		birb.setY(birdY);
	}

	/**
	 * @param {StickyNote} stickyNote
	 */
	function deleteStickyNote(stickyNote) {
		stickyNotes = stickyNotes.filter(note => note.id !== stickyNote.id);
		save();
	}

	/**
	 * Create a window element with header and content
	 * @param {string} id
	 * @param {string} title
	 * @param {HTMLElement} contentElement
	 * @param {() => void} [onClose]
	 * @returns {HTMLElement}
	 */
	function createWindow(id, title, contentElement, onClose) {
		const window = makeElement("birb-window", undefined, id);

		const header = makeElement("birb-window-header");
		const titleElement = makeElement("birb-window-title");
		titleElement.textContent = title;
		const closeButton = makeElement("birb-window-close");
		closeButton.textContent = "x";

		header.appendChild(titleElement);
		header.appendChild(closeButton);

		const contentWrapper = makeElement("birb-window-content");
		contentWrapper.appendChild(contentElement);

		window.appendChild(header);
		window.appendChild(contentWrapper);

		document.body.appendChild(window);
		makeDraggable(header);

		makeClosable(() => {
			if (onClose) {
				onClose();
			}
			window.remove();
		}, closeButton);

		return window;
	}

	function activateFeather() {
		if (document.querySelector("#" + FEATHER_ID)) {
			return;
		}
		const speciesToUnlock = Object.keys(SPECIES).filter((species) => !unlockedSpecies.includes(species));
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
		let type = SPECIES[birdType];
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
		FEATHER_ANIMATIONS.feather.draw(featherCtx, Directions.LEFT, Date.now(), CANVAS_PIXEL_SIZE, type);
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
			const message = makeElement("birb-message-content");
			message.appendChild(document.createTextNode("You've found a "));
			const bold = document.createElement("b");
			bold.textContent = SPECIES[birdType].name;
			message.appendChild(bold);
			message.appendChild(document.createTextNode(" feather! Use the Field Guide to switch your bird's species."));
			insertModal("New Bird Unlocked!", message);
		}
		save();
	}

	function updateFeather() {
		const feather = document.querySelector("#birb-feather");
		if (!feather || !(feather instanceof HTMLElement)) {
			return;
		}
		const y = parseInt(feather.style.top || "0") + FEATHER_FALL_SPEED;
		feather.style.top = `${Math.min(y, window.innerHeight - feather.offsetHeight)}px`;
		if (y < window.innerHeight - feather.offsetHeight) {
			feather.style.left = `${Math.sin(3.14 * 2 * (ticks / 120)) * 25}px`;
		}
	}

	/**
	 * @param {HTMLElement} element
	 */
	function centerElement(element) {
		element.style.left = `${window.innerWidth / 2 - element.offsetWidth / 2}px`;
		element.style.top = `${window.innerHeight / 2 - element.offsetHeight / 2}px`;
	}

	/**
	 * @param {string} title
	 * @param {HTMLElement} content
	 */
	function insertModal(title, content) {
		if (document.querySelector("#" + FIELD_GUIDE_ID)) {
			return;
		}

		const modal = createWindow("birb-modal", title, content);

		modal.style.width = "270px";
		centerElement(modal);
	}

	/**
	 * @param {HTMLElement} menu
	 */
	function updateMenuLocation(menu) {
		let x = birdX;
		let y = birb.getElementTop() + birb.getElementHeight() / 2 + WINDOW_PIXEL_SIZE * 10;
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
	};

	function insertFieldGuide() {
		if (document.querySelector("#" + FIELD_GUIDE_ID)) {
			return;
		}

		const contentContainer = document.createElement("div");
		const content = makeElement("birb-grid-content");
		const description = makeElement("birb-field-guide-description");
		contentContainer.appendChild(content);
		contentContainer.appendChild(description);

		const fieldGuide = createWindow(
			FIELD_GUIDE_ID,
			"Field Guide",
			contentContainer
		);

		const generateDescription = (/** @type {string} */ speciesId) => {
			const type = SPECIES[speciesId];
			const unlocked = unlockedSpecies.includes(speciesId);

			const boldName = document.createElement("b");
			boldName.textContent = type.name;

			const spacer = document.createElement("div");
			spacer.style.height = "0.3em";

			const descText = document.createTextNode(!unlocked ? "Not yet unlocked" : type.description);

			const fragment = document.createDocumentFragment();
			fragment.appendChild(boldName);
			fragment.appendChild(spacer);
			fragment.appendChild(descText);

			return fragment;
		};

		description.appendChild(generateDescription(currentSpecies));
		for (const [id, type] of Object.entries(SPECIES)) {
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
			birb.getFrames().base.draw(speciesCtx, Directions.RIGHT, CANVAS_PIXEL_SIZE, type);
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
				description.textContent = "";
				description.appendChild(generateDescription(id));
			});
			speciesElement.addEventListener("mouseout", () => {
				description.textContent = "";
				description.appendChild(generateDescription(currentSpecies));
			});
		}
		centerElement(fieldGuide);
	}

	function removeFieldGuide() {
		const fieldGuide = document.querySelector("#" + FIELD_GUIDE_ID);
		if (fieldGuide) {
			fieldGuide.remove();
		}
	}

	/**
	 * @param {string} type
	 */
	function switchSpecies(type) {
		currentSpecies = type;
		// Update CSS variable --birb-highlight to be wing color
		document.documentElement.style.setProperty("--birb-highlight", SPECIES[type].colors[Sprite.THEME_HIGHLIGHT]);
		save();
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
			birb.setDirection(targetX > birdX ? Directions.RIGHT : Directions.LEFT);
		}
		return complete;
	}

	function getFocusedElementRandomX() {
		return Math.random() * (focusedBounds.right - focusedBounds.left) + focusedBounds.left;
	}

	function isWithinHorizontalBounds() {
		return birdX >= focusedBounds.left && birdX <= focusedBounds.right;
	}

	function getFocusedY() {
		return getFullWindowHeight() - focusedBounds.top;
	}

	/**
	 * @returns The render-safe height of the inner browser window
	 */
	function getSafeWindowHeight() {
		// Necessary because iOS 26 Safari is terrible and won't render
		// fixed elements behind the address bar
		return window.innerHeight;
	}

	/**
	 * @returns The true height of the inner browser window
	 */
	function getFullWindowHeight() {
		return document.documentElement.clientHeight;
	}

	/**
	 * Fly to either an element or the ground
	 */
	function flySomewhere() {
		// On mobile, always prefer to focus on an element
		// If not mobile, 50% chance to focus on ground
		// if ((!isMobile() && coinFlip()) || !focusOnElement()) {
		// 	focusOnGround();
		// }
		if (!focusOnElement()) {
			focusOnGround();
		}
	}

	function focusOnGround() {
		focusedElement = null;
		focusedBounds = { left: 0, right: window.innerWidth, top: getSafeWindowHeight() };
		flyTo(Math.random() * window.innerWidth, 0);
	}

	/**
	 * Focus on an element within the viewport
	 * @param {boolean} [teleport] Whether to teleport to the element instead of flying
	 * @returns Whether an element to focus on was found
	 */
	function focusOnElement(teleport = false) {
		if (frozen) {
			return false;
		}
		const elements = document.querySelectorAll("img, video, .birb-sticky-note");
		const inWindow = Array.from(elements).filter((img) => {
			const rect = img.getBoundingClientRect();
			return rect.left >= 0 && rect.top >= MIN_FOCUS_ELEMENT_TOP && rect.right <= window.innerWidth && rect.top <= window.innerHeight;
		});
		/** @type {HTMLElement[]} */
		// @ts-expect-error
		const largeElements = Array.from(inWindow).filter((img) => img instanceof HTMLElement && img !== focusedElement && img.offsetWidth >= MIN_FOCUS_ELEMENT_WIDTH);
		// Ensure the bird doesn't land on fixed or sticky elements
		const nonFixedElements = largeElements.filter((el) => {
			const style = window.getComputedStyle(el);
			return style.position !== "fixed" && style.position !== "sticky";
		});
		if (nonFixedElements.length === 0) {
			return false;
		}
		const randomElement = nonFixedElements[Math.floor(Math.random() * nonFixedElements.length)];
		focusedElement = randomElement;
		log("Focusing on element: ", focusedElement);
		updateFocusedElementBounds();
		if (teleport) {
			teleportTo(getFocusedElementRandomX(), getFocusedY());
		} else {
			flyTo(getFocusedElementRandomX(), getFocusedY());
		}
		return randomElement !== null;
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 */
	function teleportTo(x, y) {
		birdX = x;
		birdY = y;
		setState(States.IDLE);
	}

	function updateFocusedElementBounds() {
		if (focusedElement === null) {
			// Update ground location to bottom of window
			focusedBounds = { left: 0, right: window.innerWidth, top: getFullWindowHeight() };
			return;
		}
		let { left, right, top } = focusedElement.getBoundingClientRect();
		if (focusedElement.classList.contains("birb-sticky-note")) {
			top -= 4.5 * UI_CSS_SCALE;
			if (focusedBounds.left !== left) {
				// Sticky note has moved
				const oldWidth = focusedBounds.right - focusedBounds.left;
				const newWidth = right - left;
				if (oldWidth === newWidth) {
					// Move bird along with note
					if (currentState === States.IDLE) {
						birdX += left - focusedBounds.left;
					} else if (currentState === States.HOP) {
						startX += left - focusedBounds.left;
						startY += top - focusedBounds.top;
						targetX += left - focusedBounds.left;
						targetY += top - focusedBounds.top;
					}
				}
			}
		}
		focusedBounds = { left, right, top };
	}

	function getCanvasWidth() {
		return birb.getElementWidth();
	}

	function hop() {
		if (frozen) {
			return;
		}
		if (currentState === States.IDLE) {
			setState(States.HOP);
			birb.setAnimation(Animations.FLYING);
			if ((Math.random() < 0.5 && birdX - HOP_DISTANCE > focusedBounds.left) || birdX + HOP_DISTANCE > focusedBounds.right) {
				targetX = birdX - HOP_DISTANCE;
			} else {
				targetX = birdX + HOP_DISTANCE;
			}
			targetY = getFocusedY();
		}
	}

	function pet() {
		if (currentState === States.IDLE && birb.getCurrentAnimation() !== Animations.HEART) {
			birb.setAnimation(Animations.HEART);
			lastPetTimestamp = Date.now();
		}
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 */
	function flyTo(x, y) {
		targetX = x;
		targetY = y;
		setState(States.FLYING);
		birb.setAnimation(Animations.FLYING);
	}

	/**
	 * @returns {boolean} Whether the bird should be absolutely positioned
	 */
	function isAbsolute() {
		return focusedElement !== null && (currentState === States.IDLE || currentState === States.HOP);
	}

	/**
	 * Set the current state and reset the state timer
	 * @param {string} state
	 */
	function setState(state) {
		stateStart = Date.now();
		startX = birdX;
		startY = birdY;
		currentState = state;
		if (state === States.IDLE) {
			birb.setAnimation(Animations.BOB);
		}
		birb.setAbsolutePositioned(isAbsolute());
		birb.setY(birdY);
	}

	function coinFlip() {
		return Math.random() < 0.5;
	}

	// Helper functions

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
		const midY = startY + Math.sin(angle) * distance / 2 + distance / 4 * intensity;
		const t = amount;
		const x = (1 - t) ** 2 * startX + 2 * (1 - t) * t * midX + t ** 2 * endX;
		const y = (1 - t) ** 2 * startY + 2 * (1 - t) * t * midY + t ** 2 * endY;
		return { x, y };
	}

	// Run the birb
	init();
	draw();
}).catch((e) => {
	error("Error while loading sprite sheets: ", e);
});