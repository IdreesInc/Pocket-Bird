// @ts-check

class Layer {
	/**
	 * @param {string[][]} pixels
	 * @param {string} [tag]
	 */
	constructor(pixels, tag = "default") {
		this.pixels = pixels;
		this.tag = tag;
	}
}

export default Layer;