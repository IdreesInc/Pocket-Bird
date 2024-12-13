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

const idle = [
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
];

const bob = [
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
];

const colors = {
	0: "transparent",
	1: "#000000",
	2: "#5f5f5f",
	3: "#cecece",
	4: "#ffffff",
	5: "#d39d83",
};

// Number of pixels per unit
const PIXEL_SIZE = 4;

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
canvas.width = idle[0].length * PIXEL_SIZE;
canvas.height = idle.length * PIXEL_SIZE;
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

const HOP_HEIGHT = PIXEL_SIZE * 3;
const MAX_HOP_TICKS = 24;

let direction = Directions.RIGHT;
let state = States.IDLE;
let ticks = 0;
let hopTicks = 0;
let sprite = idle;
let modY = 0;
let modX = 0;

function update() {
	ticks++;
	modY = 0;
	if (state === States.IDLE) {
		if (Math.random() < 0.0025) {
			state = States.HOP;
			sprite = idle;
			console.log("Hopping");
		} else if (ticks % 60 < 12) {
			sprite = bob;
		} else {
			sprite = idle;
		}
	} else if (state === States.HOP) {
		hopTicks++;
		if (hopTicks >= MAX_HOP_TICKS) {
			state = States.IDLE;
			hopTicks = 0;
		}
		modX += 1.4 * direction;
		modY = Math.sin(hopTicks / MAX_HOP_TICKS * Math.PI) * HOP_HEIGHT;
		// Round to the nearest scale
		modY = Math.round(modY / PIXEL_SIZE) * PIXEL_SIZE;
	}
}

setInterval(update, 1000 / 60);

function draw() {
	requestAnimationFrame(draw);
	// Clear the canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// Draw the bird
	for (let y = 0; y < sprite.length; y++) {
		const row = sprite[y];
		for (let x = 0; x < sprite[y].length; x++) {
			const cell = direction === Directions.LEFT ? row[x] : row[sprite[y].length - x - 1];
			ctx.fillStyle = colors[cell];
			ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
		};
	};
	// Modify canvas position by modY
	canvas.style.bottom = `${modY}px`;
	canvas.style.left = `${modX}px`;
}

draw();

canvas.addEventListener("click", () => {
	if (state === States.IDLE) {
		state = States.HOP;
		sprite = idle;
		hopTicks = 0;
	}
});