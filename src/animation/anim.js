import Frame from "./frame.js";
import { BirdType } from "./sprites.js";

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
		this.lastFrameIndex = -1;
		this.lastDirection = null;
		this.lastTimeStart = null;
	}

	getAnimationDuration() {
		return this.durations.reduce((a, b) => a + b, 0);
	}

	/**
	 * Get the current frame index based on elapsed time
	 * @param {number} time The elapsed time since animation start
	 * @returns {number} The index of the current frame
	 */
	getCurrentFrameIndex(time) {
		let totalDuration = 0;
		for (let i = 0; i < this.durations.length; i++) {
			totalDuration += this.durations[i];
			if (time < totalDuration) {
				return i;
			}
		}
		return this.frames.length - 1;
	}

	/**
	 * Clear the cached frame state
	 */
	#clearCache() {
		this.lastFrameIndex = -1;
		this.lastDirection = null;
	}

	/**
	 * Check if the frame needs to be redrawn
	 * @param {number} frameIndex The current frame index
	 * @param {number} direction The current direction
	 * @returns {boolean} Whether the frame needs to be redrawn
	 */
	#shouldRedraw(frameIndex, direction) {
		return frameIndex !== this.lastFrameIndex || direction !== this.lastDirection;
	}

	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} direction
	 * @param {number} timeStart The start time of the animation in milliseconds
	 * @param {number} canvasPixelSize The size of a canvas pixel in pixels
	 * @param {BirdType} [species] The species to use for the animation
	 * @returns {boolean} Whether the animation is complete
	 */
	draw(ctx, direction, timeStart, canvasPixelSize, species) {
		// Reset cache if animation was restarted
		if (this.lastTimeStart !== timeStart) {
			this.#clearCache();
			this.lastTimeStart = timeStart;
		}

		let time = Date.now() - timeStart;
		const duration = this.getAnimationDuration();
		
		if (this.loop) {
			time %= duration;
		}

		const currentFrameIndex = this.getCurrentFrameIndex(time);
		
		if (this.#shouldRedraw(currentFrameIndex, direction)) {
			this.frames[currentFrameIndex].draw(ctx, direction, canvasPixelSize, species);
			this.lastFrameIndex = currentFrameIndex;
			this.lastDirection = direction;
		}
		
		// Return whether animation is complete (for non-looping animations)
		return !this.loop && time >= duration;
	}
}

export default Anim;