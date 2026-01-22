import Anim from "./animation/anim.js";
import Frame from "./animation/frame.js";
import Layer, { TAG } from "./animation/layer.js";
import { PALETTE } from "./animation/sprites.js";
import { getLayerPixels } from "./shared.js";

const HAT_WIDTH = 12;

export const HAT = {
	NONE: "none",
	TOP_HAT: "top-hat",
	VIKING_HELMET: "viking-helmet",
	COWBOY_HAT: "cowboy-hat",
	BOWLER_HAT: "bowler-hat",
	FEZ: "fez",
	WIZARD_HAT: "wizard-hat",
	BASEBALL_CAP: "baseball-cap",
	FLOWER_HAT: "flower-hat"
};

/** @type {{ [hatId: string]: { name: string, description: string } }} */
export const HAT_METADATA = {
	[HAT.NONE]: {
		name: "Invisible Hat",
		description: "It's like you're wearing nothing at all!"
	},
	[HAT.TOP_HAT]: {
		name: "Top Hat",
		description: "The mark of a true gentlebird."
	},
	[HAT.VIKING_HELMET]: {
		name: "Viking Helmet",
		description: "Sure, vikings never actually wore this style of helmet, but why let facts get in the way of good fashion?"
	},
	[HAT.COWBOY_HAT]: {
		name: "Cowboy Hat",
		description: "You can't jam with the console cowboys without the appropriate attire."
	},
	[HAT.BOWLER_HAT]: {
		name: "Bowler Hat",
		description: "For that authentic, Victorian look!"
	},
	[HAT.FEZ]: {
		name: "Fez",
		description: "It's a fez. Fezzes are cool."
	},
	[HAT.WIZARD_HAT]: {
		name: "Wizard Hat",
		description: "Grants the bearer terrifying mystical power, but luckily birds only use it to summon old ladies with bread crumbs."
	},
	[HAT.BASEBALL_CAP]: {
		name: "Baseball Cap",
		description: "Birds unfortunately only ever hit 'fowl' balls..."
	},
	[HAT.FLOWER_HAT]: {
		name: "Flower Hat",
		description: "To be fair, this is less of a hat and more of a dirt clod that your pet happened to pick up."
	}
};

/**
 * @param {string[][]} spriteSheet 
 * @returns {{ base: Layer[], down: Layer[] }}
 */
export function createHatLayers(spriteSheet) {
	const hatLayers = {
		base: [],
		down: []
	};
	for (let i = 0; i < Object.keys(HAT).length; i++) {
		const hatName = Object.keys(HAT)[i];
		if (hatName === 'NONE') {
			continue;
		}
		const index = i - 1;
		const hatKey = HAT[hatName];
		const hatLayer = buildHatLayer(spriteSheet, hatKey, index);
		const downHatLayer = buildHatLayer(spriteSheet, hatKey, index, 1);
		hatLayers.base.push(hatLayer);
		hatLayers.down.push(downHatLayer);
	}
	return hatLayers;
}

/**
 * @param {string[][]} spriteSheet
 * @param {string} hatId 
 * @returns {Anim}
 */
export function createHatItemAnimation(hatId, spriteSheet) {
	const hatLayer = buildHatItemLayer(spriteSheet, hatId);
	const frames = [
		new Frame([hatLayer])
	];
	return new Anim(frames, [1000], true);
}

/**
 * @param {string[][]} spriteSheet 
 * @param {string} hatName
 * @param {number} hatIndex
 * @param {number} [yOffset=0]
 * @returns {Layer}
 */
function buildHatLayer(spriteSheet, hatName, hatIndex, yOffset = 0) {
	const LEFT_PADDING = 6;
	const RIGHT_PADDING = 14;
	const TOP_PADDING = 5 + yOffset;
	const BOTTOM_PADDING = Math.max(0, 15 - yOffset);

	let hatPixels = getLayerPixels(spriteSheet, hatIndex, HAT_WIDTH);
	hatPixels = pad(hatPixels, TOP_PADDING, BOTTOM_PADDING, LEFT_PADDING, RIGHT_PADDING);
	hatPixels = drawOutline(hatPixels, false);

	return new Layer(hatPixels, hatName);
}

