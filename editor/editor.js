// @ts-check
import { SPRITE_SHEET_COLOR_MAP, PALETTE, loadSpriteSheetPixels } from '../src/animation/sprites.js';
import Layer, { TAG } from '../src/animation/layer.js';
import Frame from '../src/animation/frame.js';
import { Directions, getLayerPixels } from '../src/shared.js';
import species from '../src/species.js';

/** @typedef {import('../src/species.js').Species} Species */

const COLOR_MAP = SPRITE_SHEET_COLOR_MAP;
const SPRITE_PATH = "../sprites/birb.png";
const SPRITE_SIZE = 32;
/** @type {Record<string, string>} */
const DEFAULT_OVERRIDES = {
	"hood": "face",
	"eyebrow": "face",
	"nose": "face",
	"cheek": "face",
	"collar": "face",
};
const IGNORED_PARTS = new Set(
	["transparent", "border", "heart", "heart-border", "heart-shine", "feather-spine"]
);

/** @type {HTMLCanvasElement} */
// @ts-ignore
const canvas = document.getElementById("preview");
/** @type {CanvasRenderingContext2D} */
// @ts-ignore
const ctx = canvas.getContext("2d");
/** @type {HTMLElement} */
// @ts-ignore
const editor = document.getElementById("editor");
const colorPickerInput = document.createElement("input");
/** @type {HTMLElement} */
// @ts-ignore
const jsonElement = document.getElementById("json");
/** @type {Record<string, HTMLElement>} */
const colorElements = {};
/** @type {string|null} */
let selectedPart = null;
/** @type {HTMLElement|null} */
let selectedColorElement = null;

const spriteCanvas = document.createElement('canvas');
spriteCanvas.width = canvas.width;
spriteCanvas.height = canvas.height;
/** @type {CanvasRenderingContext2D} */
// @ts-ignore
const spriteCtx = spriteCanvas.getContext('2d');

/** @type {Species} */
let currentSpecies = JSON.parse(JSON.stringify(species.bluebird));
let speciesHistory = [JSON.parse(JSON.stringify(currentSpecies))];
let historyIndex = 0;
/** @type {Frame|null} */
let baseFrame = null;

function drawBackground() {
	const patternSize = 2;
	const colors = ["#edf0f4", "#dadbe0"];
	for (let y = 0; y < canvas.height; y += patternSize) {
		for (let x = 0; x < canvas.width; x += patternSize) {
			ctx.fillStyle = ((x / patternSize + y / patternSize) % 2 === 0) ? colors[0] : colors[1];
			ctx.fillRect(x, y, patternSize, patternSize);
		}
	}
}

/**
 * Build the full palette color scheme from the current species settings
 * @returns {Record<string, string>}
 */
function buildColorScheme() {
	/** @type {Record<string, string>} */
	const scheme = {};
	for (const paletteName of Object.values(PALETTE)) {
		scheme[paletteName] = getColor(paletteName);
	}
	return scheme;
}

function draw() {
	if (!baseFrame) {
		return;
	}
	drawBackground();
	baseFrame.draw(spriteCtx, Directions.LEFT, 1, buildColorScheme(), currentSpecies.tags || []);
	ctx.drawImage(spriteCanvas, 0, 0);
}

