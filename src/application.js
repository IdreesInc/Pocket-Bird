import Frame from './animation/frame.js';
import Layer, { TAG } from './animation/layer.js';
import Anim from './animation/anim.js';
import { Birb, Animations } from './birb.js';
import { Birdsong } from './sound.js';
import { Context, ObsidianContext } from './context.js';

import {
	getContext,
	setContext,
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
	getLayerPixels,
	getWindowHeight
} from './shared.js';
import {
	PALETTE,
	SPRITE_SHEET_COLOR_MAP,
	SPECIES
} from './animation/sprites.js';
import {
	StickyNote,
	createNewStickyNote,
	drawStickyNotes
} from './stickyNotes.js';
import {
	MenuItem,
	ConditionalMenuItem,
	DebugMenuItem,
	Separator,
	insertMenu,
	removeMenu,
	isMenuOpen,
	switchMenuItems,
	MENU_EXIT_ID
} from './menu.js';
import { HAT, HAT_METADATA, createHatItemAnimation } from './hats.js';


/**
 * @typedef {import('./stickyNotes.js').SavedStickyNote} SavedStickyNote
 */

/**
 * @typedef {Object} BirbSaveData
 * @property {string[]} unlockedSpecies
 * @property {string} currentSpecies
 * @property {string[]} unlockedHats
 * @property {string} currentHat
 * @property {Partial<Settings>} settings
 * @property {SavedStickyNote[]} [stickyNotes]
 */

/**
 * @typedef {typeof DEFAULT_SETTINGS} Settings
 */