/**
 * @param {string[][]} spriteSheet 
 * @param {string} hatId 
 * @returns {Layer}
 */
function buildHatItemLayer(spriteSheet, hatId) {
	if (hatId === HAT.NONE) {
		return new Layer([], TAG.DEFAULT);
	}
	const hatIndex = Object.keys(HAT).indexOf(hatId) - 1;
	let hatPixels = getLayerPixels(spriteSheet, hatIndex, HAT_WIDTH);
	hatPixels = pad(hatPixels, 1, 1, 1, 1);
	hatPixels = drawOutline(hatPixels, true);
	hatPixels = pushToBottom(hatPixels);
	return new Layer(hatPixels, TAG.DEFAULT);
}

/**
 * Add transparent padding around the pixel array
 * @param {string[][]} pixels 
 * @param {number} top 
 * @param {number} bottom 
 * @param {number} left 
 * @param {number} right 
 * @returns {string[][]}
 */
function pad(pixels, top, bottom, left, right) {
	const paddedPixels = [];
	const rowLength = pixels[0].length + left + right;
	// Top padding
	for (let y = 0; y < top; y++) {
		paddedPixels.push(Array(rowLength).fill(PALETTE.TRANSPARENT));
	}
	// Left and right padding
	for (let y = 0; y < pixels.length; y++) {
		const row = [];
		for (let x = 0; x < left; x++) {
			row.push(PALETTE.TRANSPARENT);
		}
		for (let x = 0; x < pixels[y].length; x++) {
			row.push(pixels[y][x]);
		}
		for (let x = 0; x < right; x++) {
			row.push(PALETTE.TRANSPARENT);
		}
		paddedPixels.push(row);
	}
	// Bottom padding
	for (let y = 0; y < bottom; y++) {
		paddedPixels.push(Array(rowLength).fill(PALETTE.TRANSPARENT));
	}
	return paddedPixels;
}

/**
 * Draw an outline around non-transparent pixels
 * @param {string[][]} pixels 
 * @param {boolean} [outlineBottom=false]
 * @return {string[][]}
 */
function drawOutline(pixels, outlineBottom = false) {
	let neighborOffsets = [
		[-1, 0],
		[1, 0],
		[0, -1],
		[-1, -1],
		[1, -1],
	];
	if (outlineBottom) {
		neighborOffsets.push([0, 1], [-1, 1], [1, 1]);
	}
	for (let y = 0; y < pixels.length; y++) {
		for (let x = 0; x < pixels[y].length; x++) {
			const pixel = pixels[y][x];
			if (pixel !== PALETTE.TRANSPARENT && pixel !== PALETTE.BORDER) {
				for (let [dx, dy] of neighborOffsets) {
					const newX = x + dx;
					const newY = y + dy;
					if (newY >= 0 && newY < pixels.length && newX >= 0 && newX < pixels[newY].length && pixels[newY][newX] === PALETTE.TRANSPARENT) {
						pixels[newY][newX] = PALETTE.BORDER;
					}
				}
			}
		}
	}
	return pixels;
}

/**
 * Trim transparent rows from the bottom and push them to the top
 * @param {string[][]} pixels
 * @returns {string[][]}
 */
function pushToBottom(pixels) {
	let trimmedPixels = pixels.slice();
	let trimCount = 0;
	while (trimmedPixels.length > 1) {
		const firstRow = trimmedPixels[trimmedPixels.length - 1];
		if (firstRow.every(pixel => pixel === PALETTE.TRANSPARENT)) {
			trimmedPixels.pop();
			trimCount++;
		} else {
			break;
		}
	}
	trimmedPixels = pad(trimmedPixels, trimCount, 0, 0, 0);
	return trimmedPixels;
}