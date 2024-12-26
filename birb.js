// ==UserScript==
// @name         birb
// @namespace    https://idreesinc.com
// @version      2024-12-12
// @description  birb
// @author       Idrees
// @match        *://*/*
// @grant        none
// ==/UserScript==

// @ts-check

const sharedSettings = {
	cssScale: 1,
	canvasPixelSize: 1,
	hopSpeed: 0.07,
	hopDistance: 45,
};


let desktopSettings = {
	flySpeed: 0.2,
};

let mobileSettings = {
	flySpeed: 0.125,
};

const settings = { ...sharedSettings, ...isMobile() ? mobileSettings : desktopSettings };

const CSS_SCALE = settings.cssScale;
const CANVAS_PIXEL_SIZE = settings.canvasPixelSize;
const WINDOW_PIXEL_SIZE = CANVAS_PIXEL_SIZE * CSS_SCALE;
const HOP_SPEED = settings.hopSpeed;
const FLY_SPEED = settings.flySpeed;
const HOP_DISTANCE = settings.hopDistance;
// Time in milliseconds until the user is considered AFK
const AFK_TIME = 1000 * 30;
const MAX_HEIGHT = 32;

const styles = `
	#birb {
		image-rendering: pixelated;
		position: fixed;
		bottom: 0;
		transform: scale(${CSS_SCALE});
		transform-origin: bottom;
		z-index: 999999999;
		cursor: pointer;
	}

	.birb-window {
		font-family: "Monocraft";
		z-index: 1000;
		position: fixed;
		background-color: #ffecda;
		box-shadow: 
			var(--border-size) 0 var(--border-color), 
			var(--neg-border-size) 0 var(--border-color), 
			0 var(--neg-border-size) var(--border-color), 
			0 var(--border-size) var(--border-color), 
			var(--double-border-size) 0 var(--border-color), 
			var(--neg-double-border-size) 0 var(--border-color), 
			0 var(--neg-double-border-size) var(--border-color), 
			0 var(--double-border-size) var(--border-color), 
			0 0 0 var(--border-size) var(--border-color),
			0 0 0 var(--double-border-size) white,
			var(--double-border-size) 0 0 var(--border-size) white,
			var(--neg-double-border-size) 0 0 var(--border-size) white,
			0 var(--neg-double-border-size) 0 var(--border-size) white,
			0 var(--double-border-size) 0 var(--border-size) white;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}

	.birb-window-header {
		box-sizing: border-box;
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 7px;
		padding-top: 4px;
		padding-bottom: 4px;
		padding-left: 10px;
		padding-right: 10px;
		background-color: #ffa3cb;
		box-shadow:
			var(--border-size) 0 #ffa3cb, 
			var(--neg-border-size) 0 #ffa3cb, 
			0 var(--neg-border-size) #ffa3cb, 
			var(--neg-border-size) var(--border-size) var(--border-color), 
			var(--border-size) var(--border-size) var(--border-color);
		color: var(--border-color);
		font-size: 16px;
	}

	.birb-window-title {
		text-align: center;
		flex-grow: 1;
		user-select: none;
		color: #ffecda;
	}
	
	.birb-window-close {
		position: absolute;
		top: 2px;
		right: 5px;
		opacity: 0.35;
		user-select: none;
		cursor: pointer;
	}

	.birb-window-close:hover {
		opacity: 1;
	}

	.birb-window-content {
		box-sizing: border-box;
		background-color: #ffecda;
		margin-top: var(--border-size);
		width: 100%;
		flex-grow: 1;    
		box-shadow:
			var(--border-size) 0 #ffecda, 
			var(--neg-border-size) 0 #ffecda,
			0 var(--border-size) #ffecda,
			0 var(--neg-border-size) var(--border-color),
			0 var(--border-size) var(--border-color);
		display: flex;
		flex-direction: column;
		padding-left: 15px;
		padding-right: 15px;
		padding-top: 8px;
		padding-bottom: 8px;
	}

	.birb-window-list-item {
		font-size: 14px;
		padding-top: 5px;
		padding-bottom: 5px;
		opacity: 0.6;
		user-select: none;
	}

	.birb-window-list-item:hover {
		opacity: 1;
		cursor: pointer;
	}

	.birb-window-separator {
		width: 100%;
		height: 1.5px;
		background-color: #000000;
		box-sizing: border-box;
		margin-top: 6px;
		margin-bottom: 6px;
		opacity: 0.45;
	}
`;

