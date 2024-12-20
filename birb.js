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
const AFK_TIME = 1000 * 20;

const styles = `
	#birb {
		image-rendering: pixelated;
		position: fixed;
		bottom: 0;
		transform: scale(${CSS_SCALE});
		transform-origin: bottom;
		z-index: 999999999;
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
		// Combine layers
		this.pixels = layers[0].pixels.map(row => row.slice());
		for (let i = 1; i < layers.length; i++) {
			let layerPixels = layers[i].pixels;
			for (let y = 0; y < layerPixels.length; y++) {
				for (let x = 0; x < layerPixels[y].length; x++) {
					this.pixels[y][x] = layerPixels[y][x] !== ___ ? layerPixels[y][x] : this.pixels[y][x];
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
				const cell = direction === Directions.LEFT ? row[x] : row[this.pixels[y].length - x - 1];
				ctx.fillStyle = colors[cell];
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
};

const transparent = new Layer([
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

const base = new Layer([
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

const down = new Layer(base.pixels.map((row, rowIndex) => {
	if (rowIndex === 16) {
		const newRow = row.slice();
		newRow[4] = OUT;
		newRow[12] = UND;
		newRow[13] = OUT;
		return newRow;
	} 
	return row.slice();
}).filter((_, i) => i !== 15));
down.pixels.unshift(down.pixels[0].slice());

const wingsUp = new Layer([
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

const wingsDown = new Layer([
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

const sharedFrames = {
	base: new Frame([base]),
	headDown: new Frame([down]),
	wingsDown: new Frame([base, wingsDown]),
	wingsUp: new Frame([down, wingsUp]),
};


const Animations = {
	STILL: new Anim([sharedFrames.base], [1000]),
	BOB: new Anim([
		sharedFrames.base,
		sharedFrames.headDown
	], [
		1200,
		250
	]),
	FLYING: new Anim([
		sharedFrames.wingsUp,
		sharedFrames.headDown,
		sharedFrames.wingsDown,
		sharedFrames.base,
	], [
		80,
		40,
		80,
		40
	]),
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
	canvas.height = sharedFrames.base.pixels.length * CANVAS_PIXEL_SIZE;
	document.body.appendChild(canvas);	
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

function update() {
	ticks++;
	if (currentState === States.IDLE) {
		if (Math.random() < 1 / (60 * 3)) {
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
	// const x = e.clientX;
	// const y = window.innerHeight - e.clientY;
	// flyTo(x, y);
	// focusOnElement();
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
		if (Date.now() - timeOfLastAction > AFK_TIME) {
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
	const rect = randomImage.getBoundingClientRect();
	const x = Math.random() * (rect.right - rect.left) + rect.left;
	flyTo(x, getFocusedElementY());
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

canvas.addEventListener("click", () => {
	focusOnElement();
});

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
	x = x - getCanvasWidth() - WINDOW_PIXEL_SIZE / 2;
	canvas.style.left = `${x}px`;
}

/**
 * @param {number} y
 */
function setY(y) {
	canvas.style.bottom = `${y - WINDOW_PIXEL_SIZE}px`;
}


/**
 * @returns {boolean} Whether the user is on a mobile device
 */
function isMobile() {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}