function commitChange() {
	const previousSpecies = speciesHistory[historyIndex];
	let changed = false;
	// Check for changes in colors
	for (const part of Object.keys(currentSpecies.colors)) {
		if (currentSpecies.colors[part] !== previousSpecies.colors[part]) {
			changed = true;
			break;
		}
	}
	if (!changed) {
		for (const part of Object.keys(previousSpecies.colors)) {
			if (!(part in currentSpecies.colors)) {
				changed = true;
				break;
			}
		}
	}
	// Check for changes in tags
	if (!changed) {
		const prevTags = new Set(previousSpecies.tags || []);
		const currTags = new Set(currentSpecies.tags || []);
		for (const tag of prevTags) {
			if (!currTags.has(tag)) {
				changed = true;
				break;
			}
		}
	}
	if (!changed) {
		for (const tag of currentSpecies.tags || []) {
			if (!previousSpecies.tags || !previousSpecies.tags.includes(tag)) {
				changed = true;
				break;
			}
		}
	}
	if (changed) {
		speciesHistory = speciesHistory.slice(0, historyIndex + 1);
		speciesHistory.push(JSON.parse(JSON.stringify(currentSpecies)));
		historyIndex++;
		localStorage.setItem("speciesHistory", JSON.stringify(speciesHistory));
	}
	updateJson();
	draw();
}

function loadEditor() {
	for (const [color, part] of Object.entries(COLOR_MAP)) {
		if (IGNORED_PARTS.has(part)) {
			continue;
		}
		const item = createColorSwatch(part, getColor(part) || color);
		editor.appendChild(item);
	}
	for (const value of Object.values(TAG)) {
		if (value === TAG.DEFAULT) {
			continue;
		}
		editor.appendChild(createTagToggle(value, getTag(value)));
	}
}

/**
 * @param {string} part
 * @return {string}
 */
function getColor(part) {
	if (currentSpecies.colors[part]) {
		return currentSpecies.colors[part];
	}
	if (DEFAULT_OVERRIDES[part]) {
		return getColor(DEFAULT_OVERRIDES[part]);
	}
	for (const [color, partName] of Object.entries(COLOR_MAP)) {
		if (partName === part) {
			return color;
		}
	}
	return "transparent";
}

/**
 * @param {string} tag 
 * @returns {boolean}
 */
function getTag(tag) {
	return currentSpecies.tags ? currentSpecies.tags.includes(tag) : false;
}

/**
 * @param {string} tag
 * @param {boolean} enabled
 */
function setTag(tag, enabled) {
	if (!currentSpecies.tags) {
		currentSpecies.tags = [];
	}
	if (enabled) {
		if (!currentSpecies.tags.includes(tag)) {
			currentSpecies.tags.push(tag);
		}
	} else {
		currentSpecies.tags = currentSpecies.tags.filter(t => t !== tag);
	}
}

function createColorPicker() {
	colorPickerInput.type = "text";
	colorPickerInput.id = "color-picker-interceptor";
	colorPickerInput.setAttribute("data-coloris", "");
	document.body.appendChild(colorPickerInput);

	colorPickerInput.addEventListener("input", () => {
		if (selectedColorElement && selectedPart !== null) {
			const newColor = colorPickerInput.value;
			selectedColorElement.style.backgroundColor = newColor;
			currentSpecies.colors[selectedPart] = newColor;
			draw();
		}
	});

	document.addEventListener("mouseup", () => {
		if (selectedPart !== null && !jsonElement.contains(document.activeElement)) {
			commitChange();
		}
	});
}

/**
 * @param {string} label
 * @param {string} color
 * @returns {HTMLDivElement}
 */
function createColorSwatch(label, color) {
	const item = document.createElement("div");
	item.classList.add("editor-item");

	const colorElement = document.createElement("div");
	colorElement.classList.add("color");
	colorElement.style.backgroundColor = color;
	colorElements[label] = colorElement;
	item.appendChild(colorElement);
	if (color !== "transparent") {
		colorElement.addEventListener("click", () => {
			selectedPart = label;
			selectedColorElement = colorElement;
			const rect = colorElement.getBoundingClientRect();
			colorPickerInput.style.left = rect.left + "px";
			colorPickerInput.style.top = (rect.bottom + window.scrollY) + "px";

			colorPickerInput.value = currentSpecies.colors[label] || color;
			colorPickerInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});
	} else {
		colorElement.classList.add("color--transparent");
	}
	const labelElement = document.createElement("div");
	const labelText = label.replaceAll("-", " ").toUpperCase();
	labelElement.classList.add("label");
	labelElement.textContent = labelText;
	labelElement.title = "Click to remove from species";
	labelElement.addEventListener("click", () => {
		delete currentSpecies.colors[label];
		colorElement.style.backgroundColor = getColor(label);
		commitChange();
		refreshEditor();
	});
	item.appendChild(labelElement);

	return item;
}

