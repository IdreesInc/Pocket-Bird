// @ts-check
import { SPRITE_SHEET_COLOR_MAP, PALETTE, loadSpriteSheetPixels } from '../src/animation/sprites.js';
import Layer, { TAG } from '../src/animation/layer.js';
import Frame from '../src/animation/frame.js';
import { Directions, getLayerPixels } from '../src/shared.js';
import species from '../src/species.js';

const COLOR_MAP = SPRITE_SHEET_COLOR_MAP;
const SPRITE_PATH = "../sprites/birb.png";
const SPRITE_SIZE = 32;
/** @type {Array<{tag: string, label: string}>} */
const AVAILABLE_TAGS = [
	{ tag: TAG.TUFT, label: "Tuft" },
];

/** @type {Record<string, string>} */
const DEFAULT_OVERRIDES = {
	"hood": "face",
	"nose": "face"
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

/** @type {string|null} */
let selectedPart = null;
/** @type {HTMLElement|null} */
let selectedColorElement = null;
/** @type {Record<string, HTMLElement>} */
const colorElements = {};


/** @type {Record<string, string>} */
let currentSpecies = { ...species.bluebird.colors };
let colorHistory = [{ ...currentSpecies }];
let historyIndex = 0;


/** @type {Set<string>} */
const currentTags = new Set();

/** @type {Frame|null} */
let baseFrame = null;
const spriteCanvas = document.createElement('canvas');
spriteCanvas.width = canvas.width;
spriteCanvas.height = canvas.height;
/** @type {CanvasRenderingContext2D} */
// @ts-ignore
const spriteCtx = spriteCanvas.getContext('2d');

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
	baseFrame.draw(spriteCtx, Directions.RIGHT, 1, buildColorScheme(), [...currentTags]);
	ctx.drawImage(spriteCanvas, 0, 0);
}

function updateColors() {
	const lastColors = colorHistory[historyIndex];
	let changed = false;
	for (const part of Object.keys(currentSpecies)) {
		if (currentSpecies[part] !== lastColors[part]) {
			changed = true;
			break;
		}
	}
	if (!changed) {
		for (const part of Object.keys(lastColors)) {
			if (!(part in currentSpecies)) {
				changed = true;
				break;
			}
		}
	}
	if (changed) {
		colorHistory = colorHistory.slice(0, historyIndex + 1);
		colorHistory.push({ ...currentSpecies });
		historyIndex++;
	}
	updateJson();
	draw();
}

function loadEditor() {
	for (const [color, part] of Object.entries(COLOR_MAP)) {
		if (IGNORED_PARTS.has(part)) {
			continue;
		}
		const item = createColorItem(part, getColor(part) || color);
		editor.appendChild(item);
	}
	// for (const { tag, label } of AVAILABLE_TAGS) {
	// 	editor.appendChild(createTagItem(tag, label));
	// }
}

/**
 * @param {string} part
 * @return {string}
 */
function getColor(part) {
	if (currentSpecies[part]) {
		return currentSpecies[part];
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

function createColorPicker() {
	colorPickerInput.type = "text";
	colorPickerInput.id = "coloris-proxy";
	colorPickerInput.setAttribute("data-coloris", "");
	document.body.appendChild(colorPickerInput);

	colorPickerInput.addEventListener("input", () => {
		if (selectedColorElement && selectedPart !== null) {
			const newColor = colorPickerInput.value;
			selectedColorElement.style.backgroundColor = newColor;
			currentSpecies[selectedPart] = newColor;
			draw();
		}
	});

	document.addEventListener("mouseup", () => {
		if (selectedPart !== null && !jsonElement.contains(document.activeElement)) {
			updateColors();
		}
	});
}

/**
 * @param {string} label
 * @param {string} color
 * @returns {HTMLDivElement}
 */
function createColorItem(label, color) {
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

			colorPickerInput.value = currentSpecies[label] || color;
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
		delete currentSpecies[label];
		colorElement.style.backgroundColor = getColor(label);
		updateColors();
		refreshEditorColors();
	});
	item.appendChild(labelElement);

	return item;
}

/**
 * @param {string} tag
 * @param {string} label
 * @returns {HTMLDivElement}
 */
function createTagItem(tag, label) {
	const item = document.createElement("div");
	item.classList.add("tag-item");

	const toggle = document.createElement("button");
	toggle.classList.add("tag-toggle");
	toggle.textContent = "✓";
	toggle.addEventListener("click", () => {
		if (currentTags.has(tag)) {
			currentTags.delete(tag);
			toggle.classList.remove("tag-toggle--active");
		} else {
			currentTags.add(tag);
			toggle.classList.add("tag-toggle--active");
		}
		draw();
	});
	item.appendChild(toggle);

	const labelElement = document.createElement("div");
	labelElement.classList.add("label");
	labelElement.textContent = label.toUpperCase();
	item.appendChild(labelElement);

	return item;
}

function refreshEditorColors() {
	for (const [, part] of Object.entries(COLOR_MAP)) {
		const el = colorElements[part];
		if (el && !el.classList.contains("color--transparent")) {
			el.style.backgroundColor = getColor(part);
		}
	}
	if (selectedColorElement && selectedPart !== null) {
		colorPickerInput.value = currentSpecies[selectedPart] || "";
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
			currentSpecies = { ...colorHistory[historyIndex] };
			refreshEditorColors();
			updateJson();
			draw();
			e.preventDefault();
		}
	} else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
		if (historyIndex < colorHistory.length - 1) {
			historyIndex++;
			currentSpecies = { ...colorHistory[historyIndex] };
			refreshEditorColors();
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
			refreshEditorColors();
			draw();
		}
	} catch (e) {
	}
});

jsonElement.addEventListener("blur", () => {
	updateColors();
});

createColorPicker();
loadEditor();

(async () => {
	const pixels = await loadSpriteSheetPixels(SPRITE_PATH);
	baseFrame = new Frame([
		new Layer(getLayerPixels(pixels, 0, SPRITE_SIZE)),
		new Layer(getLayerPixels(pixels, 5, SPRITE_SIZE), TAG.TUFT),
	]);
	updateColors();
})();