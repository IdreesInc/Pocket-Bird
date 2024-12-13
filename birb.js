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
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 3, 4, 4, 4, 0, 0, 0, 0, 0, 0],
		[0, 2, 3, 1, 4, 4, 5, 5, 0, 0, 0, 0],
		[0, 0, 3, 3, 4, 5, 5, 5, 5, 5, 0, 0],
		[0, 0, 0, 3, 3, 2, 5, 5, 5, 0, 0, 0],
		[0, 0, 0, 3, 3, 3, 2, 2, 2, 0, 0, 0],
		[0, 0, 0, 0, 3, 3, 3, 3, 0, 0, 0, 0],
		[0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0]
	]),
	headDown: new Frame([
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 3, 4, 4, 4, 5, 5, 0, 0, 0, 0],
		[0, 2, 3, 1, 4, 5, 5, 5, 5, 5, 0, 0],
		[0, 0, 3, 3, 3, 2, 5, 5, 5, 0, 0, 0],
		[0, 0, 0, 3, 3, 3, 2, 2, 2, 0, 0, 0],
		[0, 0, 0, 0, 3, 3, 3, 3, 0, 0, 0, 0],
		[0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0]
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
const WINDOW_PIXEL_SIZE =  CANVAS_PIXEL_SIZE / 2;

const styles = `
	canvas {
		image-rendering: pixelated;
		position: fixed;
		bottom: 0;
		filter: drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.25));
		transform: scale(0.5);
		transform-origin: bottom;
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
};

const HOP_HEIGHT = CANVAS_PIXEL_SIZE * 2;
const MAX_HOP_TICKS = 24;

let direction = Directions.RIGHT;
let state = States.IDLE;
let ticks = 0;
let hopTicks = 0;
let animStart = Date.now();
let currentAnimation = Animations.IDLE;
let modY = 0;
let modX = 0;

function update() {
	ticks++;
	modY = 0;
	if (state === States.IDLE) {
		if (Math.random() < 0.0025) {
			state = States.HOP;
			setAnimation(Animations.STILL);
			console.log("Hopping");
		}
	} else if (state === States.HOP) {
		hopTicks++;
		if (hopTicks >= MAX_HOP_TICKS) {
			state = States.IDLE;
			hopTicks = 0;
			setAnimation(Animations.IDLE);
		}
		modX += 1.4 * direction;
		modY = Math.sin(hopTicks / MAX_HOP_TICKS * Math.PI) * HOP_HEIGHT;
	}
}

setInterval(update, 1000 / 60);

function draw() {
	requestAnimationFrame(draw);
	// Clear the canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// Draw the bird
	currentAnimation.draw(ctx, direction, animStart);
	// Update position
	setX(modX);
	setY(roundToPixel(modY));
}

draw();

canvas.addEventListener("click", () => {
	if (state === States.IDLE) {
		state = States.HOP;
		setAnimation(Animations.STILL);
		hopTicks = 0;
	}
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
 * @param {number} value
 */
function roundToPixel(value) {
	return Math.round(value / WINDOW_PIXEL_SIZE) * WINDOW_PIXEL_SIZE;
}

/**
 * @param {number} x
 */
function setX(x) {
	canvas.style.left = `${x}px`;
}

/**
 * @param {number} y
 */
function setY(y) {
	canvas.style.bottom = `${y}px`;
}