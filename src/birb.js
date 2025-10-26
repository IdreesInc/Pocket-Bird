import { Directions } from './shared.js';
import Layer from './layer.js';
import Frame from './frame.js';
import Anim from './anim.js';
import { BirdType } from './sprites.js';

/**
 * @typedef {keyof typeof Animations} AnimationType
 */

export const Animations = /** @type {const} */ ({
	STILL: "STILL",
	BOB: "BOB",
	FLYING: "FLYING",
	HEART: "HEART"
});

export class Birb {
	animStart = Date.now();
	x = 0;
	y = 0;
	direction = Directions.RIGHT;
	isAbsolutePositioned = false;
	visible = true;
	/** @type {AnimationType} */
	currentAnimation = Animations.STILL;

	/**
	 * @param {number} birbCssScale
	 * @param {number} canvasPixelSize
	 * @param {string[][]} spriteSheet The loaded sprite sheet pixel data
	 * @param {number} spriteWidth
	 * @param {number} spriteHeight
	 */
	constructor(birbCssScale, canvasPixelSize, spriteSheet, spriteWidth, spriteHeight) {
		this.birbCssScale = birbCssScale;
		this.canvasPixelSize = canvasPixelSize;
		this.windowPixelSize = canvasPixelSize * birbCssScale;
		this.spriteWidth = spriteWidth;
		this.spriteHeight = spriteHeight;

		// Build layers from sprite sheet
		this.layers = {
			base: new Layer(this.getLayer(spriteSheet, 0)),
			down: new Layer(this.getLayer(spriteSheet, 1)),
			heartOne: new Layer(this.getLayer(spriteSheet, 2)),
			heartTwo: new Layer(this.getLayer(spriteSheet, 3)),
			heartThree: new Layer(this.getLayer(spriteSheet, 4)),
			tuftBase: new Layer(this.getLayer(spriteSheet, 5), "tuft"),
			tuftDown: new Layer(this.getLayer(spriteSheet, 6), "tuft"),
			wingsUp: new Layer(this.getLayer(spriteSheet, 7)),
			wingsDown: new Layer(this.getLayer(spriteSheet, 8)),
			happyEye: new Layer(this.getLayer(spriteSheet, 9)),
		};

		// Build frames from layers
		this.frames = {
			base: new Frame([this.layers.base, this.layers.tuftBase]),
			headDown: new Frame([this.layers.down, this.layers.tuftDown]),
			wingsDown: new Frame([this.layers.base, this.layers.tuftBase, this.layers.wingsDown]),
			wingsUp: new Frame([this.layers.down, this.layers.tuftDown, this.layers.wingsUp]),
			heartOne: new Frame([this.layers.base, this.layers.tuftBase, this.layers.happyEye, this.layers.heartOne]),
			heartTwo: new Frame([this.layers.base, this.layers.tuftBase, this.layers.happyEye, this.layers.heartTwo]),
			heartThree: new Frame([this.layers.base, this.layers.tuftBase, this.layers.happyEye, this.layers.heartThree]),
			heartFour: new Frame([this.layers.base, this.layers.tuftBase, this.layers.happyEye, this.layers.heartTwo]),
		};

		// Build animations from frames
		this.animations = {
			[Animations.STILL]: new Anim([this.frames.base], [1000]),
			[Animations.BOB]: new Anim([
				this.frames.base,
				this.frames.headDown
			], [
				420,
				420
			]),
			[Animations.FLYING]: new Anim([
				this.frames.base,
				this.frames.wingsUp,
				this.frames.headDown,
				this.frames.wingsDown,
			], [
				30,
				80,
				30,
				60,
			]),
			[Animations.HEART]: new Anim([
				this.frames.heartOne,
				this.frames.heartTwo,
				this.frames.heartThree,
				this.frames.heartFour,
				this.frames.heartThree,
				this.frames.heartFour,
				this.frames.heartThree,
				this.frames.heartFour,
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

		// Create canvas element
		this.canvas = document.createElement("canvas");
		this.canvas.id = "birb";
		this.canvas.width = this.frames.base.getPixels()[0].length * canvasPixelSize;
		this.canvas.height = spriteHeight * canvasPixelSize;

		this.ctx = this.canvas.getContext("2d");

		// Append to document
		document.body.appendChild(this.canvas);
	}

	/**
	 * Draw the current animation frame
	 * @param {BirdType} species The species color data
	 * @returns {boolean} Whether the animation has completed (for non-looping animations)
	 */
	draw(species) {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		const anim = this.animations[this.currentAnimation];
		return anim.draw(this.ctx, this.direction, this.animStart, this.canvasPixelSize, species);
	}

	/**
	 * Get a layer from the sprite sheet array
	 * @param {string[][]} array
	 * @param {number} sprite
	 * @returns {string[][]}
	 */
	getLayer(array, sprite) {
		// From an array of a horizontal sprite sheet, get the layer for a specific sprite
		const layer = [];
		for (let y = 0; y < this.spriteWidth; y++) {
			layer.push(array[y].slice(sprite * this.spriteWidth, (sprite + 1) * this.spriteWidth));
		}
		return layer;
	}

	/**
	 * @returns {AnimationType} The current animation key
	 */
	getCurrentAnimation() {
		return this.currentAnimation;
	}

	/**
	 * Set the current animation by name and reset the animation timer
	 * @param {AnimationType} animationName
	 */
	setAnimation(animationName) {
		this.currentAnimation = animationName;
		this.animStart = Date.now();
	}

	/**
	 * Get the frames object
	 * @returns {Record<string, Frame>}
	 */
	getFrames() {
		return this.frames;
	}

	/**
	 * Get the canvas element
	 * @returns {HTMLCanvasElement}
	 */
	getElement() {
		return this.canvas;
	}

	/**
	 * Get the canvas width in CSS pixels
	 * @returns {number}
	 */
	getElementWidth() {
		return this.canvas.width * this.birbCssScale;
	}

	/**
	 * Get the canvas height in CSS pixels
	 * @returns {number}
	 */
	getElementHeight() {
		return this.canvas.height * this.birbCssScale;
	}

	getElementTop() {
		const rect = this.canvas.getBoundingClientRect();
		return rect.top;
	}

	/**
	 * Set the X position
	 * @param {number} x
	 */
	setX(x) {
		this.x = x;
		let mod = this.getElementWidth() / -2 - (this.windowPixelSize * (this.direction === Directions.RIGHT ? 2 : -2));
		this.canvas.style.left = `${x + mod}px`;
	}

	/**
	 * Set the Y position
	 * @param {number} y
	 */
	setY(y) {
		this.y = y;
		let bottom;
		if (this.isAbsolutePositioned) {
			// Position is absolute, convert from fixed
			bottom = y - window.scrollY;
		} else {
			// Position is fixed
			bottom = y;
		}
		this.canvas.style.bottom = `${bottom}px`;
	}

	/**
	 * Get the current X position
	 * @returns {number}
	 */
	getX() {
		return this.x;
	}

	/**
	 * Get the current Y position
	 * @returns {number}
	 */
	getY() {
		return this.y;
	}

	/**
	 * Set the direction the bird is facing
	 * @param {number} direction
	 */
	setDirection(direction) {
		this.direction = direction;
	}

	/**
	 * Set whether the element should be absolutely positioned
	 * @param {boolean} absolute
	 */
	setAbsolutePositioned(absolute) {
		this.isAbsolutePositioned = absolute;
		if (absolute) {
			this.canvas.classList.add("birb-absolute");
		} else {
			this.canvas.classList.remove("birb-absolute");
		}
		// Update Y position to apply the new positioning mode
		this.setY(this.y);
	}

	/**
	 * Set visibility of the bird
	 * @param {boolean} visible
	 */
	setVisible(visible) {
		this.visible = visible;
		this.canvas.style.display = visible ? "" : "none";
	}

	/**
	 * Get visibility of the bird
	 * @returns {boolean}
	 */
	isVisible() {
		return this.visible;
	}
}