class Layer {
	/**
	 * @param {string[][]} pixels
	 */
	constructor(pixels) {
		this.pixels = pixels;
	}
}

class Frame {
	/**
	 * @param {Layer[]} layers
	 */
	constructor(layers) {
		let maxHeight = layers.reduce((max, layer) => Math.max(max, layer.pixels.length), 0);
		this.pixels = layers[0].pixels.map(row => row.slice());
		// Pad from top with transparent pixels
		while (this.pixels.length < maxHeight) {
			this.pixels.unshift(new Array(this.pixels[0].length).fill(___));
		}
		// Combine layers
		for (let i = 1; i < layers.length; i++) {
			let layerPixels = layers[i].pixels;
			let topMargin = maxHeight - layerPixels.length;
			for (let y = 0; y < layerPixels.length; y++) {
				for (let x = 0; x < layerPixels[y].length; x++) {
					this.pixels[y + topMargin][x] = layerPixels[y][x] !== ___ ? layerPixels[y][x] : this.pixels[y + topMargin][x];
				}
			}
		}
		// Surround non-transparent pixels with border
		for (let y = 0; y < this.pixels.length; y++) {
			for (let x = 0; x < this.pixels[y].length; x++) {
				if (this.pixels[y][x] === ___ && this.hasAdjacent(x, y)) {
					this.pixels[y][x] = BOR;
				}
			}
		}
	}

	hasAdjacent(x, y) {
		for (let i = -1; i <= 1; i++) {
			for (let j = -1; j <= 1; j++) {
				if (i === 0 && j === 0) {
					continue;
				}
				if (this.pixels[y + i] && this.pixels[y + i][x + j] && this.pixels[y + i][x + j] !== ___ && this.pixels[y + i][x + j] !== BOR) {
					return true;
				}
			}
		}
		return false
	}

	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} direction
	 */
	draw(ctx, direction) {
		for (let y = 0; y < this.pixels.length; y++) {
			const row = this.pixels[y];
			for (let x = 0; x < this.pixels[y].length; x++) {
				let topMargin = MAX_HEIGHT - this.pixels.length;
				const cell = direction === Directions.LEFT ? row[x] : row[this.pixels[y].length - x - 1];
				ctx.fillStyle = colors[cell];
				ctx.fillRect(x * CANVAS_PIXEL_SIZE, (y + topMargin) * CANVAS_PIXEL_SIZE, CANVAS_PIXEL_SIZE, CANVAS_PIXEL_SIZE);
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
	 * @returns {boolean} Whether the animation is complete
	 */
	draw(ctx, direction, timeStart) {
		let time = Date.now() - timeStart;
		const duration = this.getAnimationDuration();
		if (this.loop) {
			time %= duration;
		}
		let totalDuration = 0;
		for (let i = 0; i < this.durations.length; i++) {
			totalDuration += this.durations[i];
			if (time < totalDuration) {
				this.frames[i].draw(ctx, direction);
				return false;
			}
		}
		// Draw the last frame if the animation is complete
		this.frames[this.frames.length - 1].draw(ctx, direction);
		return true;
	}
}

const ___ = "transparent";
const OUT = "outline";
const BOR = "border";
const FOT = "foot";
const BEK = "beak";
const EYE = "eye";
const FAC = "face";
const BEL = "belly";
const UND = "underbelly";
const WNG = "wing";
const WNE = "wing-edge";
const HRT = "heart";
const HRB = "heart-border";
const HRS = "heart-shine";

const colors = {
	[___]: "transparent",
	[OUT]: "#000000",
	[BOR]: "#ffffff",
	[BEK]: "#000000",
	[FOT]: "#af8e75",
	[EYE]: "#000000",
	[FAC]: "#639bff",
	[BEL]: "#f8b143",
	[UND]: "#ec8637",
	[WNG]: "#578ae6",
	[WNE]: "#326ed9",
	[HRT]: "#c82e2e",
	[HRB]: "#501a1a",
	[HRS]: "#ff6b6b",
};

const transparentLayer = new Layer([
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___]
]);

const baseLayer = new Layer([
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, OUT, OUT, OUT, OUT, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, OUT, FAC, FAC, FAC, FAC, OUT, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, OUT, FAC, FAC, FAC, FAC, FAC, FAC, OUT, OUT, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, BEK, BEK, BEK, BEK, FAC, EYE, FAC, FAC, WNG, WNG, OUT, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, OUT, FAC, FAC, FAC, FAC, FAC, FAC, WNG, WNG, WNG, OUT, OUT, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, OUT, FAC, FAC, FAC, FAC, FAC, WNG, WNG, WNG, WNG, WNG, WNG, OUT, OUT, OUT, OUT, OUT, OUT, ___, ___],
	[___, ___, OUT, BEL, FAC, FAC, BEL, BEL, WNG, WNG, WNG, WNG, WNG, WNG, WNG, WNG, WNG, WNG, WNE, WNE, OUT, ___],
	[___, ___, OUT, BEL, BEL, BEL, BEL, BEL, OUT, WNE, WNG, WNG, WNG, WNG, WNG, WNG, WNE, WNE, OUT, OUT, ___, ___],
	[___, ___, OUT, BEL, BEL, BEL, BEL, BEL, BEL, OUT, WNE, WNE, WNE, WNE, WNE, WNE, OUT, OUT, ___, ___, ___, ___],
	[___, ___, ___, OUT, BEL, BEL, BEL, BEL, UND, UND, OUT, OUT, OUT, OUT, OUT, OUT, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, OUT, BEL, BEL, BEL, UND, UND, UND, UND, UND, UND, UND, OUT, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, OUT, UND, UND, UND, UND, UND, UND, UND, UND, OUT, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, OUT, UND, UND, UND, UND, UND, UND, OUT, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, OUT, FOT, OUT, OUT, OUT, FOT, OUT, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, OUT, FOT, OUT, ___, OUT, FOT, OUT, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, OUT, FOT, OUT, FOT, OUT, FOT, OUT, FOT, OUT, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, OUT, ___, OUT, ___, OUT, ___, OUT, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
]);

const happyEyeLayer = new Layer([
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, EYE, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, EYE, ___, EYE, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___]
]);