/**
 * @param {string} tag
 * @param {boolean} enabled
 * @returns {HTMLDivElement}
 */
function createTagToggle(tag, enabled) {
	const item = document.createElement("div");
	item.classList.add("editor-item");

	const toggle = document.createElement("button");
	toggle.id = `tag-toggle-${tag}`;
	toggle.classList.add("tag-toggle");
	toggle.textContent = "✓";
	toggle.addEventListener("click", () => {
		setTag(tag, !getTag(tag));
		toggle.classList.toggle("tag-toggle--active", getTag(tag));
		commitChange();
		draw();
	});
	item.appendChild(toggle);

	const labelElement = document.createElement("div");
	labelElement.classList.add("label");
	labelElement.textContent = tag.toUpperCase();
	item.appendChild(labelElement);

	return item;
}

function refreshEditor() {
	for (const [, part] of Object.entries(COLOR_MAP)) {
		const el = colorElements[part];
		if (el && !el.classList.contains("color--transparent")) {
			el.style.backgroundColor = getColor(part);
		}
	}
	if (selectedColorElement && selectedPart !== null) {
		colorPickerInput.value = currentSpecies.colors[selectedPart] || "";
	}
	for (const value of Object.values(TAG)) {
		const toggle = editor.querySelector(`#tag-toggle-${value}`);
		if (toggle && toggle instanceof HTMLElement) {
			toggle.classList.toggle("tag-toggle--active", getTag(value));
		}
	}
}

function updateJson() {
	jsonElement.textContent = JSON.stringify(currentSpecies, null, 2);
}

document.addEventListener("keydown", (e) => {
	if (!(e.metaKey || e.ctrlKey)) {
		return;
	}
	if (e.key === "z" && !e.shiftKey) {
		if (historyIndex > 0) {
			historyIndex--;
			currentSpecies = JSON.parse(JSON.stringify(speciesHistory[historyIndex]));
			refreshEditor();
			updateJson();
			draw();
			e.preventDefault();
		}
	} else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
		if (historyIndex < speciesHistory.length - 1) {
			historyIndex++;
			currentSpecies = JSON.parse(JSON.stringify(speciesHistory[historyIndex]));
			refreshEditor();
			updateJson();
			draw();
			e.preventDefault();
		}
	}
});

jsonElement.addEventListener("input", () => {
	try {
		const parsed = JSON.parse(jsonElement.textContent || "");
		if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
			currentSpecies = parsed;
			refreshEditor();
			draw();
		}
	} catch (e) {
	}
});

jsonElement.addEventListener("blur", () => {
	commitChange();
});

function loadSpeciesHistory() {
	const storedHistory = localStorage.getItem("speciesHistory");
	if (storedHistory) {
		try {
			const parsedHistory = JSON.parse(storedHistory);
			if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
				speciesHistory = parsedHistory;
				currentSpecies = JSON.parse(JSON.stringify(speciesHistory[speciesHistory.length - 1]));
				historyIndex = speciesHistory.length - 1;
			}
		} catch (e) {
			console.warn("Failed to parse species history from localStorage:", e);
		}
	}
	draw();
}

createColorPicker();
loadEditor();
loadSpeciesHistory();

(async () => {
	const pixels = await loadSpriteSheetPixels(SPRITE_PATH);
	baseFrame = new Frame([
		new Layer(getLayerPixels(pixels, 0, SPRITE_SIZE)),
		new Layer(getLayerPixels(pixels, 5, SPRITE_SIZE), TAG.TUFT),
	]);
	updateJson();
	draw();
})();