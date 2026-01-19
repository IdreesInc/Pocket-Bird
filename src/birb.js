import { Directions, getLayerPixels, getWindowHeight, getFixedWindowHeight } from './shared.js';
import Layer from './animation/layer.js';
import Frame from './animation/frame.js';
import Anim from './animation/anim.js';
import { BirdType, PALETTE } from './animation/sprites.js';

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
		const hatLayer = this.buildHatLayer(hatSpriteSheet, "top-hat", false);
		const downHatLayer = this.buildHatLayer(hatSpriteSheet, "top-hat", false, 1);

		// Build frames from layers
		this.frames = {
			base: new Frame([this.layers.base, this.layers.tuftBase, hatLayer]),
			headDown: new Frame([this.layers.down, this.layers.tuftDown, downHatLayer]),
			wingsDown: new Frame([this.layers.base, this.layers.tuftBase, this.layers.wingsDown, hatLayer]),
			wingsUp: new Frame([this.layers.down, this.layers.tuftDown, this.layers.wingsUp, downHatLayer]),
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
		const anim = this.animations[this.currentAnimation];
		return anim.draw(this.ctx, this.direction, this.animStart, this.canvasPixelSize, species);
	}

	buildHatLayer(spriteSheet, hatName, outlineBottom = false, yOffset = 0) {
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