const downLayer = new Layer(baseLayer.pixels.map((row, rowIndex) => {
	if (rowIndex === 16) {
		const newRow = row.slice();
		newRow[4] = OUT;
		newRow[12] = UND;
		newRow[13] = OUT;
		return newRow;
	} 
	return row.slice();
}).filter((_, i) => i !== 15));
downLayer.pixels.unshift(downLayer.pixels[0].slice());

const wingsUpLayer = new Layer([
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, OUT, OUT, OUT, OUT, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, OUT, OUT, OUT, WNG, WNG, WNG, OUT, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, OUT, OUT, WNG, WNG, WNG, WNG, WNG, WNG, OUT, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, OUT, WNG, WNG, WNG, WNG, WNG, WNG, WNG, OUT, OUT, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, OUT, WNG, WNG, WNG, WNG, WNG, WNG, WNG, WNG, OUT, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, WNG, WNG, WNG, WNG, WNG, WNG, WNG, WNG, WNG, OUT, OUT, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, WNG, WNG, WNG, WNG, WNG, WNG, WNG, WNG, OUT, WNG, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, BEL, WNG, WNG, WNG, WNG, WNG, WNG, OUT, WNG, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, UND, WNG, WNG, OUT, OUT, OUT, WNG, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, UND, UND, UND, WNG, WNG, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___]
]);

const wingsDownLayer = new Layer([
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, WNG, WNG, WNG, WNG, WNG, WNG, OUT, OUT, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, OUT, WNG, WNG, WNG, WNG, WNG, WNG, OUT, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, OUT, WNE, WNG, WNG, WNG, WNG, WNG, OUT, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, OUT, WNE, WNG, WNG, WNG, WNG, WNG, WNG, OUT, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, OUT, WNE, WNG, WNG, WNG, WNG, WNG, OUT, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, OUT, WNE, WNE, WNG, WNG, WNG, WNG, OUT, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, OUT, OUT, WNE, WNE, WNG, WNG, OUT, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, OUT, OUT, WNE, WNE, OUT, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, OUT, OUT, OUT, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___]
]);