const DEFAULT_SETTINGS = {
	birbMode: false,
	soundEnabled: true
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
const HATS_SPRITE_SHEET = "__HATS_SPRITE_SHEET__";

// Element IDs
const FIELD_GUIDE_ID = "birb-field-guide";
const FEATHER_ID = "birb-feather";
const WARDROBE_ID = "birb-wardrobe";
const HAT_ID = "birb-hat";

const DEFAULT_BIRD = "bluebird";
const DEFAULT_HAT = HAT.NONE;

// Birb movement
const HOP_SPEED = 0.07;
const FLY_SPEED = isMobile() ? 0.175 : 0.25;
const HOP_DISTANCE = 35;

// Timing constants (in milliseconds)
const UPDATE_INTERVAL = 1000 / 60; // 60 FPS
const AFK_TIME = isDebug() ? 0 : 1000 * 5; // 5 seconds
const SUPER_AFK_TIME = 1000 * 60 * 60; // 1 hour
const PET_MENU_COOLDOWN = 1000;
const URL_CHECK_INTERVAL = 150;
const HOP_DELAY = 500;

// Random event chances per tick
const HOP_CHANCE = 1 / (60 * 2.5); // Every 2.5 seconds
const FOCUS_SWITCH_CHANCE = 1 / (60 * 20); // Every 20 seconds
const FEATHER_CHANCE = 1 / (60 * 60 * 60 * 2); // Every 2 hours
const HAT_CHANCE = 1 / (60 * 60 * 10); // Every 10 minutes

// Feathers
const FEATHER_FALL_SPEED = 1;

// Petting boosts
const PET_BOOST_DURATION = 1000 * 60 * 5; // 5 minutes
const PET_FEATHER_BOOST = 2;
const PET_HAT_BOOST = 1.5;

// Focus element constraints
const MIN_FOCUS_ELEMENT_WIDTH = 100;

/** @type {Partial<Settings>} */
let userSettings = {};


/** 
 * @param {Context} context
 */
export async function initializeApplication(context) {
	log("birbOS booting up...");
	setContext(context);
	log("Loading sprite sheets...");
	const birbPixels = await loadSpriteSheetPixels(SPRITE_SHEET);
	const featherPixels = await loadSpriteSheetPixels(FEATHER_SPRITE_SHEET);
	const hatsPixels = await loadSpriteSheetPixels(HATS_SPRITE_SHEET);
	startApplication(birbPixels, featherPixels, hatsPixels);
}

/**
 * @param {string[][]} birbPixels
 * @param {string[][]} featherPixels
 * @param {string[][]} hatsPixels
 */
function startApplication(birbPixels, featherPixels, hatsPixels) {

	const SPRITE_SHEET = birbPixels;
	const FEATHER_SPRITE_SHEET = featherPixels;
	const HATS_SPRITE_SHEET = hatsPixels;

	const featherLayers = {
		feather: new Layer(getLayerPixels(FEATHER_SPRITE_SHEET, 0, FEATHER_SPRITE_WIDTH)),
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
		new MenuItem("Wardrobe", insertWardrobe),
		new ConditionalMenuItem("Sticky Note", () => createNewStickyNote(stickyNotes, save, deleteStickyNote), () => getContext().areStickyNotesEnabled()),
		new MenuItem(`Hide ${birdBirb()}`, () => birb.setVisible(false)),
		new DebugMenuItem("Freeze/Unfreeze", () => {
			frozen = !frozen;
		}),
		new DebugMenuItem("Reset Data", resetSaveData),
		new DebugMenuItem("Unlock All", () => {
			for (let type in SPECIES) {
				unlockBird(type);
			}
			for (let hat in HAT) {
				unlockHat(HAT[hat]);
			}
		}),
		new DebugMenuItem("Add Feather", () => {
			activateFeather();
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
		new MenuItem(() => `${settings().soundEnabled ? "Disable" : "Enable"} Sound`, () => {
			userSettings.soundEnabled = !settings().soundEnabled;
			save();
		}),
		new MenuItem(() => `Toggle ${birdBirb(true)} Mode`, () => {
			userSettings.birbMode = !settings().birbMode;
			save();
			const message = makeElement("birb-message-content");
			message.appendChild(document.createTextNode(`Your ${birdBirb().toLowerCase()} shall now be referred to as "${birdBirb()}"`));
			if (settings().birbMode) {
				message.appendChild(document.createElement("br"));
				message.appendChild(document.createElement("br"));
				message.appendChild(document.createTextNode("Welcome back to 2012"));
			}
			insertModal(`${birdBirb()} Mode`, message);
		}),
		new Separator(),
		new MenuItem(() => `__VERSION__ ${isPetBoostActive() ? "❤" : ""}`, () => { alert("Thank you for using Pocket Bird! You are on version: __VERSION__") }, false),
	];

	const styleElement = document.createElement("style");

	/** @type {Birb} */
	let birb;

	const States = {
		IDLE: "idle",
		HOP: "hop",
		FLYING: "flying",
	};

	const birdsong = new Birdsong();

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
	let unlockedHats = [DEFAULT_HAT];
	let currentHat = DEFAULT_HAT;
	// let visible = true;
	let lastPetTimestamp = 0;
	/** @type {StickyNote[]} */
	let stickyNotes = [];

	async function load() {
		/** @type {BirbSaveData|Object} */
		let saveData = await getContext().getSaveData();

		debug("Loaded data: " + JSON.stringify(saveData));

		if (!('settings' in saveData)) {
			log("No user settings found in save data, starting fresh");
		}

		userSettings = saveData.settings ?? {};
		unlockedSpecies = saveData.unlockedSpecies ?? [DEFAULT_BIRD];
		currentSpecies = saveData.currentSpecies ?? DEFAULT_BIRD;
		unlockedHats = saveData.unlockedHats ?? [DEFAULT_HAT];
		currentHat = saveData.currentHat ?? DEFAULT_HAT;
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
		switchHat(currentHat);
	}

	function save() {
		/** @type {BirbSaveData} */
		const saveData = {
			unlockedSpecies: unlockedSpecies,
			currentSpecies: currentSpecies,
			unlockedHats: unlockedHats,
			currentHat: currentHat,
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

		getContext().putSaveData(saveData);
	}

	function resetSaveData() {
		getContext().resetSaveData();
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
	function birdBirb(invert = false) {
		return settings().birbMode !== invert ? "Birb" : "Bird";
	}

	function init() {
		log("Sprite sheets loaded successfully, initializing bird...");

		if (window !== window.top) {
			// Skip installation if within an iframe
			log("In iframe, skipping Birb script initialization");
			return;
		}

		load().then(onLoad);
	}

	function onLoad() {
		styleElement.textContent = STYLESHEET;
		document.head.appendChild(styleElement);

		birb = new Birb(BIRB_CSS_SCALE, CANVAS_PIXEL_SIZE, SPRITE_SHEET, SPRITE_WIDTH, SPRITE_HEIGHT, HATS_SPRITE_SHEET);
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

		let lastPath = getContext().getPath().split("?")[0];
		setInterval(() => {
			const currentPath = getContext().getPath().split("?")[0];
			if (currentPath !== lastPath) {
				log("Path changed from '" + lastPath + "' to '" + currentPath + "'");
				lastPath = currentPath;
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
			if (Date.now() - stateStart > HOP_DELAY && Math.random() < HOP_CHANCE && birb.getCurrentAnimation() !== Animations.HEART) {
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

		if (birb.isVisible() && Date.now() - lastActionTimestamp < SUPER_AFK_TIME) {
			if (Math.random() < FEATHER_CHANCE * (isPetBoostActive() ? PET_FEATHER_BOOST : 1)) {
				lastPetTimestamp = 0;
				activateFeather();
			}
			if (Math.random() < (HAT_CHANCE * (isPetBoostActive() ? PET_HAT_BOOST : 1))) {
				lastPetTimestamp = 0;
				insertHat();
			}
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
			if (updateParabolicPath(FLY_SPEED, 2)) {
				setState(States.IDLE);
			}
		}

		const oldTargetY = targetY;
		targetY = getFocusedY();
		// Adjust startY to account for scrolling
		startY += targetY - oldTargetY;
		if (targetY < 0 || targetY > getWindowHeight()) {
			// Fly to another element or the ground if the focused element moves out of bounds
			flySomewhere();
		}

		if (birb.draw(SPECIES[currentSpecies], currentHat)) {
			birb.setAnimation(Animations.STILL);
		}

		// Clamp startY, birdY, targetY to a bit above the top of the window
		const maxY = getWindowHeight() * 1.5;
		startY = Math.min(startY, maxY);
		birdY = Math.min(birdY, maxY);
		targetY = Math.min(targetY, maxY);

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
		FEATHER_ANIMATIONS.feather.draw(featherCtx, Directions.LEFT, Date.now(), CANVAS_PIXEL_SIZE, type.colors, type.tags);
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
	 * Insert the hat as an item element in the document if possible
	 */
	function insertHat() {
		if (document.querySelector("#" + HAT_ID)) {
			return;
		}
		// Select a random hat that hasn't been unlocked yet
		const availableHats = Object.values(HAT)
			.filter(hat => hat !== HAT.NONE && !unlockedHats.includes(hat));
		if (availableHats.length === 0) {
			return;
		}
		const hatId = availableHats[Math.floor(Math.random() * availableHats.length)];

		// Find a random valid element to place the hat on
		const element = getRandomValidElement();
		if (!element) {
			return;
		}

		// Create hat element
		const hatCanvas = document.createElement("canvas");
		hatCanvas.id = HAT_ID;
		hatCanvas.classList.add("birb-item");
		hatCanvas.width = 14 * CANVAS_PIXEL_SIZE;
		hatCanvas.height = 14 * CANVAS_PIXEL_SIZE;
		const hatCtx = hatCanvas.getContext("2d");
		if (!hatCtx) {
			return;
		}
		onClick(hatCanvas, () => {
			unlockHat(hatId);
			hatCanvas.remove();
		});

		// Create hat animation
		const hatAnimation = createHatItemAnimation(hatId, HATS_SPRITE_SHEET);
		hatAnimation.draw(hatCtx, Directions.LEFT, Date.now(), CANVAS_PIXEL_SIZE, SPECIES[currentSpecies].colors, [TAG.DEFAULT]);

		// Position hat above the element
		const rect = element.getBoundingClientRect();
		hatCanvas.style.left = (rect.left + rect.width / 2 - hatCanvas.width / 2) + "px";
		hatCanvas.style.top = (rect.top - hatCanvas.height + window.scrollY) + "px";

		// Append to document
		document.body.appendChild(hatCanvas);
	}

	/**
	 * @param {string} birdType
	 */
	function unlockBird(birdType) {
		if (!unlockedSpecies.includes(birdType)) {
			unlockedSpecies.push(birdType);
			save();
			const message = makeElement("birb-message-content");
			message.appendChild(document.createTextNode("You've found a "));
			const bold = document.createElement("b");
			bold.textContent = SPECIES[birdType].name;
			message.appendChild(bold);
			message.appendChild(document.createTextNode(" feather! Use the Field Guide to switch your bird's species."));
			insertModal("New Bird Unlocked!", message);
		}
	}

	/**
	 * @param {string} hatId 
	 */
	function unlockHat(hatId) {
		if (!unlockedHats.includes(hatId)) {
			unlockedHats.push(hatId);
			save();
			switchHat(hatId);
			const message = makeElement("birb-message-content");
			message.appendChild(document.createTextNode("You've unlocked the "));
			const bold = document.createElement("b");
			bold.textContent = HAT_METADATA[hatId].name;
			message.appendChild(bold);
			message.appendChild(document.createTextNode("! To see all of your unlocked accessories, click the Wardrobe from the menu."));
			insertModal("New Hat Found!", message);
		}
	}

	function updateFeather() {
		const feather = document.querySelector("#birb-feather");
		if (!feather || !(feather instanceof HTMLElement)) {
			return;
		}
		const y = parseInt(feather.style.top || "0") + FEATHER_FALL_SPEED;
		feather.style.top = `${Math.min(y, getWindowHeight() - feather.offsetHeight)}px`;
		if (y < getWindowHeight() - feather.offsetHeight) {
			feather.style.left = `${Math.sin(3.14 * 2 * (ticks / 120)) * 25}px`;
		}
	}

	/**
	 * @param {HTMLElement} element
	 */
	function centerElement(element) {
		element.style.left = `${window.innerWidth / 2 - element.offsetWidth / 2}px`;
		element.style.top = `${getWindowHeight() / 2 - element.offsetHeight / 2}px`;
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
		if (y > getWindowHeight() / 2) {
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
		// Remove wardrobe if open
		removeWardrobe();

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
			birb.getFrames().base.draw(speciesCtx, Directions.RIGHT, CANVAS_PIXEL_SIZE, type.colors, type.tags);
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

	function insertWardrobe() {
		console.log("Inserting wardrobe");
		if (document.querySelector("#" + WARDROBE_ID)) {
			return;
		}
		// Remove field guide if open
		removeFieldGuide();

		const contentContainer = document.createElement("div");
		const content = makeElement("birb-grid-content");
		const description = makeElement("birb-field-guide-description");
		contentContainer.appendChild(content);
		contentContainer.appendChild(description);

		const wardrobe = createWindow(
			WARDROBE_ID,
			"Wardrobe",
			contentContainer
		);

		const generateDescription = (/** @type {string} */ hat) => {
			const metadata = HAT_METADATA[hat] ?? { name: "Unknown Hat", description: "todo" };
			const unlocked = unlockedHats.includes(hat);

			const boldName = document.createElement("b");
			boldName.textContent = metadata.name;

			const spacer = document.createElement("div");
			spacer.style.height = "0.3em";

			const descText = document.createTextNode(!unlocked ? "Not yet unlocked" : metadata.description);

			const fragment = document.createDocumentFragment();
			fragment.appendChild(boldName);
			fragment.appendChild(spacer);
			fragment.appendChild(descText);

			return fragment;
		};

		description.appendChild(generateDescription(currentHat));
		for (const hat of Object.values(HAT)) {
			const unlocked = unlockedHats.includes(hat);
			const hatElement = makeElement("birb-grid-item");
			if (hat === currentHat) {
				hatElement.classList.add("birb-grid-item-selected");
			}
			const hatCanvas = document.createElement("canvas");
			hatCanvas.width = SPRITE_WIDTH * CANVAS_PIXEL_SIZE;
			hatCanvas.height = SPRITE_HEIGHT * CANVAS_PIXEL_SIZE;
			const hatCtx = hatCanvas.getContext("2d");
			if (!hatCtx) {
				return;
			}
			birb.getFrames().base.draw(
				hatCtx,
				Directions.RIGHT,
				CANVAS_PIXEL_SIZE,
				SPECIES[currentSpecies].colors,
				[...SPECIES[currentSpecies].tags, hat]
			);
			hatElement.appendChild(hatCanvas);
			content.appendChild(hatElement);
			if (unlocked) {
				onClick(hatElement, () => {
					switchHat(hat);
					document.querySelectorAll(".birb-grid-item").forEach((element) => {
						element.classList.remove("birb-grid-item-selected");
					});
					hatElement.classList.add("birb-grid-item-selected");
				});
			} else {
				hatElement.classList.add("birb-grid-item-locked");
			}
			hatElement.addEventListener("mouseover", () => {
				description.textContent = "";
				description.appendChild(generateDescription(hat));
			});
			hatElement.addEventListener("mouseout", () => {
				description.textContent = "";
				description.appendChild(generateDescription(currentHat));
			});
		}
		centerElement(wardrobe);
	}

	function removeWardrobe() {
		const wardrobe = document.querySelector("#" + WARDROBE_ID);
		if (wardrobe) {
			wardrobe.remove();
		}
	}

	/**
	 * @param {string} type
	 */
	function switchSpecies(type) {
		currentSpecies = type;
		// Update CSS variable --birb-highlight to be wing color
		document.documentElement.style.setProperty("--birb-highlight", SPECIES[type].colors[PALETTE.THEME_HIGHLIGHT]);
		save();
	}

	/**
	 * @param {string} hat
	 */
	function switchHat(hat) {
		currentHat = hat;
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
		if (distance > Math.max(window.innerWidth, getWindowHeight()) / 2) {
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
		return getWindowHeight() - focusedBounds.top;
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
		updateFocusedElementBounds();
		flyTo(Math.random() * window.innerWidth, 0);
	}

	/**
	 * @returns {HTMLElement|null} The random element, or null if no valid element was found
	 */
	function getRandomValidElement() {
		const MIN_FOCUS_ELEMENT_TOP = getContext().getFocusElementTopMargin();
		const elements = document.querySelectorAll(getContext().getFocusableElements().join(", "));
		const inWindow = Array.from(elements).filter((img) => {
			const rect = img.getBoundingClientRect();
			return rect.left >= 0 && rect.top >= MIN_FOCUS_ELEMENT_TOP && rect.right <= window.innerWidth && rect.top <= getWindowHeight();
		});
		const visible = Array.from(inWindow).filter((img) => {
			const style = window.getComputedStyle(img);
			if (style.display === "none" || style.visibility === "hidden" || (style.opacity && parseFloat(style.opacity) < 0.25)) {
				return false;
			}
			return true;
		});
		/** @type {HTMLElement[]} */
		const largeElements = Array.from(visible).filter((img) => img instanceof HTMLElement && img !== focusedElement && img.offsetWidth >= MIN_FOCUS_ELEMENT_WIDTH);
		// Ensure the bird doesn't land on fixed or sticky elements
		// const fixedAllowed = getContext() instanceof ObsidianContext;
		// TODO: FIX
		const fixedAllowed = true;
		const nonFixedElements = largeElements.filter((el) => {
			if (fixedAllowed) {
				return true;
			}
			const style = window.getComputedStyle(el);
			return style.position !== "fixed" && style.position !== "sticky";
		});
		if (nonFixedElements.length === 0) {
			return null;
		}
		const randomElement = nonFixedElements[Math.floor(Math.random() * nonFixedElements.length)];
		return randomElement;
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
		focusedElement = getRandomValidElement();
		log("Focusing on element: ", focusedElement);
		updateFocusedElementBounds();
		if (teleport) {
			teleportTo(getFocusedElementRandomX(), getFocusedY());
		} else {
			flyTo(getFocusedElementRandomX(), getFocusedY());
		}
		return focusedElement !== null;
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
			focusedBounds = { left: 0, right: window.innerWidth, top: getWindowHeight() };
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
			if (settings().soundEnabled) {
				birdsong.chirp();
			}
			birb.setAnimation(Animations.HEART);
			lastPetTimestamp = Date.now();
		}
	}

	function isPetBoostActive() {
		return Date.now() - lastPetTimestamp < PET_BOOST_DURATION;
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
}

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
						row.push(PALETTE.TRANSPARENT);
						continue;
					}
					const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
					if (!templateColors) {
						row.push(hex);
						continue;
					}
					if (SPRITE_SHEET_COLOR_MAP[hex] === undefined) {
						// Return the color as-is if not found in the map
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