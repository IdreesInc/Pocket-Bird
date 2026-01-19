import { Directions, getLayerPixels, getWindowHeight, getFixedWindowHeight } from './shared.js';
import Layer from './animation/layer.js';
import Frame from './animation/frame.js';
import Anim from './animation/anim.js';
import { BirdType, PALETTE } from './animation/sprites.js';
import { createHatLayers } from './hats.js';

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
	 * @param {string[][]} hatSpriteSheet The loaded hat sprite sheet pixel data
	 */
	constructor(birbCssScale, canvasPixelSize, spriteSheet, spriteWidth, spriteHeight, hatSpriteSheet) {
		this.birbCssScale = birbCssScale;
		this.canvasPixelSize = canvasPixelSize;
		this.windowPixelSize = canvasPixelSize * birbCssScale;
		this.spriteWidth = spriteWidth;
		this.spriteHeight = spriteHeight;

		// Build layers from sprite sheet
		this.layers = {
			base: new Layer(getLayerPixels(spriteSheet, 0, this.spriteWidth)),
			down: new Layer(getLayerPixels(spriteSheet, 1, this.spriteWidth)),
			heartOne: new Layer(getLayerPixels(spriteSheet, 2, this.spriteWidth)),
			heartTwo: new Layer(getLayerPixels(spriteSheet, 3, this.spriteWidth)),
			heartThree: new Layer(getLayerPixels(spriteSheet, 4, this.spriteWidth)),
			tuftBase: new Layer(getLayerPixels(spriteSheet, 5, this.spriteWidth), "tuft"),
			tuftDown: new Layer(getLayerPixels(spriteSheet, 6, this.spriteWidth), "tuft"),
			wingsUp: new Layer(getLayerPixels(spriteSheet, 7, this.spriteWidth)),
			wingsDown: new Layer(getLayerPixels(spriteSheet, 8, this.spriteWidth)),
			happyEye: new Layer(getLayerPixels(spriteSheet, 9, this.spriteWidth)),
		};

		// Build hat layers
		const hatLayers = createHatLayers(hatSpriteSheet);

		// Build frames from layers
		this.frames = {
			base: new Frame([this.layers.base, this.layers.tuftBase, ...hatLayers.base]),
			headDown: new Frame([this.layers.down, this.layers.tuftDown, ...hatLayers.down]),
			wingsDown: new Frame([this.layers.base, this.layers.tuftBase, this.layers.wingsDown, ...hatLayers.base]),
			wingsUp: new Frame([this.layers.down, this.layers.tuftDown, this.layers.wingsUp, ...hatLayers.down]),
			heartOne: new Frame([this.layers.base, this.layers.tuftBase, this.layers.happyEye, ...hatLayers.base, this.layers.heartOne]),
			heartTwo: new Frame([this.layers.base, this.layers.tuftBase, this.layers.happyEye, ...hatLayers.base,this.layers.heartTwo]),
			heartThree: new Frame([this.layers.base, this.layers.tuftBase, this.layers.happyEye, ...hatLayers.base, this.layers.heartThree]),
			heartFour: new Frame([this.layers.base, this.layers.tuftBase, this.layers.happyEye, ...hatLayers.base, this.layers.heartTwo]),
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
		const anim = this.animations[this.currentAnimation];
		return anim.draw(this.ctx, this.direction, this.animStart, this.canvasPixelSize, species);
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
			// Account for address bar shrinkage on iOS
			bottom = y - window.scrollY - (getWindowHeight() - getFixedWindowHeight());
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