const heartOneLayer = new Layer([
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, HRT, ___, HRT, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, HRT, HRT, HRT, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, HRT, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
]);

for (let i = 0; i < 19; i++) {
	heartOneLayer.pixels.push(heartOneLayer.pixels[heartOneLayer.pixels.length - 1].slice());
}

const heartTwoLayer = new Layer([
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, HRB, ___, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, HRB, HRT, HRB, HRT, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, HRB, HRT, HRT, HRT, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, HRB, HRT, HRT, HRT, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, HRB, HRT, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
]);

for (let i = 0; i < 20; i++) {
	heartTwoLayer.pixels.push(heartTwoLayer.pixels[heartTwoLayer.pixels.length - 1].slice());
}

const heartThreeLayer = new Layer([
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, HRB, HRB, ___, HRB, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, HRB, HRT, HRS, HRB, HRT, HRS, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, HRB, HRT, HRT, HRT, HRT, HRT, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, HRB, HRT, HRT, HRT, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, HRB, HRT, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
]);

for (let i = 0; i < 21; i++) {
	heartThreeLayer.pixels.push(heartThreeLayer.pixels[heartThreeLayer.pixels.length - 1].slice());
}

const heartFourLayer = new Layer([
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, HRB, HRB, ___, HRB, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, HRB, HRT, HRS, HRB, HRT, HRS, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, HRB, HRT, HRT, HRT, HRT, HRT, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, HRB, HRT, HRT, HRT, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, HRB, HRT, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, HRB, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
	[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
]);

for (let i = 0; i < 20; i++) {
	heartFourLayer.pixels.push(heartThreeLayer.pixels[heartThreeLayer.pixels.length - 1].slice());
}

const sharedFrames = {
	base: new Frame([baseLayer]),
	headDown: new Frame([downLayer]),
	wingsDown: new Frame([baseLayer, wingsDownLayer]),
	wingsUp: new Frame([downLayer, wingsUpLayer]),
	heartOne: new Frame([baseLayer, happyEyeLayer, heartOneLayer]),
	heartTwo: new Frame([baseLayer, happyEyeLayer, heartTwoLayer]),
	heartThree: new Frame([baseLayer, happyEyeLayer, heartThreeLayer]),
	heartFour: new Frame([baseLayer, happyEyeLayer, heartFourLayer]),
};


const Animations = {
	STILL: new Anim([sharedFrames.base], [1000]),
	BOB: new Anim([
		sharedFrames.base,
		sharedFrames.headDown
	], [
		420,
		420
	]),
	FLYING: new Anim([
		sharedFrames.base,
		sharedFrames.wingsUp,
		sharedFrames.headDown,
		sharedFrames.wingsDown,
	], [
		40,
		80,
		40,
		80,
	]),
	HEART: new Anim([
		sharedFrames.heartOne,
		sharedFrames.heartTwo,
		sharedFrames.heartThree,
		sharedFrames.heartFour,
		sharedFrames.heartThree,
		sharedFrames.heartFour,
		sharedFrames.heartThree,
		sharedFrames.heartFour,
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

const styleElement = document.createElement("style");
const canvas = document.createElement("canvas");

// Install if not within an iframe
if (window === window.top) {
	styleElement.innerHTML = styles;
	document.head.appendChild(styleElement);
	
	// Insert a canvas element into the body with the same dimensions as the 2D array
	canvas.id = "birb";
	canvas.width = sharedFrames.base.pixels[0].length * CANVAS_PIXEL_SIZE;
	canvas.height = MAX_HEIGHT * CANVAS_PIXEL_SIZE;
	document.body.appendChild(canvas);
}

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

function insertStartMenu() {
	if (document.querySelector(".birb-window")) {
		return;
	}
	let startMenu = makeElement("birb-window");
	let header = makeElement("birb-window-header");
	header.innerHTML = '<div class="birb-window-title">birbOS</div>';
	let content = makeElement("birb-window-content");
	let petButton = makeElement("birb-window-list-item", "Pet Birb");
	petButton.addEventListener("click", () => {
		removeStartMenu();
		pet();
	});
	content.appendChild(petButton);
	content.appendChild(makeElement("birb-window-list-item", "Field Guide"));
	content.appendChild(makeElement("birb-window-list-item", "Decorations"));
	content.appendChild(makeElement("birb-window-list-item", "Programs"));
	content.appendChild(makeElement("birb-window-separator"));
	content.appendChild(makeElement("birb-window-list-item", "Settings"));
	startMenu.appendChild(header);
	startMenu.appendChild(content);
	document.body.appendChild(startMenu);
	makeDraggable(document.querySelector(".birb-window-header"));

	let x = birdX;
	let y = window.innerHeight - birdY;
	const offset = 20;
	if (x < window.innerWidth / 2) {
		// Left side
		x += offset;
	} else {
		// Right side
		x -= startMenu.offsetWidth + offset;
	}
	if (y > window.innerHeight / 2) {
		// Top side
		y -= startMenu.offsetHeight + offset + 10;
	} else {
		// Bottom side
		y += offset;
	}
	startMenu.style.left = `${x}px`;
	startMenu.style.top = `${y}px`;
}

function removeStartMenu() {
	const startMenu = document.querySelector(".birb-window");
	if (startMenu) {
		startMenu.remove();
	}
}

function isStartMenuOpen() {
	return document.querySelector(".birb-window") !== null;
}

function makeDraggable(windowHeader) {
	let isMouseDown = false;
	let offsetX = 0;
	let offsetY = 0;

	// Get the parent window element
	const windowElement = windowHeader.parentElement;

	windowHeader.addEventListener("mousedown", (e) => {
		isMouseDown = true;
		offsetX = e.clientX - windowElement.offsetLeft;
		offsetY = e.clientY - windowElement.offsetTop;
	});

	document.addEventListener("mouseup", () => {
		isMouseDown = false;
	});

	document.addEventListener("mousemove", (e) => {
		if (isMouseDown) {
			windowElement.style.left = `${e.clientX - offsetX}px`;
			windowElement.style.top = `${e.clientY - offsetY}px`;
		}
	});
}

/** @type {CanvasRenderingContext2D} */
// @ts-ignore
const ctx = canvas.getContext("2d");

const Directions = {
	LEFT: -1,
	RIGHT: 1,
};

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
let birdX = 40;
// Bird's starting position (when flying)
let startX = 0;
let startY = 0;
// Bird's target position (when flying)
let targetX = 0;
let targetY = 0;
/** @type {HTMLElement|null} */
let focusedElement = null;
// Time of the user's last action on the page
let timeOfLastAction = Date.now();
// Stack of timestamps for each mouseover, max length of 10
let petStack = [];

function update() {
	ticks++;
	if (currentState === States.IDLE) {
		if (Math.random() < 1 / (60 * 3) && currentAnimation !== Animations.HEART && !isStartMenuOpen()) {
			hop();
		}
	} else if (currentState === States.HOP) {
		if (updateParabolicPath(HOP_SPEED)) {
			setState(States.IDLE);
		}
	}
}

window.addEventListener("scroll", () => {
	timeOfLastAction = Date.now();
	// Can't keep up with scrolling on mobile devices so fly down instead
	if (isMobile()) {
		focusOnGround();
	}

});

document.addEventListener("click", (e) => {
	timeOfLastAction = Date.now();
	if (e.target instanceof Node && !canvas.contains(e.target) && !document.querySelector(".birb-window")?.contains(e.target)) {
		removeStartMenu();
	}
	// const x = e.clientX;
	// const y = window.innerHeight - e.clientY;
	// flyTo(x, y);
	// focusOnElement();
});

canvas.addEventListener("click", () => {
	insertStartMenu();
	// focusOnElement();
	// if (focusedElement === null && currentState === States.IDLE) {
	// 	setAnimation(Animations.HEART)
	// }
});

canvas.addEventListener("mouseover", () => {
	timeOfLastAction = Date.now();
	if (currentState === States.IDLE) {
		petStack.push(Date.now());
		if (petStack.length > 10) {
			petStack.shift();
		}
		const pets = petStack.filter((time) => Date.now() - time < 1000).length;
		if (pets >= 4) {
			setAnimation(Animations.HEART);
			// Clear the stack
			petStack = [];
		}
	}
});

setInterval(update, 1000 / 60);

function draw() {
	requestAnimationFrame(draw);

	// Update the bird's position
	if (currentState === States.IDLE) {
		if (focusedElement !== null) {
			birdY = getFocusedElementY();
		}
	} else if (currentState === States.FLYING) {
		// Fly to target location (even if in the air)
		if (updateParabolicPath(FLY_SPEED)) {
			setState(States.IDLE);
		}
	}

	if (focusedElement === null) {
		if (Date.now() - timeOfLastAction > AFK_TIME && !isStartMenuOpen()) {
			// Fly to an element if the user is AFK
			focusOnElement();
			timeOfLastAction = Date.now();
		}
	} else if (focusedElement !== null) {
		targetY = getFocusedElementY();
		if (targetY < 0 || targetY > window.innerHeight) {
			// Fly to ground if the focused element moves out of bounds
			focusOnGround();
		}
	}

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (currentAnimation.draw(ctx, direction, animStart)) {
		setAnimation(Animations.STILL);
	}

	// Update HTML element position
	setX(birdX);
	setY(birdY);
}

draw();

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

function getFocusedElementRandomX() {
	if (focusedElement === null) {
		return Math.random() * window.innerWidth;
	}
	const rect = focusedElement.getBoundingClientRect();
	return Math.random() * (rect.right - rect.left) + rect.left;
}

function getFocusedElementY() {
	if (focusedElement === null) {
		return 0;
	}
	const rect = focusedElement.getBoundingClientRect();
	return window.innerHeight - rect.top;
}

function focusOnGround() {
	if (focusedElement === null) {
		return;
	}
	focusedElement = null;
	flyTo(Math.random() * window.innerWidth, 0);
}

function focusOnElement() {
	const images = document.querySelectorAll("img");
	const inWindow = Array.from(images).filter((img) => {
		const rect = img.getBoundingClientRect();
		return rect.left >= 0 && rect.top >= 0 + 100 && rect.right <= window.innerWidth && rect.top <= window.innerHeight;
	});
	const MIN_SIZE = 100;
	const largeImages = Array.from(inWindow).filter((img) => img !== focusedElement && img.width >= MIN_SIZE && img.height >= MIN_SIZE);
	if (largeImages.length === 0) {
		return;
	}
	const randomImage = largeImages[Math.floor(Math.random() * largeImages.length)];
	focusedElement = randomImage;
	flyTo(getFocusedElementRandomX(), getFocusedElementY());
}

function getCanvasWidth() {
	return canvas.width * CSS_SCALE
}

function getCanvasHeight() {
	return canvas.height * CSS_SCALE
}

function hop() {
	if (currentState === States.IDLE) {
		// Determine bounds for hopping
		let minX = 0;
		let maxX = window.innerWidth;
		let y = 0;
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
	}
}

function pet() {
	if (currentState === States.IDLE) {
		setAnimation(Animations.HEART);
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
	stateStart = Date.now();
	startX = birdX;
	startY = birdY;
	currentState = state;
	if (state === States.IDLE) {
		setAnimation(Animations.BOB);
	}
}

/**
 * @param {number} value
 */
function roundToPixel(value) {
	return Math.round(value / WINDOW_PIXEL_SIZE) * WINDOW_PIXEL_SIZE;
}

/**
 * @param {number} x
 */
function setX(x) {
	let mod = getCanvasWidth() / -2 - (WINDOW_PIXEL_SIZE * (direction === Directions.RIGHT ? 2 : -2));
	canvas.style.left = `${x + mod}px`;
}

/**
 * @param {number} y
 */
function setY(y) {
	canvas.style.bottom = `${y}px`;
}


/**
 * @returns {boolean} Whether the user is on a mobile device
 */
function isMobile() {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}