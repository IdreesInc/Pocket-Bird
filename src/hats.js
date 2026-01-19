import Layer from "./animation/layer.js";
import { PALETTE } from "./animation/sprites.js";
import { getLayerPixels } from "./shared.js";

const HAT = {
	TOP_HAT: 'top-hat'
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
	for (const hatName in HAT) {
		const hatKey = HAT[hatName];
		const hatLayer = buildHatLayer(spriteSheet, hatKey, false);
		const downHatLayer = buildHatLayer(spriteSheet, hatKey, false, 1);
		hatLayers.base.push(hatLayer);
		hatLayers.down.push(downHatLayer);
	}
	return hatLayers;
}

/**
 * @param {string[][]} spriteSheet 
 * @param {string} hatName 
 * @param {boolean} [outlineBottom=false]
 * @param {number} [yOffset=0]
 * @returns {Layer}
 */
function buildHatLayer(spriteSheet, hatName, outlineBottom = false, yOffset = 0) {
	const LEFT_PADDING = 6;
	const RIGHT_PADDING = 14;
	const TOP_PADDING = 4 + yOffset;
	const BOTTOM_PADDING = Math.max(0, 16 - yOffset);

	const hatPixels = getLayerPixels(spriteSheet, 0, 12);
	const paddedHatPixels = [];

	// Top padding
	for (let y = 0; y < TOP_PADDING; y++) {
		paddedHatPixels.push(Array(hatPixels[0].length + LEFT_PADDING + RIGHT_PADDING)
			.fill(PALETTE.TRANSPARENT)
		);
	}
	// Left and right padding
	for (let y = 0; y < hatPixels.length; y++) {
		const row = [];
		for (let x = 0; x < LEFT_PADDING; x++) {
			row.push(PALETTE.TRANSPARENT);
		}

		for (let x = 0; x < hatPixels[y].length; x++) {
			row.push(hatPixels[y][x]);
		}

		for (let x = 0; x < RIGHT_PADDING; x++) {
			row.push(PALETTE.TRANSPARENT);
		}

		paddedHatPixels.push(row);
	}
	// Bottom padding
	for (let y = 0; y < BOTTOM_PADDING; y++) {
		paddedHatPixels.push(Array(hatPixels[0].length + LEFT_PADDING + RIGHT_PADDING)
			.fill(PALETTE.TRANSPARENT)
		);
	}

	// Add outline
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
	for (let y = 0; y < paddedHatPixels.length; y++) {
		for (let x = 0; x < paddedHatPixels[y].length; x++) {
			const pixel = paddedHatPixels[y][x];
			if (pixel !== PALETTE.TRANSPARENT && pixel !== PALETTE.BORDER) {
				for (let [dx, dy] of neighborOffsets) {
					const newX = x + dx;
					const newY = y + dy;
					if (newY >= 0 && newY < paddedHatPixels.length && newX >= 0 && newX < paddedHatPixels[newY].length && paddedHatPixels[newY][newX] === PALETTE.TRANSPARENT) {
						paddedHatPixels[newY][newX] = PALETTE.BORDER;
					}
				}
			}
		}
	}
	return new Layer(paddedHatPixels);
}