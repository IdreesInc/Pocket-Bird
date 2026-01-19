import { Directions } from '../shared.js';
import { PALETTE, BirdType } from './sprites.js';
import Layer, { TAG } from './layer.js';

class Frame {

	/** @type {{ [tag: string]: string[][] }} */
	#pixelsByTag = {};

	/**
	 * @param {Layer[]} layers
	 */
	constructor(layers) {
		/** @type {Set<string>} */
		let tags = new Set();
		for (let layer of layers) {
			tags.add(layer.tag);
		}
		tags.add(TAG.DEFAULT);
		for (let tag of tags) {
			let maxHeight = layers.reduce((max, layer) => Math.max(max, layer.pixels.length), 0);
			if (layers[0].tag !== TAG.DEFAULT) {
				throw new Error("First layer must have the 'default' tag");
			}
			this.pixels = layers[0].pixels.map(row => row.slice());
			// Pad from top with transparent pixels
			while (this.pixels.length < maxHeight) {
				this.pixels.unshift(new Array(this.pixels[0].length).fill(PALETTE.TRANSPARENT));
			}
			// Combine layers
			for (let i = 1; i < layers.length; i++) {
				if (layers[i].tag === TAG.DEFAULT || layers[i].tag === tag) {
					let layerPixels = layers[i].pixels;
					let topMargin = maxHeight - layerPixels.length;
					for (let y = 0; y < layerPixels.length; y++) {
						for (let x = 0; x < layerPixels[y].length; x++) {
							this.pixels[y + topMargin][x] = layerPixels[y][x] !== PALETTE.TRANSPARENT ? layerPixels[y][x] : this.pixels[y + topMargin][x];
						}
					}
				}
			}
			this.#pixelsByTag[tag] = this.pixels.map(row => row.slice());
		}
	}

	/**
	 * @param {string} [tag]
	 * @returns {string[][]}
	 */
	getPixels(tag = TAG.DEFAULT) {
		return this.#pixelsByTag[tag] ?? this.#pixelsByTag[TAG.DEFAULT];
	}

	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} direction
	 * @param {number} canvasPixelSize
	 * @param {{ [key: string]: string }} colorScheme
	 * @param {string[]} tags
	 */
	draw(ctx, direction, canvasPixelSize, colorScheme, tags) {
		// Clear the canvas before drawing the new frame
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		
		const pixels = this.getPixels(tags[0]);
		for (let y = 0; y < pixels.length; y++) {
			const row = pixels[y];
			for (let x = 0; x < pixels[y].length; x++) {
				const cell = direction === Directions.LEFT ? row[x] : row[pixels[y].length - x - 1];
				ctx.fillStyle = colorScheme[cell] ?? cell;
				ctx.fillRect(x * canvasPixelSize, y * canvasPixelSize, canvasPixelSize, canvasPixelSize);
			};
		};
	}
}

export default Frame;