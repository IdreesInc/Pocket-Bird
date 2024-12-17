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

const CSS_SCALE = 0.5;
const CANVAS_PIXEL_SIZE = 6;
const WINDOW_PIXEL_SIZE = CANVAS_PIXEL_SIZE * CSS_SCALE;

const styles = `
	canvas {
		image-rendering: pixelated;
		position: fixed;
		bottom: 0;
		filter: drop-shadow(0px 0px 1px #a1a1a1);
		transform: scale(${CSS_SCALE});
		transform-origin: bottom;
		z-index: 999999999;
	}
`;

class Frame {
	/**
	 * @param {number[][]} pixels
	 */
	constructor(pixels) {
		this.pixels = pixels;
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

const ___ = 0;
// Top of head
const HED = 1;
// Beak
const BEK = 2;
// Belly
const BLY = 3;
// Eye
const EYE = 4;
// Wing feathers
const W11 = 5;
const W12 = 6;
const W21 = 7;
const W22 = 8;
const W23 = 9;
const W24 = 10;
const W31 = 11;
const W32 = 12;
const W33 = 13;
const W34 = 14;
const W41 = 15;
const W42 = 16;
const W43 = 17;
const W51 = 18;
// Front of head
const FRN = 19;
// Back of underside
const BUM = 20;
// Underside wing feather (revealed when flying)
const UND = 21;
// Leg
const LEG = 22;
// Toe
const TOE = 23;

const colors = {
	[___]: "transparent",
	[HED]: "#ffffff",
	[BEK]: "#5f5f5f",
	[BLY]: "#cecece",
	[EYE]: "#000000",
	[W11]: "#a4a4a4",
	[W12]: "#49413d",
	[W21]: "#a4a4a4",
	[W22]: "#bfbfbf",
	[W23]: "#adadad",
	[W24]: "#5b4c45",
	[W31]: "#929292",
	[W32]: "#adadad",
	[W33]: "#929292",
	[W34]: "#64524a",
	[W41]: "#9b908b",
	[W42]: "#807069",
	[W43]: "#adadad",
	[W51]: "#807069",
	[FRN]: "#e4e4e4",
	[BUM]: "#b7bcbf",
	[UND]: "#cecece",
	[LEG]: "#000000",
	[TOE]: "#5f5f5f",
};

const sharedFrames = {
	base: new Frame([
		[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
		[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
		[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
		[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
		[___, ___, ___, HED, HED, ___, ___, ___, ___, ___, ___],
		[___, ___, FRN, HED, HED, HED, ___, ___, ___, ___, ___],
		[___, BEK, FRN, EYE, HED, HED, W21, W31, ___, ___, ___],
		[___, ___, BLY, BLY, HED, W11, W22, W32, W41, W51, ___],
		[___, ___, ___, BLY, BLY, W12, W23, W33, W42, ___, ___],
		[___, ___, ___, BLY, BLY, BLY, W24, W34, W43, ___, ___],
		[___, ___, ___, ___, BLY, BLY, BUM, BUM, ___, ___, ___],
		[___, ___, ___, ___, TOE, LEG, ___, ___, ___, ___, ___]
	]),
	headDown: new Frame([
		[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
		[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
		[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
		[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
		[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
		[___, ___, ___, HED, HED, ___, ___, ___, ___, ___, ___],
		[___, ___, FRN, HED, HED, HED, W21, W31, ___, ___, ___],
		[___, BEK, FRN, EYE, HED, W11, W22, W32, W41, W51, ___],
		[___, ___, BLY, BLY, BLY, W12, W23, W33, W42, ___, ___],
		[___, ___, ___, BLY, BLY, BLY, W24, W34, W43, ___, ___],
		[___, ___, ___, ___, BLY, BLY, BUM, BUM, ___, ___, ___],
		[___, ___, ___, ___, TOE, LEG, ___, ___, ___, ___, ___]
	]),
	wingsUp: new Frame([
		[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
		[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
		[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
		[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
		[___, ___, ___, ___, ___, ___, ___, ___, ___, ___, ___],
		[___, ___, ___, HED, HED, ___, ___, W31, W32, W51, ___],
		[___, ___, FRN, HED, HED, HED, W31, W32, W33, W43, ___],
		[___, BEK, FRN, EYE, HED, W21, W22, W33, W42, ___, ___],
		[___, ___, BLY, BLY, BLY, W11, W23, W34, W34, ___, ___],
		[___, ___, ___, BLY, BLY, BLY, W12, W24, UND, ___, ___],
		[___, ___, ___, ___, BLY, BLY, BUM, BUM, ___, ___, ___],
		[___, ___, ___, ___, TOE, LEG, ___, ___, ___, ___, ___]
	]),
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
	FLAP: new Anim([
		sharedFrames.base,
		sharedFrames.wingsUp,
		sharedFrames.base,
		sharedFrames.wingsUp,
	], [
		2000,
		100,
		50,
		100
	], false),
	FLYING: new Anim([
		sharedFrames.headDown,
		sharedFrames.wingsUp
	], [
		100,
		100
	]),
};

const styleElement = document.createElement("style");
const canvas = document.createElement("canvas");

// Install if not within an iframe
if (window === window.top) {
	styleElement.innerHTML = styles;
	document.head.appendChild(styleElement);
	
	// Insert a canvas element into the body with the same dimensions as the 2D array
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
let startX = 0;
let startY = 0;
let currentState = States.IDLE;
let animStart = Date.now();
let currentAnimation = Animations.BOB;
let direction = Directions.RIGHT;
let ticks = 0;
// Bird's current position
let birdY = 0;
let birdX = 0;
// Bird's target position (when flying)
let targetX = 0;
let targetY = 0;
/** @type {HTMLElement|null} */
let focusedElement = null;

function update() {
	ticks++;
	if (currentState === States.IDLE) {
		if (Math.random() < 1 / (60 * 5)) {
			hop();
		} else if (Math.random() < 1 / (60 * 60) ) {
			if (Math.random() < 0.5) {
				focusOnElement();
			} else {
				focusOnGround();
			}
		}
	} else if (currentState === States.HOP) {
		if (updateParabolicPath(0.075)) {
			setState(States.IDLE);
		}
	}
}

setInterval(update, 1000 / 60);

function draw() {
	requestAnimationFrame(draw);
	if (currentState === States.IDLE) {
		if (focusedElement !== null) {
			birdY = getFocusedElementY();
		}
	} else if (currentState === States.FLYING) {
		// Fly to target location (even if in the air)
		if (updateParabolicPath(0.3)) {
			setState(States.IDLE);
		}
	}

	// Fly to ground if the focused element moves out of bounds
	if (focusedElement !== null) {
		targetY = getFocusedElementY();
		if (targetY < 0 || targetY > window.innerHeight) {
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
function updateParabolicPath(speed, intensity = 3) {
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
		return rect.left >= 0 && rect.top >= 0 && rect.right <= window.innerWidth && rect.top <= window.innerHeight;
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
		const HOP_DISTANCE = 60 * CSS_SCALE;
		if ((Math.random() < 0.5 && birdX - HOP_DISTANCE > minX) || birdX + HOP_DISTANCE > maxX) {
			targetX = birdX - HOP_DISTANCE;
		} else {
			targetX = birdX + HOP_DISTANCE;
		}
		targetY = y;
	}
}

canvas.addEventListener("click", () => {
	hop();
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

// Detect any click on the page and print the coordinates
document.addEventListener("click", (e) => {
	// const x = e.clientX;
	// const y = window.innerHeight - e.clientY;
	// flyTo(x, y);
	focusOnElement();
});

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
	canvas.style.bottom = `${y}px`;
}