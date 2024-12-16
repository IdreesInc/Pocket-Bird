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

const sharedFrames = {
	base: new Frame([
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0],
		[0, 0, 3, 4, 4, 4, 0, 0, 0, 0, 0],
		[0, 2, 3, 1, 4, 4, 5, 5, 0, 0, 0],
		[0, 0, 3, 3, 4, 5, 5, 5, 5, 5, 0],
		[0, 0, 0, 3, 3, 2, 5, 5, 5, 0, 0],
		[0, 0, 0, 3, 3, 3, 2, 2, 2, 0, 0],
		[0, 0, 0, 0, 3, 3, 3, 3, 0, 0, 0],
		[0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0]
	]),
	headDown: new Frame([
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0],
		[0, 0, 3, 4, 4, 4, 5, 5, 0, 0, 0],
		[0, 2, 3, 1, 4, 5, 5, 5, 5, 5, 0],
		[0, 0, 3, 3, 3, 2, 5, 5, 5, 0, 0],
		[0, 0, 0, 3, 3, 3, 2, 2, 2, 0, 0],
		[0, 0, 0, 0, 3, 3, 3, 3, 0, 0, 0],
		[0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0]
	]),
	wingsUp: new Frame([
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 4, 4, 0, 0, 5, 5, 5, 0],
		[0, 0, 3, 4, 4, 4, 5, 5, 5, 5, 0],
		[0, 2, 3, 1, 4, 5, 5, 5, 5, 0, 0],
		[0, 0, 3, 3, 3, 2, 5, 5, 2, 0, 0],
		[0, 0, 0, 3, 3, 3, 2, 2, 3, 0, 0],
		[0, 0, 0, 0, 3, 3, 3, 3, 0, 0, 0],
		[0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0]
	]),
};

const Animations = {
	STILL: new Anim([sharedFrames.base], [1000]),
	IDLE: new Anim([
		sharedFrames.base,
		sharedFrames.headDown
	], [
		750,
		250
	]),
	FLYING: new Anim([
		sharedFrames.headDown,
		sharedFrames.wingsUp
	], [
		100,
		100
	]),
};


const colors = {
	0: "transparent",
	1: "#000000",
	2: "#5f5f5f",
	3: "#cecece",
	4: "#ffffff",
	5: "#d39d83",
};

// Number of pixels per unit
const CANVAS_PIXEL_SIZE = 6;
const WINDOW_PIXEL_SIZE =  CANVAS_PIXEL_SIZE * CSS_SCALE;

const styles = `
	canvas {
		image-rendering: pixelated;
		position: fixed;
		bottom: 0;
		filter: drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.25));
		transform: scale(${CSS_SCALE});
		transform-origin: bottom;
		z-index: 999999999;
	}
`;

const styleElement = document.createElement("style");
styleElement.innerHTML = styles;
document.head.appendChild(styleElement);

// Insert a canvas element into the body with the same dimensions as the 2D array
const canvas = document.createElement("canvas");
canvas.width = sharedFrames.base.pixels[0].length * CANVAS_PIXEL_SIZE;
canvas.height = sharedFrames.base.pixels.length * CANVAS_PIXEL_SIZE;
document.body.appendChild(canvas);

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
let currentAnimation = Animations.IDLE;
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
		if (Math.random() < 0.025) {
			hop();
		}
	} else if (currentState === States.HOP) {
		if (updateParabolicPath(0.05)) {
			setState(States.IDLE);
		}
	}
}

setInterval(update, 1000 / 60);

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
	const amount = Math.min(1, time / (distance / speed));
	const { x, y } = parabolicLerp(startX, startY, targetX, targetY, amount, intensity);
	birdX = x;
	birdY = y;
	direction = targetX > birdX ? Directions.RIGHT : Directions.LEFT;
	const complete = Math.abs(birdX - targetX) < 1 && Math.abs(birdY - targetY) < 1;
	if (complete) {
		birdX = targetX;
		birdY = targetY;
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

function locateTargets() {
	// Find all images on the page
	const images = document.querySelectorAll("img");
	const MIN_SIZE = 100;
	// Filter out images that are too small
	const largeImages = Array.from(images).filter((img) => img.width >= MIN_SIZE && img.height >= MIN_SIZE);
	// Pick a random image
	const randomImage = largeImages[Math.floor(Math.random() * largeImages.length)];
	// Get the top left coordinates of the image relative to the window
	const rect = randomImage.getBoundingClientRect();
	const x = rect.left;
	const y = window.innerHeight - rect.top;
	focusedElement = randomImage;
	// Move the bird to the top left of the image
	flyTo(x, y);
}

function draw() {
	requestAnimationFrame(draw);

	if (currentState === States.FLYING) {
		// Fly to target location (even if in the air)
		if (updateParabolicPath(0.3)) {
			setState(States.IDLE);
		}
	}

	// Clear the canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// Draw the bird
	currentAnimation.draw(ctx, direction, animStart);
	// Update position
	setX(birdX);
	setY(birdY);
}

draw();

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
	locateTargets();
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
		setAnimation(Animations.IDLE);
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