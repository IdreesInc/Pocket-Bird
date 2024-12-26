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
const START_MENU_ID = "birb-start-menu";

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
				ctx.fillStyle = bluebirdColors[cell];
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

const colorsToKeys = {
	"transparent": ___,
	"#ffffff": ___,
	"#000000": OUT,
	"#010a19": BEK,
	"#190301": EYE,
	"#af8e75": FOT,
	"#639bff": FAC,
	"#f8b143": BEL,
	"#ec8637": UND,
	"#578ae6": WNG,
	"#326ed9": WNE,
	"#c82e2e": HRT,
	"#501a1a": HRB,
	"#ff6b6b": HRS
};

const bluebirdColors = {
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

const SPRITE_WIDTH = 32;
const SPRITE_SHEET_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASAAAAAgCAYAAACy9KU0AAAAAXNSR0IArs4c6QAABBdJREFUeJztnL9LHEEUx79zWkgk3RFwTRvsDKS5KpWpbDSVVQgkjSCYKkfIHyDBIhAhIAiBkOoqsUmVVDbaBFKkkLTxhHBgEQM28aU4Z53d25lddXfm1vt+4Ni5X/vm9t77znfm9hYghBBCCCGEEOIJFboDhOQhImJ7TinFHK4x/PJILiEFQMd+PD0NANg+PEy0ffSBEBIIOWcximQxigbaLnEqK/5iFMne7KzIyspAu+r4pFrGQ3eAFCOr0HyN/I+np/Gq2UTr4cOBtnYhPtjf3cWrZjNuk/rTCN0Bkk96GqK3vkf/UAKwfXiIN71e4rE3vZ5X8SNkZDGnIebWhwCZU7C92dn45msKltUHn7FJtdABFUQyCNEP7UB8oad5pgsx3YePaWC6D1x8JiOHiPQXP42tz9ihHYDZh1ACHFr8SflwBCmIiMj+/fvx/db3715HYHMdKJQDMAuf7oMQj+iRV7sfOgBCrk+hUcyW8KM2CtIBEFIuuUWkiy5db7oWfRQiBZDUCeZrcZwnIpri83wreUyVUhAR8zWVHFyXAIqI8Eslw0BadGwDNkliFSCX+ADA8y2JD3JVYjAMAkhIUcwUXFrvxu1OOwrRncqYGlNy9E9KqTenA2pMRlC3pvDhRf8APnvXxeflBuY3zwBcHOQqxGAYBJCQgohSKiE6N5WpMSXzm2f4vNwoRYSsO8gTAAA4OT6K21rlXVbzMgIhItKYTI4caQHU8TvtKBGXQkQ8Ii7hMeuCeTmI1QEppZTr515TfICkG8riKi7l7G93QAC1+KRjp91Q1v6YAKRknOJjwNSzUOjf8O/vPMLK7y9xGwCeHn/KfG36C/n56w+Ai2laUYZBAAmxsbTezU3mKtd+bPGNmLXIc2cnzwsWpztzA89NLHzFg9UD3Lt7O/O9Wni+bczoffUDXnIapuMPCOBBtgC6+kEbTMoiT4A67QhL61102lFV+WZ1X+ciVIs8v/L1gE535jCxMAOsHmQ+nxYe4Ho+VAuPptOOriSAhJTBx5kn1kHQg/gA6Oe4Lf/rQq4DAvrTmrQLOvlxAgBovt63vfciyBWFx+XAgAsXlkXZAkhImt5aS1bGtwEkp1s+xAeAuAbgurigQmdCp0VAi08Wzdf7pZ0lHVoACcmjt9aKE80QI1/5ZhUh85fhYc7/S/0Vo7fWcr62TPEx44cSQEJqgOhZQFqItAgNcx3krgHpX6POP4hVhKosfB0bgFMEKT5kBFHfNmb6SW8RohuBcRkI2X77UgDEN32/qstEpC5D4YzPS1WQEUbQd0TyYPWg0pr0SlbxZ92vWoBCxSekLui60LcbURPpYrdtqxSgkPEJqQuSQeg+uSh8HpBeh3FtqyR0fELqQN3WPi91VnLuzir88KHjE0LK5z8tFuzphqiPOAAAAABJRU5ErkJggg==";
const SPRITE_SHEET = dataUriTo2DArray(SPRITE_SHEET_URI);

const layers = {
	base: new Layer(getLayer(SPRITE_SHEET, 0)),
	down: new Layer(getLayer(SPRITE_SHEET, 1)),
	heartOne: new Layer(getLayer(SPRITE_SHEET, 2)),
	heartTwo: new Layer(getLayer(SPRITE_SHEET, 3)),
	heartThree: new Layer(getLayer(SPRITE_SHEET, 4)),
	heartFour: new Layer(getLayer(SPRITE_SHEET, 5)),
	wingsUp: new Layer(getLayer(SPRITE_SHEET, 6)),
	wingsDown: new Layer(getLayer(SPRITE_SHEET, 7)),
	happyEye: new Layer(getLayer(SPRITE_SHEET, 8)),
};

const sharedFrames = {
	base: new Frame([layers.base]),
	headDown: new Frame([layers.down]),
	wingsDown: new Frame([layers.base, layers.wingsDown]),
	wingsUp: new Frame([layers.down, layers.wingsUp]),
	heartOne: new Frame([layers.base, layers.happyEye, layers.heartOne]),
	heartTwo: new Frame([layers.base, layers.happyEye, layers.heartTwo]),
	heartThree: new Frame([layers.base, layers.happyEye, layers.heartThree]),
	heartFour: new Frame([layers.base, layers.happyEye, layers.heartFour]),
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

function init() {
	if (window !== window.top) {
		// Skip installation if within an iframe
		return;
	}

	styleElement.innerHTML = styles;
	document.head.appendChild(styleElement);
	
	canvas.id = "birb";
	canvas.width = sharedFrames.base.pixels[0].length * CANVAS_PIXEL_SIZE;
	canvas.height = MAX_HEIGHT * CANVAS_PIXEL_SIZE;
	document.body.appendChild(canvas);

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
}

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

init();
draw();

/**
 * Create an HTML element with the specified parameters
 * @param {string} className
 * @param {string} [textContent]
 * @param {string} [id]
 * @returns {HTMLElement}
 */
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

/**
 * Add the start menu to the page if it doesn't already exist
 */
function insertStartMenu() {
	if (document.querySelector("#" + START_MENU_ID)) {
		return;
	}
	let startMenu = makeElement("birb-window", undefined, START_MENU_ID);
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
	let y = canvas.offsetTop + canvas.height / 2 + WINDOW_PIXEL_SIZE * 10;
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

/**
 * Remove the start menu from the page
 */
function removeStartMenu() {
	const startMenu = document.querySelector("#" + START_MENU_ID);
	if (startMenu) {
		startMenu.remove();
	}
}

/**
 * @returns {boolean} Whether the start menu element is on the page
 */
function isStartMenuOpen() {
	return document.querySelector("#" + START_MENU_ID) !== null;
}

/**
 * Make the given HTML element draggable by the window header
 * @param {HTMLElement|null} windowHeader
 */
function makeDraggable(windowHeader) {
	if (!windowHeader) {
		return;
	}

	let isMouseDown = false;
	let offsetX = 0;
	let offsetY = 0;

	// Get the parent window element
	const windowElement = windowHeader.parentElement;
	
	if (!windowElement) {
		console.error("Birb: Window element not found");
		return;
	}

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

/**
 * @param {string} dataUri
 * @returns {string[][]}
 */
function dataUriTo2DArray(dataUri) {
	const img = new Image();
	img.src = dataUri;
	const canvas = document.createElement('canvas');
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return [];
	}
	ctx.drawImage(img, 0, 0);
	const imageData = ctx.getImageData(0, 0, img.width, img.height);
	const pixels = imageData.data;
	const hexArray = [];
	for (let y = 0; y < img.height; y++) {
		const row = [];
		for (let x = 0; x < img.width; x++) {
			const index = (y * img.width + x) * 4;
			const r = pixels[index];
			const g = pixels[index + 1];
			const b = pixels[index + 2];
			const a = pixels[index + 3];
			if (a === 0) {
				row.push(___);
				continue;
			}
			const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
			if (colorsToKeys[hex] === undefined) {
				console.error(`Unknown color: ${hex}`);
				row.push(___);
			}
			row.push(colorsToKeys[hex]);
		}
		hexArray.push(row);
	}
	return hexArray;
}

/**
 * @param {string[][]} array
 * @param {number} sprite
 * @returns {string[][]}
 */
function getLayer(array, sprite) {
	// From an array of a horizontal sprite sheet, get the layer for a specific sprite
	const layer = [];
	for (let y = 0; y < SPRITE_WIDTH; y++) {
		layer.push(array[y].slice(sprite * SPRITE_WIDTH, (sprite + 1) * SPRITE_WIDTH));
	}
	return layer;
}

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