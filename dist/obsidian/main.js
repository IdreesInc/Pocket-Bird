const { Plugin, Notice } = require('obsidian');
module.exports = class PocketBird extends Plugin {
	onload() {
		console.log("Loading Pocket Bird version 2026.1.18...");
		const OBSIDIAN_PLUGIN = this;
		(function () {
	'use strict';

	const Directions = {
		LEFT: -1,
		RIGHT: 1,
	};

	let debugMode = location.hostname === "127.0.0.1";
	let context = null;

	/**
	 * @returns {boolean} Whether debug mode is enabled
	 */
	function isDebug() {
		return debugMode;
	}

	/**
	 * @param {boolean} value
	 */
	function setDebug(value) {
		debugMode = value;
	}

	function getContext() {
		if (!context) {
			throw new Error("Context requested before being set");
		}
		return context;
	}

	function setContext(newContext) {
		context = newContext;
	}

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
	 * @param {Document|Element} element
	 * @param {(e: Event) => void} action
	 */
	function onClick(element, action) {
		element.addEventListener("click", (e) => action(e));
		element.addEventListener("touchend", (e) => {
			if (e instanceof TouchEvent === false) {
				return;
			} else if (element instanceof HTMLElement === false) {
				return;
			}
			const touch = e.changedTouches[0];
			const rect = element.getBoundingClientRect();
			if (
				touch.clientX >= rect.left &&
				touch.clientX <= rect.right &&
				touch.clientY >= rect.top &&
				touch.clientY <= rect.bottom
			) {
				action(e);
			}
		});
	}

	/**
	 * @param {HTMLElement|null} element The element to detect drag events on
	 * @param {boolean} [parent] Whether to move the parent element when the child is dragged
	 * @param {(top: number, left: number) => void} [callback] Callback for when element is moved
	 * @param {HTMLElement} [pageElement] The page element to constrain movement within
	 */
	function makeDraggable(element, parent = true, callback = () => { }, pageElement) {
		if (!element) {
			return;
		}

		let isMouseDown = false;
		let offsetX = 0;
		let offsetY = 0;
		let elementToMove = parent ? element.parentElement : element;

		if (!elementToMove) {
			error("Birb: Parent element not found");
			return;
		}

		element.addEventListener("mousedown", (e) => {
			isMouseDown = true;
			offsetX = e.clientX - elementToMove.offsetLeft;
			offsetY = e.clientY - elementToMove.offsetTop;
		});

		element.addEventListener("touchstart", (e) => {
			isMouseDown = true;
			const touch = e.touches[0];
			offsetX = touch.clientX - elementToMove.offsetLeft;
			offsetY = touch.clientY - elementToMove.offsetTop;
			e.preventDefault();
			e.stopPropagation();
		});

		document.addEventListener("mouseup", (e) => {
			if (isMouseDown) {
				callback(elementToMove.offsetTop, elementToMove.offsetLeft);
				e.preventDefault();
			}
			isMouseDown = false;
		});

		document.addEventListener("touchend", (e) => {
			if (isMouseDown) {
				callback(elementToMove.offsetTop, elementToMove.offsetLeft);
				e.preventDefault();
			}
			isMouseDown = false;
		});

		document.addEventListener("mousemove", (e) => {
			const page = pageElement || document.documentElement;
			const maxX = page.scrollWidth - elementToMove.clientWidth;
			const maxY = page.scrollHeight - elementToMove.clientHeight;
			if (isMouseDown) {
				elementToMove.style.left = `${Math.max(0, Math.min(maxX, e.clientX - offsetX))}px`;
				elementToMove.style.top = `${Math.max(0, Math.min(maxY, e.clientY - offsetY))}px`;
			}
		});

		document.addEventListener("touchmove", (e) => {
			if (isMouseDown) {
				const touch = e.touches[0];
				elementToMove.style.left = `${Math.max(0, touch.clientX - offsetX)}px`;
				elementToMove.style.top = `${Math.max(0, touch.clientY - offsetY)}px`;
			}
		});
	}

	/**
	 * @param {() => void} func
	 * @param {Element} [closeButton]
	 * @param {boolean} [allowEscape] Whether to allow closing with the Escape key
	 */
	function makeClosable(func, closeButton, allowEscape = true) {
		if (closeButton) {
			onClick(closeButton, func);
		}
		document.addEventListener("keydown", (e) => {
			if (closeButton && !document.body.contains(closeButton)) {
				return;
			}
			if (allowEscape && e.key === "Escape") {
				func();
			}
		});
	}

	/**
	 * @returns {boolean} Whether the user is on a mobile device
	 */
	function isMobile() {
		return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
	}

	function log() {
		console.log("Birb: ", ...arguments);
	}

	function debug() {
		if (isDebug()) {
			console.debug("Birb: ", ...arguments);
		}
	}

	function error() {
		console.error("Birb: ", ...arguments);
	}

	/**
	 * Get a layer from a sprite sheet array
	 * @param {string[][]} spriteSheet The sprite sheet pixel array
	 * @param {number} spriteIndex The sprite index
	 * @param {number} width The width of each sprite
	 * @returns {string[][]}
	 */
	function getLayerPixels(spriteSheet, spriteIndex, width) {
		// From an array of a horizontal sprite sheet, get the layer for a specific sprite
		const layer = [];
		for (let y = 0; y < width; y++) {
			layer.push(spriteSheet[y].slice(spriteIndex * width, (spriteIndex + 1) * width));
		}
		return layer;
	}

	/**
	 * The height of the inner browser window
	 * Will be the same as getFixedWindowHeight() on most browsers
	 * On iOS, it will vary to be the height excluding the current address bar size (potentially greater than fixed height)
	 */
	function getWindowHeight() {
		// Necessary because iOS 26 Safari is terrible and won't render
		// fixed/sticky elements behind the address bar
		return window.innerHeight;
	}

	/**
	 * The fixed height of the inner browser window
	 * Will be the same as getWindowHeight() on most browsers
	 * On iOS, it will always be the height of the window when the address bar is fully expanded
	 * @returns The true height of the inner browser window
	 */
	function getFixedWindowHeight() {
		return document.documentElement.clientHeight;
	}

	/**
	 * Palette color names
	 * @type {Record<string, string>}
	 */
	const PALETTE = {
		THEME_HIGHLIGHT: "theme-highlight",
		TRANSPARENT: "transparent",
		OUTLINE: "outline",
		BORDER: "border",
		FOOT: "foot",
		BEAK: "beak",
		EYE: "eye",
		FACE: "face",
		HOOD: "hood",
		NOSE: "nose",
		BELLY: "belly",
		UNDERBELLY: "underbelly",
		WING: "wing",
		WING_EDGE: "wing-edge",
		HEART: "heart",
		HEART_BORDER: "heart-border",
		HEART_SHINE: "heart-shine",
		FEATHER_SPINE: "feather-spine",
	};

	/**
	 * Mapping of sprite sheet colors to palette colors
	 * @type {Record<string, string>} 
	 */
	const SPRITE_SHEET_COLOR_MAP = {
		"transparent": PALETTE.TRANSPARENT,
		"#ffffff": PALETTE.BORDER,
		"#000000": PALETTE.OUTLINE,
		"#010a19": PALETTE.BEAK,
		"#190301": PALETTE.EYE,
		"#af8e75": PALETTE.FOOT,
		"#639bff": PALETTE.FACE,
		"#99e550": PALETTE.HOOD,
		"#d95763": PALETTE.NOSE,
		"#f8b143": PALETTE.BELLY,
		"#ec8637": PALETTE.UNDERBELLY,
		"#578ae6": PALETTE.WING,
		"#326ed9": PALETTE.WING_EDGE,
		"#c82e2e": PALETTE.HEART,
		"#501a1a": PALETTE.HEART_BORDER,
		"#ff6b6b": PALETTE.HEART_SHINE,
		"#373737": PALETTE.FEATHER_SPINE,
	};

	class BirdType {
		/**
		 * @param {string} name
		 * @param {string} description
		 * @param {Record<string, string>} colors
		 * @param {string[]} [tags]
		 */
		constructor(name, description, colors, tags = []) {
			this.name = name;
			this.description = description;
			const defaultColors = {
				[PALETTE.TRANSPARENT]: "transparent",
				[PALETTE.OUTLINE]: "#000000",
				[PALETTE.BORDER]: "#ffffff",
				[PALETTE.BEAK]: "#000000",
				[PALETTE.EYE]: "#000000",
				[PALETTE.HEART]: "#c82e2e",
				[PALETTE.HEART_BORDER]: "#501a1a",
				[PALETTE.HEART_SHINE]: "#ff6b6b",
				[PALETTE.FEATHER_SPINE]: "#373737",
				[PALETTE.HOOD]: colors.face,
				[PALETTE.NOSE]: colors.face,
			};
			/** @type {Record<string, string>} */
			this.colors = { ...defaultColors, ...colors, [PALETTE.THEME_HIGHLIGHT]: colors[PALETTE.THEME_HIGHLIGHT] ?? colors.hood ?? colors.face };
			this.tags = tags;
		}
	}

	/** @type {Record<string, BirdType>} */
	const SPECIES = {
		bluebird: new BirdType("Eastern Bluebird",
			"Native to North American and very social, though can be timid around people.", {
			[PALETTE.FOOT]: "#af8e75",
			[PALETTE.FACE]: "#639bff",
			[PALETTE.BELLY]: "#f8b143",
			[PALETTE.UNDERBELLY]: "#ec8637",
			[PALETTE.WING]: "#578ae6",
			[PALETTE.WING_EDGE]: "#326ed9",
		}),
		shimaEnaga: new BirdType("Shima Enaga",
			"Small, fluffy birds found in the snowy regions of Japan, these birds are highly sought after by ornithologists and nature photographers.", {
			[PALETTE.FOOT]: "#af8e75",
			[PALETTE.FACE]: "#ffffff",
			[PALETTE.BELLY]: "#ebe9e8",
			[PALETTE.UNDERBELLY]: "#ebd9d0",
			[PALETTE.WING]: "#f3d3c1",
			[PALETTE.WING_EDGE]: "#2d2d2d",
			[PALETTE.THEME_HIGHLIGHT]: "#d7ac93",
		}),
		tuftedTitmouse: new BirdType("Tufted Titmouse",
			"Native to the eastern United States, full of personality, and notably my wife's favorite bird.", {
			[PALETTE.FOOT]: "#af8e75",
			[PALETTE.FACE]: "#c7cad7",
			[PALETTE.BELLY]: "#e4e5eb",
			[PALETTE.UNDERBELLY]: "#d7cfcb",
			[PALETTE.WING]: "#b1b5c5",
			[PALETTE.WING_EDGE]: "#9d9fa9",
		}, ["tuft"]),
		europeanRobin: new BirdType("European Robin",
			"Native to western Europe, this is the quintessential robin. Quite friendly, you'll often find them searching for worms.", {
			[PALETTE.FOOT]: "#af8e75",
			[PALETTE.FACE]: "#ffaf34",
			[PALETTE.HOOD]: "#aaa094",
			[PALETTE.BELLY]: "#ffaf34",
			[PALETTE.UNDERBELLY]: "#babec2",
			[PALETTE.WING]: "#aaa094",
			[PALETTE.WING_EDGE]: "#888580",
			[PALETTE.THEME_HIGHLIGHT]: "#ffaf34",
		}),
		redCardinal: new BirdType("Red Cardinal",
			"Native to the eastern United States, this strikingly red bird is hard to miss.", {
			[PALETTE.BEAK]: "#d93619",
			[PALETTE.FOOT]: "#af8e75",
			[PALETTE.FACE]: "#31353d",
			[PALETTE.HOOD]: "#e83a1b",
			[PALETTE.BELLY]: "#e83a1b",
			[PALETTE.UNDERBELLY]: "#dc3719",
			[PALETTE.WING]: "#d23215",
			[PALETTE.WING_EDGE]: "#b1321c",
		}, ["tuft"]),
		americanGoldfinch: new BirdType("American Goldfinch",
			"Coloured a brilliant yellow, this bird feeds almost entirely on the seeds of plants such as thistle, sunflowers, and coneflowers.", {
			[PALETTE.BEAK]: "#ffaf34",
			[PALETTE.FOOT]: "#af8e75",
			[PALETTE.FACE]: "#fff255",
			[PALETTE.NOSE]: "#383838",
			[PALETTE.HOOD]: "#383838",
			[PALETTE.BELLY]: "#fff255",
			[PALETTE.UNDERBELLY]: "#f5ea63",
			[PALETTE.WING]: "#e8e079",
			[PALETTE.WING_EDGE]: "#191919",
			[PALETTE.THEME_HIGHLIGHT]: "#ffcc00"
		}),
		barnSwallow: new BirdType("Barn Swallow",
			"Agile birds that often roost in man-made structures, these birds are known to build nests near Ospreys for protection.", {
			[PALETTE.FOOT]: "#af8e75",
			[PALETTE.FACE]: "#db7c4d",
			[PALETTE.BELLY]: "#f7e1c9",
			[PALETTE.UNDERBELLY]: "#ebc9a3",
			[PALETTE.WING]: "#2252a9",
			[PALETTE.WING_EDGE]: "#1c448b",
			[PALETTE.HOOD]: "#2252a9",
		}),
		mistletoebird: new BirdType("Mistletoebird",
			"Native to Australia, these birds eat mainly mistletoe and in turn spread the seeds far and wide.", {
			[PALETTE.FOOT]: "#6c6a7c",
			[PALETTE.FACE]: "#352e6d",
			[PALETTE.BELLY]: "#fd6833",
			[PALETTE.UNDERBELLY]: "#e6e1d8",
			[PALETTE.WING]: "#342b7c",
			[PALETTE.WING_EDGE]: "#282065",
		}),
		redAvadavat: new BirdType("Red Avadavat",
			"Native to India and southeast Asia, these birds are also known as Strawberry Finches due to their speckled plumage.", {
			[PALETTE.BEAK]: "#f71919",
			[PALETTE.FOOT]: "#af7575",
			[PALETTE.FACE]: "#cb092b",
			[PALETTE.BELLY]: "#ae1724",
			[PALETTE.UNDERBELLY]: "#831b24",
			[PALETTE.WING]: "#7e3030",
			[PALETTE.WING_EDGE]: "#490f0f",
		}),
		scarletRobin: new BirdType("Scarlet Robin",
			"Native to Australia, this striking robin can be found in Eucalyptus forests.", {
			[PALETTE.FOOT]: "#494949",
			[PALETTE.FACE]: "#3d3d3d",
			[PALETTE.BELLY]: "#fc5633",
			[PALETTE.UNDERBELLY]: "#dcdcdc",
			[PALETTE.WING]: "#2b2b2b",
			[PALETTE.WING_EDGE]: "#ebebeb",
			[PALETTE.THEME_HIGHLIGHT]: "#fc5633",
		}),
		americanRobin: new BirdType("American Robin",
			"While not a true robin, this social North American bird is so named due to its orange coloring. It seems unbothered by nearby humans.", {
			[PALETTE.BEAK]: "#e89f30",
			[PALETTE.FOOT]: "#9f8075",
			[PALETTE.FACE]: "#2d2d2d",
			[PALETTE.BELLY]: "#eb7a3a",
			[PALETTE.UNDERBELLY]: "#eb7a3a",
			[PALETTE.WING]: "#444444",
			[PALETTE.WING_EDGE]: "#232323",
			[PALETTE.THEME_HIGHLIGHT]: "#eb7a3a",
		}),
		carolinaWren: new BirdType("Carolina Wren",
			"Native to the eastern United States, these little birds are known for their curious and energetic nature.", {
			[PALETTE.FOOT]: "#af8e75",
			[PALETTE.FACE]: "#edc7a9",
			[PALETTE.NOSE]: "#f7eee5",
			[PALETTE.HOOD]: "#c58a5b",
			[PALETTE.BELLY]: "#e1b796",
			[PALETTE.UNDERBELLY]: "#c79e7c",
			[PALETTE.WING]: "#c58a5b",
			[PALETTE.WING_EDGE]: "#866348",
		}),
	};

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
			tags.add("default");
			for (let tag of tags) {
				let maxHeight = layers.reduce((max, layer) => Math.max(max, layer.pixels.length), 0);
				if (layers[0].tag !== "default") {
					throw new Error("First layer must have the 'default' tag");
				}
				this.pixels = layers[0].pixels.map(row => row.slice());
				// Pad from top with transparent pixels
				while (this.pixels.length < maxHeight) {
					this.pixels.unshift(new Array(this.pixels[0].length).fill(PALETTE.TRANSPARENT));
				}
				// Combine layers
				for (let i = 1; i < layers.length; i++) {
					if (layers[i].tag === "default" || layers[i].tag === tag) {
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
		getPixels(tag = "default") {
			return this.#pixelsByTag[tag] ?? this.#pixelsByTag["default"];
		}

		/**
		 * @param {CanvasRenderingContext2D} ctx
		 * @param {BirdType} [species]
		* @param {number} direction
		 * @param {number} canvasPixelSize
		 */
		draw(ctx, direction, canvasPixelSize, species) {
			// Clear the canvas before drawing the new frame
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
			
			const pixels = this.getPixels(species?.tags[0]);
			for (let y = 0; y < pixels.length; y++) {
				const row = pixels[y];
				for (let x = 0; x < pixels[y].length; x++) {
					const cell = direction === Directions.LEFT ? row[x] : row[pixels[y].length - x - 1];
					ctx.fillStyle = species?.colors[cell] ?? cell;
					ctx.fillRect(x * canvasPixelSize, y * canvasPixelSize, canvasPixelSize, canvasPixelSize);
				}		}	}
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

	/**
	 * @typedef {keyof typeof Animations} AnimationType
	 */

	const Animations = /** @type {const} */ ({
		STILL: "STILL",
		BOB: "BOB",
		FLYING: "FLYING",
		HEART: "HEART"
	});

	class Birb {
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

	// @ts-check

	class Birdsong {

		/**
		 * @type {AudioContext}
		 */
		audioContext;

		chirp() {
			if (!this.audioContext) {
				this.audioContext = new AudioContext();
			}

			const TIMES = [0, 0.06, 0.10, 0.15];
			const FREQUENCIES = [2200,
				3500 + Math.random() * 600,
				2100 + Math.random() * 200,
				1600 + Math.random() * 400];
			const VOLUMES = [0.0001, 0.2, 0.2, 0.0001];

			const oscillator = this.audioContext.createOscillator();
			oscillator.type = "sine";
			const gain = this.audioContext.createGain();
			oscillator.connect(gain);
			gain.connect(this.audioContext.destination);

			const now = this.audioContext.currentTime;
			for (let i = 0; i < TIMES.length; i++) {
				const time = TIMES[i] + now;
				if (i === 0) {
					oscillator.frequency.setValueAtTime(FREQUENCIES[i], time);
					gain.gain.setValueAtTime(VOLUMES[i], time);
				} else {
					oscillator.frequency.exponentialRampToValueAtTime(FREQUENCIES[i], time);
					gain.gain.exponentialRampToValueAtTime(VOLUMES[i], time);
				}
			}

			oscillator.start(now);
			oscillator.stop(now + TIMES[TIMES.length - 1]);
		}
	}

	const ROOT_PATH = "";

	/**
	 * @typedef {import('./application.js').BirbSaveData} BirbSaveData
	 */

	/**
	 * @abstract
	 */
	class Context {

		/**
		 * @abstract
		 * @returns {Promise<BirbSaveData|{}>}
		 */
		async getSaveData() {
			throw new Error("Method not implemented");
		}

		/**
		 * @abstract
		 * @param {BirbSaveData} saveData
		 */
		async putSaveData(saveData) {
			throw new Error("Method not implemented");
		}

		/**
		 * @abstract
		 */
		resetSaveData() {
			throw new Error("Method not implemented");
		}

		/**
		 * @returns {string[]} A list of CSS selectors for focusable elements
		 */
		getFocusableElements() {
			return ["img", "video", ".birb-sticky-note"];
		}

		getFocusElementTopMargin() {
			return 80;
		}

		/**
		 * @returns {string} The current path of the active page in this context
		 */
		getPath() {
			// Default to website URL
			return window.location.href;
		}

		/**
		 * @returns {HTMLElement} The current active page element where sticky notes can be applied
		 */
		getActivePage() {
			// Default to root element
			return document.documentElement;
		}

		/**
		 * Checks if a path is applicable given the context
		 * @param {string} path Can be a site URL or another context-specific path
		 * @returns {boolean} Whether the path matches the current context state
		 */
		isPathApplicable(path) {
			// Default to website URL matching
			const currentUrl = window.location.href;
			const stickyNoteWebsite = path.split("?")[0];
			const currentWebsite = currentUrl.split("?")[0];

			if (stickyNoteWebsite !== currentWebsite) {
				return false;
			}

			const pathParams = parseUrlParams(path);
			const currentParams = parseUrlParams(currentUrl);

			if (window.location.hostname === "www.youtube.com") {
				if (currentParams.v !== undefined && currentParams.v !== pathParams.v) {
					return false;
				}
			}
			return true;
		}

		areStickyNotesEnabled() {
			return true;
		}
	}

	class ObsidianContext extends Context {

		/**
		 * @override
		 * @returns {Promise<BirbSaveData|{}>}
		 */
		async getSaveData() {
			return new Promise((resolve) => {
				// @ts-expect-error
				OBSIDIAN_PLUGIN.loadData().then((data) => {
					resolve(data ?? {});
				});
			});
		}

		/**
		 * @override
		 * @param {BirbSaveData|{}} saveData
		 */
		async putSaveData(saveData) {
			// @ts-expect-error
			await OBSIDIAN_PLUGIN.saveData(saveData);
		}

		/** @override */
		resetSaveData() {
			this.putSaveData({});
		}

		/** @override */
		getFocusableElements() {
			const elements = [
				".workspace-leaf",
				".cm-callout",
				".HyperMD-codeblock-begin",
				".status-bar",
				".mobile-navbar"
			];
			return super.getFocusableElements().concat(elements);
		}

		/** @override */
		getPath() {
			// @ts-expect-error
			const file = app.workspace.getActiveFile();
			if (file && this.getActiveEditorElement()) {
				return file.path;
			} else {
				return ROOT_PATH;
			}
		}

		/** @override */
		getActivePage() {
			if (this.getPath() === ROOT_PATH) {
				// Root page, use document element
				return document.documentElement
			}
			return this.getActiveEditorElement() ?? document.documentElement;
		}

		/** @override */
		isPathApplicable(path) {
			return path === this.getPath();
		}

		/** @override */
		areStickyNotesEnabled() {
			return this.getPath() !== ROOT_PATH;
		}

		/** @returns {HTMLElement|null} */
		getActiveEditorElement() {
			// @ts-expect-error
			const activeLeaf = app.workspace.activeLeaf;
			const leafElement = activeLeaf?.view?.containerEl;
			return leafElement?.querySelector(".cm-scroller") ?? null;
		}
	}

	/**
	 * Parse URL parameters into a key-value map
	 * @param {string} url
	 * @returns {Record<string, string>}
	 */
	function parseUrlParams(url) {
		const queryString = url.split("?")[1];
		if (!queryString) return {};

		return queryString.split("&").reduce((params, param) => {
			const [key, value] = param.split("=");
			return { ...params, [key]: value };
		}, {});
	}

	/**
	 * @typedef {Object} SavedStickyNote
	 * @property {string} id
	 * @property {string} site
	 * @property {string} content
	 * @property {number} top
	 * @property {number} left
	 */

	class StickyNote {
		/**
		 * @param {string} id
		 * @param {string} [site]
		 * @param {string} [content]
		 * @param {number} [top]
		 * @param {number} [left]
		 */
		constructor(id, site = "", content = "", top = 0, left = 0) {
			this.id = id;
			this.site = site;
			this.content = content;
			this.top = top;
			this.left = left;
		}
	}

	/**
	 * @param {StickyNote} stickyNote
	 * @param {HTMLElement} page
	 * @param {() => void} onSave
	 * @param {() => void} onDelete
	 * @returns {HTMLElement}
	 */
	function renderStickyNote(stickyNote, page, onSave, onDelete) {
		const noteElement = makeElement("birb-window");
		noteElement.classList.add("birb-sticky-note");
		const color = getColor(stickyNote.id);
		noteElement.style.setProperty("--birb-highlight", color);
		noteElement.style.setProperty("--birb-border-color", color);
		
		// Create header
		const header = makeElement("birb-window-header");
		const titleDiv = makeElement("birb-window-title", "Sticky Note");
		const closeButton = makeElement("birb-window-close", "x");
		header.appendChild(titleDiv);
		header.appendChild(closeButton);
		
		// Create content
		const content = makeElement("birb-window-content");
		const textarea = document.createElement("textarea");
		textarea.className = "birb-sticky-note-input";
		textarea.style.width = "150px";
		textarea.placeholder = "Write your notes here and they'll stick to the page!";
		textarea.value = stickyNote.content;
		content.appendChild(textarea);
		
		noteElement.appendChild(header);
		noteElement.appendChild(content);

		noteElement.style.top = `${stickyNote.top}px`;
		noteElement.style.left = `${stickyNote.left}px`;
		page.appendChild(noteElement);

		makeDraggable(header, true, (top, left) => {
			stickyNote.top = top;
			stickyNote.left = left;
			onSave();
		}, page);

		if (closeButton) {
			makeClosable(() => {
				if (stickyNote.content.trim() === "" || confirm("Are you sure you want to delete this sticky note?")) {
					onDelete();
					noteElement.remove();
				}
			}, closeButton, false);
		}

		if (textarea && textarea instanceof HTMLTextAreaElement) {
			let saveTimeout;
			// Save after debounce
			textarea.addEventListener("input", () => {
				stickyNote.content = textarea.value;
				if (saveTimeout) {
					clearTimeout(saveTimeout);
				}
				saveTimeout = setTimeout(() => {
					onSave();
				}, 250);
			});
		}

		// On window resize
		window.addEventListener("resize", () => {
			const modTop = `${stickyNote.top - Math.min(window.innerHeight - noteElement.offsetHeight, stickyNote.top)}px`;
			const modLeft = `${stickyNote.left - Math.min(window.innerWidth - noteElement.offsetWidth, stickyNote.left)}px`;
			noteElement.style.transform = `scale(var(--birb-ui-scale)) translate(-${modLeft}, -${modTop})`;
		});

		return noteElement;
	}

	/**
	 * @param {StickyNote[]} stickyNotes
	 * @param {() => void} onSave
	 * @param {(note: StickyNote) => void} onDelete
	 */
	function drawStickyNotes(stickyNotes, onSave, onDelete) {
		// Remove all existing sticky notes
		const existingNotes = document.querySelectorAll(".birb-sticky-note");
		existingNotes.forEach(note => note.remove());
		// Render all sticky notes
		const pageElement = getContext().getActivePage();
		const context = getContext();
		for (let stickyNote of stickyNotes) {
			if (context.isPathApplicable(stickyNote.site)) {
				renderStickyNote(stickyNote, pageElement, onSave, () => onDelete(stickyNote));
			}
		}
	}

	/**
	 * @param {StickyNote[]} stickyNotes
	 * @param {() => void} onSave
	 * @param {(note: StickyNote) => void} onDelete
	 */
	function createNewStickyNote(stickyNotes, onSave, onDelete) {
		if (getContext().areStickyNotesEnabled() === false) {
			return;
		}
		const id = Date.now().toString();
		const site = getContext().getPath();
		const stickyNote = new StickyNote(id, site, "");
		const page = getContext().getActivePage();
		const element = renderStickyNote(stickyNote, page, onSave, () => onDelete(stickyNote));
		element.style.left = `${page.clientWidth / 2 - element.offsetWidth / 2}px`;
		element.style.top = `${page.scrollTop + page.clientHeight / 2 - element.offsetHeight / 2}px`;
		stickyNote.top = parseInt(element.style.top, 10);
		stickyNote.left = parseInt(element.style.left, 10);
		stickyNotes.push(stickyNote);
		onSave();
	}

	/**
	 * Get a color based on the mod of the sticky note ID
	 * @param {string} id
	 * @returns {string} A color hex code
	 */
	function getColor(id) {
		const colors = ["#ff8baa", "#79bcff", "#d18bff", "#6de192", "#ffd17c", "#ffb37c", "#ff7c7c"];
		const index = parseInt(id, 10) % colors.length;
		return colors[index];
	}

	const MENU_ID = "birb-menu";
	const MENU_EXIT_ID = "birb-menu-exit";

	class MenuItem {
		/**
		 * @param {string|(() => string)} text
		 * @param {() => void} action
		 * @param {boolean} [removeMenu]
		 */
		constructor(text, action, removeMenu = true) {
			this.text = text;
			this.action = action;
			this.removeMenu = removeMenu;
		}
	}

	class ConditionalMenuItem extends MenuItem {
		/**
		 * @param {string} text
		 * @param {() => void} action
		 * @param {() => boolean} condition
		 * @param {boolean} [removeMenu]
		 */
		constructor(text, action, condition, removeMenu = true) {
			super(text, action, removeMenu);
			this.condition = condition;
		}
	}

	class DebugMenuItem extends ConditionalMenuItem {
		/**
		 * @param {string} text
		 * @param {() => void} action
		 */
		constructor(text, action, removeMenu = true) {
			super(text, action, () => isDebug(), removeMenu);
		}
	}

	class Separator extends MenuItem {
		constructor() {
			super("", () => { });
		}
	}

	/**
	 * @param {MenuItem} item
	 * @param {() => void} removeMenuCallback
	 * @returns {HTMLElement}
	 */
	function makeMenuItem(item, removeMenuCallback) {
		if (item instanceof Separator) {
			return makeElement("birb-window-separator");
		}
		let menuItem = makeElement("birb-menu-item", typeof item.text === "function" ? item.text() : item.text);
		onClick(menuItem, () => {
			if (item.removeMenu) {
				removeMenuCallback();
			}
			item.action();
		});
		return menuItem;
	}

	/**
	 * Add the menu to the page if it doesn't already exist
	 * @param {MenuItem[]} menuItems
	 * @param {string} title
	 * @param {(menu: HTMLElement) => void} updateLocationCallback
	 */
	function insertMenu(menuItems, title, updateLocationCallback) {
		if (document.querySelector("#" + MENU_ID)) {
			return;
		}
		let menu = makeElement("birb-window", undefined, MENU_ID);
		let header = makeElement("birb-window-header");
		const titleDiv = makeElement("birb-window-title", title);
		header.appendChild(titleDiv);
		let content = makeElement("birb-window-content");
		const removeCallback = () => removeMenu();
		for (const item of menuItems) {
			if (!(item instanceof ConditionalMenuItem) || item.condition()) {
				content.appendChild(makeMenuItem(item, removeCallback));
			}
		}
		menu.appendChild(header);
		menu.appendChild(content);
		document.body.appendChild(menu);
		makeDraggable(document.querySelector(".birb-window-header"));

		let menuExit = makeElement("birb-window-exit", undefined, MENU_EXIT_ID);
		onClick(menuExit, removeCallback);
		document.body.appendChild(menuExit);
		makeClosable(removeCallback);

		updateLocationCallback(menu);
	}

	/**
	 * Remove the menu from the page
	 */
	function removeMenu() {
		const menu = document.querySelector("#" + MENU_ID);
		if (menu) {
			menu.remove();
		}
		const exitMenu = document.querySelector("#" + MENU_EXIT_ID);
		if (exitMenu) {
			exitMenu.remove();
		}
	}

	/**
	 * @returns {boolean} Whether the menu element is on the page
	 */
	function isMenuOpen() {
		return document.querySelector("#" + MENU_ID) !== null;
	}

	/**
	 * @param {MenuItem[]} menuItems
	 * @param {(menu: HTMLElement) => void} updateLocationCallback
	 */
	function switchMenuItems(menuItems, updateLocationCallback) {
		const menu = document.querySelector("#" + MENU_ID);
		if (!menu || !(menu instanceof HTMLElement)) {
			return;
		}
		const content = menu.querySelector(".birb-window-content");
		if (!content) {
			error("Birb: Content not found");
			return;
		}
		while (content.firstChild) {
			content.removeChild(content.firstChild);
		}
		const removeCallback = () => removeMenu();
		for (const item of menuItems) {
			if (!(item instanceof ConditionalMenuItem) || item.condition()) {
				content.appendChild(makeMenuItem(item, removeCallback));
			}
		}
		updateLocationCallback(menu);
	}

	/**
	 * @typedef {import('./stickyNotes.js').SavedStickyNote} SavedStickyNote
	 */

	/**
	 * @typedef {Object} BirbSaveData
	 * @property {string[]} unlockedSpecies
	 * @property {string} currentSpecies
	 * @property {Partial<Settings>} settings
	 * @property {SavedStickyNote[]} [stickyNotes]
	 */

	/**
	 * @typedef {typeof DEFAULT_SETTINGS} Settings
	 */
	const DEFAULT_SETTINGS = {
		birbMode: false,
		soundEnabled: true
	};

	// Rendering constants
	const SPRITE_WIDTH = 32;
	const SPRITE_HEIGHT = 32;
	const FEATHER_SPRITE_WIDTH = 32;
	const BIRB_CSS_SCALE = 1;
	const UI_CSS_SCALE = isMobile() ? 0.9 : 1;
	const CANVAS_PIXEL_SIZE = 1;
	const WINDOW_PIXEL_SIZE = CANVAS_PIXEL_SIZE * BIRB_CSS_SCALE;

	// Build-time assets
	const STYLESHEET = `@font-face {
	font-family: 'Monocraft';
	src: url("data:font/otf;base64,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BE0fTTlNVE1vTYlNpE2/TdtN9U4QTitOR05iTnxOmE60Ts9O6U8ETytPPk9UT21Pe0+RT6tPy0/kT/1QFlAuUEdQX1B3UI9Qp1DAUNlQ81EMUSRRPVFVUW1Rh1GhUbpR0lHrUgRSHFI1Uk5SaFKAUplSslLMUuVS/VMXUzFTSlNiU3tTm1O/U85T4FP4VBRUMlREVFVUaFR7VItUnFSvVMBU0VTiVPlVClUdVTRVRVVcVW1VgVWTValVuVXSVeVV9lYIVhpWK1ZNVmxWjlanVsNW0lbsVwdXIlc9V1dXcleNV6hXwlfdV/hYE1guWEhYY1h/WJpYtVjQWOpZBlkiWT5ZWVl1WZFZrFnHWeJZ/loZWjVaUFpqWoVan1q6WtVa71sKWxxbL1tCW1VbZ1t6W41boFuyW8Vb2FvrW/5cEFwjXDdcSlxdXHBcglyWXKpcvlzRXOVc+V0MXR9dMl1GXVldbV2AXZJdpV23Xcpd3V3vXgFeFl4wXkNeX157Xo5ep17CXuBe/l8bXzZfTF9bX2lfd1+YX6hfvF/NX95f72ANYCpgOGBHYFZgc2CFYJVgqGC4YNBg4GD5YQ5hImFDYWNhgWGfYbRhzmHcYfBiAGIeYjpiT2JrYoNimGK8Ytli52L1YxFjLmM8Y2FjgmOXY6pjwWPaY/lkF2Q2ZEtkXmRuZIdko2SzZMNk12ToZPplC2UmZUBlWWVnZXVljWWnZb5l0WXmZftmCWYYZidmRGZhZn5mm2a6ZtZm8mcOZypnRWdhZ31nmWe1Z9Fn9GgQaCxoSGhkaIBom2jCaOdpCmkvaVJpd2maabxp3GoBaiRqSWpsao1qrGrNauxrEWs0a1lrfGuda7xr4WwEbClsTGxxbJRsuWzcbP1tHG09bVxtfW2cbcFt5G4JbixuUW50bpluvG7hbwRvKm9Ob3FvlW+5b+FwD3A5cFVwbXCOcK1wznDtcQ5xLXFQcXFxkXGvcdNx+XIcckFyZ3KPcqJyqXKwcspy5XMAcxpzNXNQc11zcHN+c5NzmHOkc7BzvnPTc+h0EXQ7dEl0YHRrdHN0jHSldLV0ynTWdOh1CHUddSx1PHVcdWx1fHWLdZx1rXW9ddJ143X6dhZ2M3ZBdk52W3Zqdnh2hnaTdqJ2sXa/dtJ24Xb2dxB3K3c9d0d3VHdld253d3eBd4l3mHehd6p3sne9d85313fjd+93+3gEeBd4JHgueD94UHhgeGp4dHh9eIl4onixeMF43Hj3eQd5Ink7eVR5bnmHeaF5vXnWefF6C3ooekR6YXp3epJ6oXquer56zXrdewJ7JXs7e097Znt8e5N7vXvEe8574nvufAJ8E3wlfD98TnxYfGp8c3x+fI18lXygfKt8tXzBfMl82XzifOl883z/fQt9G30kfS99Pn1PfWR9e32FfY59lX2ZfZx9oH2jfa59u33Ifc19433offF9/X4hfkR+en6vfuV/AH8jf0d/aH+Lf55/s3/Kf9Z/6X/4gASAHoA4gFWAcoCOgKqAxoDigO+A/IEIgRCBHIEqgTaBSYFOgVaBXYFigWyBdoGCgZqBroHAgdCB4IHzggOCFIIogjmCTIJegnCCgoKNgpaCpoK2gsiC14LngveDCYMYgySDL4NCg1iDZ4N5g4mDk4Odg6eDsYO7g8WDz4PZg9+D7YP0hAWEGYQthEOER4RchGqEcoSEhJSEooSrhLWE2oTrhPiFIoUwhVKFbIWFhamFz4XgheyGBYYfhj+GaIaChp+Gw4bbhvSHDYcmhz6HV4dwh4mHoYe6h9OH7IgFiB2INohQiGmIgoibiLOIzYjniQGJGok0iU6JZ4mAiZmJs4nMieaJ/4oXijCKSIphinqKjoqjirmKyYrWiuSK8Yr8iw+LKIs/i1aLa4uHi6OLuIvhi/+MG4w5jFaMcYybjMOM34z8jRiNNI1QjWyNiI2kjcCN3I34jhSOMI5MjmiOhI6gjryO2I70jxCPLI9Ij2SPgI+cj7iP1I/rkAKQGZAxkE6QapCPkK6Qy5DokQWRIZE+kVqRdZGPkaKRt5HEkdGR4pHzkgiSIJIqkjWSRpJPkluSepKZkriS15L2kxWTNJNTk3KTkpOyk9KT8pQSlDKUUpRylJKUspTSlPKVEpUylVKVcpWSlbKV0pXylhKWMJZOlmyWipaolsaW5JcClyCXP5del32XnJe7l9qX+ZgYmDeYVph1mJSYs5jSmPGZEJkvmU6ZbZmMmauZvpnRmeSZ95oKmh2aMJpDmlaaapp+mpKappq6ms6a4pr2mwqbHpsym0abWptum4Kblpuqm76b0pvmm/qcDJwenDCcQpxUnGaceJyKnJycr5zCnNWc6Jz7nQ6dIZ00nUedWp1tnYCdk52mnbmdzJ3fnfKeBZ4YniueOJ5FnlKeX55snnmehp6TnqGer569nsue2Z7nnvWfA58Rnx+fLZ87n0mfV59ln3OfgZ+Pn52fq5+5n8af05/gn+2f+qAHoBSgIaAuoDygSqBYoGagdKCCoJCgnqCsoLqgyKDWoOSg8qEAoQ6hHKEqoTihRqFUoV+haqF1oYChi6GWoaGhrKG3ocOhz6Hboeeh86H/oguiF6Ijoi+iO6JHolOiX6Jroneig6KPopuip6Kzorai66L0ov1leGNsYW1hdGlvbl9tYXJrcXVvdGF0aW9uX21hcmtudW1iZXJfc2lnbmRvbGxhcl9zaWducGVyY2VudF9zaWduc2luZ2xlX3F1b3RlbGVmdF9wYXJlbnRoZXNpc3JpZ2h0X3BhcmVudGhlc2lzcGx1c19zaWdubGF0aW5fY2FwaXRhbF9sZXR0ZXJfYWxhdGluX2NhcGl0YWxfbGV0dGVyX2JsYXRpbl9jYXBpdGFsX2xldHRlcl9jbGF0aW5fY2FwaXRhbF9sZXR0ZXJfZGxhdGluX2NhcGl0YWxfbGV0dGVyX2VsYXRpbl9jYXBpdGFsX2xldHRlcl9mbGF0aW5fY2FwaXRhbF9sZXR0ZXJfZ2xhdGluX2NhcGl0YWxfbGV0dGVyX2hsYXRpbl9jYXBpdGFsX2xldHRlcl9pbGF0aW5fY2FwaXRhbF9sZXR0ZXJfamxhdGluX2NhcGl0YWxfbGV0dGVyX2tsYXRpbl9jYXBpdGFsX2xldHRlcl9sbGF0aW5fY2FwaXRhbF9sZXR0ZXJfbWxhdGluX2NhcGl0YWxfbGV0dGVyX25sYXRpbl9jYXBpdGFsX2xldHRlcl9vbGF0aW5fY2FwaXRhbF9sZXR0ZXJfcGxhdGluX2NhcGl0YWxfbGV0dGVyX3FsYXRpbl9jYXBpdGFsX2xldHRlcl9ybGF0aW5fY2FwaXRhbF9sZXR0ZXJfc2xhdGluX2NhcGl0YWxfbGV0dGVyX3RsYXRpbl9jYXBpdGFsX2xldHRlcl91bGF0aW5fY2FwaXRhbF9sZXR0ZXJfdmxhdGluX2NhcGl0YWxfbGV0dGVyX3dsYXRpbl9jYXBpdGFsX2xldHRlcl94bGF0aW5fY2FwaXRhbF9sZXR0ZXJfeWxhdGluX2NhcGl0YWxfbGV0dGVyX3psZWZ0X3NxdWFyZV9icmFja2V0cmlnaHRfc3F1YXJlX2JyYWNrZXRhc2NpaV9jYXJldGdyYXZlX2FjY2VudGxhdGluX3NtYWxsX2xldHRlcl9hbGF0aW5fc21hbGxfbGV0dGVyX2JsYXRpbl9zbWFsbF9sZXR0ZXJfY2xhdGluX3NtYWxsX2xldHRlcl9kbGF0aW5fc21hbGxfbGV0dGVyX2VsYXRpbl9zbWFsbF9sZXR0ZXJfZmxhdGluX3NtYWxsX2xldHRlcl9nbGF0aW5fc21hbGxfbGV0dGVyX2hsYXRpbl9zbWFsbF9sZXR0ZXJfaWxhdGluX3NtYWxsX2xldHRlcl9qbGF0aW5fc21hbGxfbGV0dGVyX2tsYXRpbl9zbWFsbF9sZXR0ZXJfbGxhdGluX3NtYWxsX2xldHRlcl9tbGF0aW5fc21hbGxfbGV0dGVyX25sYXRpbl9zbWFsbF9sZXR0ZXJfb2xhdGluX3NtYWxsX2xldHRlcl9wbGF0aW5fc21hbGxfbGV0dGVyX3FsYXRpbl9zbWFsbF9sZXR0ZXJfcmxhdGluX3NtYWxsX2xldHRlcl9zbGF0aW5fc21hbGxfbGV0dGVyX3RsYXRpbl9zbWFsbF9sZXR0ZXJfdWxhdGluX3NtYWxsX2xldHRlcl92bGF0aW5fc21hbGxfbGV0dGVyX3dsYXRpbl9zbWFsbF9sZXR0ZXJfeGxhdGluX3NtYWxsX2xldHRlcl95bGF0aW5fc21hbGxfbGV0dGVyX3psZWZ0X2N1cmx5X2JyYWNldmVydGljYWxfYmFycmlnaHRfY3VybHlfYnJhY2Vhc2NpaV90aWxkZW5vLWJyZWFrX3NwYWNlaW52ZXJ0ZWRfZXhjbGFtYXRpb25fbWFya2NlbnRfc2lnbnBvdW5kX3NpZ25jdXJyZW5jeV9zaWdueWVuX3NpZ25icm9rZW5fYmFyc2VjdGlvbl9zaWduZGlhZXJlc2lzY29weXJpZ2h0X3NpZ25mZW1pbmluZV9vcmRpbmFsX2luZGljYXRvcmxlZnRfcG9pbnRpbmdfZG91YmxlX2FuZ2xlX3F1b3RhdGlvbl9tYXJrbm90X3NpZ25yZWdpc3RlcmVkX3NpZ25kZWdyZWVfc2lnbnBsdXNfbWludXNfc2lnbnN1cGVyc2NyaXB0X3R3b3N1cGVyc2NyaXB0X3RocmVlYWN1dGVfYWNjZW50bWljcm9fc2lnbnBpbGNyb3dfc2lnbm1pZGRsZV9kb3RzdXBlcnNjcmlwdF9vbmVtYXNjdWxpbmVfb3JkaW5hbF9pbmRpY2F0b3JyaWdodF9wb2ludGluZ19kb3VibGVfYW5nbGVfcXVvdGF0aW9uX21hcmt2dWxnYXJfZnJhY3Rpb25fb25lX3F1YXJ0ZXJ2dWxnYXJfZnJhY3Rpb25fb25lX2hhbGZ2dWxnYXJfZnJhY3Rpb25fdGhyZWVfcXVhcnRlcnNpbnZlcnRlZF9xdWVzdGlvbl9tYXJrbGF0aW5fY2FwaXRhbF9sZXR0ZXJfYV93aXRoX2dyYXZlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfYV93aXRoX2FjdXRlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfYV93aXRoX2NpcmN1bWZsZXhsYXRpbl9jYXBpdGFsX2xldHRlcl9hX3dpdGhfdGlsZGVsYXRpbl9jYXBpdGFsX2xldHRlcl9hX3dpdGhfZGlhZXJlc2lzbGF0aW5fY2FwaXRhbF9sZXR0ZXJfYV93aXRoX3JpbmdfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl9hZWxhdGluX2NhcGl0YWxfbGV0dGVyX2Nfd2l0aF9jZWRpbGxhbGF0aW5fY2FwaXRhbF9sZXR0ZXJfZV93aXRoX2dyYXZlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfZV93aXRoX2FjdXRlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfZV93aXRoX2NpcmN1bWZsZXhsYXRpbl9jYXBpdGFsX2xldHRlcl9lX3dpdGhfZGlhZXJlc2lzbGF0aW5fY2FwaXRhbF9sZXR0ZXJfaV93aXRoX2dyYXZlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfaV93aXRoX2FjdXRlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfaV93aXRoX2NpcmN1bWZsZXhsYXRpbl9jYXBpdGFsX2xldHRlcl9pX3dpdGhfZGlhZXJlc2lzbGF0aW5fY2FwaXRhbF9sZXR0ZXJfZXRobGF0aW5fY2FwaXRhbF9sZXR0ZXJfbl93aXRoX3RpbGRlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfb193aXRoX2dyYXZlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfb193aXRoX2FjdXRlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfb193aXRoX2NpcmN1bWZsZXhsYXRpbl9jYXBpdGFsX2xldHRlcl9vX3dpdGhfdGlsZGVsYXRpbl9jYXBpdGFsX2xldHRlcl9vX3dpdGhfZGlhZXJlc2lzbXVsdGlwbGljYXRpb25fc2lnbmxhdGluX2NhcGl0YWxfbGV0dGVyX29fd2l0aF9zdHJva2VsYXRpbl9jYXBpdGFsX2xldHRlcl91X3dpdGhfZ3JhdmVsYXRpbl9jYXBpdGFsX2xldHRlcl91X3dpdGhfYWN1dGVsYXRpbl9jYXBpdGFsX2xldHRlcl91X3dpdGhfY2lyY3VtZmxleGxhdGluX2NhcGl0YWxfbGV0dGVyX3Vfd2l0aF9kaWFlcmVzaXNsYXRpbl9jYXBpdGFsX2xldHRlcl95X3dpdGhfYWN1dGVsYXRpbl9jYXBpdGFsX2xldHRlcl90aG9ybmxhdGluX3NtYWxsX2xldHRlcl9zaGFycF9zbGF0aW5fc21hbGxfbGV0dGVyX2Ffd2l0aF9ncmF2ZWxhdGluX3NtYWxsX2xldHRlcl9hX3dpdGhfYWN1dGVsYXRpbl9zbWFsbF9sZXR0ZXJfYV93aXRoX2NpcmN1bWZsZXhsYXRpbl9zbWFsbF9sZXR0ZXJfYV93aXRoX3RpbGRlbGF0aW5fc21hbGxfbGV0dGVyX2Ffd2l0aF9kaWFlcmVzaXNsYXRpbl9zbWFsbF9sZXR0ZXJfYV93aXRoX3JpbmdfYWJvdmVsYXRpbl9zbWFsbF9sZXR0ZXJfYWVsYXRpbl9zbWFsbF9sZXR0ZXJfY193aXRoX2NlZGlsbGFsYXRpbl9zbWFsbF9sZXR0ZXJfZV93aXRoX2dyYXZlbGF0aW5fc21hbGxfbGV0dGVyX2Vfd2l0aF9hY3V0ZWxhdGluX3NtYWxsX2xldHRlcl9lX3dpdGhfY2lyY3VtZmxleGxhdGluX3NtYWxsX2xldHRlcl9lX3dpdGhfZGlhZXJlc2lzbGF0aW5fc21hbGxfbGV0dGVyX2lfd2l0aF9ncmF2ZWxhdGluX3NtYWxsX2xldHRlcl9pX3dpdGhfYWN1dGVsYXRpbl9zbWFsbF9sZXR0ZXJfaV93aXRoX2NpcmN1bWZsZXhsYXRpbl9zbWFsbF9sZXR0ZXJfaV93aXRoX2RpYWVyZXNpc2xhdGluX3NtYWxsX2xldHRlcl9ldGhsYXRpbl9zbWFsbF9sZXR0ZXJfbl93aXRoX3RpbGRlbGF0aW5fc21hbGxfbGV0dGVyX29fd2l0aF9ncmF2ZWxhdGluX3NtYWxsX2xldHRlcl9vX3dpdGhfYWN1dGVsYXRpbl9zbWFsbF9sZXR0ZXJfb193aXRoX2NpcmN1bWZsZXhsYXRpbl9zbWFsbF9sZXR0ZXJfb193aXRoX3RpbGRlbGF0aW5fc21hbGxfbGV0dGVyX29fd2l0aF9kaWFlcmVzaXNkaXZpc2lvbl9zaWdubGF0aW5fc21hbGxfbGV0dGVyX29fd2l0aF9zdHJva2VsYXRpbl9zbWFsbF9sZXR0ZXJfdV93aXRoX2dyYXZlbGF0aW5fc21hbGxfbGV0dGVyX3Vfd2l0aF9hY3V0ZWxhdGluX3NtYWxsX2xldHRlcl91X3dpdGhfY2lyY3VtZmxleGxhdGluX3NtYWxsX2xldHRlcl91X3dpdGhfZGlhZXJlc2lzbGF0aW5fc21hbGxfbGV0dGVyX3lfd2l0aF9hY3V0ZWxhdGluX3NtYWxsX2xldHRlcl90aG9ybmxhdGluX3NtYWxsX2xldHRlcl95X3dpdGhfZGlhZXJlc2lzbGF0aW5fY2FwaXRhbF9sZXR0ZXJfYV93aXRoX21hY3JvbmxhdGluX3NtYWxsX2xldHRlcl9hX3dpdGhfbWFjcm9ubGF0aW5fY2FwaXRhbF9sZXR0ZXJfYV93aXRoX2JyZXZlbGF0aW5fc21hbGxfbGV0dGVyX2Ffd2l0aF9icmV2ZWxhdGluX2NhcGl0YWxfbGV0dGVyX2Ffd2l0aF9vZ29uZWtsYXRpbl9zbWFsbF9sZXR0ZXJfYV93aXRoX29nb25la2xhdGluX2NhcGl0YWxfbGV0dGVyX2Nfd2l0aF9hY3V0ZWxhdGluX3NtYWxsX2xldHRlcl9jX3dpdGhfYWN1dGVsYXRpbl9jYXBpdGFsX2xldHRlcl9jX3dpdGhfY2lyY3VtZmxleGxhdGluX3NtYWxsX2xldHRlcl9jX3dpdGhfY2lyY3VtZmxleGxhdGluX2NhcGl0YWxfbGV0dGVyX2Nfd2l0aF9kb3RfYWJvdmVsYXRpbl9zbWFsbF9sZXR0ZXJfY193aXRoX2RvdF9hYm92ZWxhdGluX2NhcGl0YWxfbGV0dGVyX2Nfd2l0aF9jYXJvbmxhdGluX3NtYWxsX2xldHRlcl9jX3dpdGhfY2Fyb25sYXRpbl9jYXBpdGFsX2xldHRlcl9kX3dpdGhfY2Fyb25sYXRpbl9zbWFsbF9sZXR0ZXJfZF93aXRoX2Nhcm9ubGF0aW5fY2FwaXRhbF9sZXR0ZXJfZV93aXRoX21hY3JvbmxhdGluX3NtYWxsX2xldHRlcl9lX3dpdGhfbWFjcm9ubGF0aW5fY2FwaXRhbF9sZXR0ZXJfZV93aXRoX2JyZXZlbGF0aW5fc21hbGxfbGV0dGVyX2Vfd2l0aF9icmV2ZWxhdGluX2NhcGl0YWxfbGV0dGVyX2Vfd2l0aF9kb3RfYWJvdmVsYXRpbl9zbWFsbF9sZXR0ZXJfZV93aXRoX2RvdF9hYm92ZWxhdGluX2NhcGl0YWxfbGV0dGVyX2Vfd2l0aF9vZ29uZWtsYXRpbl9zbWFsbF9sZXR0ZXJfZV93aXRoX29nb25la2xhdGluX2NhcGl0YWxfbGV0dGVyX2Vfd2l0aF9jYXJvbmxhdGluX3NtYWxsX2xldHRlcl9lX3dpdGhfY2Fyb25sYXRpbl9jYXBpdGFsX2xldHRlcl9nX3dpdGhfY2lyY3VtZmxleGxhdGluX3NtYWxsX2xldHRlcl9nX3dpdGhfY2lyY3VtZmxleGxhdGluX2NhcGl0YWxfbGV0dGVyX2dfd2l0aF9icmV2ZWxhdGluX3NtYWxsX2xldHRlcl9nX3dpdGhfYnJldmVsYXRpbl9jYXBpdGFsX2xldHRlcl9nX3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX2dfd2l0aF9kb3RfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl9nX3dpdGhfY2VkaWxsYWxhdGluX3NtYWxsX2xldHRlcl9nX3dpdGhfY2VkaWxsYWxhdGluX2NhcGl0YWxfbGV0dGVyX2hfd2l0aF9jaXJjdW1mbGV4bGF0aW5fc21hbGxfbGV0dGVyX2hfd2l0aF9jaXJjdW1mbGV4bGF0aW5fY2FwaXRhbF9sZXR0ZXJfaV93aXRoX3RpbGRlbGF0aW5fc21hbGxfbGV0dGVyX2lfd2l0aF90aWxkZWxhdGluX2NhcGl0YWxfbGV0dGVyX2lfd2l0aF9tYWNyb25sYXRpbl9zbWFsbF9sZXR0ZXJfaV93aXRoX21hY3JvbmxhdGluX2NhcGl0YWxfbGV0dGVyX2lfd2l0aF9icmV2ZWxhdGluX3NtYWxsX2xldHRlcl9pX3dpdGhfYnJldmVsYXRpbl9jYXBpdGFsX2xldHRlcl9pX3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX2RvdGxlc3NfaWxhdGluX2NhcGl0YWxfbGlnYXR1cmVfaWpsYXRpbl9zbWFsbF9saWdhdHVyZV9pamxhdGluX2NhcGl0YWxfbGV0dGVyX2pfd2l0aF9jaXJjdW1mbGV4bGF0aW5fc21hbGxfbGV0dGVyX2pfd2l0aF9jaXJjdW1mbGV4bGF0aW5fY2FwaXRhbF9sZXR0ZXJfa193aXRoX2NlZGlsbGFsYXRpbl9zbWFsbF9sZXR0ZXJfa193aXRoX2NlZGlsbGFsYXRpbl9zbWFsbF9sZXR0ZXJfa3JhbGF0aW5fY2FwaXRhbF9sZXR0ZXJfbF93aXRoX2FjdXRlbGF0aW5fc21hbGxfbGV0dGVyX2xfd2l0aF9hY3V0ZWxhdGluX2NhcGl0YWxfbGV0dGVyX2xfd2l0aF9jZWRpbGxhbGF0aW5fc21hbGxfbGV0dGVyX2xfd2l0aF9jZWRpbGxhbGF0aW5fY2FwaXRhbF9sZXR0ZXJfbF93aXRoX2Nhcm9ubGF0aW5fc21hbGxfbGV0dGVyX2xfd2l0aF9jYXJvbmxhdGluX2NhcGl0YWxfbGV0dGVyX2xfd2l0aF9zdHJva2VsYXRpbl9zbWFsbF9sZXR0ZXJfbF93aXRoX3N0cm9rZWxhdGluX2NhcGl0YWxfbGV0dGVyX25fd2l0aF9hY3V0ZWxhdGluX3NtYWxsX2xldHRlcl9uX3dpdGhfYWN1dGVsYXRpbl9jYXBpdGFsX2xldHRlcl9uX3dpdGhfY2VkaWxsYWxhdGluX3NtYWxsX2xldHRlcl9uX3dpdGhfY2VkaWxsYWxhdGluX2NhcGl0YWxfbGV0dGVyX25fd2l0aF9jYXJvbmxhdGluX3NtYWxsX2xldHRlcl9uX3dpdGhfY2Fyb25sYXRpbl9jYXBpdGFsX2xldHRlcl9vX3dpdGhfbWFjcm9ubGF0aW5fc21hbGxfbGV0dGVyX29fd2l0aF9tYWNyb25sYXRpbl9jYXBpdGFsX2xldHRlcl9vX3dpdGhfYnJldmVsYXRpbl9zbWFsbF9sZXR0ZXJfb193aXRoX2JyZXZlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfb193aXRoX2RvdWJsZV9hY3V0ZWxhdGluX3NtYWxsX2xldHRlcl9vX3dpdGhfZG91YmxlX2FjdXRlbGF0aW5fY2FwaXRhbF9saWdhdHVyZV9vZWxhdGluX3NtYWxsX2xpZ2F0dXJlX29lbGF0aW5fY2FwaXRhbF9sZXR0ZXJfcl93aXRoX2FjdXRlbGF0aW5fc21hbGxfbGV0dGVyX3Jfd2l0aF9hY3V0ZWxhdGluX2NhcGl0YWxfbGV0dGVyX3Jfd2l0aF9jYXJvbmxhdGluX3NtYWxsX2xldHRlcl9yX3dpdGhfY2Fyb25sYXRpbl9jYXBpdGFsX2xldHRlcl9zX3dpdGhfYWN1dGVsYXRpbl9zbWFsbF9sZXR0ZXJfc193aXRoX2FjdXRlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfc193aXRoX2NpcmN1bWZsZXhsYXRpbl9zbWFsbF9sZXR0ZXJfc193aXRoX2NpcmN1bWZsZXhsYXRpbl9jYXBpdGFsX2xldHRlcl9zX3dpdGhfY2VkaWxsYWxhdGluX3NtYWxsX2xldHRlcl9zX3dpdGhfY2VkaWxsYWxhdGluX2NhcGl0YWxfbGV0dGVyX3Nfd2l0aF9jYXJvbmxhdGluX3NtYWxsX2xldHRlcl9zX3dpdGhfY2Fyb25sYXRpbl9jYXBpdGFsX2xldHRlcl90X3dpdGhfY2Fyb25sYXRpbl9zbWFsbF9sZXR0ZXJfdF93aXRoX2Nhcm9ubGF0aW5fY2FwaXRhbF9sZXR0ZXJfdV93aXRoX3RpbGRlbGF0aW5fc21hbGxfbGV0dGVyX3Vfd2l0aF90aWxkZWxhdGluX2NhcGl0YWxfbGV0dGVyX3Vfd2l0aF9tYWNyb25sYXRpbl9zbWFsbF9sZXR0ZXJfdV93aXRoX21hY3JvbmxhdGluX2NhcGl0YWxfbGV0dGVyX3Vfd2l0aF9icmV2ZWxhdGluX3NtYWxsX2xldHRlcl91X3dpdGhfYnJldmVsYXRpbl9jYXBpdGFsX2xldHRlcl91X3dpdGhfcmluZ19hYm92ZWxhdGluX3NtYWxsX2xldHRlcl91X3dpdGhfcmluZ19hYm92ZWxhdGluX2NhcGl0YWxfbGV0dGVyX3Vfd2l0aF9kb3VibGVfYWN1dGVsYXRpbl9zbWFsbF9sZXR0ZXJfdV93aXRoX2RvdWJsZV9hY3V0ZWxhdGluX2NhcGl0YWxfbGV0dGVyX3dfd2l0aF9jaXJjdW1mbGV4bGF0aW5fc21hbGxfbGV0dGVyX3dfd2l0aF9jaXJjdW1mbGV4bGF0aW5fY2FwaXRhbF9sZXR0ZXJfeV93aXRoX2NpcmN1bWZsZXhsYXRpbl9zbWFsbF9sZXR0ZXJfeV93aXRoX2NpcmN1bWZsZXhsYXRpbl9jYXBpdGFsX2xldHRlcl95X3dpdGhfZGlhZXJlc2lzbGF0aW5fY2FwaXRhbF9sZXR0ZXJfel93aXRoX2FjdXRlbGF0aW5fc21hbGxfbGV0dGVyX3pfd2l0aF9hY3V0ZWxhdGluX2NhcGl0YWxfbGV0dGVyX3pfd2l0aF9kb3RfYWJvdmVsYXRpbl9zbWFsbF9sZXR0ZXJfel93aXRoX2RvdF9hYm92ZWxhdGluX2NhcGl0YWxfbGV0dGVyX3pfd2l0aF9jYXJvbmxhdGluX3NtYWxsX2xldHRlcl96X3dpdGhfY2Fyb25sYXRpbl9zbWFsbF9sZXR0ZXJfbG9uZ19zbGF0aW5fY2FwaXRhbF9sZXR0ZXJfYl93aXRoX2hvb2tsYXRpbl9jYXBpdGFsX2xldHRlcl90b25lX3NpeGxhdGluX3NtYWxsX2xldHRlcl90b25lX3NpeGxhdGluX2NhcGl0YWxfbGV0dGVyX29wZW5fb2xhdGluX2NhcGl0YWxfbGV0dGVyX2FmcmljYW5fZGxhdGluX2NhcGl0YWxfbGV0dGVyX3JldmVyc2VkX2VsYXRpbl9jYXBpdGFsX2xldHRlcl9zY2h3YWxhdGluX2NhcGl0YWxfbGV0dGVyX29wZW5fZWxhdGluX2NhcGl0YWxfbGV0dGVyX2Zfd2l0aF9ob29rbGF0aW5fc21hbGxfbGV0dGVyX2xfd2l0aF9iYXJsYXRpbl9zbWFsbF9sZXR0ZXJfbGFtYmRhX3dpdGhfc3Ryb2tlbGF0aW5fc21hbGxfbGV0dGVyX25fd2l0aF9sb25nX3JpZ2h0X2xlZ2xhdGluX2NhcGl0YWxfbGV0dGVyX29fd2l0aF9taWRkbGVfdGlsZGVsYXRpbl9jYXBpdGFsX2xldHRlcl90b25lX3R3b2xhdGluX3NtYWxsX2xldHRlcl90b25lX3R3b2xhdGluX2NhcGl0YWxfbGV0dGVyX2VzaGxhdGluX2xldHRlcl9yZXZlcnNlZF9lc2hfbG9vcGxhdGluX2NhcGl0YWxfbGV0dGVyX3Zfd2l0aF9ob29rbGF0aW5fY2FwaXRhbF9sZXR0ZXJfZXpobGF0aW5fY2FwaXRhbF9sZXR0ZXJfZXpoX3JldmVyc2VkbGF0aW5fc21hbGxfbGV0dGVyX2V6aF9yZXZlcnNlZGxhdGluX2xldHRlcl90d29fd2l0aF9zdHJva2VsYXRpbl9jYXBpdGFsX2xldHRlcl90b25lX2ZpdmVsYXRpbl9zbWFsbF9sZXR0ZXJfdG9uZV9maXZlbGF0aW5fbGV0dGVyX2ludmVydGVkX2dsb3R0YWxfc3RvcF93aXRoX3N0cm9rZWxhdGluX2xldHRlcl93eW5ubGF0aW5fbGV0dGVyX2RlbnRhbF9jbGlja2xhdGluX2xldHRlcl9sYXRlcmFsX2NsaWNrbGF0aW5fbGV0dGVyX2FsdmVvbGFyX2NsaWNrbGF0aW5fbGV0dGVyX3JldHJvZmxleF9jbGlja2xhdGluX3NtYWxsX2xldHRlcl9samxhdGluX2NhcGl0YWxfbGV0dGVyX2Ffd2l0aF9jYXJvbmxhdGluX3NtYWxsX2xldHRlcl9hX3dpdGhfY2Fyb25sYXRpbl9jYXBpdGFsX2xldHRlcl9pX3dpdGhfY2Fyb25sYXRpbl9zbWFsbF9sZXR0ZXJfaV93aXRoX2Nhcm9ubGF0aW5fY2FwaXRhbF9sZXR0ZXJfb193aXRoX2Nhcm9ubGF0aW5fc21hbGxfbGV0dGVyX29fd2l0aF9jYXJvbmxhdGluX2NhcGl0YWxfbGV0dGVyX3Vfd2l0aF9jYXJvbmxhdGluX3NtYWxsX2xldHRlcl91X3dpdGhfY2Fyb25sYXRpbl9zbWFsbF9sZXR0ZXJfdHVybmVkX2VsYXRpbl9jYXBpdGFsX2xldHRlcl9hZV93aXRoX21hY3JvbmxhdGluX3NtYWxsX2xldHRlcl9hZV93aXRoX21hY3JvbmxhdGluX2NhcGl0YWxfbGV0dGVyX2dfd2l0aF9jYXJvbmxhdGluX3NtYWxsX2xldHRlcl9nX3dpdGhfY2Fyb25sYXRpbl9jYXBpdGFsX2xldHRlcl9rX3dpdGhfY2Fyb25sYXRpbl9zbWFsbF9sZXR0ZXJfa193aXRoX2Nhcm9ubGF0aW5fY2FwaXRhbF9sZXR0ZXJfZXpoX3dpdGhfY2Fyb25sYXRpbl9zbWFsbF9sZXR0ZXJfZXpoX3dpdGhfY2Fyb25sYXRpbl9zbWFsbF9sZXR0ZXJfal93aXRoX2Nhcm9ubGF0aW5fY2FwaXRhbF9sZXR0ZXJfZ193aXRoX2FjdXRlbGF0aW5fc21hbGxfbGV0dGVyX2dfd2l0aF9hY3V0ZWxhdGluX2NhcGl0YWxfbGV0dGVyX3d5bm5sYXRpbl9jYXBpdGFsX2xldHRlcl9uX3dpdGhfZ3JhdmVsYXRpbl9zbWFsbF9sZXR0ZXJfbl93aXRoX2dyYXZlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfYWVfd2l0aF9hY3V0ZWxhdGluX3NtYWxsX2xldHRlcl9hZV93aXRoX2FjdXRlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfc193aXRoX2NvbW1hX2JlbG93bGF0aW5fc21hbGxfbGV0dGVyX3Nfd2l0aF9jb21tYV9iZWxvd2xhdGluX2NhcGl0YWxfbGV0dGVyX3Rfd2l0aF9jb21tYV9iZWxvd2xhdGluX3NtYWxsX2xldHRlcl90X3dpdGhfY29tbWFfYmVsb3dsYXRpbl9jYXBpdGFsX2xldHRlcl95b2dobGF0aW5fc21hbGxfbGV0dGVyX3lvZ2hsYXRpbl9jYXBpdGFsX2xldHRlcl9oX3dpdGhfY2Fyb25sYXRpbl9zbWFsbF9sZXR0ZXJfaF93aXRoX2Nhcm9ubGF0aW5fY2FwaXRhbF9sZXR0ZXJfbl93aXRoX2xvbmdfcmlnaHRfbGVnbGF0aW5fc21hbGxfbGV0dGVyX2Rfd2l0aF9jdXJsbGF0aW5fY2FwaXRhbF9sZXR0ZXJfel93aXRoX2hvb2tsYXRpbl9zbWFsbF9sZXR0ZXJfel93aXRoX2hvb2tsYXRpbl9jYXBpdGFsX2xldHRlcl9hX3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX2Ffd2l0aF9kb3RfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl9vX3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX29fd2l0aF9kb3RfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl95X3dpdGhfbWFjcm9ubGF0aW5fc21hbGxfbGV0dGVyX3lfd2l0aF9tYWNyb25sYXRpbl9zbWFsbF9sZXR0ZXJfbF93aXRoX2N1cmxsYXRpbl9zbWFsbF9sZXR0ZXJfbl93aXRoX2N1cmxsYXRpbl9zbWFsbF9sZXR0ZXJfdF93aXRoX2N1cmxsYXRpbl9jYXBpdGFsX2xldHRlcl9hX3dpdGhfc3Ryb2tlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfY193aXRoX3N0cm9rZWxhdGluX3NtYWxsX2xldHRlcl9jX3dpdGhfc3Ryb2tlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfbF93aXRoX2JhcmxhdGluX2NhcGl0YWxfbGV0dGVyX3Rfd2l0aF9kaWFnb25hbF9zdHJva2VsYXRpbl9jYXBpdGFsX2xldHRlcl9nbG90dGFsX3N0b3BsYXRpbl9zbWFsbF9sZXR0ZXJfZ2xvdHRhbF9zdG9wbGF0aW5fY2FwaXRhbF9sZXR0ZXJfYl93aXRoX3N0cm9rZWxhdGluX2NhcGl0YWxfbGV0dGVyX3VfYmFybGF0aW5fY2FwaXRhbF9sZXR0ZXJfdHVybmVkX3ZsYXRpbl9jYXBpdGFsX2xldHRlcl9lX3dpdGhfc3Ryb2tlbGF0aW5fc21hbGxfbGV0dGVyX2Vfd2l0aF9zdHJva2VsYXRpbl9jYXBpdGFsX2xldHRlcl9qX3dpdGhfc3Ryb2tlbGF0aW5fc21hbGxfbGV0dGVyX2pfd2l0aF9zdHJva2VsYXRpbl9jYXBpdGFsX2xldHRlcl9zbWFsbF9xX3dpdGhfaG9va190YWlsbGF0aW5fc21hbGxfbGV0dGVyX3Ffd2l0aF9ob29rX3RhaWxsYXRpbl9jYXBpdGFsX2xldHRlcl9yX3dpdGhfc3Ryb2tlbGF0aW5fc21hbGxfbGV0dGVyX3Jfd2l0aF9zdHJva2VsYXRpbl9jYXBpdGFsX2xldHRlcl95X3dpdGhfc3Ryb2tlbGF0aW5fc21hbGxfbGV0dGVyX3lfd2l0aF9zdHJva2VsYXRpbl9zbWFsbF9sZXR0ZXJfdHVybmVkX2FsYXRpbl9zbWFsbF9sZXR0ZXJfYWxwaGFsYXRpbl9zbWFsbF9sZXR0ZXJfdHVybmVkX2FscGhhbGF0aW5fc21hbGxfbGV0dGVyX2Jfd2l0aF9ob29rbGF0aW5fc21hbGxfbGV0dGVyX29wZW5fb2xhdGluX3NtYWxsX2xldHRlcl9jX3dpdGhfY3VybGxhdGluX3NtYWxsX2xldHRlcl9kX3dpdGhfdGFpbGxhdGluX3NtYWxsX2xldHRlcl9kX3dpdGhfaG9va2xhdGluX3NtYWxsX2xldHRlcl9yZXZlcnNlZF9lbGF0aW5fc21hbGxfbGV0dGVyX3NjaHdhbGF0aW5fc21hbGxfbGV0dGVyX3NjaHdhX3dpdGhfaG9va2xhdGluX3NtYWxsX2xldHRlcl9vcGVuX2VsYXRpbl9zbWFsbF9sZXR0ZXJfcmV2ZXJzZWRfb3Blbl9lbGF0aW5fc21hbGxfbGV0dGVyX3JldmVyc2VkX29wZW5fZV93aXRoX2hvb2tsYXRpbl9zbWFsbF9sZXR0ZXJfY2xvc2VkX3JldmVyc2VkX29wZW5fZWxhdGluX3NtYWxsX2xldHRlcl9kb3RsZXNzX2pfd2l0aF9zdHJva2VsYXRpbl9zbWFsbF9sZXR0ZXJfZ193aXRoX2hvb2tsYXRpbl9zbWFsbF9sZXR0ZXJfc2NyaXB0X2dsYXRpbl9sZXR0ZXJfc21hbGxfY2FwaXRhbF9nbGF0aW5fc21hbGxfbGV0dGVyX3JhbXNfaG9ybmxhdGluX3NtYWxsX2xldHRlcl90dXJuZWRfaGxhdGluX3NtYWxsX2xldHRlcl9oX3dpdGhfaG9va2xhdGluX3NtYWxsX2xldHRlcl9oZW5nX3dpdGhfaG9va2xhdGluX3NtYWxsX2xldHRlcl9pX3dpdGhfc3Ryb2tlbGF0aW5fbGV0dGVyX3NtYWxsX2NhcGl0YWxfaWxhdGluX3NtYWxsX2xldHRlcl9sX3dpdGhfbWlkZGxlX3RpbGRlbGF0aW5fc21hbGxfbGV0dGVyX2xfd2l0aF9iZWx0bGF0aW5fc21hbGxfbGV0dGVyX2xfd2l0aF9yZXRyb2ZsZXhfaG9va2xhdGluX3NtYWxsX2xldHRlcl9sZXpobGF0aW5fc21hbGxfbGV0dGVyX3R1cm5lZF9tbGF0aW5fc21hbGxfbGV0dGVyX3R1cm5lZF9tX3dpdGhfbG9uZ19sZWdsYXRpbl9zbWFsbF9sZXR0ZXJfbV93aXRoX2hvb2tsYXRpbl9zbWFsbF9sZXR0ZXJfbl93aXRoX2xlZnRfaG9va2xhdGluX3NtYWxsX2xldHRlcl9uX3dpdGhfcmV0cm9mbGV4X2hvb2tsYXRpbl9sZXR0ZXJfc21hbGxfY2FwaXRhbF9ubGF0aW5fc21hbGxfbGV0dGVyX2JhcnJlZF9vbGF0aW5fc21hbGxfbGV0dGVyX2Nsb3NlZF9vbWVnYWxhdGluX3NtYWxsX2xldHRlcl9waGlsYXRpbl9zbWFsbF9sZXR0ZXJfdHVybmVkX3JsYXRpbl9zbWFsbF9sZXR0ZXJfdHVybmVkX3Jfd2l0aF9sb25nX2xlZ2xhdGluX3NtYWxsX2xldHRlcl90dXJuZWRfcl93aXRoX2hvb2tsYXRpbl9zbWFsbF9sZXR0ZXJfcl93aXRoX2xvbmdfbGVnbGF0aW5fc21hbGxfbGV0dGVyX3Jfd2l0aF9maXNoaG9va2xhdGluX3NtYWxsX2xldHRlcl9yZXZlcnNlZF9yX3dpdGhfZmlzaGhvb2tsYXRpbl9sZXR0ZXJfc21hbGxfY2FwaXRhbF9ybGF0aW5fbGV0dGVyX3NtYWxsX2NhcGl0YWxfaW52ZXJ0ZWRfcmxhdGluX3NtYWxsX2xldHRlcl9kb3RsZXNzX2pfd2l0aF9zdHJva2VfYW5kX2hvb2tsYXRpbl9zbWFsbF9sZXR0ZXJfc3F1YXRfcmV2ZXJzZWRfZXNobGF0aW5fc21hbGxfbGV0dGVyX2VzaF93aXRoX2N1cmxsYXRpbl9zbWFsbF9sZXR0ZXJfdHVybmVkX3RsYXRpbl9zbWFsbF9sZXR0ZXJfdF93aXRoX3JldHJvZmxleF9ob29rbGF0aW5fc21hbGxfbGV0dGVyX3VfYmFybGF0aW5fc21hbGxfbGV0dGVyX3Vwc2lsb25sYXRpbl9zbWFsbF9sZXR0ZXJfdl93aXRoX2hvb2tsYXRpbl9zbWFsbF9sZXR0ZXJfdHVybmVkX3ZsYXRpbl9zbWFsbF9sZXR0ZXJfdHVybmVkX3dsYXRpbl9zbWFsbF9sZXR0ZXJfdHVybmVkX3lsYXRpbl9sZXR0ZXJfc21hbGxfY2FwaXRhbF95bGF0aW5fc21hbGxfbGV0dGVyX3pfd2l0aF9jdXJsbGF0aW5fc21hbGxfbGV0dGVyX2V6aGxhdGluX3NtYWxsX2xldHRlcl9lemhfd2l0aF9jdXJsbGF0aW5fbGV0dGVyX2dsb3R0YWxfc3RvcGxhdGluX2xldHRlcl9waGFyeW5nZWFsX3ZvaWNlZF9mcmljYXRpdmVsYXRpbl9sZXR0ZXJfaW52ZXJ0ZWRfZ2xvdHRhbF9zdG9wbGF0aW5fbGV0dGVyX3N0cmV0Y2hlZF9jbGF0aW5fbGV0dGVyX2JpbGFiaWFsX2NsaWNrbGF0aW5fbGV0dGVyX3NtYWxsX2NhcGl0YWxfYmxhdGluX3NtYWxsX2xldHRlcl9jbG9zZWRfb3Blbl9lbGF0aW5fbGV0dGVyX3NtYWxsX2NhcGl0YWxfZ193aXRoX2hvb2tsYXRpbl9sZXR0ZXJfc21hbGxfY2FwaXRhbF9obGF0aW5fc21hbGxfbGV0dGVyX2pfd2l0aF9jcm9zc2VkX3RhaWxsYXRpbl9zbWFsbF9sZXR0ZXJfdHVybmVkX2tsYXRpbl9sZXR0ZXJfc21hbGxfY2FwaXRhbF9sbGF0aW5fc21hbGxfbGV0dGVyX3Ffd2l0aF9ob29rbGF0aW5fbGV0dGVyX2dsb3R0YWxfc3RvcF93aXRoX3N0cm9rZWxhdGluX2xldHRlcl9yZXZlcnNlZF9nbG90dGFsX3N0b3Bfd2l0aF9zdHJva2VsYXRpbl9sZXR0ZXJfYmlsYWJpYWxfcGVyY3Vzc2l2ZW1vZGlmaWVyX2xldHRlcl90dXJuZWRfY29tbWFtb2RpZmllcl9sZXR0ZXJfbG93X3ZlcnRpY2FsX2xpbmVkb3RfYWJvdmVncmVla19xdWVzdGlvbl9tYXJrZ3JlZWtfYW5vX3RlbGVpYWdyZWVrX2NhcGl0YWxfbGV0dGVyX2FscGhhZ3JlZWtfY2FwaXRhbF9sZXR0ZXJfYmV0YWdyZWVrX2NhcGl0YWxfbGV0dGVyX2dhbW1hZ3JlZWtfY2FwaXRhbF9sZXR0ZXJfZGVsdGFncmVla19jYXBpdGFsX2xldHRlcl9lcHNpbG9uZ3JlZWtfY2FwaXRhbF9sZXR0ZXJfemV0YWdyZWVrX2NhcGl0YWxfbGV0dGVyX2V0YWdyZWVrX2NhcGl0YWxfbGV0dGVyX3RoZXRhZ3JlZWtfY2FwaXRhbF9sZXR0ZXJfaW90YWdyZWVrX2NhcGl0YWxfbGV0dGVyX2thcHBhZ3JlZWtfY2FwaXRhbF9sZXR0ZXJfbGFtZGFncmVla19jYXBpdGFsX2xldHRlcl9tdWdyZWVrX2NhcGl0YWxfbGV0dGVyX251Z3JlZWtfY2FwaXRhbF9sZXR0ZXJfeGlncmVla19jYXBpdGFsX2xldHRlcl9vbWljcm9uZ3JlZWtfY2FwaXRhbF9sZXR0ZXJfcGlncmVla19jYXBpdGFsX2xldHRlcl9yaG9ncmVla19jYXBpdGFsX2xldHRlcl9zaWdtYWdyZWVrX2NhcGl0YWxfbGV0dGVyX3RhdWdyZWVrX2NhcGl0YWxfbGV0dGVyX3Vwc2lsb25ncmVla19jYXBpdGFsX2xldHRlcl9waGlncmVla19jYXBpdGFsX2xldHRlcl9jaGlncmVla19jYXBpdGFsX2xldHRlcl9wc2lncmVla19jYXBpdGFsX2xldHRlcl9vbWVnYWdyZWVrX3NtYWxsX2xldHRlcl9hbHBoYWdyZWVrX3NtYWxsX2xldHRlcl9iZXRhZ3JlZWtfc21hbGxfbGV0dGVyX2dhbW1hZ3JlZWtfc21hbGxfbGV0dGVyX2RlbHRhZ3JlZWtfc21hbGxfbGV0dGVyX2Vwc2lsb25ncmVla19zbWFsbF9sZXR0ZXJfemV0YWdyZWVrX3NtYWxsX2xldHRlcl9ldGFncmVla19zbWFsbF9sZXR0ZXJfdGhldGFncmVla19zbWFsbF9sZXR0ZXJfaW90YWdyZWVrX3NtYWxsX2xldHRlcl9rYXBwYWdyZWVrX3NtYWxsX2xldHRlcl9sYW1kYWdyZWVrX3NtYWxsX2xldHRlcl9tdWdyZWVrX3NtYWxsX2xldHRlcl9udWdyZWVrX3NtYWxsX2xldHRlcl94aWdyZWVrX3NtYWxsX2xldHRlcl9vbWljcm9uZ3JlZWtfc21hbGxfbGV0dGVyX3BpZ3JlZWtfc21hbGxfbGV0dGVyX3Job2dyZWVrX3NtYWxsX2xldHRlcl9maW5hbF9zaWdtYWdyZWVrX3NtYWxsX2xldHRlcl9zaWdtYWdyZWVrX3NtYWxsX2xldHRlcl90YXVncmVla19zbWFsbF9sZXR0ZXJfdXBzaWxvbmdyZWVrX3NtYWxsX2xldHRlcl9waGlncmVla19zbWFsbF9sZXR0ZXJfY2hpZ3JlZWtfc21hbGxfbGV0dGVyX3BzaWdyZWVrX3NtYWxsX2xldHRlcl9vbWVnYWdyZWVrX3NtYWxsX2xldHRlcl9zdGlnbWFjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9pZV93aXRoX2dyYXZlY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfaW9jeXJpbGxpY19jYXBpdGFsX2xldHRlcl9kamVjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9namVjeXJpbGxpY19jYXBpdGFsX2xldHRlcl91a3JhaW5pYW5faWVjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9kemVjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9ieWVsb3J1c3NpYW5fdWtyYWluaWFuX2ljeXJpbGxpY19jYXBpdGFsX2xldHRlcl95aWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2plY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfbGplY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfbmplY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfdHNoZWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2tqZWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2lfd2l0aF9ncmF2ZWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX3Nob3J0X3VjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9kemhlY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfYWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2JlY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfdmVjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9naGVjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9kZWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2llY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfemhlY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfemVjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9pY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfc2hvcnRfaWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2thY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfZWxjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9lbWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2VuY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfb2N5cmlsbGljX2NhcGl0YWxfbGV0dGVyX3BlY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfZXJjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9lc2N5cmlsbGljX2NhcGl0YWxfbGV0dGVyX3RlY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfdWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2VmY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfaGFjeXJpbGxpY19jYXBpdGFsX2xldHRlcl90c2VjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9jaGVjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9zaGFjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9zaGNoYWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2hhcmRfc2lnbmN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX3llcnVjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9zb2Z0X3NpZ25jeXJpbGxpY19jYXBpdGFsX2xldHRlcl9lY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfeXVjeXJpbGxpY19jYXBpdGFsX2xldHRlcl95YWN5cmlsbGljX3NtYWxsX2xldHRlcl9hY3lyaWxsaWNfc21hbGxfbGV0dGVyX2JlY3lyaWxsaWNfc21hbGxfbGV0dGVyX3ZlY3lyaWxsaWNfc21hbGxfbGV0dGVyX2doZWN5cmlsbGljX3NtYWxsX2xldHRlcl9kZWN5cmlsbGljX3NtYWxsX2xldHRlcl9pZWN5cmlsbGljX3NtYWxsX2xldHRlcl96aGVjeXJpbGxpY19zbWFsbF9sZXR0ZXJfemVjeXJpbGxpY19zbWFsbF9sZXR0ZXJfaWN5cmlsbGljX3NtYWxsX2xldHRlcl9zaG9ydF9pY3lyaWxsaWNfc21hbGxfbGV0dGVyX2thY3lyaWxsaWNfc21hbGxfbGV0dGVyX2VsY3lyaWxsaWNfc21hbGxfbGV0dGVyX2VtY3lyaWxsaWNfc21hbGxfbGV0dGVyX2VuY3lyaWxsaWNfc21hbGxfbGV0dGVyX29jeXJpbGxpY19zbWFsbF9sZXR0ZXJfcGVjeXJpbGxpY19zbWFsbF9sZXR0ZXJfZXJjeXJpbGxpY19zbWFsbF9sZXR0ZXJfZXNjeXJpbGxpY19zbWFsbF9sZXR0ZXJfdGVjeXJpbGxpY19zbWFsbF9sZXR0ZXJfdWN5cmlsbGljX3NtYWxsX2xldHRlcl9lZmN5cmlsbGljX3NtYWxsX2xldHRlcl9oYWN5cmlsbGljX3NtYWxsX2xldHRlcl90c2VjeXJpbGxpY19zbWFsbF9sZXR0ZXJfY2hlY3lyaWxsaWNfc21hbGxfbGV0dGVyX3NoYWN5cmlsbGljX3NtYWxsX2xldHRlcl9zaGNoYWN5cmlsbGljX3NtYWxsX2xldHRlcl9oYXJkX3NpZ25jeXJpbGxpY19zbWFsbF9sZXR0ZXJfeWVydWN5cmlsbGljX3NtYWxsX2xldHRlcl9zb2Z0X3NpZ25jeXJpbGxpY19zbWFsbF9sZXR0ZXJfZWN5cmlsbGljX3NtYWxsX2xldHRlcl95dWN5cmlsbGljX3NtYWxsX2xldHRlcl95YWN5cmlsbGljX3NtYWxsX2xldHRlcl9pZV93aXRoX2dyYXZlY3lyaWxsaWNfc21hbGxfbGV0dGVyX2lvY3lyaWxsaWNfc21hbGxfbGV0dGVyX2RqZWN5cmlsbGljX3NtYWxsX2xldHRlcl9namVjeXJpbGxpY19zbWFsbF9sZXR0ZXJfdWtyYWluaWFuX2llY3lyaWxsaWNfc21hbGxfbGV0dGVyX2R6aGVjeXJpbGxpY19zbWFsbF9sZXR0ZXJfYnllbG9ydXNzaWFuX3VrcmFpbmlhbl9pY3lyaWxsaWNfc21hbGxfbGV0dGVyX3lpY3lyaWxsaWNfc21hbGxfbGV0dGVyX2plY3lyaWxsaWNfc21hbGxfbGV0dGVyX2xqZWN5cmlsbGljX3NtYWxsX2xldHRlcl9uamVjeXJpbGxpY19zbWFsbF9sZXR0ZXJfdHNoZWN5cmlsbGljX3NtYWxsX2xldHRlcl9ramVjeXJpbGxpY19zbWFsbF9sZXR0ZXJfaV93aXRoX2dyYXZlY3lyaWxsaWNfc21hbGxfbGV0dGVyX3Nob3J0X3VjeXJpbGxpY19zbWFsbF9sZXR0ZXJfZHplY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfeWF0Y3lyaWxsaWNfc21hbGxfbGV0dGVyX3lhdGN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2ZpdGFjeXJpbGxpY19zbWFsbF9sZXR0ZXJfZml0YWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2l6aGl0c2FjeXJpbGxpY19zbWFsbF9sZXR0ZXJfaXpoaXRzYWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2doZV93aXRoX3VwdHVybmN5cmlsbGljX3NtYWxsX2xldHRlcl9naGVfd2l0aF91cHR1cm5jeXJpbGxpY19jYXBpdGFsX2xldHRlcl9naGVfd2l0aF9zdHJva2VjeXJpbGxpY19zbWFsbF9sZXR0ZXJfZ2hlX3dpdGhfc3Ryb2tlY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfemhlX3dpdGhfZGVzY2VuZGVyY3lyaWxsaWNfc21hbGxfbGV0dGVyX3poZV93aXRoX2Rlc2NlbmRlcmN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2thX3dpdGhfZGVzY2VuZGVyY3lyaWxsaWNfc21hbGxfbGV0dGVyX2thX3dpdGhfZGVzY2VuZGVyY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfZW5fd2l0aF9kZXNjZW5kZXJjeXJpbGxpY19zbWFsbF9sZXR0ZXJfZW5fd2l0aF9kZXNjZW5kZXJjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9zdHJhaWdodF91Y3lyaWxsaWNfc21hbGxfbGV0dGVyX3N0cmFpZ2h0X3VjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9zdHJhaWdodF91X3dpdGhfc3Ryb2tlY3lyaWxsaWNfc21hbGxfbGV0dGVyX3N0cmFpZ2h0X3Vfd2l0aF9zdHJva2VjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9zaGhhY3lyaWxsaWNfc21hbGxfbGV0dGVyX3NoaGFjeXJpbGxpY19sZXR0ZXJfcGFsb2Noa2FjeXJpbGxpY19jYXBpdGFsX2xldHRlcl96aGVfd2l0aF9icmV2ZWN5cmlsbGljX3NtYWxsX2xldHRlcl96aGVfd2l0aF9icmV2ZWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2Ffd2l0aF9icmV2ZWN5cmlsbGljX3NtYWxsX2xldHRlcl9hX3dpdGhfYnJldmVjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9hX3dpdGhfZGlhZXJlc2lzY3lyaWxsaWNfc21hbGxfbGV0dGVyX2Ffd2l0aF9kaWFlcmVzaXNjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9pZV93aXRoX2JyZXZlY3lyaWxsaWNfc21hbGxfbGV0dGVyX2llX3dpdGhfYnJldmVjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9zY2h3YWN5cmlsbGljX3NtYWxsX2xldHRlcl9zY2h3YWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX3NjaHdhX3dpdGhfZGlhZXJlc2lzY3lyaWxsaWNfc21hbGxfbGV0dGVyX3NjaHdhX3dpdGhfZGlhZXJlc2lzY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfemhlX3dpdGhfZGlhZXJlc2lzY3lyaWxsaWNfc21hbGxfbGV0dGVyX3poZV93aXRoX2RpYWVyZXNpc2N5cmlsbGljX2NhcGl0YWxfbGV0dGVyX3plX3dpdGhfZGlhZXJlc2lzY3lyaWxsaWNfc21hbGxfbGV0dGVyX3plX3dpdGhfZGlhZXJlc2lzY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfaV93aXRoX21hY3JvbmN5cmlsbGljX3NtYWxsX2xldHRlcl9pX3dpdGhfbWFjcm9uY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfaV93aXRoX2RpYWVyZXNpc2N5cmlsbGljX3NtYWxsX2xldHRlcl9pX3dpdGhfZGlhZXJlc2lzY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfb193aXRoX2RpYWVyZXNpc2N5cmlsbGljX3NtYWxsX2xldHRlcl9vX3dpdGhfZGlhZXJlc2lzY3lyaWxsaWNfY2FwaXRhbF9sZXR0ZXJfYmFycmVkX29jeXJpbGxpY19zbWFsbF9sZXR0ZXJfYmFycmVkX29jeXJpbGxpY19jYXBpdGFsX2xldHRlcl9iYXJyZWRfb193aXRoX2RpYWVyZXNpc2N5cmlsbGljX3NtYWxsX2xldHRlcl9iYXJyZWRfb193aXRoX2RpYWVyZXNpc2N5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2Vfd2l0aF9kaWFlcmVzaXNjeXJpbGxpY19zbWFsbF9sZXR0ZXJfZV93aXRoX2RpYWVyZXNpc2N5cmlsbGljX2NhcGl0YWxfbGV0dGVyX3Vfd2l0aF9tYWNyb25jeXJpbGxpY19zbWFsbF9sZXR0ZXJfdV93aXRoX21hY3JvbmN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX3Vfd2l0aF9kaWFlcmVzaXNjeXJpbGxpY19zbWFsbF9sZXR0ZXJfdV93aXRoX2RpYWVyZXNpc2N5cmlsbGljX2NhcGl0YWxfbGV0dGVyX3Vfd2l0aF9kb3VibGVfYWN1dGVjeXJpbGxpY19zbWFsbF9sZXR0ZXJfdV93aXRoX2RvdWJsZV9hY3V0ZWN5cmlsbGljX2NhcGl0YWxfbGV0dGVyX2NoZV93aXRoX2RpYWVyZXNpc2N5cmlsbGljX3NtYWxsX2xldHRlcl9jaGVfd2l0aF9kaWFlcmVzaXNjeXJpbGxpY19jYXBpdGFsX2xldHRlcl95ZXJ1X3dpdGhfZGlhZXJlc2lzY3lyaWxsaWNfc21hbGxfbGV0dGVyX3llcnVfd2l0aF9kaWFlcmVzaXNjeXJpbGxpY19jYXBpdGFsX2xldHRlcl9rb21pX2RlYXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfYXliYXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfYmVuYXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfZ2ltYXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfZGFhcm1lbmlhbl9jYXBpdGFsX2xldHRlcl9lY2hhcm1lbmlhbl9jYXBpdGFsX2xldHRlcl96YWFybWVuaWFuX2NhcGl0YWxfbGV0dGVyX2VoYXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfZXRhcm1lbmlhbl9jYXBpdGFsX2xldHRlcl90b2FybWVuaWFuX2NhcGl0YWxfbGV0dGVyX3poZWFybWVuaWFuX2NhcGl0YWxfbGV0dGVyX2luaWFybWVuaWFuX2NhcGl0YWxfbGV0dGVyX2xpd25hcm1lbmlhbl9jYXBpdGFsX2xldHRlcl94ZWhhcm1lbmlhbl9jYXBpdGFsX2xldHRlcl9jYWFybWVuaWFuX2NhcGl0YWxfbGV0dGVyX2tlbmFybWVuaWFuX2NhcGl0YWxfbGV0dGVyX2hvYXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfamFhcm1lbmlhbl9jYXBpdGFsX2xldHRlcl9naGFkYXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfY2hlaGFybWVuaWFuX2NhcGl0YWxfbGV0dGVyX21lbmFybWVuaWFuX2NhcGl0YWxfbGV0dGVyX3lpYXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfbm93YXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfc2hhYXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfdm9hcm1lbmlhbl9jYXBpdGFsX2xldHRlcl9jaGFhcm1lbmlhbl9jYXBpdGFsX2xldHRlcl9wZWhhcm1lbmlhbl9jYXBpdGFsX2xldHRlcl9qaGVoYXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfcmFhcm1lbmlhbl9jYXBpdGFsX2xldHRlcl9zZWhhcm1lbmlhbl9jYXBpdGFsX2xldHRlcl92ZXdhcm1lbmlhbl9jYXBpdGFsX2xldHRlcl90aXduYXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfcmVoYXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfY29hcm1lbmlhbl9jYXBpdGFsX2xldHRlcl95aXduYXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfcGl3cmFybWVuaWFuX2NhcGl0YWxfbGV0dGVyX2tlaGFybWVuaWFuX2NhcGl0YWxfbGV0dGVyX29oYXJtZW5pYW5fY2FwaXRhbF9sZXR0ZXJfZmVoYXJtZW5pYW5fbW9kaWZpZXJfbGV0dGVyX2xlZnRfaGFsZl9yaW5nYXJtZW5pYW5fYXBvc3Ryb3BoZWFybWVuaWFuX2VtcGhhc2lzX21hcmthcm1lbmlhbl9leGNsYW1hdGlvbl9tYXJrYXJtZW5pYW5fY29tbWFhcm1lbmlhbl9xdWVzdGlvbl9tYXJrYXJtZW5pYW5fYWJicmV2aWF0aW9uX21hcmthcm1lbmlhbl9zbWFsbF9sZXR0ZXJfdHVybmVkX2F5YmFybWVuaWFuX3NtYWxsX2xldHRlcl9heWJhcm1lbmlhbl9zbWFsbF9sZXR0ZXJfYmVuYXJtZW5pYW5fc21hbGxfbGV0dGVyX2dpbWFybWVuaWFuX3NtYWxsX2xldHRlcl9kYWFybWVuaWFuX3NtYWxsX2xldHRlcl9lY2hhcm1lbmlhbl9zbWFsbF9sZXR0ZXJfemFhcm1lbmlhbl9zbWFsbF9sZXR0ZXJfZWhhcm1lbmlhbl9zbWFsbF9sZXR0ZXJfZXRhcm1lbmlhbl9zbWFsbF9sZXR0ZXJfdG9hcm1lbmlhbl9zbWFsbF9sZXR0ZXJfemhlYXJtZW5pYW5fc21hbGxfbGV0dGVyX2luaWFybWVuaWFuX3NtYWxsX2xldHRlcl9saXduYXJtZW5pYW5fc21hbGxfbGV0dGVyX3hlaGFybWVuaWFuX3NtYWxsX2xldHRlcl9jYWFybWVuaWFuX3NtYWxsX2xldHRlcl9rZW5hcm1lbmlhbl9zbWFsbF9sZXR0ZXJfaG9hcm1lbmlhbl9zbWFsbF9sZXR0ZXJfamFhcm1lbmlhbl9zbWFsbF9sZXR0ZXJfZ2hhZGFybWVuaWFuX3NtYWxsX2xldHRlcl9jaGVoYXJtZW5pYW5fc21hbGxfbGV0dGVyX21lbmFybWVuaWFuX3NtYWxsX2xldHRlcl95aWFybWVuaWFuX3NtYWxsX2xldHRlcl9ub3dhcm1lbmlhbl9zbWFsbF9sZXR0ZXJfc2hhYXJtZW5pYW5fc21hbGxfbGV0dGVyX3ZvYXJtZW5pYW5fc21hbGxfbGV0dGVyX2NoYWFybWVuaWFuX3NtYWxsX2xldHRlcl9wZWhhcm1lbmlhbl9zbWFsbF9sZXR0ZXJfamhlaGFybWVuaWFuX3NtYWxsX2xldHRlcl9yYWFybWVuaWFuX3NtYWxsX2xldHRlcl9zZWhhcm1lbmlhbl9zbWFsbF9sZXR0ZXJfdmV3YXJtZW5pYW5fc21hbGxfbGV0dGVyX3Rpd25hcm1lbmlhbl9zbWFsbF9sZXR0ZXJfcmVoYXJtZW5pYW5fc21hbGxfbGV0dGVyX2NvYXJtZW5pYW5fc21hbGxfbGV0dGVyX3lpd25hcm1lbmlhbl9zbWFsbF9sZXR0ZXJfcGl3cmFybWVuaWFuX3NtYWxsX2xldHRlcl9rZWhhcm1lbmlhbl9zbWFsbF9sZXR0ZXJfb2hhcm1lbmlhbl9zbWFsbF9sZXR0ZXJfZmVoYXJtZW5pYW5fc21hbGxfbGlnYXR1cmVfZWNoX3lpd25hcm1lbmlhbl9zbWFsbF9sZXR0ZXJfeWlfd2l0aF9zdHJva2Vhcm1lbmlhbl9oeXBoZW5hcm1lbmlhbl9kcmFtX3NpZ25oZWJyZXdfcHVuY3R1YXRpb25fbWFxYWZoZWJyZXdfcHVuY3R1YXRpb25fc29mX3Bhc3VxaGVicmV3X3B1bmN0dWF0aW9uX251bl9oYWZ1a2hhaGVicmV3X2xldHRlcl9hbGVmaGVicmV3X2xldHRlcl9iZXRoZWJyZXdfbGV0dGVyX2dpbWVsaGVicmV3X2xldHRlcl9kYWxldGhlYnJld19sZXR0ZXJfaGVoZWJyZXdfbGV0dGVyX3ZhdmhlYnJld19sZXR0ZXJfemF5aW5oZWJyZXdfbGV0dGVyX2hldGhlYnJld19sZXR0ZXJfdGV0aGVicmV3X2xldHRlcl95b2RoZWJyZXdfbGV0dGVyX2ZpbmFsX2thZmhlYnJld19sZXR0ZXJfa2FmaGVicmV3X2xldHRlcl9sYW1lZGhlYnJld19sZXR0ZXJfZmluYWxfbWVtaGVicmV3X2xldHRlcl9tZW1oZWJyZXdfbGV0dGVyX2ZpbmFsX251bmhlYnJld19sZXR0ZXJfbnVuaGVicmV3X2xldHRlcl9zYW1la2hoZWJyZXdfbGV0dGVyX2F5aW5oZWJyZXdfbGV0dGVyX2ZpbmFsX3BlaGVicmV3X2xldHRlcl9wZWhlYnJld19sZXR0ZXJfZmluYWxfdHNhZGloZWJyZXdfbGV0dGVyX3RzYWRpaGVicmV3X2xldHRlcl9xb2ZoZWJyZXdfbGV0dGVyX3Jlc2hoZWJyZXdfbGV0dGVyX3NoaW5oZWJyZXdfbGV0dGVyX3RhdmhlYnJld19saWdhdHVyZV95aWRkaXNoX2RvdWJsZV92YXZoZWJyZXdfbGlnYXR1cmVfeWlkZGlzaF92YXZfeW9kaGVicmV3X2xpZ2F0dXJlX3lpZGRpc2hfZG91YmxlX3lvZGhlYnJld19wdW5jdHVhdGlvbl9nZXJlc2hoZWJyZXdfcHVuY3R1YXRpb25fZ2Vyc2hheWltbmtvX2RpZ2l0X2VpZ2h0Z2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfYW5nZW9yZ2lhbl9jYXBpdGFsX2xldHRlcl9iYW5nZW9yZ2lhbl9jYXBpdGFsX2xldHRlcl9nYW5nZW9yZ2lhbl9jYXBpdGFsX2xldHRlcl9kb25nZW9yZ2lhbl9jYXBpdGFsX2xldHRlcl9lbmdlb3JnaWFuX2NhcGl0YWxfbGV0dGVyX3Zpbmdlb3JnaWFuX2NhcGl0YWxfbGV0dGVyX3plbmdlb3JnaWFuX2NhcGl0YWxfbGV0dGVyX3Rhbmdlb3JnaWFuX2NhcGl0YWxfbGV0dGVyX2luZ2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfa2FuZ2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfbGFzZ2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfbWFuZ2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfbmFyZ2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfb25nZW9yZ2lhbl9jYXBpdGFsX2xldHRlcl9wYXJnZW9yZ2lhbl9jYXBpdGFsX2xldHRlcl96aGFyZ2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfcmFlZ2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfc2FuZ2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfdGFyZ2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfdW5nZW9yZ2lhbl9jYXBpdGFsX2xldHRlcl9waGFyZ2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfa2hhcmdlb3JnaWFuX2NhcGl0YWxfbGV0dGVyX2doYW5nZW9yZ2lhbl9jYXBpdGFsX2xldHRlcl9xYXJnZW9yZ2lhbl9jYXBpdGFsX2xldHRlcl9zaGluZ2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfY2hpbmdlb3JnaWFuX2NhcGl0YWxfbGV0dGVyX2Nhbmdlb3JnaWFuX2NhcGl0YWxfbGV0dGVyX2ppbGdlb3JnaWFuX2NhcGl0YWxfbGV0dGVyX2NpbGdlb3JnaWFuX2NhcGl0YWxfbGV0dGVyX2NoYXJnZW9yZ2lhbl9jYXBpdGFsX2xldHRlcl94YW5nZW9yZ2lhbl9jYXBpdGFsX2xldHRlcl9qaGFuZ2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfaGFlZ2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfaGVnZW9yZ2lhbl9jYXBpdGFsX2xldHRlcl9oaWVnZW9yZ2lhbl9jYXBpdGFsX2xldHRlcl93ZWdlb3JnaWFuX2NhcGl0YWxfbGV0dGVyX2hhcmdlb3JnaWFuX2NhcGl0YWxfbGV0dGVyX2hvZWdlb3JnaWFuX2NhcGl0YWxfbGV0dGVyX3luZ2VvcmdpYW5fY2FwaXRhbF9sZXR0ZXJfYWVuZ2VvcmdpYW5fbGV0dGVyX2FuZ2VvcmdpYW5fbGV0dGVyX2Jhbmdlb3JnaWFuX2xldHRlcl9nYW5nZW9yZ2lhbl9sZXR0ZXJfZG9uZ2VvcmdpYW5fbGV0dGVyX2VuZ2VvcmdpYW5fbGV0dGVyX3Zpbmdlb3JnaWFuX2xldHRlcl96ZW5nZW9yZ2lhbl9sZXR0ZXJfdGFuZ2VvcmdpYW5fbGV0dGVyX2luZ2VvcmdpYW5fbGV0dGVyX2thbmdlb3JnaWFuX2xldHRlcl9sYXNnZW9yZ2lhbl9sZXR0ZXJfbWFuZ2VvcmdpYW5fbGV0dGVyX25hcmdlb3JnaWFuX2xldHRlcl9vbmdlb3JnaWFuX2xldHRlcl9wYXJnZW9yZ2lhbl9sZXR0ZXJfemhhcmdlb3JnaWFuX2xldHRlcl9yYWVnZW9yZ2lhbl9sZXR0ZXJfc2FuZ2VvcmdpYW5fbGV0dGVyX3Rhcmdlb3JnaWFuX2xldHRlcl91bmdlb3JnaWFuX2xldHRlcl9waGFyZ2VvcmdpYW5fbGV0dGVyX2toYXJnZW9yZ2lhbl9sZXR0ZXJfZ2hhbmdlb3JnaWFuX2xldHRlcl9xYXJnZW9yZ2lhbl9sZXR0ZXJfc2hpbmdlb3JnaWFuX2xldHRlcl9jaGluZ2VvcmdpYW5fbGV0dGVyX2Nhbmdlb3JnaWFuX2xldHRlcl9qaWxnZW9yZ2lhbl9sZXR0ZXJfY2lsZ2VvcmdpYW5fbGV0dGVyX2NoYXJnZW9yZ2lhbl9sZXR0ZXJfeGFuZ2VvcmdpYW5fbGV0dGVyX2poYW5nZW9yZ2lhbl9sZXR0ZXJfaGFlZ2VvcmdpYW5fbGV0dGVyX2hlZ2VvcmdpYW5fbGV0dGVyX2hpZWdlb3JnaWFuX2xldHRlcl93ZWdlb3JnaWFuX2xldHRlcl9oYXJnZW9yZ2lhbl9sZXR0ZXJfaG9lZ2VvcmdpYW5fbGV0dGVyX2ZpZ2VvcmdpYW5fbGV0dGVyX3luZ2VvcmdpYW5fbGV0dGVyX2VsaWZpZ2VvcmdpYW5fbGV0dGVyX3R1cm5lZF9nYW5nZW9yZ2lhbl9sZXR0ZXJfYWluZ2VvcmdpYW5fcGFyYWdyYXBoX3NlcGFyYXRvcm1vZGlmaWVyX2xldHRlcl9nZW9yZ2lhbl9uYXJnZW9yZ2lhbl9sZXR0ZXJfYWVuZ2VvcmdpYW5fbGV0dGVyX2hhcmRfc2lnbmdlb3JnaWFuX2xldHRlcl9sYWJpYWxfc2lnbmNhbmFkaWFuX3N5bGxhYmljc19jYXJyaWVyX3RoYWNhbmFkaWFuX3N5bGxhYmljc19jYXJyaWVyX2toYWNhbmFkaWFuX3N5bGxhYmljc19jYXJyaWVyX2p1cnVuaWNfbGV0dGVyX2ZlaHVfZmVvaF9mZV9mcnVuaWNfbGV0dGVyX3VydXpfdXJfdXJ1bmljX2xldHRlcl95cnJ1bmljX2xldHRlcl95cnVuaWNfbGV0dGVyX3dydW5pY19sZXR0ZXJfdGh1cmlzYXpfdGh1cnNfdGhvcm5ydW5pY19sZXR0ZXJfZXRocnVuaWNfbGV0dGVyX2Fuc3V6X2FydW5pY19sZXR0ZXJfb3Nfb3J1bmljX2xldHRlcl9hY19hcnVuaWNfbGV0dGVyX2Flc2NydW5pY19sZXR0ZXJfbG9uZ19icmFuY2hfb3NzX29ydW5pY19sZXR0ZXJfc2hvcnRfdHdpZ19vc3Nfb3J1bmljX2xldHRlcl9vcnVuaWNfbGV0dGVyX29lcnVuaWNfbGV0dGVyX29ucnVuaWNfbGV0dGVyX3JhaWRvX3JhZF9yZWlkX3JydW5pY19sZXR0ZXJfa2F1bmFydW5pY19sZXR0ZXJfY2VucnVuaWNfbGV0dGVyX2thdW5fa3J1bmljX2xldHRlcl9lbmdydW5pY19sZXR0ZXJfZ2Vib19neWZ1X2dydW5pY19sZXR0ZXJfZ2FycnVuaWNfbGV0dGVyX3d1bmpvX3d5bm5fd3J1bmljX2xldHRlcl9oYWdsYXpfaHJ1bmljX2xldHRlcl9oYWVnbF9ocnVuaWNfbGV0dGVyX2xvbmdfYnJhbmNoX2hhZ2FsbF9ocnVuaWNfbGV0dGVyX3Nob3J0X3R3aWdfaGFnYWxsX2hydW5pY19sZXR0ZXJfbmF1ZGl6X255ZF9uYXVkX25ydW5pY19sZXR0ZXJfc2hvcnRfdHdpZ19uYXVkX25ydW5pY19sZXR0ZXJfZG90dGVkX25ydW5pY19sZXR0ZXJfaXNhel9pc19pc3NfaXJ1bmljX2xldHRlcl9lcnVuaWNfbGV0dGVyX2plcmFuX2pydW5pY19sZXR0ZXJfZ2VycnVuaWNfbGV0dGVyX2xvbmdfYnJhbmNoX2FyX2FlcnVuaWNfbGV0dGVyX3Nob3J0X3R3aWdfYXJfYXJ1bmljX2xldHRlcl9pd2F6X2VvaHJ1bmljX2xldHRlcl9wZXJ0aG9fcGVvcnRoX3BydW5pY19sZXR0ZXJfYWxnaXpfZW9saHhydW5pY19sZXR0ZXJfc293aWxvX3NydW5pY19sZXR0ZXJfc2lnZWxfbG9uZ19icmFuY2hfc29sX3NydW5pY19sZXR0ZXJfc2hvcnRfdHdpZ19zb2xfc3J1bmljX2xldHRlcl9jcnVuaWNfbGV0dGVyX3pydW5pY19sZXR0ZXJfdGl3YXpfdGlyX3R5cl90cnVuaWNfbGV0dGVyX3Nob3J0X3R3aWdfdHlyX3RydW5pY19sZXR0ZXJfZHJ1bmljX2xldHRlcl9iZXJrYW5hbl9iZW9yY19iamFya2FuX2JydW5pY19sZXR0ZXJfc2hvcnRfdHdpZ19iamFya2FuX2JydW5pY19sZXR0ZXJfZG90dGVkX3BydW5pY19sZXR0ZXJfb3Blbl9wcnVuaWNfbGV0dGVyX2Vod2F6X2VoX2VydW5pY19sZXR0ZXJfbWFubmF6X21hbl9tcnVuaWNfbGV0dGVyX2xvbmdfYnJhbmNoX21hZHJfbXJ1bmljX2xldHRlcl9zaG9ydF90d2lnX21hZHJfbXJ1bmljX2xldHRlcl9sYXVrYXpfbGFndV9sb2dyX2xydW5pY19sZXR0ZXJfZG90dGVkX2xydW5pY19sZXR0ZXJfaW5nd2F6cnVuaWNfbGV0dGVyX2luZ3J1bmljX2xldHRlcl9kYWdhel9kYWVnX2RydW5pY19sZXR0ZXJfb3RoYWxhbl9ldGhlbF9vcnVuaWNfbGV0dGVyX2VhcnJ1bmljX2xldHRlcl9pb3JydW5pY19sZXR0ZXJfY3dlb3J0aHJ1bmljX2xldHRlcl9jYWxjcnVuaWNfbGV0dGVyX2NlYWxjcnVuaWNfbGV0dGVyX3N0YW5ydW5pY19sZXR0ZXJfbG9uZ19icmFuY2hfeXJydW5pY19sZXR0ZXJfc2hvcnRfdHdpZ195cnJ1bmljX2xldHRlcl9pY2VsYW5kaWNfeXJydW5pY19sZXR0ZXJfcXJ1bmljX2xldHRlcl94cnVuaWNfc2luZ2xlX3B1bmN0dWF0aW9ucnVuaWNfbXVsdGlwbGVfcHVuY3R1YXRpb25ydW5pY19jcm9zc19wdW5jdHVhdGlvbnJ1bmljX2FybGF1Z19zeW1ib2xydW5pY190dmltYWR1cl9zeW1ib2xydW5pY19iZWxndGhvcl9zeW1ib2xydW5pY19sZXR0ZXJfa3J1bmljX2xldHRlcl9zaHJ1bmljX2xldHRlcl9vb3J1bmljX2xldHRlcl9mcmFua3NfY2Fza2V0X29zcnVuaWNfbGV0dGVyX2ZyYW5rc19jYXNrZXRfaXNydW5pY19sZXR0ZXJfZnJhbmtzX2Nhc2tldF9laHJ1bmljX2xldHRlcl9mcmFua3NfY2Fza2V0X2FjcnVuaWNfbGV0dGVyX2ZyYW5rc19jYXNrZXRfYWVzY2xhdGluX2xldHRlcl9zbWFsbF9jYXBpdGFsX2FsYXRpbl9sZXR0ZXJfc21hbGxfY2FwaXRhbF9jbGF0aW5fbGV0dGVyX3NtYWxsX2NhcGl0YWxfZGxhdGluX2xldHRlcl9zbWFsbF9jYXBpdGFsX2VsYXRpbl9zbWFsbF9sZXR0ZXJfdHVybmVkX2lsYXRpbl9sZXR0ZXJfc21hbGxfY2FwaXRhbF9qbGF0aW5fbGV0dGVyX3NtYWxsX2NhcGl0YWxfa2xhdGluX2xldHRlcl9zbWFsbF9jYXBpdGFsX21sYXRpbl9sZXR0ZXJfc21hbGxfY2FwaXRhbF9vbGF0aW5fbGV0dGVyX3NtYWxsX2NhcGl0YWxfcGxhdGluX2xldHRlcl9zbWFsbF9jYXBpdGFsX3R1cm5lZF9ybGF0aW5fbGV0dGVyX3NtYWxsX2NhcGl0YWxfdGxhdGluX2xldHRlcl9zbWFsbF9jYXBpdGFsX3VsYXRpbl9sZXR0ZXJfc21hbGxfY2FwaXRhbF92bGF0aW5fbGV0dGVyX3NtYWxsX2NhcGl0YWxfd2xhdGluX2xldHRlcl9zbWFsbF9jYXBpdGFsX3psYXRpbl9zbWFsbF9sZXR0ZXJfdHVybmVkX2dsYXRpbl9zbWFsbF9sZXR0ZXJfZF93aXRoX2hvb2tfYW5kX3RhaWxsYXRpbl9jYXBpdGFsX2xldHRlcl9iX3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX2Jfd2l0aF9kb3RfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl9kX3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX2Rfd2l0aF9kb3RfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl9mX3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX2Zfd2l0aF9kb3RfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl9nX3dpdGhfbWFjcm9ubGF0aW5fc21hbGxfbGV0dGVyX2dfd2l0aF9tYWNyb25sYXRpbl9jYXBpdGFsX2xldHRlcl9oX3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX2hfd2l0aF9kb3RfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl9oX3dpdGhfZGlhZXJlc2lzbGF0aW5fc21hbGxfbGV0dGVyX2hfd2l0aF9kaWFlcmVzaXNsYXRpbl9jYXBpdGFsX2xldHRlcl9rX3dpdGhfYWN1dGVsYXRpbl9zbWFsbF9sZXR0ZXJfa193aXRoX2FjdXRlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfbV93aXRoX2FjdXRlbGF0aW5fc21hbGxfbGV0dGVyX21fd2l0aF9hY3V0ZWxhdGluX2NhcGl0YWxfbGV0dGVyX21fd2l0aF9kb3RfYWJvdmVsYXRpbl9zbWFsbF9sZXR0ZXJfbV93aXRoX2RvdF9hYm92ZWxhdGluX2NhcGl0YWxfbGV0dGVyX25fd2l0aF9kb3RfYWJvdmVsYXRpbl9zbWFsbF9sZXR0ZXJfbl93aXRoX2RvdF9hYm92ZWxhdGluX2NhcGl0YWxfbGV0dGVyX3Bfd2l0aF9hY3V0ZWxhdGluX3NtYWxsX2xldHRlcl9wX3dpdGhfYWN1dGVsYXRpbl9jYXBpdGFsX2xldHRlcl9wX3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX3Bfd2l0aF9kb3RfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl9yX3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX3Jfd2l0aF9kb3RfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl9zX3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX3Nfd2l0aF9kb3RfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl90X3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX3Rfd2l0aF9kb3RfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl92X3dpdGhfdGlsZGVsYXRpbl9zbWFsbF9sZXR0ZXJfdl93aXRoX3RpbGRlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfd193aXRoX2dyYXZlbGF0aW5fc21hbGxfbGV0dGVyX3dfd2l0aF9ncmF2ZWxhdGluX2NhcGl0YWxfbGV0dGVyX3dfd2l0aF9hY3V0ZWxhdGluX3NtYWxsX2xldHRlcl93X3dpdGhfYWN1dGVsYXRpbl9jYXBpdGFsX2xldHRlcl93X3dpdGhfZGlhZXJlc2lzbGF0aW5fc21hbGxfbGV0dGVyX3dfd2l0aF9kaWFlcmVzaXNsYXRpbl9jYXBpdGFsX2xldHRlcl93X3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX3dfd2l0aF9kb3RfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl94X3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX3hfd2l0aF9kb3RfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl94X3dpdGhfZGlhZXJlc2lzbGF0aW5fc21hbGxfbGV0dGVyX3hfd2l0aF9kaWFlcmVzaXNsYXRpbl9jYXBpdGFsX2xldHRlcl95X3dpdGhfZG90X2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX3lfd2l0aF9kb3RfYWJvdmVsYXRpbl9jYXBpdGFsX2xldHRlcl96X3dpdGhfY2lyY3VtZmxleGxhdGluX3NtYWxsX2xldHRlcl96X3dpdGhfY2lyY3VtZmxleGxhdGluX3NtYWxsX2xldHRlcl90X3dpdGhfZGlhZXJlc2lzbGF0aW5fc21hbGxfbGV0dGVyX3dfd2l0aF9yaW5nX2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX3lfd2l0aF9yaW5nX2Fib3ZlbGF0aW5fc21hbGxfbGV0dGVyX2xvbmdfc193aXRoX2RvdF9hYm92ZWxhdGluX3NtYWxsX2xldHRlcl9sb25nX3Nfd2l0aF9kaWFnb25hbF9zdHJva2VsYXRpbl9zbWFsbF9sZXR0ZXJfbG9uZ19zX3dpdGhfaGlnaF9zdHJva2VsYXRpbl9jYXBpdGFsX2xldHRlcl9zaGFycF9zbGF0aW5fc21hbGxfbGV0dGVyX2RlbHRhbGF0aW5fY2FwaXRhbF9sZXR0ZXJfZV93aXRoX3RpbGRlbGF0aW5fc21hbGxfbGV0dGVyX2Vfd2l0aF90aWxkZWxhdGluX2NhcGl0YWxfbGV0dGVyX3lfd2l0aF9ncmF2ZWxhdGluX3NtYWxsX2xldHRlcl95X3dpdGhfZ3JhdmVsYXRpbl9jYXBpdGFsX2xldHRlcl95X3dpdGhfdGlsZGVsYXRpbl9zbWFsbF9sZXR0ZXJfeV93aXRoX3RpbGRlbGF0aW5fY2FwaXRhbF9sZXR0ZXJfbWlkZGxlX3dlbHNoX3ZsYXRpbl9zbWFsbF9sZXR0ZXJfbWlkZGxlX3dlbHNoX3ZsYXRpbl9jYXBpdGFsX2xldHRlcl95X3dpdGhfbG9vcGxhdGluX3NtYWxsX2xldHRlcl95X3dpdGhfbG9vcGdyZWVrX3NtYWxsX2xldHRlcl9hbHBoYV93aXRoX21hY3JvbmdyZWVrX2NhcGl0YWxfbGV0dGVyX2FscGhhX3dpdGhfbWFjcm9uZ3JlZWtfc21hbGxfbGV0dGVyX2lvdGFfd2l0aF9tYWNyb25ncmVla19jYXBpdGFsX2xldHRlcl9pb3RhX3dpdGhfbWFjcm9uZ3JlZWtfc21hbGxfbGV0dGVyX3Vwc2lsb25fd2l0aF9tYWNyb25ncmVla19jYXBpdGFsX2xldHRlcl91cHNpbG9uX3dpdGhfbWFjcm9ubm9uX2JyZWFraW5nX2h5cGhlbmVuX2Rhc2hlbV9kYXNobGVmdF9zaW5nbGVfcXVvdGF0aW9uX21hcmtyaWdodF9zaW5nbGVfcXVvdGF0aW9uX21hcmtzaW5nbGVfbG93XzlfcXVvdGF0aW9uX21hcmtsZWZ0X2RvdWJsZV9xdW90YXRpb25fbWFya3JpZ2h0X2RvdWJsZV9xdW90YXRpb25fbWFya2RvdWJsZV9sb3dfOV9xdW90YXRpb25fbWFya2RvdWJsZV9kYWdnZXJob3Jpem9udGFsX2VsbGlwc2lzcGVyX21pbGxlX3NpZ25wZXJfdGVuX3Rob3VzYW5kX3NpZ25wcmltZWRvdWJsZV9wcmltZXRyaXBsZV9wcmltZXJldmVyc2VkX3ByaW1lcmV2ZXJzZWRfZG91YmxlX3ByaW1lcmV2ZXJzZWRfdHJpcGxlX3ByaW1lc2luZ2xlX2xlZnRfcG9pbnRpbmdfYW5nbGVfcXVvdGF0aW9uX21hcmtzaW5nbGVfcmlnaHRfcG9pbnRpbmdfYW5nbGVfcXVvdGF0aW9uX21hcmtyZWZlcmVuY2VfbWFya2RvdWJsZV9leGNsYW1hdGlvbl9tYXJraW50ZXJyb2Jhbmdhc3RlcmlzbXF1ZXN0aW9uX2V4Y2xhbWF0aW9uX21hcmtleGNsYW1hdGlvbl9xdWVzdGlvbl9tYXJrdGlyb25pYW5fc2lnbl9ldHJldmVyc2VkX3BpbGNyb3dfc2lnbmxvd19hc3Rlcmlza3JldmVyc2VkX3NlbWljb2xvbnR3b19hc3Rlcmlza3NfYWxpZ25lZF92ZXJ0aWNhbGx5Y29tbWVyY2lhbF9taW51c19zaWducXVhZHJ1cGxlX3ByaW1lc3VwZXJzY3JpcHRfemVyb3N1cGVyc2NyaXB0X2xhdGluX3NtYWxsX2xldHRlcl9pc3VwZXJzY3JpcHRfZm91cnN1cGVyc2NyaXB0X2ZpdmVzdXBlcnNjcmlwdF9zaXhzdXBlcnNjcmlwdF9zZXZlbnN1cGVyc2NyaXB0X2VpZ2h0c3VwZXJzY3JpcHRfbmluZXN1cGVyc2NyaXB0X3BsdXNfc2lnbnN1cGVyc2NyaXB0X21pbnVzc3VwZXJzY3JpcHRfZXF1YWxzX3NpZ25zdXBlcnNjcmlwdF9sZWZ0X3BhcmVudGhlc2lzc3VwZXJzY3JpcHRfcmlnaHRfcGFyZW50aGVzaXNzdWJzY3JpcHRfemVyb3N1YnNjcmlwdF9vbmVzdWJzY3JpcHRfdHdvc3Vic2NyaXB0X3RocmVlc3Vic2NyaXB0X2ZvdXJzdWJzY3JpcHRfZml2ZXN1YnNjcmlwdF9zaXhzdWJzY3JpcHRfc2V2ZW5zdWJzY3JpcHRfZWlnaHRzdWJzY3JpcHRfbmluZXN1YnNjcmlwdF9wbHVzX3NpZ25zdWJzY3JpcHRfbWludXNzdWJzY3JpcHRfZXF1YWxzX3NpZ25zdWJzY3JpcHRfbGVmdF9wYXJlbnRoZXNpc3N1YnNjcmlwdF9yaWdodF9wYXJlbnRoZXNpc2V1cm9fY3VycmVuY3lfc2lnbmNvbG9uX3NpZ25jcnV6ZWlyb19zaWduZnJlbmNoX2ZyYW5jX3NpZ25saXJhX3NpZ25taWxsX3NpZ25uYWlyYV9zaWdud29uX3NpZ25uZXdfc2hlcWVsX3NpZ25kb25nX3NpZ25ldXJvX3NpZ25raXBfc2lnbnR1Z3Jpa19zaWduZ2VybWFuX3Blbm55X3NpZ25wZXNvX3NpZ25ndWFyYW5pX3NpZ25hdXN0cmFsX3NpZ25ocnl2bmlhX3NpZ25jZWRpX3NpZ25saXZyZV90b3Vybm9pc19zaWduc3Blc21pbG9fc2lnbnRlbmdlX3NpZ25pbmRpYW5fcnVwZWVfc2lnbnR1cmtpc2hfbGlyYV9zaWdubm9yZGljX21hcmtfc2lnbm1hbmF0X3NpZ25ydWJsZV9zaWdubGFyaV9zaWduYml0Y29pbl9zaWduc291bmRfcmVjb3JkaW5nX2NvcHlyaWdodHRyYWRlX21hcmtfc2lnbnR1cm5lZF9jYXBpdGFsX2Z0dXJuZWRfc2Fuc19zZXJpZl9jYXBpdGFsX2d0dXJuZWRfc2Fuc19zZXJpZl9jYXBpdGFsX3l0dXJuZWRfYW1wZXJzYW5kdnVsZ2FyX2ZyYWN0aW9uX29uZV9zZXZlbnRodnVsZ2FyX2ZyYWN0aW9uX29uZV9uaW50aHZ1bGdhcl9mcmFjdGlvbl9vbmVfdGhpcmR2dWxnYXJfZnJhY3Rpb25fdHdvX3RoaXJkc3Z1bGdhcl9mcmFjdGlvbl9vbmVfZmlmdGh2dWxnYXJfZnJhY3Rpb25fdHdvX2ZpZnRoc3Z1bGdhcl9mcmFjdGlvbl90aHJlZV9maWZ0aHN2dWxnYXJfZnJhY3Rpb25fb25lX3NpeHRodnVsZ2FyX2ZyYWN0aW9uX2ZpdmVfc2l4dGhzdnVsZ2FyX2ZyYWN0aW9uX29uZV9laWdodGh2dWxnYXJfZnJhY3Rpb25fdGhyZWVfZWlnaHRoc3Z1bGdhcl9mcmFjdGlvbl9maXZlX2VpZ2h0aHN2dWxnYXJfZnJhY3Rpb25fc2V2ZW5fZWlnaHRoc2ZyYWN0aW9uX251bWVyYXRvcl9vbmV2dWxnYXJfZnJhY3Rpb25femVyb190aGlyZHNsZWZ0d2FyZHNfYXJyb3d1cHdhcmRzX2Fycm93cmlnaHR3YXJkc19hcnJvd2Rvd253YXJkc19hcnJvd2xlZnRfcmlnaHRfYXJyb3dyaWdodHdhcmRzX2Fycm93X292ZXJfbGVmdHdhcmRzX2Fycm93cmlnaHR3YXJkc19kb3VibGVfYXJyb3dfd2l0aF9zdHJva2VsZWZ0d2FyZHNfZG91YmxlX2Fycm93dXB3YXJkc19kb3VibGVfYXJyb3dyaWdodHdhcmRzX2RvdWJsZV9hcnJvd2Rvd253YXJkc19kb3VibGVfYXJyb3dsZWZ0X3JpZ2h0X2RvdWJsZV9hcnJvd2Rvd253YXJkc19hcnJvd19sZWZ0d2FyZHNfb2ZfdXB3YXJkc19hcnJvd2Zvcl9hbGxjb21wbGVtZW50cGFydGlhbF9kaWZmZXJlbnRpYWx0aGVyZV9leGlzdHN0aGVyZV9kb2VzX25vdF9leGlzdG5vdF9hbl9lbGVtZW50X29mY29udGFpbnNfYXNfbWVtYmVyZG9lc19ub3RfY29udGFpbl9hc19tZW1iZXJuX2FyeV9zdW1tYXRpb25taW51c19zaWdubWludXNfb3JfcGx1c19zaWduY3ViZV9yb290Zm91cnRoX3Jvb3Rwcm9wb3J0aW9uYWxfdG9pbmZpbml0eXBhcmFsbGVsX3RvbG9naWNhbF9hbmRsb2dpY2FsX29yaW50ZXJzZWN0aW9uaW50ZWdyYWxjb250b3VyX2ludGVncmFsdGhlcmVmb3JlYmVjYXVzZXByb3BvcnRpb25jb2xvbl9lcXVhbHNub3RfZXF1YWxfdG9ub3RfaWRlbnRpY2FsX3Rvc3Vic2V0X29mc3VwZXJzZXRfb2Zub3RfYV9zdWJzZXRfb2Zub3RfYV9zdXBlcnNldF9vZnN1YnNldF9vZl9vcl9lcXVhbF90b3N1cGVyc2V0X29mX29yX2VxdWFsX3RvcmlnaHRfdGFja2Rvd25fdGFja3VwX3RhY2t0cnVleG9ybmFuZG5vcm5fYXJ5X3VuaW9uc3Rhcl9vcGVyYXRvcmRpYW1ldGVyX3NpZ25ob3VzZXBsYWNlX29mX2ludGVyZXN0X3NpZ253YXRjaGhvdXJnbGFzc2VqZWN0X3N5bWJvbGJsYWNrX3JpZ2h0X3BvaW50aW5nX2RvdWJsZV90cmlhbmdsZWJsYWNrX2xlZnRfcG9pbnRpbmdfZG91YmxlX3RyaWFuZ2xlYmxhY2tfcmlnaHRfcG9pbnRpbmdfZG91YmxlX3RyaWFuZ2xlX3dpdGhfdmVydGljYWxfYmFyYmxhY2tfbGVmdF9wb2ludGluZ19kb3VibGVfdHJpYW5nbGVfd2l0aF92ZXJ0aWNhbF9iYXJibGFja19yaWdodF9wb2ludGluZ190cmlhbmdsZV93aXRoX2RvdWJsZV92ZXJ0aWNhbF9iYXJob3VyZ2xhc3Nfd2l0aF9mbG93aW5nX3NhbmRibGFja19tZWRpdW1fbGVmdF9wb2ludGluZ190cmlhbmdsZWJsYWNrX21lZGl1bV9yaWdodF9wb2ludGluZ190cmlhbmdsZWJsYWNrX21lZGl1bV91cF9wb2ludGluZ190cmlhbmdsZWJsYWNrX21lZGl1bV9kb3duX3BvaW50aW5nX3RyaWFuZ2xlZG91YmxlX3ZlcnRpY2FsX2JhcmJsYWNrX3NxdWFyZV9mb3Jfc3RvcGJsYWNrX2NpcmNsZV9mb3JfcmVjb3JkcG93ZXJfc3ltYm9scG93ZXJfb25fb2ZmX3N5bWJvbHBvd2VyX29uX3N5bWJvbHdoaXRlX3NxdWFyZWJsYWNrX3VwX3BvaW50aW5nX3RyaWFuZ2xld2hpdGVfdXBfcG9pbnRpbmdfdHJpYW5nbGVibGFja19yaWdodF9wb2ludGluZ190cmlhbmdsZXdoaXRlX3JpZ2h0X3BvaW50aW5nX3RyaWFuZ2xlYmxhY2tfZG93bl9wb2ludGluZ190cmlhbmdsZXdoaXRlX2Rvd25fcG9pbnRpbmdfdHJpYW5nbGVibGFja19sZWZ0X3BvaW50aW5nX3RyaWFuZ2xld2hpdGVfbGVmdF9wb2ludGluZ190cmlhbmdsZWJsYWNrX2RpYW1vbmR3aGl0ZV9kaWFtb25kd2hpdGVfY2lyY2xlYnVsbHNleWVibGFja19jaXJjbGVpbnZlcnNlX2J1bGxldHdoaXRlX2J1bGxldGJsYWNrX3N1bl93aXRoX3JheXNjbG91ZHVtYnJlbGxhc25vd21hbmNvbWV0YmxhY2tfc3RhcndoaXRlX3N0YXJ0aHVuZGVyc3Rvcm11bWJyZWxsYV93aXRoX3JhaW5fZHJvcHNza3VsbF9hbmRfY3Jvc3Nib25lc3RyaWdyYW1fZm9yX2hlYXZlbnRyaWdyYW1fZm9yX2xha2V0cmlncmFtX2Zvcl9maXJldHJpZ3JhbV9mb3JfdGh1bmRlcnRyaWdyYW1fZm9yX3dpbmR0cmlncmFtX2Zvcl93YXRlcnRyaWdyYW1fZm9yX21vdW50YWludHJpZ3JhbV9mb3JfZWFydGh3aGl0ZV9mcm93bmluZ19mYWNld2hpdGVfc21pbGluZ19mYWNlYmxhY2tfc21pbGluZ19mYWNlZmlyc3RfcXVhcnRlcl9tb29uZmVtYWxlX3NpZ25tYWxlX3NpZ25ibGFja19zcGFkZV9zdWl0d2hpdGVfaGVhcnRfc3VpdHdoaXRlX2RpYW1vbmRfc3VpdGJsYWNrX2NsdWJfc3VpdHdoaXRlX3NwYWRlX3N1aXRibGFja19oZWFydF9zdWl0YmxhY2tfZGlhbW9uZF9zdWl0d2hpdGVfY2x1Yl9zdWl0cXVhcnRlcl9ub3RlZWlnaHRoX25vdGViZWFtZWRfZWlnaHRoX25vdGVzYmVhbWVkX3NpeHRlZW50aF9ub3Rlc211c2ljX2ZsYXRfc2lnbm11c2ljX25hdHVyYWxfc2lnbm11c2ljX3NoYXJwX3NpZ25kaWVfZmFjZV8xZGllX2ZhY2VfMmRpZV9mYWNlXzNkaWVfZmFjZV80ZGllX2ZhY2VfNWRpZV9mYWNlXzZ3aGl0ZV9mbGFnYmxhY2tfZmxhZ2FuY2hvcmNyb3NzZWRfc3dvcmRzYWxlbWJpY2hpZ2hfdm9sdGFnZV9zaWdubWFsZV9hbmRfZmVtYWxlX3NpZ25zbm93bWFuX3dpdGhvdXRfc25vd3RodW5kZXJfY2xvdWRfYW5kX3JhaW5waWNrYmxhY2tfY3Jvc3Nfb25fc2hpZWxkYmxhY2tfc2Npc3NvcnNlbnZlbG9wZWxvd2VyX3JpZ2h0X3BlbmNpbGhlYXZ5X2NoZWNrX21hcmtoZWF2eV9iYWxsb3RfeHNub3dmbGFrZWNyb3NzX21hcmtoZWF2eV9oZWFydF9leGNsYW1hdGlvbl9tYXJrX29ybmFtZW50aGVhdnlfYmxhY2tfaGVhcnRsYXJnZV91cF90YWNrZG93bndhcmRzX2hhcnBvb25fd2l0aF9iYXJiX3JpZ2h0X2Zyb21fYmFyc3F1YXJlZF9zcXVhcmVtdWx0aXBsaWNhdGlvbl9zaWduX3dpdGhfZG90X2Fib3ZlbG9naWNhbF9hbmRfd2l0aF9kb3RfYWJvdmVsb2dpY2FsX29yX3dpdGhfZG90X2Fib3Zlc3Vic2V0X29mX29yX2VxdWFsX3RvX3dpdGhfZG90X2Fib3Zlc3VwZXJzZXRfb2Zfb3JfZXF1YWxfdG9fd2l0aF9kb3RfYWJvdmV3aGl0ZV9tZWRpdW1fc3RhcmhlYXZ5X2NpcmNsZXN0YXJfd2l0aF9sZWZ0X2hhbGZfYmxhY2tzdGFyX3dpdGhfcmlnaHRfaGFsZl9ibGFja2xhdGluX3NtYWxsX2xldHRlcl9hX3dpdGhfc3Ryb2tlbGF0aW5fc21hbGxfbGV0dGVyX3Rfd2l0aF9kaWFnb25hbF9zdHJva2VsYXRpbl9jYXBpdGFsX2xldHRlcl9hbHBoYWxhdGluX2NhcGl0YWxfbGV0dGVyX3R1cm5lZF9hbGF0aW5fc21hbGxfbGV0dGVyX3Zfd2l0aF9yaWdodF9ob29rZ2VvcmdpYW5fc21hbGxfbGV0dGVyX2FuZ2VvcmdpYW5fc21hbGxfbGV0dGVyX2Jhbmdlb3JnaWFuX3NtYWxsX2xldHRlcl9nYW5nZW9yZ2lhbl9zbWFsbF9sZXR0ZXJfZG9uZ2VvcmdpYW5fc21hbGxfbGV0dGVyX2VuZ2VvcmdpYW5fc21hbGxfbGV0dGVyX3Zpbmdlb3JnaWFuX3NtYWxsX2xldHRlcl96ZW5nZW9yZ2lhbl9zbWFsbF9sZXR0ZXJfdGFuZ2VvcmdpYW5fc21hbGxfbGV0dGVyX2luZ2VvcmdpYW5fc21hbGxfbGV0dGVyX2thbmdlb3JnaWFuX3NtYWxsX2xldHRlcl9sYXNnZW9yZ2lhbl9zbWFsbF9sZXR0ZXJfbWFuZ2VvcmdpYW5fc21hbGxfbGV0dGVyX25hcmdlb3JnaWFuX3NtYWxsX2xldHRlcl9vbmdlb3JnaWFuX3NtYWxsX2xldHRlcl9wYXJnZW9yZ2lhbl9zbWFsbF9sZXR0ZXJfemhhcmdlb3JnaWFuX3NtYWxsX2xldHRlcl9yYWVnZW9yZ2lhbl9zbWFsbF9sZXR0ZXJfc2FuZ2VvcmdpYW5fc21hbGxfbGV0dGVyX3Rhcmdlb3JnaWFuX3NtYWxsX2xldHRlcl91bmdlb3JnaWFuX3NtYWxsX2xldHRlcl9waGFyZ2VvcmdpYW5fc21hbGxfbGV0dGVyX2toYXJnZW9yZ2lhbl9zbWFsbF9sZXR0ZXJfZ2hhbmdlb3JnaWFuX3NtYWxsX2xldHRlcl9xYXJnZW9yZ2lhbl9zbWFsbF9sZXR0ZXJfc2hpbmdlb3JnaWFuX3NtYWxsX2xldHRlcl9jaGluZ2VvcmdpYW5fc21hbGxfbGV0dGVyX2Nhbmdlb3JnaWFuX3NtYWxsX2xldHRlcl9qaWxnZW9yZ2lhbl9zbWFsbF9sZXR0ZXJfY2lsZ2VvcmdpYW5fc21hbGxfbGV0dGVyX2NoYXJnZW9yZ2lhbl9zbWFsbF9sZXR0ZXJfeGFuZ2VvcmdpYW5fc21hbGxfbGV0dGVyX2poYW5nZW9yZ2lhbl9zbWFsbF9sZXR0ZXJfaGFlZ2VvcmdpYW5fc21hbGxfbGV0dGVyX2hlZ2VvcmdpYW5fc21hbGxfbGV0dGVyX2hpZWdlb3JnaWFuX3NtYWxsX2xldHRlcl93ZWdlb3JnaWFuX3NtYWxsX2xldHRlcl9oYXJnZW9yZ2lhbl9zbWFsbF9sZXR0ZXJfaG9laW52ZXJ0ZWRfaW50ZXJyb2JhbmdoeXBoZW5fd2l0aF9kaWFlcmVzaXNyZXZlcnNlZF9xdWVzdGlvbl9tYXJrdHVybmVkX3NlbWljb2xvbnR1cm5lZF9kYWdnZXJyZXZlcnNlZF9jb21tYXRyaXBsZV9kYWdnZXJwb3N0YWxfbWFya2JvcG9tb2ZvX2xldHRlcl9lbmdsYXRpbl9jYXBpdGFsX2xldHRlcl9oZW5nbGF0aW5fc21hbGxfbGV0dGVyX2hlbmdsYXRpbl9jYXBpdGFsX2xldHRlcl90emxhdGluX3NtYWxsX2xldHRlcl90emxhdGluX2xldHRlcl9zbWFsbF9jYXBpdGFsX2ZsYXRpbl9sZXR0ZXJfc21hbGxfY2FwaXRhbF9zbGF0aW5fc21hbGxfbGV0dGVyX2F2bGF0aW5fc21hbGxfbGV0dGVyX2F2X3dpdGhfaG9yaXpvbnRhbF9iYXJsYXRpbl9jYXBpdGFsX2xldHRlcl9yX3JvdHVuZGFsYXRpbl9zbWFsbF9sZXR0ZXJfcl9yb3R1bmRhbGF0aW5fY2FwaXRhbF9sZXR0ZXJfaW5zdWxhcl9kbGF0aW5fY2FwaXRhbF9sZXR0ZXJfdHVybmVkX2xsYXRpbl9zbWFsbF9sZXR0ZXJfdHVybmVkX2xsYXRpbl9jYXBpdGFsX2xldHRlcl9zX3dpdGhfb2JsaXF1ZV9zdHJva2VsYXRpbl9zbWFsbF9sZXR0ZXJfc193aXRoX29ibGlxdWVfc3Ryb2tlbGF0aW5fbGV0dGVyX3NtYWxsX2NhcGl0YWxfcWxhdGluX2NhcGl0YWxfbGV0dGVyX3R1cm5lZF9rc3RhbmRhcmRfZ2FsYWN0aWNfYWxwaGFiZXRfYXN0YW5kYXJkX2dhbGFjdGljX2FscGhhYmV0X2JzdGFuZGFyZF9nYWxhY3RpY19hbHBoYWJldF9jc3RhbmRhcmRfZ2FsYWN0aWNfYWxwaGFiZXRfZHN0YW5kYXJkX2dhbGFjdGljX2FscGhhYmV0X2VzdGFuZGFyZF9nYWxhY3RpY19hbHBoYWJldF9mc3RhbmRhcmRfZ2FsYWN0aWNfYWxwaGFiZXRfZ3N0YW5kYXJkX2dhbGFjdGljX2FscGhhYmV0X2hzdGFuZGFyZF9nYWxhY3RpY19hbHBoYWJldF9pc3RhbmRhcmRfZ2FsYWN0aWNfYWxwaGFiZXRfanN0YW5kYXJkX2dhbGFjdGljX2FscGhhYmV0X2tzdGFuZGFyZF9nYWxhY3RpY19hbHBoYWJldF9sc3RhbmRhcmRfZ2FsYWN0aWNfYWxwaGFiZXRfbXN0YW5kYXJkX2dhbGFjdGljX2FscGhhYmV0X25zdGFuZGFyZF9nYWxhY3RpY19hbHBoYWJldF9vc3RhbmRhcmRfZ2FsYWN0aWNfYWxwaGFiZXRfcHN0YW5kYXJkX2dhbGFjdGljX2FscGhhYmV0X3FzdGFuZGFyZF9nYWxhY3RpY19hbHBoYWJldF9yc3RhbmRhcmRfZ2FsYWN0aWNfYWxwaGFiZXRfc3N0YW5kYXJkX2dhbGFjdGljX2FscGhhYmV0X3RzdGFuZGFyZF9nYWxhY3RpY19hbHBoYWJldF91c3RhbmRhcmRfZ2FsYWN0aWNfYWxwaGFiZXRfdnN0YW5kYXJkX2dhbGFjdGljX2FscGhhYmV0X3dzdGFuZGFyZF9nYWxhY3RpY19hbHBoYWJldF94c3RhbmRhcmRfZ2FsYWN0aWNfYWxwaGFiZXRfeXN0YW5kYXJkX2dhbGFjdGljX2FscGhhYmV0X3psYXRpbl9zbWFsbF9saWdhdHVyZV9mZmxhdGluX3NtYWxsX2xpZ2F0dXJlX2ZpbGF0aW5fc21hbGxfbGlnYXR1cmVfZmxsYXRpbl9zbWFsbF9saWdhdHVyZV9mZmlsYXRpbl9zbWFsbF9saWdhdHVyZV9sb25nX3NfdGhlYnJld19sZXR0ZXJfeW9kX3dpdGhfaGlyaXFoZWJyZXdfbGlnYXR1cmVfeWlkZGlzaF95b2RfeW9kX3BhdGFoaGVicmV3X2xldHRlcl9zaGluX3dpdGhfc2luX2RvdGhlYnJld19sZXR0ZXJfYmV0X3dpdGhfZGFnZXNoaGVicmV3X2xldHRlcl92YXZfd2l0aF9kYWdlc2hoZWJyZXdfbGV0dGVyX2thZl93aXRoX2RhZ2VzaGhlYnJld19sZXR0ZXJfcGVfd2l0aF9kYWdlc2hoZWJyZXdfbGV0dGVyX3Rhdl93aXRoX2RhZ2VzaGhlYnJld19sZXR0ZXJfdmF2X3dpdGhfaG9sYW1oZWJyZXdfbGV0dGVyX2JldF93aXRoX3JhZmVoZWJyZXdfbGV0dGVyX3BlX3dpdGhfcmFmZWZ1bGx3aWR0aF9wbHVzX3NpZ25yZXBsYWNlbWVudF9jaGFyYWN0ZXJkb3VibGVfZXF1YWxzdHJpcGxlX2VxdWFsc25vdF9kb3VibGVfZXF1YWxzbm90X3RyaXBsZV9lcXVhbHNsZXNzX3RoYW5fb3JfZXF1YWxfdG9ncmVhdGVyX3RoYW5fb3JfZXF1YWxfdG9sZWZ0X2Fycm93cmlnaHRfYXJyb3dyaWdodF90aGlja19hcnJvd3NwYWNlc2hpcGh0bWxfY29tbWVudHJpZ2h0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzFyaWdodF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8ycmlnaHRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fM3JpZ2h0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzRyaWdodF90aGlja19hcnJvd19lcXVhbHNfc2lnbl81cmlnaHRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fNnJpZ2h0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzdyaWdodF90aGlja19hcnJvd19lcXVhbHNfc2lnbl84cmlnaHRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fOXJpZ2h0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzEwcmlnaHRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMTFyaWdodF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8xMnJpZ2h0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzEzcmlnaHRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMTRyaWdodF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8xNXJpZ2h0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzE2cmlnaHRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMTdyaWdodF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8xOHJpZ2h0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzE5cmlnaHRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMjByaWdodF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8yMXJpZ2h0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzIycmlnaHRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMjNyaWdodF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8yNHJpZ2h0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzI1cmlnaHRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMjZyaWdodF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8yN3JpZ2h0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzI4cmlnaHRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMjlyaWdodF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8zMGxlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMWxlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMmxlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fM2xlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fNGxlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fNWxlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fNmxlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fN2xlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fOGxlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fOWxlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMTBsZWZ0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzExbGVmdF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8xMmxlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMTNsZWZ0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzE0bGVmdF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8xNWxlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMTZsZWZ0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzE3bGVmdF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8xOGxlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMTlsZWZ0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzIwbGVmdF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8yMWxlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMjJsZWZ0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzIzbGVmdF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8yNGxlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMjVsZWZ0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzI2bGVmdF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8yN2xlZnRfdGhpY2tfYXJyb3dfZXF1YWxzX3NpZ25fMjhsZWZ0X3RoaWNrX2Fycm93X2VxdWFsc19zaWduXzI5bGVmdF90aGlja19hcnJvd19lcXVhbHNfc2lnbl8zMHJpZ2h0X2Fycm93X21pbnVzXzFyaWdodF9hcnJvd19taW51c18ycmlnaHRfYXJyb3dfbWludXNfM3JpZ2h0X2Fycm93X21pbnVzXzRyaWdodF9hcnJvd19taW51c181cmlnaHRfYXJyb3dfbWludXNfNnJpZ2h0X2Fycm93X21pbnVzXzdyaWdodF9hcnJvd19taW51c184cmlnaHRfYXJyb3dfbWludXNfOXJpZ2h0X2Fycm93X21pbnVzXzEwcmlnaHRfYXJyb3dfbWludXNfMTFyaWdodF9hcnJvd19taW51c18xMnJpZ2h0X2Fycm93X21pbnVzXzEzcmlnaHRfYXJyb3dfbWludXNfMTRyaWdodF9hcnJvd19taW51c18xNXJpZ2h0X2Fycm93X21pbnVzXzE2cmlnaHRfYXJyb3dfbWludXNfMTdyaWdodF9hcnJvd19taW51c18xOHJpZ2h0X2Fycm93X21pbnVzXzE5cmlnaHRfYXJyb3dfbWludXNfMjByaWdodF9hcnJvd19taW51c18yMXJpZ2h0X2Fycm93X21pbnVzXzIycmlnaHRfYXJyb3dfbWludXNfMjNyaWdodF9hcnJvd19taW51c18yNHJpZ2h0X2Fycm93X21pbnVzXzI1cmlnaHRfYXJyb3dfbWludXNfMjZyaWdodF9hcnJvd19taW51c18yN3JpZ2h0X2Fycm93X21pbnVzXzI4cmlnaHRfYXJyb3dfbWludXNfMjlyaWdodF9hcnJvd19taW51c18zMGxlZnRfYXJyb3dfbWludXNfMWxlZnRfYXJyb3dfbWludXNfMmxlZnRfYXJyb3dfbWludXNfM2xlZnRfYXJyb3dfbWludXNfNGxlZnRfYXJyb3dfbWludXNfNWxlZnRfYXJyb3dfbWludXNfNmxlZnRfYXJyb3dfbWludXNfN2xlZnRfYXJyb3dfbWludXNfOGxlZnRfYXJyb3dfbWludXNfOWxlZnRfYXJyb3dfbWludXNfMTBsZWZ0X2Fycm93X21pbnVzXzExbGVmdF9hcnJvd19taW51c18xMmxlZnRfYXJyb3dfbWludXNfMTNsZWZ0X2Fycm93X21pbnVzXzE0bGVmdF9hcnJvd19taW51c18xNWxlZnRfYXJyb3dfbWludXNfMTZsZWZ0X2Fycm93X21pbnVzXzE3bGVmdF9hcnJvd19taW51c18xOGxlZnRfYXJyb3dfbWludXNfMTlsZWZ0X2Fycm93X21pbnVzXzIwbGVmdF9hcnJvd19taW51c18yMWxlZnRfYXJyb3dfbWludXNfMjJsZWZ0X2Fycm93X21pbnVzXzIzbGVmdF9hcnJvd19taW51c18yNGxlZnRfYXJyb3dfbWludXNfMjVsZWZ0X2Fycm93X21pbnVzXzI2bGVmdF9hcnJvd19taW51c18yN2xlZnRfYXJyb3dfbWludXNfMjhsZWZ0X2Fycm93X21pbnVzXzI5bGVmdF9hcnJvd19taW51c18zMG1pbnVzX21pbnVzXzJtaW51c19taW51c18zbWludXNfbWludXNfNG1pbnVzX21pbnVzXzVtaW51c19taW51c182bWludXNfbWludXNfN21pbnVzX21pbnVzXzhtaW51c19taW51c185bWludXNfbWludXNfMTBtaW51c19taW51c18xMW1pbnVzX21pbnVzXzEybWludXNfbWludXNfMTNtaW51c19taW51c18xNG1pbnVzX21pbnVzXzE1bWludXNfbWludXNfMTZtaW51c19taW51c18xN21pbnVzX21pbnVzXzE4bWludXNfbWludXNfMTltaW51c19taW51c18yMG1pbnVzX21pbnVzXzIxbWludXNfbWludXNfMjJtaW51c19taW51c18yM21pbnVzX21pbnVzXzI0bWludXNfbWludXNfMjVtaW51c19taW51c18yNm1pbnVzX21pbnVzXzI3bWludXNfbWludXNfMjhtaW51c19taW51c18yOW1pbnVzX21pbnVzXzMwY2FyZXRfY2FyZXRfMWNhcmV0X2NhcmV0XzJjYXJldF9jYXJldF8zY2FyZXRfY2FyZXRfNGNhcmV0X2NhcmV0XzVjYXJldF9jYXJldF82Y2FyZXRfY2FyZXRfN2NhcmV0X2NhcmV0XzhjYXJldF9jYXJldF85Y2FyZXRfY2FyZXRfMTBjYXJldF9jYXJldF8xMWNhcmV0X2NhcmV0XzEyY2FyZXRfY2FyZXRfMTNjYXJldF9jYXJldF8xNGNhcmV0X2NhcmV0XzE1Y2FyZXRfY2FyZXRfMTZjYXJldF9jYXJldF8xN2NhcmV0X2NhcmV0XzE4Y2FyZXRfY2FyZXRfMTljYXJldF9jYXJldF8yMGNhcmV0X2NhcmV0XzIxY2FyZXRfY2FyZXRfMjJjYXJldF9jYXJldF8yM2NhcmV0X2NhcmV0XzI0Y2FyZXRfY2FyZXRfMjVjYXJldF9jYXJldF8yNmNhcmV0X2NhcmV0XzI3Y2FyZXRfY2FyZXRfMjhjYXJldF9jYXJldF8yOWNhcmV0X2NhcmV0XzMwcGx1c19wbHVzXzFwbHVzX3BsdXNfMnBsdXNfcGx1c18zcGx1c19wbHVzXzRwbHVzX3BsdXNfNXBsdXNfcGx1c182cGx1c19wbHVzXzdwbHVzX3BsdXNfOHBsdXNfcGx1c185cGx1c19wbHVzXzEwcGx1c19wbHVzXzExcGx1c19wbHVzXzEycGx1c19wbHVzXzEzcGx1c19wbHVzXzE0cGx1c19wbHVzXzE1cGx1c19wbHVzXzE2cGx1c19wbHVzXzE3cGx1c19wbHVzXzE4cGx1c19wbHVzXzE5cGx1c19wbHVzXzIwcGx1c19wbHVzXzIxcGx1c19wbHVzXzIycGx1c19wbHVzXzIzcGx1c19wbHVzXzI0cGx1c19wbHVzXzI1cGx1c19wbHVzXzI2cGx1c19wbHVzXzI3cGx1c19wbHVzXzI4cGx1c19wbHVzXzI5cGx1c19wbHVzXzMwNC4xSWRyZWVzIEhhc3NhbiwgaHR0cHM6Ly9naXRodWIuY29tL0lkcmVlc0luYy9Nb25vY3JhZnRNb25vY3JhZnRNb25vY3JhZnQAAAAAAQGHAYgBiQGKAYsABwGMAY0BjgALAY8ADQAOAA8AEAARABIAEwAUABUAFgAXABgAGQAaABsAHAAdAB4AHwAgACEBkAGRAZIBkwGUAZUBlgGXAZgBmQGaAZsBnAGdAZ4BnwGgAaEBogGjAaQBpQGmAacBqAGpAaoAPQGrAawAQAGtAa4BrwGwAbEBsgGzAbQBtQG2AbcBuAG5AboBuwG8Ab0BvgG/AcABwQHCAcMBxAHFAcYBxwHIAckBygHLAcwBzQHOAc8B0AHRAdIB0wHUAdUB1gHXAdgB2QCAAdoB2wHcAd0B3gHfAeAB4QCFAeIB4wHkAeUB5gHnAegB6QHqAesB7AHtAe4B7wHwAfEB8gHzAfQB9QH2AfcB+AH5AfoB+wH8Af0B/gH/AgACAQICAgMCBAIFAgYCBwIIAgkCCgILAgwCDQIOAg8CEAIRAhICEwIUAhUCFgIXAhgCGQIaAhsCHAIdAh4CHwIgAiECIgIjAiQCJQImAicCKAIpAioCKwIsAi0CLgIvAjACMQIyAjMCNAI1AjYCNwI4AjkCOgI7AjwCPQI+Aj8CQAJBAkICQwJEAkUCRgJHAkgCSQJKAksCTAJNAk4CTwJQAlECUgJTAlQCVQJWAlcCWAJZAloCWwJcAl0CXgJfAmACYQJiAmMCZAJlAmYCZwJoAmkCagJrAmwCbQJuAm8CcAJxAnICcwJ0AnUCdgJ3AngCeQJ6AnsCfAJ9An4CfwKAAoECggKDAoQChQKGAocCiAKJAooCiwKMAo0CjgKPApACkQKSApMClAKVApYClwKYApkCmgKbApwCnQKeAp8CoAKhAqICowKkAqUCpgKnAqgCqQKqAqsCrAKtAq4CrwKwArECsgKzArQCtQK2ArcCuAK5AroCuwK8Ar0CvgK/AsACwQLCAsMCxALFAsYCxwLIAskCygLLAswCzQLOAs8C0ALRAtIC0wLUAtUC1gLXAtgC2QLaAtsC3ALdAt4C3wLgAuEC4gLjAuQC5QLmAucC6ALpAuoC6wLsAu0C7gLvAvAC8QLyAvMC9AL1AvYC9wL4AvkC+gL7AvwC/QL+Av8DAAMBAwIDAwMEAwUDBgMHAwgDCQMKAwsDDAMNAw4DDwMQAxEDEgMTAxQDFQMWAxcDGAMZAxoDGwMcAx0DHgMfAyADIQMiAyMDJAMlAyYDJwMoAykDKgMrAywDLQMuAy8DMAMxAzIDMwM0AzUDNgM3AzgDOQM6AzsDPAM9Az4DPwNAA0EDQgNDA0QDRQNGA0cDSANJA0oDSwNMA00DTgNPA1ADUQNSA1MDVANVA1YDVwNYA1kDWgNbA1wDXQNeA18DYANhA2IDYwNkA2UDZgNnA2gDaQNqA2sDbANtA24DbwNwA3EDcgNzA3QDdQN2A3cDeAN5A3oDewN8A30DfgN/A4ADgQOCA4MDhAOFA4YDhwOIA4kDigOLA4wDjQOOA48DkAORA5IDkwOUA5UDlgOXA5gDmQOaA5sDnAOdA54DnwOgA6EDogOjA6QDpQOmA6cDqAOpA6oDqwOsA60DrgOvA7ADsQOyA7MDtAO1A7YDtwO4A7kDugO7A7wDvQO+A78DwAPBA8IDwwPEA8UDxgPHA8gDyQPKA8sDzAPNA84DzwPQA9ED0gPTA9QD1QPWA9cD2APZA9oD2wPcA90D3gPfA+AD4QPiA+MD5APlA+YD5wPoA+kD6gPrA+wD7QPuA+8D8APxA/ID8wP0A/UD9gP3A/gD+QP6A/sD/AP9A/4D/wQABAEEAgQDBAQEBQQGBAcECAQJBAoECwQMBA0EDgQPBBAEEQQSBBMEFAQVBBYEFwQYBBkEGgQbBBwEHQQeBB8EIAQhBCIEIwQkBCUEJgQnBCgEKQQqBCsELAQtBC4ELwQwBDEEMgQzBDQENQQ2BDcEOAQ5BDoEOwQ8BD0EPgQ/BEAEQQRCBEMERARFBEYERwRIBEkESgRLBEwETQROBE8EUARRBFIEUwRUBFUEVgRXBFgEWQRaBFsEXARdBF4EXwRgBGEEYgRjBGQEZQRmBGcEaARpBGoEawRsBG0EbgRvBHAEcQRyBHMEdAR1BHYEdwR4BHkEegR7BHwEfQR+BH8EgASBBIIEgwSEBIUEhgSHBIgEiQSKBIsEjASNBI4EjwSQBJEEkgSTBJQElQSWBJcEmASZBJoEmwScBJ0EngSfBKAEoQSiBKMEpASlBKYEpwSoBKkEqgSrBKwErQSuBK8EsASxBLIEswS0BLUEtgS3BLgEuQS6BLsEvAS9BL4EvwTABMEEwgTDBMQExQTGBMcEyATJBMoEywTMBM0EzgTPBNAE0QTSBNME1ATVBNYE1wTYBNkE2gTbBNwE3QTeBN8E4AThBOIE4wTkBOUE5gTnBOgE6QTqBOsE7ATtBO4E7wTwBPEE8gTzBPQE9QT2BPcE+AT5BPoE+wT8BP0E/gT/BQAFAQUCBQMFBAUFBQYFBwUIBQkFCgULBQwFDQUOBQ8FEAURBRIFEwUUBRUFFgUXBRgFGQUaBRsFHAUdBR4FHwUgBSEFIgUjBSQFJQUmBScFKAUpBSoFKwUsBS0FLgUvBTAFMQUyBTMFNAU1BTYFNwU4BTkFOgU7BTwFPQU+BT8FQAVBBUIFQwVEBUUFRgVHBUgFSQVKBUsFTAVNBU4FTwVQBVEFUgVTBVQFVQVWBVcFWAVZBVoFWwVcBV0FXgVfBWAFYQViBWMFZAVlBWYFZwVoBWkFagVrBWwFbQVuBW8FcAVxBXIFcwV0BXUFdgV3BXgFeQV6BXsFfAV9BX4FfwWABYEFggWDBYQFhQWGBYcFiAWJBYoFiwWMBY0FjgWPBZAFkQWSBZMFlAWVBZYFlwWYBZkFmgWbBZwFnQWeBZ8FoAWhBaIFowWkBaUFpgWnBagFqQBwBaoAdAWrBawFrQWuBa8FsAWxBbIFswW0BbUFtgW3BbgFuQW6BbsFvAW9Bb4FvwXABcEFwgXDBcQFxQXGBccFyAXJBcoFywXMBc0FzgXPBdAF0QXSBdMF1AXVBdYF1wXYBdkF2gXbBdwF3QXeBd8F4AXhBeIF4wXkBeUF5gXnBegF6QXqBesF7AXtBe4F7wXwBfEF8gXzBfQF9QX2BfcF+AX5BfoF+wX8Bf0F/gX/BgAGAQYCBgMGBAYFBgYGBwYIBgkGCgYLBgwGDQYOBg8GEAYRBhIGEwYUBhUGFgYXBhgGGQYaBhsGHAYdBh4GHwYgBiEGIgYjBiQGJQYmBicGKAYpBioGKwYsBi0GLgYvBjAGMQYyBjMGNAY1BjYGNwY4BjkGOgY7BjwGPQY+Bj8GQAZBBkIGQwZEBkUGRgZHBkgGSQZKBksGTAZNBk4GTwZQBlEGUgZTBlQGVQZWBlcGWAZZBloGWwZcBl0GXgZfBmAGYQZiBmMGZAZlBmYGZwZoBmkGagZrBmwGbQZuBm8GcAZxBnIGcwZ0BnUGdgZ3BngGeQZ6BnsGfAZ9Bn4GfwaABoEGggaDBoQGhQaGBocGiAaJBooGiwaMBo0GjgaPBpAGkQaSBpMGlAaVBpYGlwaYBpkGmgabBpwGnQaeBp8GoAahBqIGowakBqUGpganBqgGqQaqBqsGrAatBq4GrwawBrEGsgazBrQGtQa2BrcGuAa5BroGuwa8Br0Gvga/BsAGwQbCBsMGxAbFBsYGxwbIBskGygbLBswGzQbOBs8G0AbRBtIG0wbUBtUG1gbXBtgG2QbaBtsG3AbdBt4G3wbgBuEG4gbjBuQG5QbmBucG6AbpBuoG6wbsBu0G7gbvBvAG8QbyBvMG9Ab1BvYG9wb4BvkG+gb7BvwG/Qb+Bv8HAAcBBwIHAwcEBwUHBgcHBwgHCQcKBwsHDAcNBw4HDwcQBxEHEgcTBxQHFQcWBxcHGAcZBxoHGwccBx0HHgcfByAHIQciByMHJAclByYHJwcoBykHKgcrBywHLQcuBy8HMAcxBzIHMwc0BzUHNgc3BzgHOQc6BzsHPAc9Bz4HPwdAB0EHQgdDB0QHRQdGB0cHSAdJB0oHSwdMB00HTgdPB1AHUQdSB1MHVAdVB1YHVwdYB1kHWgdbB1wHXQdeB18HYAdhB2IHYwdkB2UHZgdnB2gHaQdqB2sHbAdtB24Hbwdw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9wz3DPf89wz3DPsM9wz7DPsM+wz7DPcM+/z7/Ab3hPsM+4T3DAcO+wz3DIv3DIv3DPh09wwSi/cM9/z3DIv3DBNc9wz3DBX47Pf8BxM8YQoTXEUKEzz3DAYTXPsMBxO89wwGE7opChO8+wwGEzr53Px0+wz7DPzsBw77DPcM9wz3DPcM9wyL9wwSi/cM9/z3DIv3DBPc9wz3hBX3hAcT7PeE+wz3DPsM+/z7DPf8+wz3DAYT2ikKE9z7DPjs+wwGE+wmChPcjgoOoHb4dPcMi/cMi/cMEvcM9wz3/PcME9z3hPjsFfcMBxOs9/wGE8z7DAcTrCEKE9z3DPx0+4T7DPsM9wz8dPcM+HT3/Px09wz4dPsM9wwHDqB29wz3DPcM9wyL9wwS9wz3DPf89wwT7PcMFvcM9wz3DPcM+wz3DPcM9wz3hPsM9wz3DPsMBhPckAoT7CYKE9z3DPsM+/z7DPsM9wwHDqB2+HT3hPsM94T7hPcMEvcM9wz3DPcMi/cMi/cME8z3/Ph0FROc9wwHE5r3DAYTzPsM+wz8dPcM+HQHE8r3DAYTqvcMBxOd94T3DPsMBhOtKgoTzTkKE6wqChOceAoTrPeEBhPM+wwHDvsM9wz3DPcM9wz3DPcMdwH3DPcM9/z3DAP3hPeEFfcM9/z7DPv8+wz3/PsM/HT7DPh09wz3DPf89wz3DAf7DPcM+wz7DPv89wz7DPsM+wz7DPcM+wwGDov3DPeE9wyL9wwSi/cM9/z3DBPY9wz3/BUTuPcMBxPYXwoTuPcM/HT8dPcM+wz3/PcM+/z3DPf8BxPY9wwHDov3DPeE9wyL9wwSi/cM9/z3DBO49wz3DBX3/AcT2PeE+wz3DPuE+/z7DPh0BhO4+Oz7DAcT2CYKE7h+Cg6L9wyL9wz3hPcMEov3DPf89wwTuPeE9wwVE3j3DPsM94T3/AcTuPv8+4T7DPeE9wwHE3j3DPf8+wz3DPx0BhO4/Oz3DAcTePcMBw6L9wz3hPcMi/cM9wz3DBKL9wz3/PcME9z3DPcMFfeE9wz3DPsM94T3/PcM+/z7DPsM/WT4dPcM9wwHE7x6ChPc+wwHE7z3hPv8Bg6L9wyL9wz3DPcMi/cMEov3DIv3/Iv3DBOE9wwWOwoTUi8KExQ4ChMoKwoTlEoKE4j7/AYTSDEKE4j3DAYOKHb3DPcMi/cMi/cM9wz3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E59cCg6L9wyL9/yL9wwSi/cMi/f8i/cME5T3DPcMFfcZChOI+wwHE5D7/AYTiDYKE0QvChNI+wwGEyhEChNQ+wwHE0j3/AYTVPcaCg6L9wyL9/yL9wwSi/cM94T3DPeE9wwUHBOc9wz3DBUTXPf8+OwHE5z7/PuE94T7DPuE+4T7DPeE9wz3DPsM94T3DAcTXJQKEzz3DPzsBxNcfAoOKHb3DPcMi/f8i/cMEov3DIv3/PuE9wz3DPcME8r3DPcMFROq9/wHE9r3GwoT1PsMBxPSWgoT1CQKE9ItChOk9wwGE8T7/AcToS8KE6T7DAYTlPcMBxOSnQoTlPsMBhOqfAoOi/cMi/cM9/x3Eov3DPf89wwTuPcMFqIKE3j3DAYTuPsM9wz47PsMBxN4lQoTuKsKE3gxChO49wwGDov3DIv3DPjsdxKL9wz3/PcME7j3DBaiChN49wwGE7j7DPcM+dz7DAcTePzs+wwHE7irChN4MQoTuPcMBg77DPcMi/cMi/cM9/x3Eov3DPf89wyL9wwTuvjs+wwVJAoTvPsM+Oz7DPv8+wwGE1yrChM8MQoTXPcTChM89wwGE1z7DAcTvPcMBg4odvh09wyL9wwSi/cM9/z3DBPY+wwE9wz4dPcM9wz3hPsM9wz3DPsMBhO4kAoT2CYKE7gqCg6gdvf89wyL9wwSi/cM9/z3DBO4iwTRChPYXwoTuMUKDih2+HT3DIv3DBKL9wz3/PcME7j4dPsMFfccChPYKwoTuPf8Bg6gdveE9wyL9wyL9wwSi/cM9/z3DBPc9wz3/BX3DAcTrPf8BhPM+wwHE6whChPc9wz8dPzs9wz3hPf8+4T3DPeE+wz3DAcOi/cMi/cM9/x3Eov3DPf89wwTuPcM9wwVE3j3GQoTuPsMBxN49wz3DPsM9wz3DPeE+wz7hPv894T7DAYTuPzs+HT3DAcO+wz3DPcM9wz4dPcMEov3DPf89wyL9wwT+PcM+wwV9/z3DPcM9wwGE/QkChP4+wz4dAYT9CEKE/j7DPsM/HT7DPsM9wz7DPv894T7DPuE9wwHDvsM9wz4dPcMAfeE9wwD9/z7DBX3hPcM+4T4dPsM9wz7hPsM94T8dPcMBg77DPcMi/cMi/cM+HT3DBKL9wz3hPcME5z3DBYTXPcMBxO89x0KE1z3DAYTPPcM9wz3DPsM+HT3hPcM+4T7DPsM/HT7hAcTXHgKDih294T3DPf89wwS9wz3DIv3DBPo94T7DBX3DPeE9wz3DPsM9/wGE/B1ChPo+/wHE/DmChPo9wwGDvsM9wz4dPcM94R3EveE9wyL9wwT6Pf8+wwVJAoT8PsM+HQGE+gkChPw+wz3hPsM+4T7DPsM9wz8dPcMBg6L9wz3DPcM94R3AfcM9wz3/PcMA/eE9wwV9wz3/PsM+/z7DPh094T3DPcM+wz3hPsM+4T7/PeEB/sM+4T7DPsM9wz7DAYOi/cMi/eEi/eE+wz3DBKL9wyL9wz3DPcMi/cME4X3DBY7ChNRJQoTUjAKExEkChMi+4T7hAYTQvcMBhOJ0woTSPeEBxMkJQoTWM4KE1T3DAYTSCwKE4j3DAYOi/cM9/z3DBKL9wz3hPcMi/cME+j3DBb3HgoT8HUKE+j3HwoOi/f8i/cMi/cMEov3DIv3DPcM9wyL9wwTkIsELwoTTG0KE4T3DAYTglUKE4z7DAYTTCoKEywqChNIJgoTkCYKDqB2+HT3DAGL9wz3DPcM9wz3DAMUOIsE9wz4dPcM+4T3DPeE9wz8dPcM+HT7DPcM/HQGDqB29/z3DPcM9wwBi/cM9/z3DAOLBPcM9/z3/Pv89wz3/PsM9wz7/PcM+HT3DPx0+wz7DAYOoHb3/PcMi/cMEov3DIv3DPcM9wyL9wwTzPeEFoIKE6IhChPMbwoT0PsMBhOwMQoT0PcMBhPMcQoOKHb3DPcMi/cMi/cM9wz3DBKL9wyL9wyL9wyL9wyL9wwT3UD3DPcMFfcM+wz7hPeE+wz3DPcM9wz3DAcTqEAkChOogPsMBhOYgPcMBxOdQPsM9wz3DPcM/HT7DPeEBhOaAPsMBxOZACgKE6iA9wwGE9lAywoT2gCkChPcAPsMBxPaAPcMBhPdQPsMBw77DPcMi/cM9wz3DPcM9wwSi/cM9/z3DBO89wz7DBU7ChN89wMKE7zTChN8MQoTvPcMBg77DPcMi/cMi/cM94T3DBKL9wyL9wyL9wz3DPcME5n3DBYTWfcMBxO19wwGE5smChOVNgoTW/cMBhO794T7DPcM9wz3hPzs+wz4dPsM+4QHE7X7DPeE+4QHE7MwChM1pAoTWXgKDqB294T3DPeE9wyL9wwSi/cM9wz3DPcM9wwUDhPe94QW9wgKE+4rChPe9/z7/PuEBg6gdveE9wz3hPcMi/cMEov3DPcM9wz3DPcMFA4T3veEFvcM9/z7hPf8BhPuXwoT3vcM+/z7DPsM+/z3DPsM9wwHDov3DIv3DPeE9wz3hHcSi/cM9wz3DPcM9wwUDhO+9wwWOwoTfvcM9/z7DPcM+wz3hPsM+/z3hAYTvj8KE34xChO+9wwGDvsM9wyL9wz3hPcMi/cMEov3DIv3/Iv3DBOE9wz7DBU7ChNCIQoTlPsMBxOY+/z4dAYTJPf8BhMiKQoTJPsMBhNURAoTWEMKE4j3DAYOi/cM94T3DPeE9wwSi/cMi/f8+4T3DPcM9wwU4BPk94T3/BUhChPw+wz7/BX47AcT6F4KE/D7/AYT6DYKE+I3ChPoOAoT8EwKDov3DIv3DIv3DIv3DIv3DBKL+HT8dPcM9/z3DBOi9wz3DBX3DAcTRPf8BhOE+wwHE0EkChNE+wwGEyz3DAcTKkEKExT3/AYTJPsMBxMRJAoTFPsMBhOs9yAKDov3DIv3DPcM9wyL9wwSi/cMi/f8i/cME4j3DPcMFRNo9wkKE5RKChOI+/wGE4Q2ChNSLwoTFDgKE2j7DPsM+wz3DPsM+wz7DAcOi/cM9wz3DPcM9wz3DPcMEov3DPf89wyL9wwT/PcMFvf89wz3DAYT+vchChP89wz7DPv89/wGE/r4dAYT/PeEBxP6IQoT/PsM+wz7DPv8+wz7DPv89wwHDqB294T3DPeEdwGL9wz3/PcMA4sE9yIKDvsM9wyL9wyL9wz3/Hf3IPcMEov3DPeE9wwTHvf8+WQVIQoTnvuE/dwVE173DAcTvvcdChNe9wwGEz73DPcM9wz7DPf8+wz7/PuEBxNeeAoOKHb3hPcMi/cM9wz3DIv3DBKL9wyL9wz3DPcME4v3/PsMFZwKE5P7hPsM9wwHE5X7DAYTjTEKE7X3DAYTs0cKE8UrChOrwQoOi/cM+HR3AYv3DAOLBPjs9wz8dPh0+wwGDih294T3DPcM9wyL9wz3DPcMEov3DPf89wyL9wwT3vcM94QV94QHE+73hPsM9wz7DPv8+wz3/PuE9wz53AYT7SEKE+73DAoT3o4KDqB29wz3DPcM9wz3DPcMi/cMEov3DPcM9wz3DPcMFAcT7/eEFvcM9wz3hPcM+4T3DPcM9wz3DPeE+wz3DPv8BhP3KwoT7/f8+4T7hPuE+4T7DPeEBg6gdvcM9wz3DPcM9wz3DIv3DBKL9wz3DPcM9wz3DBQHE+/3hBb3DPcM94T3DPuE94T7hPeEBhP3XwoT7/cM+/z7DPsM+4T3DPsM9wz7DPuE+wz3hAcOi/cM9/z3DPeEdwGL9wz3DPcM9wz3DAMUHPh0BPcjCv3cBPcjCg747PeEAfeE9wwD94T47BUiCg77DPeEAfeE9wwD94T7DBUiCg747PcMAfeE9wwD94T47BUhCg4odvh09wwB94T3DAP3hPf8FSEK/OwEIgoO+HT3DAH3hPcMA/eE+HQVIQoOoHb4dPcM9wz3DAGL9wz3/PcMA/cM+OwVSQoOi/cM9/z3DIv3DIv3DBKL+HT8dPcM9/z3DBPU9wz3DBX3/AcT2EoKE9IvChPYMAoT1EEKE6j3/AYTyPsMBxOiJAoTqPsMBhPYSwoOoHb5ZPcMAYv3DAOLBPckCg6L94T7hPcM9wz3/PeEdxKL9wyL9wz3DPcMi/cME1n3DPcMFROZ9yUKE5b7DAYTNvcmChOY+/wHEzb3DPf89wz7/AYTkvcMBhNZ+wwHDov3DPf89wz3DPcMAYv3DAOLBE4KDov3DPcM9wyL9wyL9wz3DPcMEov3DIv3DIv3DIv3DIv3DBPMQIsEcgoTygAkChOpACQKE5iAJAoTnEBzChOYgCYKE6kAJgoTygAmChPMQCYKDqB2+HT3DPeEdwGL9wz3/PcMA4sEUQoOi/cM94T3DPeE9wwSi/cMi/f8+4T3DPcM9wwU4BPk94T3/BUhChPw+wz7/BX47AcT6F4KE/D7/AYT6DYKE+I3ChPoOAoT8EwKDov3DPjs9wwB9wz3/AP3DBZSCg6gdvf89wz3DPcMi/cMEov3DPeE9wyL9wwT7IsEVAoT6lUKE+xWChPaIQoT7FcKE9xYCg6L94SL9/z3hHcSi/cMi/cM9wz3DIv3DBOwiwQlChNs9wz3/PcM+/wGE6T3DAYTou8KE6z7DAYTbPcmChOwlQoOoHb4dPcMi/cM9wx3Eov3DPcM9wz3DPcMFA4TvosENwoT3loKE75bChPeJgoTvlwKDqB29/z3DIv3DIv3DPcMdxKL9wz3DPcM9wz3DBQHE5+LBDcKE68oChPPXQoTryoKE59cCg6L9wz3hPcM94T3DAEU4PlkBDQK9wz8dBXZCvsM/HQVNAoOi/cM+Oz3DBKL9wyL9/yL9wwT4PcM9wwV+OwHE9BeChPg+/wGE9A2ChPINwoT0DgKE+BMCg6gdvlk9wwBi/cM9/z3DAOLBPcnCg6gdvjs9wyL9wwSi/cM9/z3DBPY9wz47BUTuPcMBxPYXwoTuGAKE9j3DAcOi/cM9wz3DPcM9wz3DPcMEov3DIv3DIv3DBP4iwRyChP0JAoT8iQKE/QwChP48woT9EcKE/gmCg6gdvlk9wwB94T3DAP3hBZnCg6gdvjs9wyL9wwSi/cMi/cM9wz3DIv3DBPM94QWcAoToiEKE8xvChPQ+wwGE7AxChPQ9wwGE8xxCg6gdvcM9wyL9/yL9wz3DHcSi/cMi/f8+4T3DPcM9wwTzQD3DPeEFROtAPf8BxPdAPcbChPaAPsMBxPZAFoKE9oAJAoT2QAtChOqAPcMBhPKAPv8BxOogC8KE6oA+wwGE5oA9wwHE5kAnQoTmgD7DAYTrQB8Cg6L9/yL9wz3DPcMi/cMEov3DIv3DPcM9wyL9wwTiIsELwoTRm0KE4L3DAYTgVUKE4L7DAYTYm4KExEhChMmbwoTKPsMBhMYMQoTaPcMBhNkRwoTiCYKDqB2+HT3DIv3hBKL9wz3DPcM9wz3DBQcE9z3hBb3KAoTvCIKE9wnChO8WAoT3CcKE7z3KQoT3OcKDov3hPuE9wz47PcMEov3DIv3DPcM9wyL9wwTcIsEE6j3hPeEBhOy+wz4dPf8BhOk/HT7DPuEBxNiogoTZPsMBhOk9wwHE6r3KgoTsPcrChNo+wwHE3D7DAYOi/cMi/f8i/cMEov3DIv3hPcM9wwTlPcM9wwVE1T3/AcTTPeEBhOM+/wHE5T7hAYTjJ8KE0z3/AcTLCEKE0wmChMskAoTVHwKDih29wz3DPeE9wz3DPcMi/cMEov3DPcM9wyL9wyL9wwT7ID3DPcMFfjs+wz93PcM9wz3/PcM9wz3hAcT9QAwChP2ADAKE/UAIQoT7QD3LAoT9QD3hAYT9gBGChPtAHEKE+yA+4QHDvsM9wyL94T3DPcMi/cMEov3DIv3DIv3DIv3DIv3DBOEAPeEFhNEAPeEBxNCAPcMBhOCAPuEBxOEAPsMBhOCACkKE2EAJQoTYgAwChMhACQKExCAIQoTIQAmChMiAPsMBxMkADAKEygA+wwGExgAMQoTaAD3DAYTZAD7DPcM+wz7DPuEBw6L9wyL94SL9wyL9wz3DPcMEov3DIv3DIv3DIv3DIv3DBOMAPcM9wwVE0wA94QHEyoAJAoTKQD3DAYTKID7DAcTSID3DAYTjEDTChOKQDYKE0hAJQoTSID7DAYTKID3DAcTKQD7DAYTGQD3DAcTGkD3EQoTGQD7hAYTGgBGChMqACYKE0wALAoOi/cM9wz3DPcM9wwBi/cMAxTg9wwW9w4KDvsM9wz3DPcM9wz3DIv3DPcM9wwS9wz3DIv3DIv3DIv3DBPpAPf8+wwVJAoT7ID3DPcM+wz3DPuE9wwGE+oAJAoT2QAkChPYgPIKE9kAJgoT6gAmChPsAEYKE+qAwAoT6QAmCg4odvchdvh09wwBi/cM9/z3DAP4dPsMFfAKDov3DPeE9wz3hPcMEov3DIv3/Iv3DBTgE/T3DPcMFe0KE+j7hAcT8Pv8BhPoNgoT5DcKE+g4ChPw+wwHE+j3/AYT9PEKDov3DPh0dxL3DPcMi/cME9D3hBYkChPgagoOi/cMi/cM9wz3DIv3DBKL9wz3DPcMi/cME4yLBPcMBhNMhwoTjPcMBhOKKQoTjPsMBhNsbgoTGiEKEyybChOcWAoOi/eEi/eE94T3DBKL9wyL9wyL9wyL9wyL9wwTsIsEJQoTaCUKE2T3DAYTYvuEBxOi9wwGE6HvChOi+wwGE2L3hAcTdPctChNoJwoTsCcKDih29wz3DPh0dwGL9wz3/PcMA/sMBKkKDov3DIv3hIv3hBKL9wyL9wz3DPcMi/cME4z3hBYkChNEJQoTIiIKE0wnChOMJwoTSPeEBxNQ+wwGEzD3KQoTUPcMBhNM+4QHE4z3DAYO+wz3DPcM9wz3DPcM94T3DBKL9wyL9/z7DPcMi/cME/L3/PsMFSQKE/EkChP0MAoT+EEKE/Q7ChP4QQoT9DsKE/j7/PcM+wz7DPcM+wz7DPsM9wz7DPsM+wz3DAYT9KEKE/ImCg6L9wyL9/yL9wwSi/cMi/f8i/cME5D3DPcMFRNQ9/wHE0j3/AYTiPv8BxOQ+/wGE4g2ChNELwoTSPsMBhMoRAoTUHwKDqB2+HT3DAH3DPcM9wz3DAP3DBb3DPh09wz8dPcM+HT3DPcM/Oz7DPcMBg4odveE9wz3hPcMAYv3DPf89wwD9wz3hBX3hPsM/Oz3DPeE9/z3DPcM94T7DPcM+/z7DPf8+4QHDvsM9wz3DPcM9wz3DIv3DBKL9wyL9/z7DPcMi/cME9L3/PsMFSQKE9EkChPUMAoT2PcuChPk9/wGE+EpChPk+wwGE9REChPY9y8KE9ShChPSJgoOi/cM9/z3DAGL9wz3/PcMA/cM9wwV9/z3/Pv8+/z7DPf89wz3DPf89wz3DPzs+wz7DPv8Bw6L9wz3/PcMEveE9wyL9wwT0Pf8FiQKE+D7DPf894T3DPzs+wz3hPv89wwGDov3DPf89wwSi/cM94T3DIv3DBPo9wwW9x4KE/B1ChPo9x8KDih29wz3DIv3/Iv3DBKL9wz3DPcMi/cMi/cME933/PcMFff8+wz7/PsMBxOtlgoTzfcM+wz3DPsM9wz3DPcM9wwGE6kvChOq+wwGE5oqChOc+wwHE6r3DAYT3fv8Bw77DPeEi/cM9wz3DIv3DBKL9wyL9wz3DPcMi/cME4j7DAQlChNGbQoTgvcMBhOB7woTgvsMBhNibgoTESEKEyZvChMo+wwGExgxChNo9wwGE2RHChOIJgoOKHb3hPcMi/f8Eov3DPcM9wz3DPcMFBwT3PeE+wwV9zAKE7yUChPclQoTvPf8+wwHE9yVChO8lgoT3OcKDov3DIv3/Iv3DBKL9wyL9wz3DPcM9wz3DIv3DBON9wwW94T3DPcM+wz3hPcMBhNFLwoTRvsMBhMmMQoTRvcMBhOV+/z7hPeE+wz7hPuEBxNU9/wHEywhChNUfAoTlPcMBg6L9wz3DPcM94T3DIv3DBKL9wz3/PcME9yLBPjs9/z8dPf8BhPsXwoT3PcM+/z7DPsM+/z3DPsM9/z7DPx0Bw6L9wz3/PcM9wz3DPcM9wyL9wwSi/cMi/cMi/cME/H3hPpUFSQKE/L7DAYT6jEKE/L3DAYT5fuE/swVTgoOi/cM9/z3DPcM9wz3DPcMEov3DIv3DPcM9wwT8vf8+lQVIQoT9vuE+wwVIQoT+vsM/swVTgoOi/cM94T3DPeE9wwS9wz3DPcM9wyL9wwU4BP09wwW9wz3/PeEBhP4rgoT9PcM9/z7/PeE94T3DPx0+wz3DAYOoHb5ZPcM9wz3DIv3DBKL9wz3DPcMi/cME+z3hPpUFSQKE9ohChPsJgr7hP7MFfckCg6L9wyL9wz3DPcM9wz3DIv3DBKL9wyL9/yL9wwTovcMFjsKE2EhChOq+wwHE6zuChMy9/wGEzEpChMy+wwGE2pEChNsTAoTpPcMBg6L9wyL9wz3hPcM9wz3DBKL9wyL9/yL9wwTtPcMFjsKE3IvChO0MAoTumUKE7T8dAYTuEYKE7RmChO4+/wGE3gxChO49wwGDov3DPjs9wwB9wz3/AP3DBZSCg6L9wz47PcM9wz3DAH3DPcM9wz3DAP3/PpUFSEK+4T7DBUhCv7MBFIKDov3DIv3DPjsdxKL9wz3/PcME7j3DBY7ChN4UwoTuP1k+/wHE3gxChO49wwGDov3DPf89wz3DPcMEov3DIv3DPcM94T7hPcM9wz3DBPi+HT3DBX3/AcT5D4KE+EvChPkMAoT6vsM94T7/AYT8P1k+wz7DPcM9wwHE+r3DPjs9wwGE+T9ZPeE9wwHDov3DPf89wz3hHcBi/cM9wz3DPcM9wwDFBz3/PcMFff89wz7/PcM9/z7DPcM+wz3hPsM+4T7DPeE+wz93Af3DPh09wz8dPeE9wwGDqB294T3DIv3DPcM9wz3DHcS9wz3DPeE9wwT3vcMFvcwChO+9wz7/PcM9/z7DPcM+wwGE977DPsM94T3/PcM+/z3DPsM+wz7DPsM9wwHDqB29/z3DPcM9wyL9wz3DPcMi/cMEov3DPcM9wyL9wyL9wwTywD3hPpUFSQKE8aAIQoTywAmCvuE/swV0QoT4oD3MQoT4kBVChPigFYKE9JAIQoT4oBXChPSgFgKDqB29/z3DIv3DIv3DPcMd/cg9wyL9wwSi/cMi/cMi/cM9wz3DBOMYPeE+lQVJAoTjKD7DAYTiqAxChOMoPcMBhPJYPuE/swVggoTqWAkChOZYFsKE6lgJgoTyWCECg6L9wz3hPcM9/x39yD3DIv3DBKL9wyL9wz3hPcME/P3hPpUFaIKE+shChPzqwoT6zEKE/P3DAYT5fuE/swV9zIKE+P3MwoT5fx0Bg4odvcM9wz5ZHcBi/cM9wz3DPcM9wwDFBz3hPsMFfcM9wz3hPnc+wz9ZPv8+WT7DP3c94QGDqB2+HT3DPcM9wwBi/cM9/z3DAP3DPjsFUkKDov3DPf89wz3DPcMAYv3DPf89wwD9wz3DBX3/Pf8+/z3DPf8+wz3DPv89wz4dPcM/Oz93Ph09wwHDov3DPf89wyL9wyL9wwSi/h0/HT3DPf89wwT1PcM9wwV9/wHE9hKChPSLwoT2DAKE9RBChOo9/wGE8j7DAcToiQKE6j7DAYT2EsKDqB2+WT3DAGL9wwDiwT3JAoOKHb3DPcM+Oz3DAGL9wz3DPcM9wz3DAMUHPeE9wwV9/z7DPv8+wz7hPcM9wz3/PsM9wz6VPv8+/z3DPeEB/cM/OwGDov3DPf89wz3DPcMAYv3DAOLBE4KDqB2+HT3DIv3hBKL9wz3DPcM9wz3DBQcE9yLBPc0ChO8IgoT3CcKE7xYChPcJwoTvPcpChPcyAoOi/cMi/cM9/z3DIv3DBKL9wyL9/yL9wwThPcMFjsKE2L3DPf8+wz3DPcM9wwGEyT7DAYTFEQKE6grChOk9/wGE6L3DwoThPv8BxOI+/wGE0gxChOI9wwGDqB29/z3DIv3DIv3DPcMdxKL9wz3DPcM9wz3DBQHE8+LBIIKE68kChOfWwoTryYKE8+ECg6gdvf89wyL9wyL9wz3DHf3IPcMi/cMEov3DIv3DIv3DPcM9wwTjGD3hPpUFaIKE4qgIQoTjKCrChOKoDEKE4yg9wwGE8lg+4T+zBWCChOpYCQKE5lgWwoTqWAmChPJYIQKDqB29/z3DPcM9wyL9wwSi/cM94T3DIv3DBPsiwRUChPqVQoT7FYKE9ohChPsVwoT3FgKDov3DPjs9wwSi/cMi/cM94T3DBPoiwQkChPY9wz47PeE/WT3DPnc/HQGE+j9ZPsMBw6gdvh09wyL9wz3DHcSi/cM9wz3DPcM9wwUDhO+iwQ3ChPeWgoTvlsKE94mChO+XAoOoHb4dPcM94R3AYv3DPf89wwDiwRRCg6L9wz47PcMEov3DIv3/Iv3DBPg9wz3DBX47AcT0F4KE+D7/AYT0DYKE8g3ChPQOAoT4EwKDqB2+WT3DAGL9wz3/PcMA4sE9ycKDqB2+Oz3DIv3DBKL9wz3/PcME9j3DPjsFRO49wwHE9hfChO4YAoT2PcMBw6L9wyL9wz3/PcMi/cMEov3DIv3/Iv3DBOE9wwWOwoTQiEKE5T7DAcTmPv8+OwGEyT3/AYTIikKEyT7DAYTVEQKE1hMChOI9wwGDqB2+WT3DAH3hPcMA/eEFmcKDov3DPeE9wz3/HcBi/cM9/z3DAOLBPc1Cg4odvcM9wz4dPcM9wx3Eov3DIv3/PuE9wz3DPcME/r3DPcMFfh09wz8dPsMBxP0+wwHE/JaChP0JAoT8vsM+HQGE/T3DPx0BhPx0QoT9DAKE/KdChP0+wwGE/pDCg6L9/yL9wz3DPcMi/cMEov3DIv3DPcM9wyL9wwTiIsELwoTRm0KE4L3DAYTgVUKE4L7DAYTYm4KExEhChMmbwoTKPsMBhMYMQoTaPcMBhNkRwoTiCYKDih29wz3DPlkdxKL9wz3hPcMi/cME/T4dPsMFSUKE/j7DPlk+wz9ZPuE+WT7DP3cBhP0+HQGDqB29/z3DPf8dwGL9wz3/PcMA/h0Fvc2Cg6L9wz5ZHcBi/cM9wz3DPcM9wwDFDiLBPjs+dz7DP1k+wz5ZPsM/WT7DPlk+wwGDih29wz3DPlkdxKL9wz3DPcM9wz3DIv3DBP6+Oz7DBUlChP8+wz5ZPsM/WT7DPlk+wz9ZPsM+WT7DP3cBhP6+OwGDov3DPeE9wz3hPcMEvcM9/z7/PcM94T3DBTgE+j3hPcMFfeEBxPwjQoT5CUKE/AwChPo+4T3/PuE+wz3DAYT8P1k9/z3DAcOi/cM94T3DPf8dxKL94T7hPcM9wz3DPcM9wwT4vh0FpwKE+r7/P1kFfeEBxPy9zcKE+YlChPyMAoT6r8KE/L93PeE9wwHDov3DPeE9wz3/HcBi/cM9/z3DAP3DPcMFfeE9/z7hPcM94T7DPcM+/z3/PsM/dz4dPcMBw6L9wyL9wz3DPcM9wz3DIv3DBKL9wyL9/yL9wwTovcMFjsKE2k3ChMqOAoTNCsKE6r3/AYToT0KE6L7hAcTpPv8BhNkMQoTpPcMBg6L9wz3hPcM94T3DBKL9wz3DPcMi/cMi/cMFOAT+Pf89wwV+OwHE/S6ChP4+wwGE/QpChPyNwoT9KQKE/j7DPsM+4T7DPf8+wz93PcM9/z3DPuEBw6gdvh09wyL9wyL9wwSi/cM9/z3DBPM9wz47BUTrPcMBxPc9/z7DPv8+wz7DPx09wz4dPf8/HT3DPnc/HQGE6x4Cg6L9wyL9wyL9wz3DPcMEov3DPf89wwTnPcM9wwVE1z3DAcTvHcKE1x4Cg6L9wz3/PcM9wz3DAGL9wz3/PcMA/cM9wwV9/z3/Pv8+/z7DPf89wz3DPf8+wz3DPv89wz4dPcMB/x0+wz7DPzsBg6L9wyL9wyL9wyL9wyL9wwSi/h0/HT3DPf89wwTovcM9wwV9wwHE0T3/AYThPsMBxNBJAoTRPsMBhMs9wwHEypBChMU9/wGEyT7DAcTESQKExT7DAYTrPcgCg6gdvh09wwB9wz3DAP3DBb3OAoOKHb3DPcM9/z3DAGL9wz3DPcM9wz3DAMUHPeE9wwV94T7DPuE+wz7hPcM9wz3/PsM9wz5ZPv8+4T3DPcMB/cM+/wGDov3DPcM9wz3DPcMAYv3DPf89wwDFOD3DPf8FX8KDov3hIv3DIv3hBKL9wz3DPcM9wz3DBQcE5yLBCUKE1z3DAYTnHYKE1z3hAcTnPc5ChNc9wwHEzwiChNcJwoTPFgKE1wnChM89ykKE1z3DAYTnCYKDov3DIv3DPcM9wyL9wwSi/cMi/f8i/cME4T3DBY7ChNi9xAKEyT7DAYTFEQKE2grChNk9/wGE2L3DwoThPsMBxOI+/wGE0gxChOI9wwGDqB29wz3DIv3DIv3DPcMdxKL9wz3DPcM9wz3DBQHE8+LBOQKE68kChOf9zoKE68mChPPhAoOoHb3DPcMi/cMi/cM9wx39yD3DIv3DBKL9wyL9wyL9wz3DPcME4xg94T5ZBWiChOKoCEKE4ygqwoTiqAxChOMoPcMBhPJYPuE/dwV5AoTqWAkChOZYPc6ChOpYCYKE8lghAoOi/cMi/cM9wz3DIv3DBKL9wz3hPcMi/cME4yLBPcMBhNM9zsKE4z3DAYTiikKE4z7DAYTbG4KExohChMsVwoTnFgKDov3DPf89wwSi/cMi/cM94T3DBPoiwQkChPY9wz3/PeE/HT3DPjs/HQGE+hhCg6gdveE9wyL9wz3DHcSi/cM9wz3DPcM9wwUDhO+iwQvChPeWgoTvvc6ChPeJgoTvlwKDqB294T3DPeEdwGL9wz3/PcMA4sE9yIKDov3DIv3/Iv3DBKL9wyL9/yL9wwTkPcM9wwVE1D3/AcTSPf8BhOI+/wHE5D7/AYTiDYKE0QvChNI+wwGEyhEChNQfAoOoHb4dPcMAYv3DPf89wwDiwT3DPh09/z8dPcM+Oz87AYOKHb3hPcM9wz3DIv3DBKL9wz3/PcME+z3DPeEFYsKE9yMChPs+wwHE9yNCg6L9wyL9wz3DPcMi/cMEov3DIv3/Iv3DBOE9wwWOwoTQiEKE5T7DAcTmHsKEyT3/AYTIikKEyT7DAYTVEQKE1h8ChOI9wwGDqB2+HT3DAH3hPcMA/eEFvc8Cg77DPcM9wz3DPf8dwGL9wz3/PcMA/sMBJgKDih29wz3DIv3/Iv3DBKL9wyL9/z7hPcM9wz3DBPK9wz3DBUTqvf8BxPa9xsKE9T7DAcT0loKE9QkChPSLQoTpPcMBhPE+/wHE6EvChOk+wwGE5REChOqfAoOi/cMi/cM9wz3DIv3DBKL9wyL9wz3DPcMi/cME4iLBCQKE0ZtChOC9wwGE4EpChOC+wwGE2JuChMRIQoTJm8KEyj7DAYTGDEKE2j3DAYTZEcKE4gmCg4odvcM9wz4dHcSi/cM94T3DIv3DBP0+HT7DBUlChP4+wz4dPsM/HT7hPh0+wz87AYT9Ph0Bg6gdveE9wz3hHcBi/cM9/z3DAP4dBb3DPjs+wz7hPv894T7DPuE9wz7DPf8Bg6L9wz4dHcBi/cM9wz3DPcM9wwDFDiLBPjs+Oz7DPx0+wz4dPsM/HT7DPh0+wwGDih29wz3DPh0dxKL9wz3DPcM9wz3DIv3DBP6+Oz7DBUlChP8+wz4dPsM/HT7DPh0+wz8dPsM+HT7DPzsBhP6+OwGDov3DIv3DIv3DPcM9wwS9wz3/Pv89wz3hPcME7T3hPcMFfcMBxNY94QGE5j7DAcTUiQKE1j7DAYTuPcMBxO0+4T3hPuE+wz3DAYTuPx09/z3DAcOi/cMi/cMi/cM94R3Eov3hPuE9wz3DPcM9wz3DBOR+HQWIAoTtfv8/HQV9wwHE1n3DAYTmfsMBxNTJAoTWfsMBhO59wwHE7X3CgoTufzs94T3DAcOi/cMi/cMi/cM94R3Eov3DPf89wwTvPcM9wwV9wwHE1z3/AYTnPsMBxNcIQoTvPcM+/z3hPsM/Oz4dPcMBw6L9wyL9wyL9wyL9wyL9wwSi/cMi/f8i/cME4L3DBY7ChNJLwoTCjgKExQrChOq9/wGE6H3DwoTgvsMBxOE+/wGE0QxChOE9wwGDov3DIv3/Iv3DBKL9wz3DPcMi/cMi/cME5j3/PcMFRNY9/wHE1T3DAYTlPv8BxOY+wwGE5QpChNSLwoTVPsMBhM0KgoTWJsKE7j3hPsM/Oz3DPeE9wwHE1j7DAcOoHb3hPcMi/cMi/cMEov3DPf89wwTzPcM9/wVE6z3DAcT3Pf8+wz7/PsM+wz7hPcM94T3/PuE9wz47Px0BhOseAoOi/cM9wz3DPcM9wz3DPcMi/cMEov3DIv3DIv3DPcM9wwT8YD3hPlkFSQKE/KA+wwGE+qAMQoT8oD3DAYT5ID7DPx0FcwKE+KAyQoT5IDNChPigPv8BhPkgLQKDov3DPcM9wz3DPcM9wz3DBKL9wyL9wz3DPcMi/cME/L3/PlkFSEKE/T7hPsMFSEKE/j8dATMChP1yQoT+c0KE/T7/AYT+bQKDov3DPeE9wyL9wz3DPcMEvcM9wz3DPcMi/cME7z3/BYkChO6LwoTvKQKE9z3FQoT2veE9wz7hPcM+wz7DPsM+wz3DPzs9wz3hAYT3CQKE7z3GwoOoHb4dPcM9wz3DIv3DBL3DPcMi/cMi/cME+T3hPlkFSQKE9IhChPkJgoTyPsM/dwV9zgKDov3DIv3DIv3DIv3DIv3DBKL9wyL9/yL9wwTgvcMFjsKE0EhChOq+wwHE6z7/PcM94T3DPuE9wwGExL3/AYTESkKExL7DAYTSkQKE0x8ChOE9wwGDov3DPcM9wz3DPcMAYv3DPf89wwDFOCLBJEKDov3DPf89wz3DPcMAfdI9wwD90j5ZBUhCvcM/dwVhQoOi/cM9/z3DPcM9wwSx/cMi/cMi/cME+T3wPlkFSEKE/D7hPsMFSEKE+T3hP3cFaIKE+j7hAYT9NAKE+jPCg77DPcM+Ox39yD3DAGL9wz3/PcMA/h0+WQVIQr7/P5UFYYKDov3DIv3DIv3DPcM9wwSi/cMi/cM9wz3hPuE9wz3DPcME7EA+HT3DBX3DAcTUgD3DAYTkgD7DAcTUIAkChNSAPsMBhOyAPcMBxO1APsM94T7/AYTmAD8dPsM+wz3DPcMBxNVAPcM9/z3DAYTsgD8dPeE9wwHDov3DIv3DIv3DPeEdxKL9wz3DPcM9wz3DBQOE773/PcMFfcMBxNe9wwGE577DAcTXiEKE773DPsM94T7DPuE+wz3hPsM/Oz3DPeE9wz7hPeE9wwHDqB294T3DIv3DPcM9wz3DHcS9wz3DPcM9wyL9wwT3vcMFvcwChO+9wwGE71VChO+pAoT3vcVChPd94T3DPuE9wz7DPsM+wz7DPcMBg6L9wyL9wz3DPcMi/cM9wz3DIv3DBKL9wz3DPcMi/cMi/cMEwsA94T5ZBUkChMGgCEKEwsAJgoTgoD7hP3cFfcMBhNCgPc7ChOCgPcMBhOCQCkKE4KA+wwGE2KAbgoTEkAhChMigFcKE5KAWAoOoHb3DPcMi/cMi/cM9wx39yD3DIv3DBKL9wyL9wyL9wz3DPcME4xg94T5ZBUkChOMoPsMBhOKoDEKE4yg9wwGE8lg+4T93BXkChOpYCQKE5lg9zoKE6lgJgoTyWCECg77DPcM9wz3DPf8d/cg9wyL9wwSi/cMi/cM94T3DBPz94T5ZBWiChPrIQoT86sKE+sxChPz9wwGE+X7hP5UFdgKE+O0ChPl/HQGDih29wz3DPh0dwGL9wz3DPcM9wz3DAMUHPeE+wwV9wz3DPeE+Oz7DPx0+/z4dPsM/Oz3hAYOi/cM94T3DPcM9wz3DHcB9wz3DPf89wwD94T3DBX3hPf8+4T3DPeE+wz3DPv89wz3DPcM+wz3DPsM+wwH+wz7DPcM/Oz4dPcMBg6L9wyL9wyL9wz3DPcMEvcM9wz3/PcME7z3hPcMFfcMBxNc9/wGE5z7DAcTXCEKE7z3DPv89wz3DPcM+wz3DPsM+wz7DPsM9wz8dPh09wwHDov3DPeE9wz3hPcMEov3DIv3/Iv3DBTgE/T3DPcMFe0KE+j7hAcT8Pv8BhPoNgoT5DcKE+g4ChPw+wwHE+j3/AYT9PEKDov3DIv3/Iv3DBKL9wyL9/yL9wwTlPcM9wwV9xkKE4j7DAcTkPv8BhOINgoTRC8KE0j7DAYTKEQKE1D7DAcTSPf8BhNU9xoKDov3DIv3hPf89wwSi/cMi/cM9wz3DIv3DIv3DBOs94QWJAoTZCUKE2IvChNhIQoTYiYKE2yVChOsJwoTaPeEBxNwagoTbPuEBxOs9wwGDov3DIv3DPeE9wwSi/cMi/cM9wz3DIv3DIv3DBOs94QWJAoTZCQKE2IlChNhIQoTYiYKE2wnChOsJgoTaPcMBxNw9z0KE2z7DAcTrPcMBg6gdvlk9wwBi/cM9/z3DAOLBPcM+WT4dPf8+wz7hPx0Bg6gdvh09wz3hHcBi/cM9/z3DAOLBPcM+HT4dPf8+wz7hPx0Bg6gdvh09wz3DPcMAfcM9wwD9wwW9wz4dPcM9wz7DPcM+HT3DPzs+4T7DPsM9wwGDqB294T3DPcM9wwB9wz3DAP3DBb3DPeE9wz3DPsM9wz3/PcM/HT7hPsM+wz3DAYOKHb3DPf8i/cMi/cMi/cMi/cMEov3DIv3DPcM9wz3DPcMi/cMi/cME8CQ+dz7DBUlChPAoHQKE8DA+wwGE6DAKgoTkMD3DAcTiMAkChOEoCEKE4nAJgoTlcD7DPsM94T7DPuE+wwHE4mA9wwHE4qA+wwGE4aAMQoTioD3DAYTiYD7DAcTkYD3DAYToYAmChPCgPsM+wz7/PcM9/wHE6HAJAoT0MD3DPx09wz4dAYToMAoChPAwPcMBhPAoPv8BxPAkPcMBg4odvcM94SL9wyL94QSi/cM9wz3DPcM9wyL9wwTzfjs+wwVJQoTzqQKE673DAcTniIKE64nChOeWAoTricKE573KQoTrvcMBhPO9z4KE673DAYTznYKE673hAcTzvc3ChPN9wwGDih29yF29/z3DPcM9wyL9wwSi/cM94T3DIv3DIv3DBP0gPjs+wwVJQoT9QB0ChP2AFYKE+0AIQoT9gBXChPuAPeE+wz93PcM+HT3hPsM9wwHE/UA+/wHE/SA9wwGDih29wz3DIv3DPcM9wyL9wwSi/cM9wz3DIv3DIv3DBOmgPh0+wwVJQoTxgD7hAYTtgBuChONACEKE5YAmwoTzgD3hPsM/Oz3DAcTpgCHChPGAPcMBhPFAPsMBxPGgPcMBg4odvchdvh09wz3hHcSi/cM9/z3DIv3DBP6+Oz7DBUlChP8+wz5ZPsM+4T7/PeE+wz93PcM+HT3/Px0BhP69wwGDih29yF294T3DPeEdxKL9wz3/PcMi/cME/r47PsMFSUKE/z7DPh0+wz7hPv894T7DPzs9wz3hPf8+4QGE/r3DAYOoHb47PcMi/cMEov3DIv3DPcM9wyL9wwTzPeEFnAKE6IhChPMbwoT0PsMBhOwMQoT0PcMBhPMcQoOKHb3/PcMi/eEEov3DIv3DPcM9wyL9wwTzPeE+wwVggoToiIKE8z7hPsM+wz7DPcMBxPQ+wwGE7D3KQoT0PcMBhPMcQoOoHb3/PcM9wz3DIv3DBKL9wyL9wyL9wyL9wyL9wwT4oD3hBb3DPf89wz3DPsM9wwGE+EAJAoT0IAhChPhACYKE+IA+wwHE+QAMAoT6AD7DAYT2AAxChPoAPcMBhPkAHEKE+IA+wwHE+QA5goT4oD3DAYOKHb3DPcM9wz3DIv3hBKL9wyL9wyL9wyL9wyL9wwT4oD3hPsMFfc/ChPhACQKE9CAIgoT4QAnChPiAPsMBxPkADAKE+gA+wwGE9gA9ykKE+gA9wwGE+QAcQoT4gD7DAcT5ADmChPigPcMBg6gdvh09wz3hHcBi/cM9/z3DAOLBPdACg6gdvf89wyL9wz3hHcSi/cM9/z3DBPciwSCChO8gwoT3IQKDov3DPjs9wwB9wz3/AP3DBZSCg6gdvh09wyL94T3DPcMi/cMEov3DIv3DIv3DPcM9wwTkYD3hPpUFaIKE4qAIQoTkoCrChOKgDEKE5KA9wwGE8WA+4T+zBX3NAoTpYAiChPFgCcKE6WAWAoTxYAnChOlgPcpChPFgMgKDov3hIv3DIv3hPcM9wyL9wwSi/cMi/cMi/cM9wz3DBMRgPeE+WQVogoTCoAhChMSgKsKEwqAMQoTEoD3DAYThYD7hP3cFSUKE0WA9wwGE4WAdgoTRYD3hAcThYD3OQoTRYD3DAcTJYAiChNFgCcKEyWAWAoTRYAnChMlgPcpChNFgPcMBhOFgCYKDqB2+HT3DPcM9wz3DPcMi/cMEov3DIv3DPeE9wwT8/eE+lQVogoT6yEKE/OrChPrMQoT8/cMBhPl+wz8dBWzChPj+/wGE+W0Cg6L9wyL9wyL9wz3DPcM9wz3DIv3DBKL9wyL9wz3hPcMExmA94T5ZBWiChMVgCEKExmAqwoTFYAxChMZgPcMBhOSgPsM/WQVE1KA9wwHE7KAxgoTsYDHChNSgHgKDqB2+HT3DPcM9wz3DPcMEov3DIv3DPcM9wyL9wwT8vf8+lQVIQoT9PuE+wwVIQoT+fx0BLMKE/T7/AYT+bQKDov3DIv3DIv3DPcM9wz3DPcMEov3DIv3DPcM9wyL9wwTGQD3/PlkFSEKExoA+4T7DBUhChOcgP1kBBNcgPcMBxO8gMYKE7qAxwoTXIB4Cg6L9wz3/PcM9wz3DPcM9wyL9wwSi/cMi/cM94T3DBPz94T6VBWiChPrIQoT86sKE+sxChPz9wwGE+X7hP7MFU4KDov3DPcM9wz3DPcM9wz3DIv3DBKL9wyL9wz3hPcME/P3hPlkFaIKE+shChPzqwoT6zEKE/P3DAYT5fsM/HQVzAoT48kKE+XNChPj+/wGE+W0Cg6L9wz3hPcM9wz3DIv3DBKL9wyL9/yL9wwT2vcM9wwV7QoT1PuEBxPY+/wGE9Q2ChPSNwoT1DgKE+grChPU9/wGE9r7hPx0+/wHDov3DPcM9wz3DPcMAYv3DPf89wwDFOD3DPcMFfcCCg6L9wz3hPcM9wz3DIv3DPcM9wwSi/cMi/cM9wz3DIv3DBPJAPf8+lQVIQoTygD7hPsMFSEKE9yA/lQEQAoT2oC+ChPsgCsKE9yA9/z7hPx0+/wGDov3DPcM9wz3DPcM9wz3DBKL9wyL9wz3DPcMi/cME/L3/PlkFSEKE/T7hPsMFSEKE/n9ZAT3DPf8+wz7/AcT9fsM9/z3DPcM9/z7DPcMBxP5/HT7DPh0+wz8dPuEBg6gdvh09wyL94T3DPcMEov3DIv3DIv3DIv3DIv3DBORAPf8+lQVIQoTlAD7hPsMFSEKE9qA+wz+zBX3NAoTuoAiChPagCcKE7qAWAoT2oAnChO6gPcpChPagMgKDov3hIv3DIv3hPcM9wwSi/cMi/cMi/cMi/cMi/cMExEA9/z5ZBUhChMUAPuE+wwVIQoTmoD7DP3cFSUKE1qA9wwGE5qAdgoTWoD3hAcTmoD3OQoTWoD3DAcTOoAiChNagCcKEzqAWAoTWoAnChM6gPcpChNagPcMBhOagCYKDov3DIv3DPf89wyL9wz3DPcMEov3DIv3DPcM9wyL9wwTCQD3/PpUFSEKEwoA+4T7DBUhChOKgP7MBDsKE2qA9wz3/PsM9wz3DPcM+wwGExqARAoTrID3QQoTqoD7hPsM94T7/AYTjAD7/AYTTAAxChOMAPcMBg6L9wyL9wz3DPcMi/cM9wz3DBKL9wyL9wz3DPcMi/cMEwkA9/z5ZBUhChMKAPuE+wwVIQoTioD93AQ7ChNqgPcEChMagEQKE2yA90EKE2qA+4T7DPeEBhOMgDkKE0wAMQoTjAD3DAYOoHb3/PcMi/cMi/cM9wx39yD3DBKL9wz3DPcM9wz3DBQDgBOPgPcM+lQV2Qr7DP7MFfcMBhPPgPdCChOvgCQKE5+AWwoTr4AmChPPgIQKDqB29wz3DIv3DIv3DPcMd/cg9wwSi/cM9wz3DPcM9wwUA4ATj4D3DPlkFdkK+wz93BX3DAYTz4A1ChOvgCQKE5+A9zoKE6+AJgoTz4CECg6gdvf89wyL9wyL9wz3DHf3IPcMEov3DIv3DIv3DIv3DIv3DBOMQPf8+lQVIQoTjQD7hPsMFSEKE86g+wz+zBWCChOsoCQKE5wg90MKE5xA+wwGE66gJgoTzqCECg6gdvcM9wyL9wyL9wz3DHf3IPcMEov3DIv3DIv3DIv3DIv3DBOMQPf8+WQVIQoTjQD7hPsMFSEKE86g+wz93BXkChOsoCQKE5wg9wz7/PcM+Oz7DPsMBhOcQPsMBhOuoCYKE86ghAoOi/cM+Oz3DPcM9wwSi/cMi/cM9wz3DIv3DBPk9/z6VBUhChPo+4T7DBUhChPy/lQEvQoT6r4KE/JMCg6L9wyL9/yL9wz3DPcMEov3DIv3DPcM9wyL9wwTEvf8+WQVIQoTFPuE+wwVIQoTmf1kBBNZ1AoTmT8KE5U2ChNVlAoTNUQKE1l8Cg6L9wz3hPcM94T3DBKL9wyL9/yL9wwU4BP09wz3DBXtChPo+4QHE/D7/AYT6DYKE+Q3ChPoOAoT8PsMBxPo9/wGE/TxCg6L9wyL9/yL9wwSi/cMi/f8i/cME5T3DPcMFfcZChOI+wwHE5D7/AYTiDYKE0QvChNI+wwGEyhEChNQ+wwHE0j3/AYTVPcaCg6L9wz3hPcM94T3DPcM9wwSi/cMi/cM9wz3DIv3DBPy9/z6VBUhChP0+4T7DBUhChP5/lQEQAoT9b4KE/n7DPf8+4T7/PeE+wz87AcOi/cMi/f8i/cM9wz3DBKL9wyL9wz3DPcMi/cMExL3/PlkFSEKExT7hPsMFSEKE5n9ZAT3DPf8+wz7/AcTlTYKE1WUChM1RAoTWfsM9/z7DPv89wz7DPv8Bw6L9wyL9wz3DPcM9wz3DIv3DPcM9wwSi/cMi/cM9wz3DIv3DBMkgPf8+lQVIQoTJQD7hPsMFSEKE6VA/swEOwoTbUD3HAoTNkArChOtQPf8+4T7hPsM94T7hAYTpgD7/AYTZgAxChOmAPcMBg6L9wyL9wyL9wyL9wyL9wz3DPcMEov3DIv3DPcM9wyL9wwTBID3/PlkFSEKEwUA+4T7DBUhChOFQP3cBDsKE01A90QKExZAKwoTrUD3/PsM+4T7DPeE+wwGE4YA+/wGE0YAMQoThgD3DAYOi/cM94T3DPf8d/cg9wwBi/cM9/z3DAP3DPpUFdkK+wz+zBX3NQoO+wz3DPcM9wz3/Hf3IPcMAYv3DPf89wwD9wz5ZBXZCvsM/lQVmAoOi/cM94T3DPf8d/cg9wwSi/cMi/cM9wz3DIv3DBPy9/z6VBUhChP0+4T7DBUhChP5+wz+zBX3MgoT9fczChP5/HQGDvsM9wz3DPcM9/x39yD3DBKL9wyL9wz3DPcMi/cME/L3/PlkFSEKE/T7hPsMFSEKE/n7DP5UFdgKE/W0ChP5/HQGDov3DPeE9wz3/Hf3IPcMi/cMEov3DIv3DPcM9wyL9wwT8QD3/PpUFSQKE+iAIQoT8QAmChP0APv8+wwVJAoT6gAhChP0ACYK/swEE+SA9zIKE+KA9zMKE+SA/HQGDvsM9wz3DPcM9/x39yD3DIv3DBKL9wyL9wz3DPcMi/cME/EA9/z5ZBUkChPogCEKE/EAJgoT9AD7/PsMFSQKE+oAIQoT9AAmCv5UBBPkgNgKE+KAtAoT5ID8dAYOoHb3/PcM9/x39yD3DBKL9wyL9wz3DPcMi/cME/L3/PpUFSEKE/T7hPsMFSEKE/n3/P7MFfcM+dz7DPv8+/z3/PsM+/z3DAYT9aEKDqB294T3DPeEd/cg9wwSi/cMi/cM9wz3DIv3DBPy9/z5ZBUhChP0+4T7DBUhChP59/z93BX3RQoT9aEKDov3DPeE9wz3/Hf3IPcMEov3DIv3DIv3DIv3DIv3DBPxAPf8+lQVIQoT9AD7hPsMFSEKE/CA9/z+zBWcChP6APv8/WQV94T3DPuE9wz3hPsM9wz7DPf8+wz93PeE9wwHDov3DIv3DIv3DPeEd/cg9wwSi/cMi/cMi/cMi/cMi/cMExiA9/z5ZBUhChMaAPuE+wwVIQoTmED3/P3cFSAKE70A+/z8dBX3DAcTXQD3DAYTnQD7DAcTXQAhChO9APcM+wz3hPsM/Oz3hPcMBw6L9wyL9wyL9wz4dHcSi/cM9/z3DBOc9wz3DBUTXPcMBxO89/z7DPv8+wz4dPnc+wz8dPv8BhNceAoOi/cMi/cM+Ox3Eov3DPeE9wyL9wwTuPcMFvdGChO0KQoTuPsMBhN49wwHE3QgChN4/Oz7DAcTuPsM+4T5ZPsMBxN4/WQHE7j3DAYOoHb3hPcM9/z3DAGL9wz3/PcMA4sE9wz3hPh09wz8dPf89/z7hPcM94T7DPcM+/z7DPsMBg6gdveE9wz3/PcMAYv3DPf89wwD9wz3/BX3/Pf8+/z7/PsM9/z7hPcM94T3DPcM+wz3/PsM9wwH+/z7DPsM+/wGDqB294T3DPf89wwBi/cM9/z3DAP4dBb3DPeE9wz3DPsM9/z7DPcM+/z7DPsM+/z3DPf89/wGDov3DIv3DPeE9wz3hHcSi/cM9/z3DBO89wwWOwoTfCEKE7z7DPv89/z4dPcM/HT3hPsMBxN8/WQHE7z3DAYOi/eE+4T3DPh09wyL9wwSi/cM94T3DIv3DBOKiwQTSvjs9wwGE0z7DAYTnPcMBxOa9yoKEyorChOa9/wGE4xhChNMqwoTiioKDov3DPf89wz3hHcBi/cMA4sE+Oz3DPx09/z4dPcM/HT3hPsMBg6L9wz4dPcMi/cMEov3DPf89wwTuIsE+Oz3DPx0+OwGE9hfChO4xQoOi/cM94T3DPeE9wwBi/cM9wz3DPeE9wwDFOD3/PcMFfeE94T7hPuE+wz3hPcM9wz47PsM9wz8dPsM+wz9ZAf3DPlk+HT7hPuE+wz7DPuEBg6L9wz3/PcM94R3AYv3DPf89wwD9wz3DBX3/Pf8+/z7/PsM9/z3DPcM9/z3DPcM+wz3hPsM+4QH+/z7DPsM+/wGDqB2+HT3DPeEdwGL9wz3/PcMA4sE9wz4dPf8+/z3DPf8+wz3DPv894T7DAYOi/cM+WR3AYv3DAOLBPh09wz7/Plk+wwGDov3DPf89wz3hHcBi/cM9wz3DPeE9wwDiwT3DPh09wz7/PcM+wz3hPcM9wz4dPsM/HT7hPh0+4QG94T7DAcOi/cMi/f8i/cMi/cMi/cMEov3DIv3DPcM9wyL9wwThAD3DPcMFRNEAPf8BxMjAPcMBhMTAPcMBxMhACgKE0EA9wwGE4SAPwoTgoA2ChNAgC8KE0EA+wwGEyEAKgoTEQD3DAcTCICiChMNAPuEBhMVAPsMBxNMAPuE9wz7DPsM9wz7hPsM+/wGDqB29/z3DPf8dwGL9wz3/PcMA/h0FvcM+WT7DPuE+/z3/PsM+/z3DPsM9/wGDqB2+WT3DAH4dPcMA/h0FvcM+HT7DPcM9wz3DPsM9wz8dPsM+HT7DPx0+wz4dAYOi/cMi/cMi/cM9/z3DBKL9wyL9wz3DPcMi/cME5j3DPcMFRNY9wwHE7QoChO4+wwGE7XJChOy9wcKEzX3RAoTOfsM+wz7hPcM94T3/AcTNvv8+wz7DPsM9wz7DAcTWHgKDov3DPjs9wwBi/cM9/z3DAP4dBb3hPcM+wz47PsM9wz7/PsM+wz7hPcM94T3/AYOi/cM9/z3DPcM9wwBi/cM9/z3DAP3DPcMFff89/z3DPv89wz3/PcM+/z7DPsM/WT47Ph0+wz7/AcOi/cM+Oz3DAGL9wz3/PcMA/cMFvf89wz3DPjs9wz3DPuE/WT7/Plk+wz9ZPcMBg6L9wyL9wz3DPcM9wz3DIv3DBKL9wyL9/yL9wwTovcMFjsKE2k8ChMqOAoTNCsKE6r3/AYTpfuE/HT7DPh0BxOi+4QHE6T7/AYTZDEKE6T3DAYOi/cMi/cM+HT3DBL3DPcM94T3DBO494QWogoTeCEKE7j7DPuE+WT7hPsM9wwHE3j87AcTuPcMBg6L9wyL9wz3hPcM9wz3DBKL9wyL9wyL9wz3DPcME7X3DBY7ChN5IQoTud0KE3UkChN79wz3DPeE9wz87PsM94QGE3UmChN5fAoTufcMBg6gdvlk9wwBi/cM9/z3DAOLBPdHCg6L9wyL9wz3DPcM9wz3DIv3DBKL9wz3DPcMi/cMi/cME60A9/wWE6yAogoTrQD7hAYTLgD3hAcTLQAkChMsgEgKEzSAKwoTbID3/AYTZQAnChNmAPsM+wz7DPuE+wwHE60A9/wGDqB2+WT3DAGL9wz3DPcM9wz3DAMUOPh0FvcM+WT7DPcM+/z7DPsM+4T3DPeE9wz7/PcM9/z3DAYOi/cM9/z3DPcM9wwSi/cM9wz3DIv3DIv3DBP49/z3hBX3hPsM9wz7DPcM+wz7hPeE+4T3DAcT9PdIChPy+Oz3DAYT9DAKE/L3DPh0+wz3DPv8+wz3/AYT9Px0Bw6gdvcM9wz4dPcMAYv3DPf89wwDiwT3DPlk9/z9ZPcM9wz3DPcM+wz4dPsM9wz7/PsM+wwGDov3DPlkdwGL9wz3/PcMA/cMFmgKDqB294T3DPeEd/eYdwGL9wz3/PcMA/h0FvcM+dz7DPx0+/z3hPsM+4T3DPsM9/wGDov3DIv3DPcM9wz3DPcMi/cMEov3DIv3/Iv3DBOi9wwWOwoTaSUKEyowChMs9y4KEzL3/AYTMSkKEzL7DAYTqkQKE6z3LwoTovczChOk+/wGE2QxChOk9wwGDqB2+Oz3DIv3DBKL9wz3/PcME7iLBPcM+WQGE9hfChO4xQoOi/cM9wz3DIv3DIv3hIv3DBKL9wyL9/yL9wwTpPcM+HQVE5T3hAcTkvf8BhOi+4QHE6T7/AYTxCsKE6L3/PuE+/z7DPf89wwGE6ElChOiMAoTkSUKE5L7DAYTikQKE5QsCg6gdvh09wz3hHcBi/cMA4sE9wz4dPf89wz7/PeE+wwGDqB29wz3DIv3/Iv3DPcMdxKL9wyL9/z7hPcM9wz3DBPNAPcM94QVE60A9/wHE90A9xsKE9oA+wwHE9kAWgoT2gAkChPZAC0KE6oA9wwGE8oA+/wHE6iALwoTqgD7DAYTmgD3DAcTmQCdChOaAPsMBhOtAHwKDqB29wz3DPcM9wz3hPcMAYv3DPf89wwD9wz4dBX3hPsM/WT3DPcM+HT3DPx09wz3/PcM9wz3hPsM9wwH+/z7DPf8+4QGDov3DPjs9wwSi/cMi/f8i/cME+D3DPcMFfjsBxPQXgoT4Pv8BhPQNgoTyDcKE9A4ChPgTAoOi/cMi/cM94T3DIv3DIv3DBKL9wyL9/z7hPcM9wz3DBOhAPf89wwV9/wHE6IAPgoTaIAvChMqADAKEykAdAoTCgD7hAYTFQB4ChMlAPcMBhMVAPcMBxOtAMgKE6IA+wwHE6UA9xsKE0QAMQoTpAD3DAYTogA2Cg74dPcM94R3EvcM9wyL9wwT0PeE+HQVJAoT4PdJCg74dPcM94R3EvcM9wyL9wwT4PcM+HQVJAoT0CIKE+AnCg747PcMi/cMEvcM9wyL9wwToPcM+OwVJAoTUCEKE6AmCg747PcM9wx3AfcM9wz3DPcMA/cM+HQV9wz3DPeE94T7DPsM+4QGDvjs9wyL9wwS9wz3DIv3DBOQ94T47BUkChOg+wwGE2AxChOg9wwGDvjs9wyL9wwS9wz3DPcM9wwTcPcM+HQVJQoTsPcNChNw9wz7DPsM+wwHDvjs9wz3DHcBi/cMA/jsBPjs9wz8dPcM+wwGDqB2+HT3DAGL9wz3DPcM9wz3DAMUOIsEiQoOi/cM+HR3AYv3DPcM9wz3DPcMAxQ49wwW9xcKDih294T3DPcM9wyL9wwSi/cM9/z3DBPs+wwE9wz3hPh09wz8dPcM9wz3DPeE+wz3DPcM+wwGE9yQChPsJgoT3CoKDih294T3DPcM9wyL9wwSi/cM9/z3DBPc9wz3hBX3hAcT7PeE+wz3DPsM+/z7DPf8+4T3DPeE9wz3DPsMBhPc9/z7DAcT7CYKE9yOCg4odvcM9wz3/PcMAYv3DPf89wwD+HT7DBX3DPcM9wz3DPsM9/z7DPcM/HT87PcM+HT3/AYOi/cMi/cM94T3DPeEdxKL9wz3/PcME7z3DBaiChN89wwGE7z7DPcM9/z7DAcTfCYKE7z7DPuE9/z3hPcM+4T3hPsMBxN8/WQHE7z3DAYO+wz3DPcM9wz3DPcMi/cMEov3DPf89wwT3PcM94QV94QHE+z3hPsM9wz7DPv8+wz3/PuE94T3DPsMBhPc+Oz7DAcT7CYKE9yOCg4odvcM9wz3/PcM94R3AYv3DPeE9wwD9/z7DBX3DPeE+/z3/Pf89wz7/PeE+wz93Pf8Bg77DPcM9/z3DIv3DBKL9wz3/PcME9j7DAT47PcM/HT3/PcM9wwGE7j3hPv89wz3/PsM9wz7hAYT2CYKE7gqCg4odvcM9wyL9wyL9wyL9wyL9wwSi/cM9wz3DIv3DIv3DBPDQPf89wwVE6NA9wwHE9JA9wwGE8KA+wwHE8MA+wwGE8KAKQoTp0D3DPf8+wz3DPuEBhOLQCYKE4dA9wz7DP1k9wwHE4tA+HT3DPcMBxOWQPdKChOSgPsMBhOjQHgKDov3DPf89wz3hHcBi/cM9/z3DAP3DPcMFff89/z7/Pv8+wz4dPh09wz3DPsM94T7DPuE+/z7DAf7DPv8Bg4odvchdvf89wyL9wz3hHcSi/cM9/z3DBPu+wwE9ygKE96DChPuhAoO+wz3DPjsdwH3DPcMA/cM+wwV94T3DPsM+Oz7DAYOKHb3DPcM94T3DIv3DPeEdxKL9wz3hPcM9wz3DBPv+wwE9ygKE9/3DPv89wz7DPeE+Oz7DPx0+wz3/PsM9wz7DAYT74QKDov3DPeE9wz3DPcMi/cMEov3DIv3DPcM9wyL9wwT6vcM9wwV9/z3hPsM9wwHE+nTChPl+wz3/PcM9wz3hAcT4vsM9wz7DPcMBhPhogoT6vuE+wz7hPcMBhPUIQoT6vsM+wz7DPcM+wz7DPv8Bw4odveE9wyL9wz4dHcSi/cM9/z3DBO8+HT7DBX3EgoT3PsM+4T47PsMBxO8/OwHE9z3EwoTvPcMBg6gdvf89wyL9wz3hHcSi/cM9/z3DBPciwSCChO8gwoT3IQKDov3DIv3DPcM9wz3DPcMi/cMEov3DPf89wwTpvcM9wwV7QoTZiYKE6ZFChNm9wwGE677DPcM9/z7DPcM9wz3hAcTNvx0BhMuMQoTdvcM+wz3/PsM+/z7DPsM+4QGDvsM9wygdvh09wwSi/cM9/z3DBO4+HT7DBX3hPcM+wz4dPsM9wz8dAYTePzs9wz4dPf8Bw6L9wyL9wz3hPcM9wz3DBKL9wz3/PcME7z3DPcMFdQKE3wnChO8RQoTfPcMBhO8+wz3DPh0+wz3DPv89wz4dPcM/HT7DPsMBxN8/OwHDov3DPh0d/cg9wwBi/cM9/z3DAP3DBb4dPlk9wz3DPuE/WT7/Ph0+wz8dPcMBg77DPcMi/cM+HR3Eov3DPf89wwTuPcM+wwVOwoTeCAKE7j87Pv8BxN4MQoTuPcMBg6L9wz4dHf3IPcMAfcM9wz3/PcMA/eEFvh0+Oz7DPx0+/z5ZPuE+wz3DPzs9wwGDvsM9wz3DPcM9wz3DIv3DBKL9wyL9/yL9wwT2vsMBHIKE9Q7ChPSJQoT1DgKE+grChPU9/z7hPv8BhPaJgoOoHb3/PcMi/cMEov3DPf89wwT2IsEggoTuIMKE9gmChO4KgoO+wz3DPcM9wz3DPcMi/cMEov3DPf89wwT3PsMBPjs9wz8dPcM9/z3DPcM94QGE+z8dAYT3DEKE+z3DPsM9/z7DPv8+wz7DAYOKHb3DPcM+HR3AYv3DPcM9wz3DPcMAxQc+HT7DBX3GAoO+wz3DPcM9wyL94SL9wwSi/cMi/f8i/cME8j3DPeEFROo94QHE6T3/AYTxPuEBxPK+/z7DPsM+4T47PcM/HT3DAYTxDsKE6IlChOk+wwGE5REChOoLAoOi/cM9/z3DBKL9wz3hPcMi/cME+iLBPcM+HT3/AYT8PuE+wz7hAcT6KIKE/AwChPo90sKDov3DPh0dwGL9wz3/PcMA/cMFpMKDvsM9wyL9wz4dHf3mHcSi/cM9/z3DBO8+HT7DBX3hPcM+wz53PsMBhN8/WT7/Ph0+wz8dPcM+wz3/AcOi/cM9/z3DAGL9wz3hPcM94T3DAMUOPcMFvf8+HT3hPx09wz4dPsM9wz7/Px0+4T4dPsM/HT3DAYOKHb3IXb4dPcMAYv3DPf89wwD+wwE9wz47Pf8/HT3DPh0+wz3DPx0Bg77DPcM9wz3DPeE9wwBi/cM9/z3DAP3DPeEFYEKDov3DPh0dwGL9wwDiwT4dPcM+/z4dPsMBg4odvcM9wz3/PcM94R3AYv3DPeE9wz3hPcMAxQO9/z7DBX3DPjs94T8dPcM+HT7DPcM+4T3hPsM/WT7hPh0+wwG/HT3DPsM94QHDih29wz3DPcM9wyL9wyL9wwS9wz3DPf89wwT7vf89/wV9wz7DPcM+wz8dPsM+wz3DPsM9wz3DPh09wz8dPcMB/f89wwGE9YhChPO9ywKE9b3hAYT7vsMBw6L9wyL9/yL9wwSi/cMi/f8i/cME5D3DPcMFRNQ9/wHE0j3/AYTiPv8BxOQ+/wGE4g2ChNELwoTSPsMBhMoRAoTUHwKDih29wz3DIv3DPeE9wyL9wyL9wwSi/cMi/f8+4T3DPcM9wwT0ID3/PcMFff8BxPRAD4KE7RALwoTlQAwChOUgHQKE4UA+4QGE4qAeAoTkoD3DAYTioD3DAcT1oDIChPRAPsMBxPSgPcbChOiADEKE9IA9wwGE9EA+wwHE9CAWgoT0QAkCg6L9wyL9wz47HcSi/cM94T3DBO49wwWJAoTePcMBhO4+wz3/PcM+4T3/PsMBxN4JwoTuPsM+wz5ZPsMBxN4/WQHE7j3DAYO+wz3DIv3DPcM9wz3hHcSi/cM9/z3DBO89wz7DBU7ChN89wz3hPcM9wz7DPeE+wz7hPuE+wz3hAYTvNMKE3wxChO89wwGDvf89wyL9wwSi/cME6D3DPf8FaMKE2AxChOg9wwGDqB29wz3DPcM9wz3DPcMi/cMEov3DPeE9wwT7vf8FvcM9wz3DPcM+wz3DPcM9wz7DPeE+wz3DPuEBhP2KwoT7veE+4T7hPsM94T7DPuE+wz3hAYO+HT3DAH4dAQ0Cg6L9wz3/PcMAfeE9wwD94T4dBUhCvzsBCEKDov3DPf89wwB9wz3DAP3DBb3/PcM+4T3/PeE9wz7hPsM+wwGDov3DPcM9wz3DPcMEov3DIv3DPcM9wyL9wwU4BP0iwT3DPeE94T7DPcMBhPiKQoT5PsMBhPq94T3DPeE+wz7hPuE9wwHE/T7DPcM+wz7DPcM+4T7DAYOi/cM9/z3DAH3/PcMA4sE90wKDov3DIv3DPeE9wwSi/cMi/cMi/cMi/cME7CLBCQKE2gkChNk9wwGE6J2ChNi94QHE3T3LQoTaCcKE7AmCg6gdvh09wwB9/z3DAP3/Bb3DPh09wz3DPzs+wz3/AYOoHb4dPcMAYv3DPf89wwD+HQW900K/HT8dBWUCg6gdvjsdwH3hPcMA/eEFiAKDqB2+HT3DAH3hPcMA/eEFvcM+HT3DPcM+/z7DPcMBg6gdvh09wwBi/cM9/z3DAOLBIoKDov3DPf89wwBi/cM9/z3DAP3DBb3/PcM9wz3/PsM9wz7hPsM94T7/Pv8+HT7DPx09wwGDvf894QB94T3DAP3hPf8FSIKDih2+Oz3DAH4dPcMA/h0+wwV9wz5ZPzs+wz4dAYOi/cM9/z3DAH4dPcMA4sE904KDov3DIv3DPeE9wwSi/cM9wz3DIv3DIv3DBO494QWJAoTdCQKE3L3DPf8/HT3DPsM+4T4dAYTdCcKE7gmCg6L9wz3/PcMAYv3DPf89wwD9wz3DBX3/Pf89wz8dPzs+Oz4dPsM+/wHDov3DPeE9wyL9wwSi/cMi/cM94T3DBPUiwQvChPMJAoTrPeE+/z7DPsM94T4dPsM9wz7hAYTzPsMBxPU+wwGE7QxChPUyAoOKHb5ZHcB94T3DAP3hPsMFVMKDov3DPf89wwB9/z3DAP3DBb3/Ph0+wz3DPuE+wz3hPv8+4QGDov3DIv3/Iv3DBKL9wyL9/yL9wwTkPcM9wwVE1D3/AcTSPf8BhOI+/wHE5D7/AYTiDYKE0QvChNI+wwGEyhEChNQfAoO+wz3DIv3DIv3DPf8dxL3DPcMi/cMi/cMi/cME5L7DAQ7ChNSJAoTMWkKE1L8dAcTVPsMBhM09wwHEzj3PQoTNPsMBxNU9wwGE5I5Cg4odvf89wz3DPcMAYv3DPf89wwD+HT7DBX3DPjs+wz3DPx0+/z3hPcM+wz3DPf8Bg6L9wz3DPcM9wz3DAGL9wz3/PcMAxTgiwT3TwoOKHb3/PcM9wz3DBKL9wyL9wz3DPcMi/cME+z3hPsMFYIKE+IiChPs+4T7DPsM+wz3hAcT8HUKE+x2Cg6L9wz3DPcMi/cMi/cMEov3DIv3DPeE9wwTyosE+Oz3hPsM9wwGE6b3DAYT1veE+wz7hPuEBxOm9wwHE6r7DAYTmjEKE6r3DAYTpvsMBxPG9wz7DPeE+wwGE8r8dAYOKHb3IXb3hPcM9wz3DBKL9wz3DPcMi/cMi/cME/z3hBYlChP6JAoT+XMKE/omChP8Jgr7hPv8FWkKDqB2+HT3DAH4dPcMA/h0FvcM+HT7DPcM/HT7DPh0Bg6L9wz3DPcM94R3AYv3DPcM9wz3DPcMAxQc9wwW91AKDov3DPf89wwB9wz3DPeE9wwDiwT3hPh094T8dPcM+HT7DPcM/HT7DPcM+/z7DAYOoHb47HcB9wz3DPcM9wwD9/wWIAr7hPzsFSAKDqB2+Ox3AfcM9wz3DPcMA/cM9/wVIgr3hPzsFSAKDvf894QB9wz3DPcM9wwD9/z3/BUiCvuE+4QVIgoO94T3DPeEdxL3DPcMi/cME+D3DPeEFSQKE9AiChPgJwoO94T3DIv3hBKL9wz3hPcME7D3hAS2ChNwIgoTsCcKE3BYChOwJwoOi/cMi/cMi/cM9wz3DPeEdxKL9wz3DPcMi/cMi/cME7yA9wz3DBXUChM9ACYKE14AJgoTngD7DAcTXgAkChO9ACQKE76A9wz3hPx094T7DP3c94T3DAYOi/cMi/cM+HT3DBKL9wyL9wz3hPcME6z3DBY7ChN0IQoTtPsM+/z4dAcTbPUKE3T87PsMBhNs9wwGE3RDChO09wwGDov3DPeE9wz3hPcMEov3DIv3DPeE9wwU4BP0+HQW9/z3DPuE+WT7DPv8+/z3hAYT7CEKE/T3LwoT7KEKDov3DPiJdvcM9wwBi/cM9/z3DAP4dBb3/PcM+4T5ZPzs+4T3DPcM9/wGDov3DIv3/Iv3DPcM9wwSi/cMi/f8i/cME5j3DPcMFRNY9/wHE1T3/AYTlPv8BxOY+/wGE5Q2ChNSLwoTVPsMBhM0pQoTOveE9wz87PsM94T7DAYTNPsMBhNYfAoOoHb5AXb3DPcMAYv3DPf89wwD+HQW9wz53Pzs+4T3DPcM9/wGDqB2+HT3DKB29wz3DBKL9wz3/PcM9wz3DBPe+HQW9wz4dPcM+wz3DAYTvveEBxPe+4T3hPzsBhO++4T3DPcM9/wHDov3DPeE9wyL9wz3DPcMEveE9wz3/PcME9z3/PcMFeUKE7z3UQoT3PsM+wz3/Pv8+wz3hPzsBw6L9wz3/PcM9wz3DAGL9wz3/PcM9wz3DAP3DPcMFfjs9/z87Pv8+wz4dPh09wz7DPcM94T7hPeE/HT7DAf7DPzsBg6gdvlk9wwB+HT3DAP4dBb3UgoOoHb3DPcM9/z3DPcMdwGL9wz3/PcMA/cM94QV9/z3/Pv8+/z7DPf8+wz3DPjs+wz3DPv89wz7DPzsBw6L9wz3hPcMi/cMoHb3DPcMEov3DPcM9wz3/PcME8/3/PcMFeUKE6/3UQoT3/sM+wz3/Pv8+4T3DPcM9wz87AcOi/cM9/z3DPcM9wwBi/cM9/z3DAP3DPcMFff89/z7/Pv8+wz3/PcM9wz3/PcM9wz7DPeE/Oz7DAf4dPsM+/z7DPsM+/wGDqB2+HT3DPcM9wwBi/cM9/z3DAOLBPcM+HT3/Px09wz4dPsM9wz7/PcM+HT3DPzsBg6L9wyL9wz4dPcMEov3DPeE9wyL9wz3DPcME7b3DPcMFfjs9/wHE3phChO6YgoTtqYKE3ohChO6qwoTevcMBxN2YwoOi/cM+Oz3DAH3hPcM9/z3DAP3/Bb3/PcM9wz5ZPsM/WT7/Plk+/z7DPeE/Oz3DAYOoHb3/PcM94T3DAH3DPcM9/z3DAP47Bb3DPnc+wz7/Pv89/z7hPsM9wz7hPcM+wz3/AYOi/cM9/z3DPeEdwGL9wz3/PcM9wz3DAP3DBb3/PcM9wz3/PcM+wz3DPeE+4T3hPsM/WT7/PeE+wwG+4T3DAcOi/cM+WR3AYv3DPf89wwD9wwW9/z3DPcM94T7DPuE+/z5ZPsM/WT3DAYOi/cM+HT3DIv3DBKL9wz3/PcME9j3DPjsFRO49wwHE9hfChO49wz8dP3c+Oz3DPx09/z3/AcT2PcMBw6L9wyL9wz4dPcMEov3DIv3/Iv3DPcM9wwTsvcM9wwV+OwHE6peChOy+/wGE6r7DPf89wz3hPsM9wz3DPsMBxNm9wz7DPh0BxNqOAoTckwKDqB294T3DIv3/Iv3DBKL9wyL9/z7hPcM9wz3DBPK9wz3/BUTqvf8BxPa9xsKE9T7DAcT0vdTChPUJAoT0i0KE6T3DAYTxPv8BxOhLwoTpPsMBhOURAoTqnwKDqB2+HT3DPeEdwGL9wz3DPcM9wz3DAMUHPeEFvcM+HT3DPsM9wz3hPuE94T7DPuE+wz3DPsM+4T3hAYOoHb5ZPcMAYv3DPf89wwDiwT3RwoOoHb3/PcM9/x3AYv3DPf89wwD+HQW9zYKDov3DIv3DPcM9wz3/HcSi/cM9/z3DBO89wwWOwoTfPcM+WT7DPv8+/z3/PsM+/z3DPsM9/wGE7zTChN8MQoTvPcMBg6gdvh09wz3hHcBi/cM9/z3DAOLBPdACg4odvcM9wz4dPcMi/cMEov3DPf89wwT3Ph0+wwV9wz3/PsM+wz7/PjsBhPsXwoT3PcM+/z7DPsM/Oz3DPsM9/wHDov3DPf89wz3hHcBi/cM9/z3DPcM9wwD9wz3DBX3/Pf8+/z7/PsM+HT4dPcM+wz3DPeE+4T3hPsM+4QH+/z7DPsM+/wGDqB294T3DPeE9wyL9wwSi/cM9wz3DPcM9wwUDhPu9wz47BUT3vcMBxPuXwoT3vcM/HT93PcM94T3DPsM9wz3hPuE9wz3/AcT7vcMBw6L9wyL9wz3hPcM9wz3DBKL9wyL9/yL9wwTtPcMFjsKE3IvChO0MAoTumUKE7T8dAYTuEYKE7RmChO4+/wGE3gxChO49wwGDov3DPeE9wz3/HcBi/cM9/z3DAOLBPjs9wz8dPeE9/z3DPcM9/z7DPv8+/z3/PsMBg77DPcMi/cMi/cM9wz3hIv3hPsM9wwSi/cMi/cM9wz3DIv3DBOxAPeE9/wV94QHE7IA+wwGE7EA+4T3DPsM+wwHE4IArgoTQYD3DAYTIYCHChNAgPcMBhNAQCkKE0CA+wwGEzCA9wz7DPcM9wz3hAcTCkD3VAoTtkD3VQoTsYAsCg6L9wz4iXb3DPcMAYv3DPcM9wz3/PcMA/f8Fvf89wz3DPeE+wz7hPv8+WT7/PuE9wz3DPcM/Oz3DAYOoHb3/PcMi/cM94R3Eov3DPf89wwTvIsE0QoT3F8KE7z3DPv894T7DAcOi/cMi/cM9/z3DPcMdxKL9wz3/PcME7z3DBY7ChN89wz4dPsM9wz7/PcM+wz7hPh0BhO8/HT7/AcTfDEKE7z3DAYOoHb3/PcM94T3DBKL9wyL9wz3hPcME/T4dBb3DPnc+wz7/Pv894QGE+whChP09y8KE+yhCg6gdvf89wyL9/wSi/cM9wz3DPcM9wwUHBPc94QWggoTvJQKE9w/ChO8lgoT3OcKDov3DIv3DIv3DPeE9wyL9wwSi/cM94T3/Pv89wz3hPcME4WA9wz3DBUTRYD3DAcTtYD3hPsM+4T7DPf894T3hPcM+4T3DAYTFgCiChMVAPuEBhMNAPcMBxMWAPdKChMUgCQKExYA+wwGEy4ARAoTJYD8dPuEBxNFgHgKDov3DIv3DPeE9wz3DPcMEov3DIv3/Iv3DBO09wwWOwoTciEKE7T7DAcTuHsKE3Q7ChN68goTdDkKE3h8ChO49wwGDov3DPcM9wyL9wyL9wz3DPcMEov3DIv3DIv3DIv3DIv3DBPMQIsEcgoTygAkChOpACQKE5iAJAoTnEBzChOYgCYKE6kAJgoTygAmChPMQCYKDov3DIv3DPcM9wz3DHcSi/cM9wz3DPcM9wwUDhO+9wwWOwoTfvcM94T7DPcM+wz3DPsM+4T3hAYTvtMKE34xChO+9wwGDov3DIv3hIv3DPeE9wwSi/cMi/f8+4T3DPcM9wwTmPcM9wwVE1j3hAcTVPf8BhOU+4QHE5j7/AYTlDYKE1ElChNU+wwGEzT3DAcTOvsM9/z7/PsM94T7hAYTNPsMBhNYLAoO+wz3DIv3hIv3DPcM9wwSi/cMi/f8+wz3DIv3DBOY9wwWE1j3hAcTVPf8BhOU+4QHE5j7/AYTlDYKE1ElChNU+wwGEzr3hPsM9wz7/PsM9/z7DAcTNPuEBhNYLAoO+wz3DIv3DPcM9wyL9wyL9wwSi/cMi/cMi/cMi/cMi/cMEyEA9/z3/BUTEQD3DAcTEID3DAYTIID7DAcTIQD7DAYTIIApChMQQCQKExCA+wwGEwiAKgoTEQD7DAcTEgD7DAYTagAqChNsAPcvChNCAPsMBxNEgOYKE4KAXwoTaoClChMsAHQKExIA9wwGExEA+wwHDvsM9wyL9wz3hPcMi/cMEov3DIv3/Iv3DBOE9wz7DBU7ChNS0QoTFDgKEygrChOU9/z8dAYTiPv8BhNIMQoTiPcMBg77DPcMi/cM94T3DIv3DBKL9wyL9/yL9wwThPcM+wwVOwoTYvdWChMk+wwGExREChOoKwoTpPf8BhOi9w8KE4T7hAcTiPv8BhNIMQoTiPcMBg6L9wz3hPcM94T3DBKL9wyL9wyL9wyL9wyL9wwU4BPl9/z3DBX3hPcMBxPi+4QHE+T7DAYT4ikKE+X3DPeE+wz3DPsM94QGE+ikChPw9z4KE+j3DAYT9CcKE+j7DAcT5fc3Cg6L9wyL9/yL9wwSi/cMi/cMi/cM9wz3DBOS9wz3DBUTUvf8BxNK9wwGE4r7/AcTkvsMBhOKKQoTRi8KE6b3DPx09wz4dPsM9wz7DAYTRvsMBxNK+wwGEyoqChNSfAoOi/cMi/f8i/cMEov3DIv3DPcM9wyL9wwTiPcMFiQKE5L7DAYTUtQKE4SgChNKlAoTKkQKE1B8ChOQ9wwGDvsM9wyL9wz3/PcMEov3DPeE9wyL9wwTtPcM+wwVOwoTdCUKE7gwChO0JAoTuPsM9wz7DPsM9wz7DPsM+wz3DAYTtNMKE3QxChO09wwGDvsM9wyL9wyL9wyL94T7DPcMi/cMEov3DIv3DIv3DIv3DIv3DIv3DIv3DBOCUPjs+wwVIQoTQlCQChMiQJAKExIA94QHEwkA9wwGEwiAKQoTCED3DAYTCCApChMQEPcMBhMQCO8KExAQ+wwGEwQQKgoTCCD7DAcTCED7DAYTBEAqChMIgPsMBxMJAPsMBhMFACoKExJQLAoTIlD3DAYTQlD7DPsM+wz3DPcM94T7DAcTglD3hAYOi/cM94T3DIv3DPcM9wwSi/cMi/f8i/cME7r3DPcMFff8BxPS9zEKE9T7hAcT2Pv8BhPUNgoT0jcKE9TbChPSJwoTtJAKE7p8Cg6L9wz3hPcMi/cM9wz3DBKL9wz3/PcME9z3DPcMFeUKE7z3UQoT3PsM+wz3hPh09wz87P1kBw6L9wyL9/yL9wwSi/cMi/cM9wz3DIv3DBOI9wwWJAoTkPsMBhNQ9/wHEyz3UwoTRPcMBhOEoAoTQi8KE0z7DAYTLPcM+wz7DPsM9wz7DAcTUHwKE5D3DAYO+wz3DIv3DPcM9wz3hPcMi/cMEov3DIv3/Iv3DBOi9wz7DBU7ChNxPAoTMjAKEzT7/AYTLDEKE7T3DAYTsqEKE6E9ChOi+4QHE6T7/AYTZDEKE6T3DAYO+wz3DIv3DPcM9wyL9wyL9wwSi/cMi/cMi/cM9wz3DBOCgPcM+wwVOwoTaYD3DPjs+/wGEyKA+4QHEySA+wwGExSAMQoTJID3DAYTIoApChMVgPcMBhONgPcM9wz8dPv8BxNEgDEKE4SA9wwGDov3DPcM9wyL9wz3DPcMi/cMEov3DIv3DPcM9wyL9wwTogD3DBYkChOkAHQKE8MAWgoToQD3DPuE+wz7DPcM9wwGE6CAJQoTowCkChPDACYKE7IA9wwHE7SA+wz3DPf89wwGE4qAIQoTsoA5ChO0APcrCg6L9wz3/PcM94R3Eov3DPeE9wyL9wwT9PcMFvceChP4dQoT9Pv8+/z5ZPsM/WT3DAcO+wz3DIv3/PcM9wyL9wwSi/cMi/cMi/cMi/cMi/cMEyQA94T4dBX3DAcTEgD3DAYTZQAmChNKgPuE9wz3DPcMBxOIgD8KE0gAlgoTiAD3DAYThIA2ChNQgJQKExEA94QHExIApAoTJAB4Cg77DPcMi/cM94T3DIv3DBKL9wyL9wz3DPcMi/cME4X3DPsMFTsKE1HRChMWpAoTJiYKExQqChMoKwoTJloKE5L3DAYTifx0+/wHE0gxChOI9wwGDvsM9wyL9wz3DPcMi/cMi/cMEov3DIv3DIv3DIv3DIv3DBMkAPcM9/wVExQA9wwHExIA9wwGEyIA+wwHEyQA+wwGEyIAKQoTEQAkChNogPcM+4T7DPsM9wwGE4JAqwoTQgAxChOCAPcMBhOBQKYKE2hAJAoTaIAwChMoQCUKEwiApAoTEQD7DAcTEgD7DAYTCgAqChMUAHgKDvsM9wyL9wz3DPcMi/cM9/x3Eov3DIv3DPeE9wwTi/cM+wwVOwoTW/cM+dz7DPv8+4QGEysrChOd94T7/Pv8BhNNMQoTjfcMBg77DPcMi/cM9wz3hPsM9wyL9wwSi/cMi/cMi/cMi/cMi/cME4KA9/z7DBUhChNigKUKEyQAdAoTEgD3DAYTEQApChMggPcMBhMgQO8KEyCA+wwGEwiAKgoTEQD7DAcTEgD7DAYTCgAqChNkAPcvChNCAPsMBxNEgOYKE4KA9/wGDvsM9wz3DPcM94T3DBKL9wyL9wz3hPcME/T7DAT4dPcM9wz47PsM+/z7/PeEBhPsIQoT9PcvChPstAoT9Px0Bg6L9wz3hPcM9wz3DIv3DBKL9wyL9wyL9wyL9wyL9wwT1ID3hPcMFfeE94T7hPuEBxPSgPsM94T3DPcM+OwHE9EApAoT4gD7DAcT5AD7DAYT1AAqChPoACsKE+QA9wwGE+IAKQoT0QD3DAYT0oD7hPuEBxPUgCwKDqB294T3DPcM9wyL9wyL9wwSi/cM94T3DIv3DBPt9wz47BX3DPsM/WT3DPeE9/z7hPcM94T7DPcM+/z3DAcT5qIKE9YhChPO9ywKE9b3hAYT7vsMBw77DPcM9/z3DIv3DBKL9wyL9wz3DPcMi/cME8r3DPsMFff89wz3DPeEBhPEMAoTwiQKE8T7DAYTpDEKE8T3VwoTsvuE+/z4dAcTqCEKE7D3KwoOi/cM94T3DIv3DPeEdxKL9wz3/PcME7z3DPcMFff8BxPc94T7DPcM+4T7/PsM9/z3DPcM+WT7DPv8+wwGE7x+Cg77DPcMi/eEi/cMi/cM9wz3DIv3DBKL9wyL9wyL9wyL9wyL9wwTgQD3hBYTQQD3hAcTQgD7DAYTQQD7hAcTgQD3DAYTgIApChNAQCUKEyIgIQoTFiD3DPv894QHEwkA9wwGEwiAKQoTCED3DAYTCCApChMIQPsMBhMEQCoKEwiA+wwHEwkA+wwGEyUAKgoTJiBDChNSICQKEyAg9/wGE0BAJgoTgID7hAcO+wz3DIv3DPcM9wyL9wyL9wz3DPcMEov3DIv3DIv3/PuE9wyL9wwTJUD3hPf8FRMVQPcMBxNtQMgKE2SA+wwHE2RA5woThiA5ChNGADEKE4YA9wwGE4UgNgoTbCAkChNsQDAKEyyAJAoTLEAwChMMgCQKEw5A+wz3DPsM9wz7/PsM9/z7DAYTDID7DAYTFUB4Cg6L9wz3hPcM9/x3AYv3DPf89wwD9wz3DBX3hPf8+4T7/PsM9/z3DPcM94T7DPcM+/z3/PsM/WQHDvsM9wyL9wz3/PcM94R3Eov3DPcM9wyL9wwTuvcM+wwVogoTeiUKE7x0ChO6JAoTvPsM94T7DPuE+wz7DPcM+4T3DAYTuvuE+4QHE3oxChO69wwGDov3DIv3DPcM9wz3hPcMEov3DPcM94SL9wwTuvcMFjsKE3okChN8MAoTeiQKE3wwChN6JAoTfPsM9wz7hPsM94T7DPuE+wz3hPsM+4T7DPeEBhO6OQoTejEKE7r3DAYOi/cMi/cM9wz3DIv3DIv3DIv3DBKL9wyL9wyL9wz3DPcMi/cME2YA9wz4dBX3hPsM/OwHE4IA9wwGE4EgyQoTYCAkChNgQDAKEyAgJAoTIED7DAYTEED3DAcTCCAkChMIQPsMBhMEQDEKEwhA9wwGExBAeAoTYED3VwoToqD7DPx094T3DPcMBxMUgCUKE2UApAoTZgD7DAcTZQD3DAYTZoD7hAcO+wz3DPcM9wyL94SL9wwSi/cMi/cM9wz3DIv3DBPE94T3DBX3DAcTyPsMBhPG+wz3DPsM+wz7DPcM9wz3DPsM9wz3DPsM9wz3DPcMBxOlIgoTlUQKE6ksChPJ9wwGE6ntChPG91gKDvsM9wyL9wz3DPcM9wz3DBKL9wz3hPcMi/cME7r3DPsMFTsKE3oiChO894QHE7r3DPcM/Oz7DAYTvPf8+wz7DPsMBhO694T7hPv8BhN6MQoTuvcMBg77DPcMi/cM9/z3DPcM9wwSi/cMi/f8i/cME7T3DPsMFTsKE3L3VgoTtDAKE7j7/PcM94T3DAYTtPuEBhO4RgoTtKEKE7L3DwoTtPuEBxO4+/wGE3gxChO49wwGDvsM9wygdveE9wz3DPcMi/cMi/cMEov3DIv3hIv3DBOigPcMFveE94QHE6EA+4QHE6IA+4QGE6EApgoTdID3DPeE9wz3DPsM9wz3DPcM+wz3DAYTJQD3FAoTKgB4ChMyAPcMBhMqAPcMBxN1APeEBhNygKsKE3EA+wwHE3CA90oKE2EA+4QGE2KALAoO+wz3DPcM9wyL94SL9wz3DPcMEov3DIv3/PuE9wz3DPcME80A9wz3hBUTrQD3hAcT3QD3DPuE+wwGE9oA+wwHE9mA91kKE9oAJAoT2QB0ChOqAPcMBhPKAPuEBxOogCUKE6oA+wwGE5oA9wwHE50A+wz3DPsM9wz7hPsM94T7DAYTmgD7DAYTrQAsCg77DPcMi/cM9wz3DPcM9wwSi/cMi/f8i/cME7T3DPsMFTsKE3IhChO0+wwHE7j3LgoTdDsKE3ryChN0OQoTeCwKE7j3DAYO+wz3DPcM9wz3hPcMEov3DPeE9wyL9wwT9PcM+wwV+HT3DPx09wz3/PcM9wz3hAYT+HUKE/T7hPv89/z7DPzs9wwHDvsM9wz3DPcMi/eEi/cMEov3DIv3/PuE9wz3DPcME8j3DPeEFROo94QHE6T3/AYTxPuEBxPI+/wGE8T7DAcTw/dZChPEJAoToSUKE6T7DAYTlEQKE6gsCg77DPcMi/cM94T3DIv3DBKL9wyL9wz3hPcME4b4dPsMFSEKE1b3WgoTGnQKEyZfChNWRAoTWvcvChNG+wwHE0rmChOG+HQGDvcM9wyL9wyL9wwS9wz3DPcM9wwTOPcM9/wVIQoTWPeE+4QVIQoTmPuE+4QVIQoO94T3DIv3DIv3DPcM9wwS9wz3hPuE9wz3DPcME7T3hPf8FfcMBxNY9wwGE5j7DAcTUiQKE1j7DAYTuPcMBxO2+wz3DPeE9wz7/AYTuPzs94T3DAcO+wz3DIv3DPcM9wz3DPcMEov3DIv3/Iv3DBO09wz7DBU7ChNyJQoTtDAKE7plChO0/HQGE7hGChO09zMKE7j7/AYTeDEKE7j3DAYO+wz3DIv3hIv3DPcM9wwSi/cMi/cM9wz3DIv3DBOY9wwWE1j3hAcTNm0KE1L3DAYTmdMKE5U2ChNRJQoTUvsMBhMypQoTMaIKEzb7hPsM+wz3DAYTOM4KEzT3hPsM+wwGE1gsCg6L9wyL9/yL9wwSi/cMi/f8i/cME5D3DPcMFRNQ9/wHE0j3/AYTiPv8BxOQ+/wGE4g2ChNELwoTSPsMBhMoRAoTUHwKDov3DPjs9wwBi/cM9/z3DAP3DPcMFfjs9/z87Pv8+wz4dPnc/HT7DPsM/OwHDov3DIv3DIv3DPf89wwSi/cMi/h0+wz3DBOa9wz3DBUTWvcMBxO6xgoTtPsM+HT53Px0BxM6+wz7DPv89wz3/Pf8+/z7/AcTWngKDov3DIv3DPcM9wyL9wyL94T7DPcMEov3DPeE9wyL9wwTgoD3DBY7ChNCgCEKE6KA+wz7/PeEBxMjAKIKExMAJAoTCoD3DPeE/Oz7hPcMBhMWgPcZChMTACYKE2MA+wz7hPsM+wz7hAcTgoD3DAYOoHb3/PcMi/cM9wz3DBKL94T7hPcM9wz3DIv3DBPU9wz3/BUTtPcMBxPYKAoT0iQKE7EkChOyMAoTsSEKE7ImChO4+wwHE7L3DAYT0vsMBxPY+wwGE7j3DAcTtPdbChPYJAoOoHb5ZPcMEov3DPcM9wyL9wyL9wwT8IsE9wz5ZPcM+4T3DAYT6HYKE+TvChPodAoT8PdcCg6L94T4dPcMEov3DPcM9wyL9wyL9wwT8IsE9wz5ZPcM+4T3DPuE+wz7hPcM94QGE+j3DAYT5O8KE+h0ChPw91wKDqB29wz3DPh09wwSi/cM9wz3DIv3DIv3DBP4iwT3DPlk9wz7hPcM+4T7DPsM9wz3DAYT9PcMBhPy7woT9HQKE/j3XAoOi/eEi/eE94T3DBKL94T7hPcM9wz3DIv3DIv3DBOw94T3hBUTcPeEBxNk9wwGE6T7hAcTsPsMBhOk7woTovcMBhOh7woTovsMBhNi94QHE2R0ChNw910KE2h0ChOw9wz3DPuEBhOo/dz3DAcTaPeEBw6gdvf89wyL9wz3hHcSi/f8+/z3DPeE9wwT1PcM9/wVE7T3DAcT2PdKChPSJAoT2PsMBhO49wwHE7T3XgoT2KIKDqB29wz3DPcM9wz3DPcM9wx3Eov3/Pv89wz3hPcME/r3DPeEFfcM9wz3DPsM9wwHE/z3hPv8BhP5LwoT/DAKE/r7hPcM+wz93PcM9wwGE/yiCg6gdvf89wyL9wyL9wyL9wwS9wz3hPuE9wz3DPcME6r3hPjsFfcMBxOU9wwGE6T7DAcTkSQKE5T7DAYTrJAKE6L3XwoTxPcMBhPBKQoTxPsMBhOs9wwHDqB29/z3DIv3DIv3DIv3DBKL94T7hPcM9wz3DIv3DBPEAPeE+HQVE6QA9wwHE6EA9wwGE8EA+wwHE8QA+wwGE8EAKQoToIAkChOhAPsMBhORAPcMBxOIgCEKE5EA+wwHE5QA+wwGE6wA+wwHE6oAMAoTlAD3DAYTrACQChOiAPdfCg6gdvf89wyL9wyL9wyL9wwSi/eE+4T3DPcM9wyL9wwTqgD3DPjsFfcMBxOUAPcMBhOkAPsMBxORACQKE4iAIQoTkQD7DAcTlAD7DAYTrACQChOiAPdfChPEAPcMBhPBACkKE8QA+wwGE6wA9wwHDqB294T3DPcM9wyL9wyL9wwSi/eE+4T3DPcM9wyL9wwT5AD3hPh0FfcMBxPhACgKE+QA+wwGE+EAcQoT4IApChPhADAKE+CAJAoT4QD7DAYT0QD3DAcT1AD7DAYT7AD7DAcT6gAwChPUAPcMBhPsAJAKE+IA918KDov3DIv3DIv3DIv3DPcM9wz3DHcSi/cMi/eE+wz3hPuE9wz3DPcME10A9/z3hBX3DAcTLID3DAYTTID7DAcTLCAkChMsgPsMBhMcgPcMBxMdAPsMBhMeQPf8+wz7hPsM9wz7DPsM9wz7DPsM+wwHEy6A9wwGEx6AsgoTroAmChOtAPsMBxOsgPcMBhOMQHYKE0xA9wwHE4yA9wwGE4wgKQoTjID7DAYTXID3DAcOi/cMi/cMi/cMi/cM9/x3EvcM94T7hPcM9wz3DBNa94T3hBX3DAcTLPcMBhNM+wwHEykkChMs+wwGE5z3DAcTmvsM9/z7DP3c9wwGE0r3DAcTjPcMBhOJKQoTjPsMBhNc9wwHDov3DIv3DIv3DIv3DPf8dxL3DPcMi/eE+wz3DBNN94T3hBUTLfcMBxNdyAoTjSsKE0n3DAYTmfsM9wz53PsM+/wHExr7DAYTLXgKDov3DIv3DIv3DIv3DPcM9wz3DHcSi/cMi/eE+wz3hPuE9wz3DPcME06A9wz3hBUTLoD3DAcTXoDIChOOQCsKE0xA9wwGE6xAcQoTLQD3hAcTLIAkChMtAPsMBhMdAPcMBxMcgPcMBhMsgPsMBxMcICQKExyAMAoTHCAhChMcgPsMBxMcQPcKChMcgPv8BxMdAPsMBhMugHgKDov3DIv3DIv3DIv3DIv3DIv3DPcMdxKL9wyL94T7DPcM9wz3DBNDYPcM94QVEyNg9wwHE1NgyAoTg2ArChNCYPcMBhOKYHEKEwqg+HT3DPcMBxMGYCEKEwpg92AKExJg+/wHExKg+wwGEyNgeAoOi/cMi/cMi/cMi/cM9wz3DIv3DBKL94T7hPcM9wz3DIv3DBMlAPcM9/wV9/wHExoA9wwGExiARwoTIgD7DAcTGIAkChMYQCQKEwiAMAoTCgD7DAYTpgCQChOhAP3c9wz3hAcTQgD3DAYTQID7DAcTgID3DAYTgEApChOAgPsMBhNAgPcMBxNCAPsMBhMmAPcMBw73DPcMi/cM9wz3DIv3DBL3DPcMi/cMi/cME4L3/PcMFSQKE4T7DAYTZPcMBxNoMAoTJCQKExIhChNkJgoTaEYKE0T7DAcThPcMBg6L9wyL9wyL9wz4dHcSi/cM9wz3DIv3DBO8iwQlChNcKAoTnPcMBhOaKQoTnPsMBhNcKgoTvPcM+wz4dPsMBw6gdvh09wyL9wyL9wwSi/cM9wz3DIv3DBPMiwT3KAoTrCQKE5ohChOsJgoT3PdgCg6gdvf894SL9wyL9wwSi/f8+4T3DPcM9wyL9wwTxPcMFi8KE8glChOiJAoTkSEKE6ImChPY+wwHE9T3YQoTyPddChPE9wwGDov3DIv3hIv3DIv3hIv3DBKL9wyL9wz3DPcMi/cME4QAiwQkChNDAPdiChOBAPcMBhOAgCkKE4EA+wwGE0EAWAoTIQD3DAcTEQAlChMIgCEKExMAJgoTIwAnChMSAPeEBxMUAPsMBhMMADEKExQA9wwGExIA+4QHEyIA9wwGE0IAJgoThAAnCg6L9wyL94SL9wyL94SL9wwSi/cMi/cMi/cMi/cMi/cME0QA9wz3/BUTJAD3DAcTIgD3DAYTQgD7DAcTRAD7DAYThACuChNCACUKE0EA9wwGEyEA9wwHEyCA9wwGE0CA+wwHE0EA+wwGE0CA+4QHE4CA9wwGE4BAKQoTgID7DAYTQID3hAcTIEAkChMggPsMBhMQgPeEBxMIQCEKExCAJgoTIQD7hAcTIgD7DAYTEgD3hAcTFAD7DAYTDAAxChMUAPcMBhMkAPdYCg6gdvf89wz3DPcMi/cMEov3hPuE9wz3DPcMi/cME9T3DPf8Fff8BxPo9wwGE+JHChPo+wwHE+IkChPhJAoT4jAKE+j7DAYT2JAKE9T93PcM94QHE9gkCg6gdveE9wyL9wz3/HcSi/cM9/z3DBO8iwQvChPc94T7DPcM+4T3DPnc+wz8dPsMBhO89wz7hPf8+wwHDqB294T3DIv3DPf8dxKL9/z7/PcM94T3hPsM9wwT2ff894QV9wwHE7n3DAYT2SYKE7L7DAcTufcM+wz3DPnc+wz7/PsMBhPY+wwHE9T7hAYTtPcMBxO4ogoT1PdeCg6gdvcM9wyL9wz3DPcMi/cM9wx3Eov3DIv3/PuE9wz3DPcME6SA94QWJQoTxQD3DAYTxEApChPFAPsMBhO1APcMBxO0gDAKE5UAJAoTjEAhChOVAPsMBxOWgPdjChOOADEKE7YA9wwGE7UA+wwHE7SAKAoTpQD7DAYTxoArChOkgPcMBg6gdvf894T3hHcS9wz3/PuE9wwT6PeEFi8KE/AlChPo92EKE/D3XQoT6PcMBg6gdveE9wyL9wyL9wyL9wz3DHcSi/cM9wz3DPcM9wwUA4ATp4D3hBYvChPHgPcNChOngPcM+wz3/PsMBxOXgCcKE4+AMQoTl4DnCg6gdveE9wyL9wz3/HcS9wz3DPcM9wwTvPcMFi8KE9z3DQoTvPcM+wz3/PsMBw6gdveE9wyL94SL9wz3DHcSi/cMi/f8+4T3DPcM9wwTqQD3hBYvChPKAPcMBhPIgCkKE8oA+wwGE6oA94QHE60A92MKE5wAMQoTrAD3DAYTqgD7hAcTqQD3DAYOoHb53HcB94T3DAP3hBacCg6gdvf894T3hHcS9wz3/PuE9wwT6PeEFi8KE/AlChPo92EKE/D3XQoT6PcMBg6L9wyL9wyL9wyL9wyL9wyL9wyL9wwSi/cMi/cMi/cMi/cMi/cMi/cMEyBA94T3hBUkChMggPsMBhMQgPcMBxMRAPsMBhMJAPcMBxMEgCQKEwJAIQoTBIAmChMJAHgKExEA9wwGExCA+wwHEyCA9wwGE4Ag9wz7/BUkChNAECQKEyAIJAoTIBD7DAYTEBD3DAcTECD7DAYTCCAxChMQIPcMBhMQEPsMBxMgEPcMBhNAECYKE4AgJgoOoHb3hPcMi/cMi/cM94R3Eov3DIv3/PuE9wz3DPcME80A9wz3/BUTrQD3DAcT3QDIChPaAPsMBxPZAPdTChPaACQKE9kAMAoTqgD3DAYTygD7DAcTqIAkChOqAPsMBhOaAPcMBxOZAPdhChOaAPsMBhOtAHgKDqB294T3DIv3DIv3DIv3DPcMdxKL9wz3DPcM9wz3DBQDgBOXgPeEFvcoChOPgCEKE5eA92AKE6eAlQoTx4ArChOngPcMBg6gdveE9wyL9wz3/HcS9wz3DPcM9wwTvPf8FvcSChPcKwoTvPcMBg6L9wyL9wz3/PcMi/cMEov3DPcM9wz3DPcMFA4TnvcMFveE+WQGEy73DQoTnvcM+4T9ZPsMBxNOMQoTnvcMBg6L9wyL9wz3/PcMi/cMEov3hPuE9wz3DPcMi/cME4iLBKIKE4L3DAYTgSkKE4L7DAYTQioKE5j7DAcTlLgKEyj3DAYTIikKExEhChMi+wwHEyj7DAYTmJAKDqB2+HT3hIv3DBKL9wyL9/z7hPcM9wz3DBPE94QW0QoTyCUKE6IhChPI+wwHE9T7DAYTtCoKE9QmChOwMQoT0PcMBhPI+4QHE8T3DAYOi/cMi/cM9wz3DPcM9wyL9wwS9wz3DIv3DIv3DBOh9/wWJAoTovsMBhNy9wwHE3X7DPcM94T3DPuE9wwGEzIkChMpIQoTciYKE3T3ZAoTYvsMBxOi9wwGDqB294T3DIv3DIv3DPeEdxKL9wz3DPcM9wz3DBQHE5/4dBb3DPjs+4QGE68mChPP+wz7DPh0+wz87PeE9wwHE68kChOf9wwGDvncdwH3hPcMA/eE+HQVlAoO9/z3hPeEdwH3DPf8A/cM9/wV9/z3hPsM94T7DPuE+wwGDvf89wyL9wz3hHcSi/cM9wz3DPcM9wwUHBO894T3hBXkChN8IQoTvPdlChN8MQoTvOcKDqB2+HT3DIv3DPcMdxKL9wz3DPcM9wz3DBQOE773hBY3ChPe9w0KE773ZgoT3isKE773DAYOoHb4dPcMi/cM9wx3EvcM9wz3DPcME7z3/Bb3DPnc+wz7DPsMBhPcKwoTvPcMBg6gdveE94SL9wyL9wz3DHcSi/cMi/f8+4T3DBPN9wz4dBUTrfcMBxPdyAoT2vuEBxPZ91MKE9olChPZ+wz3/PsM+wwGE5r7DAYTrXgKDov3DPcM9wz3DPcM9wz3DBKL9wz3DPcMi/cME/z3DPcMFfeE9wz3DPsM94QHE/r3hAYT/CsKE/r3DPcM+wz3DPv8/dz3/PcM9wz3DAYT/HUKE/r7DAcOoHb3/PcM9wz3DPcMdxL3DPeE+4T3DPcM9wwT9PeE9/wV9wwHE/goChPyJAoT+DAKE/IhChP4+wwHE/T3WwoT+CQKDov3DPeE9wz3hPcMEov3/Pv894T7hPcM94T3DBTgE+j3hPcMFfcMBxPkMAoT8I0KE+IlChPwMAoT6DAKE+QwChPwjQoT4iUKE/D7DPcM+/z93Pf89wwGDov3DIv3DIv3DPcM9wyL9wyL9wwSi/eE+4T3DPcM9wyL9wwToQCLBCUKE0IA9wwGE0CA+wwHE4CA9wwGE4BAKQoTgID7DAYTQID3DAcTQgD7DAYTMgD3DAcTMQAwChMSACQKEwiAJAoTBEAhChMIgCYKE7YA+wwHE7UA9woKDqB2+HT3DIv3DPcMdxKL9wz3DPcM9wz3DBQOE76LBDcKE95aChO+WwoT3iYKE75cCg6gdvf89wyL9wyL9wz3DHcSi/eE+4T3DPcM9wyL94T7DPcME9oA9wz4dBX3DAcTrAD3DAYTzAD7DAcTyUD3DAYTqUD3DAcT2UDIChPYgPsMBxPYQPcM+/z3DPnc+wz7DAYTmID7DAYTqQD7DAcTrAD7DAYT3AD3DAcT2gD7DPcM+wz93PcM9/wGE9wAJAoOoHb4dPcMi/eEEov3DPcM9wz3DPcMFBwT3PeEFvcoChO8IgoT3CcKE7xYChPcJwoTvPcpChPc5woOoHb47PeEAfcM9/wD94QW9wz47PcM94T7/PuE9wwGDqB2+HT3DIv3DPcMdxL3DPcM9wz3DBO89wwWNwoT3PcNChO8XAoOoHb3hPeEi/cMi/cM9wx3Eov3/PuE9wz3DPcME9v3hPh0FfcMBxOp9wwGE8z7DAcTqyEKE9v3DPsM9wz7DPv8BxPc910KE9r3UwoT3CUKDvcM9wyL9wyL9wyL9wyL9wwSi/cMi/cMi/cMi/cMi/cME4IA94T3hBUTQgD3DAcTRAD7DAYTQgD7DAcTggD3DAYTgQApChNAgCQKEyBAJAoTIID7DAYTEID3DAcTEQD7DAYTCQAqChMSACYKEyQAeAoTRAD3DAYTJAD3DAcTEgAkChMRAPcMBhMQgPsMBxMggPcMBhNAgCYKE4EA+wwHDov3DPcM9wyL9wyL9wz3DPcMEov3DIv3DIv3DIv3DIv3DBPKAPeE94QV9wwHE8wA+wwGE8oA+wz3DPsM+wz7DPcM9wwHE8kA9wwGE8iAKQoTyQAwChPIgCQKE6hAJAoTqID7DAYTmID3DAcTmQAwChOYgCEKE5kA+wwHE5oA92cKE6wAeAoTzAD3DAYTrAD3DAcTmgAkChOZAPcMBhOYgPsMBxOogPcMBhPIgCYKE8kA+wwHDqB29wz3hIv3DIv3hPcMdxKL94T7hPcM9wz3DIv3hPsM9wwT2gD3DPf8FfcMBxOsAPcMBhPMAPsMBxPJQPcMBhOpQPcMBxPZQMgKE9iA+4QHE9hA92gKE5iA+wwGE6kA+4QHE6wA+wwGE9wA94QHE9oA92kKE9wAJQoOi/cMi/cM9wz3DIv3DIv3DIv3DBL3DPcMi/cMi/cMi/cMi/cME2EA9/z3/BX3DAcTYgD7DAYTYQBHChOCACsKE0EAJAoTQID3DAYTQED7DAcTgED3DAYTgCApChOAQPsMBhNgQPcMBxNggDAKEyBAJAoTECAkChMQQPsMBhMIQPcMBxMIgPsMBhMEgCoKEwkAJgoTEgB4ChMiAPcMBhMSAPcMBxMJACQKEwiA9wwGEwhA+wwHExBA9wwGE2BAJgoTYID7DAcOoHb47PcMi/cMEov3DPeE9wz3hPcMFBwTvPf8FvcM+WQGE9xaChO8IQoT3CYKE7xEChPcJgoTvDEKE9xaChO89wwGDqB29wz3DIv3DPcM9wyL9wz3DHcSi/cMi/f8+4T3DPcM9wwTpID3hBYlChPFAPcMBhPEQCkKE8UA+wwGE7UA9wwHE7SAMAoTlQAkChOMQCEKE5UA+wwHE5aA92MKE44AMQoTtgD3DAYTtQD7DAcTtIAoChOlAPsMBhPGgCsKE6SA9wwGDov3DIv3DPf89wyL9wwSi/cM94T3DPeE9wwUDhOeiwT3DPcM9wz7DPeE+WQGEy5aChMeIQoTLiYKE573DPuE/WT7DAcTTioKE54mCg6L9wyL94T4dHcSi/cMi/f8+4T3DPcM9wwTtIsEJAoTZPcMBhOkcQoTZPcMBxOo9wwGE6IpChOo+wwGE2j3hAcTZPsM+HT7DPx0BhNo+wwGE7QnCg6L9wyL94SL9wyL94SL9wwSi/cMi/f8+4T3DPcM9wwTRQD3DPf8FRMlAPcMBxNVAMgKE4UArgoTQQD3DAYTgQBxChNBAPcMBxOCAPcMBhOAgCkKE4IA+wwGE1IA94QHE1EAMAoTIgD3DAYTQgD7DAcTIIAkChMiAPsMBhMSAPeEBxMIgCEKExIA+wwHExUA+wwGEw0AKgoTFQAmChMNADEKExUA9wwGEyUA91gKDqB29wz3DIv3DIv3DIv3DIv3DPcMdxKL94T7hPcM9wz3DIv3hPsM9wwT0oD3DPeEFfcMBxOjAPcMBhPDAPsMBxPCUPcMBhOiUPcMBxPWUMgKE8Yg+wwHE8YQ92gKE4Yg+wwGE4pQ+wwHE5ZQyAoTikD3DAcTiwD7DAYTkwD7DAcTkkD3DAYTokD7DAcTowD7DAYTlwD3DAcTloAwChOLAPcMBhPXAPcMBxPWgPdpChPTACQKDov3hIv3DPh0dxKL9wz3DPcM9wz3DBQcE7yLBCUKE3z3DAYTvHYKE3z3hAcTvPc5ChN89wz7DPh0+wz8dPsMBxO8JgoOoHYB94T3DAP3hBaUCg6gdvcM9wyL9wz3DPcMi/cM9wx3Eov3DIv3/PuE9wz3DPcME8SA94QWJAoTxQAkChOkQCEKE80A+wwHE8yALQoTlQD3DAYTlEApChOVAPsMBhONAPcMBxOMgJ0KE40A+wwGE5aAKwoTzoD3GwoTpgAxChPGAPcMBhPFAPsMBxPEgPcMBg6gdveE9wyL9wyL9wyL9wyL9wwSi/cMi/cMi/eE+wz3DBPBAPeE9/wVE6EA9wwHE6IA+wwGE6EA+wwHE8UA9wwGE8SA+wwHE8RA92oKE4SA+dz7hAcTiQAmChOSAHgKE6IA9wwGE5IA9wwHE4lAJAoTxUA+Cg6gdveE9wyL9wyL9wz3hHcS9wz3hPuE9wz3DPcMi/eE+wz3DBPYQPjsFvcMBhPYgOUKE9hA+wwGE5iA94T7hAcTqQAmChPcAPsMBxPaAHQKE9wAJAoT2gCkChPcAPdYChPaAPcMBhPMAPuE94T3DAcTqUAkChPYQPc3ChPYgOYKE9hA9wwGDveE94QB9wz3hAP3DPeEFfeE94T7hAYO9wz3DPeE9wwB94T3DAP3hPh0FSEK/HQEIQoO9/z3DAH3hPcMA/eE9wwVMwoOoHb3hPcMi/cM9wz3DIv3DBKL9wz3DPcM9wz3DBQHE4/3hBb3DPlkBhOX9w0KE6/3DPuE+/z7DAcTxysKE6/3DAYOi/eEi/cM9wz3DIv3hBKL9wyL9/z7hPcM9wz3DBOKiwQlChNC9wwGE4J2ChNC94QHE4T3DAYTge8KE4T7DAYTZPcMBxNiMAoTJCQKExEiChMk+4QHEyr7DAYTGlgKEyonChMY9ykKE2j3DAYTZPsMBxNiKAoTRPsMBhOKJgoOoHb3DPcMi/f8i/cM9wx3Eov3DIv3/PuE9wz3DPcME80A9wz3hBUTrQD3/AcT3QD3GwoT2gD7DAcT2QBaChPaACQKE9kALQoTqgD3DAYTygD7/AcTqIAvChOqAPsMBhOaAPcMBxOZAJ0KE5oA+wwGE60AfAoOoHb3/PcMi/cM94R3Eov3DPeE9wyL9wwT3IsEggoTvPdqChO67woTvPsM94T7DPcM+wwGE9yECg6gdveE9wyL9wyL9wz3hHcSi/cM9wz3DPcM9wwUBxOfiwTRChOvKAoTz/cM+wz3hPjs+wz8dPsMBhOvKgoTn5AKDqB294T3DIv3DIv3DIv3DIv3DBKL9wyL9wyL9/z7hPcM9wz3DIv3DBPBAPeE9/wVE6EA9wwHE6IA+wwGE6EA+wwHE8UA9wwGE8SA+wwHE8RA91MKE8SAJAoTxEAtChOIgPcMBhOIIPsMBxOQIPcMBhOgICYKE8CA+wwHE6AgJAoTkBAkChOQIPsMBhOIIPcMBxOIgPsMBhOEgEQKE4kAJgoTkgB4ChOiAPcMBhOSAPcMBxOJQCQKE8VAPgoOoHb3/PcM9wx395h3AYv3DPeE9wwD9/wW9wz47PsM+wz7hPf8+wz87PcM9wz3hAYOi/cM9wz3DPcM9wz3DPcMEvcM9wyL9wwT9PeEFiQKE/gwChP0JAoT+DAKE/QkChP4MAoT9CEKE/j7DPsM+wz3DPsM+wz7DPcM+wz7DPsM9wwHDqB294T3DIv3DIv3DPeEdxKL9wyL9wyL9wyL9wyL9wwTyID3/BYlChPJQPsMBhOpQDUKE5lAIQoTqUAmChOZAPcMBxOaAPdJChOpAPsMBxOqAPsMBhPNACsKE6kA9wwGE8kAcQoOoHb4dPcM94R3Eov3DPeE9wyL9wwT+IsE9wz4dPeE+4T3DAYT9O8KE/j7DPeE+wz3DPuE94T7DAYOi/cMi/eE+HR3Eov3DIv3DIv3DIv3DIv3DBOwiwQkChNqbQoTovcMBhOhKQoTovsMBhNl94T7DPh0+wz8dAcTaPsMBhOwJwoOoHb3hPcM9wz3DAGL9wz3/PcMA/cM9/wV9wz7DPx09wz3hPf8+4T3DPh0+wz3DPv8+wz3/PsMBw6L9wyL9wz3DPcMi/cMEov3DIv3/Iv3DBOE9wwWOwoTQiEKE5T7DAcTmHsKEyT3/AYTIikKEyT7DAYTVEQKE1h8ChOI9wwGDov3DPf89wwBi/cM9/z3DAP3DPcMFff89/z7/PcM9/z7DPcM/HT87Ph09wwHDov3DPcM9wz3DPcMAYv3DAMU4IsE+Oz3DPx09wz3hPcM+4T3DPh09wz87AYO+wz3DAH3hPcMA/eE9wwVIAr93AQhCg6L9wyL9wz3/HcSi/cM9/z3DBO49wwWOwoTeGkKE7j8dPv8BxN4MQoTuPcMBg6L9wyL9wz3DPcMi/cMEov3DPeE9wyL9wwTjIsE9wwGE0z3OwoTjPcMBhOKKQoTjPsMBhNsbgoTGiEKEyxXChOcWAoOoHb3hPcMi/cM9wx3Eov3DPcM9wz3DPcMFA4TvosELwoT3loKE773OgoT3iYKE75cCg6L9wyL9/yL9wwSi/cMi/f8i/cME5D3DPcMFRNQ9/wHE0j3/AYTiPv8BxOQ+/wGE4g2ChNELwoTSPsMBhMoRAoTUHwKDqB29/z3DIv3DBKL9wz3/PcME9j3DPf8FRO49wwHE9hfChO49wz8dPzs9wz3hPf8BxPY9wwHDov3DIv3DPjsdxKL9wz3/PcME7j3DPcMFRN49xkKE7j7DPv8+wz4dPnc+wz8dPv8+HT7DPx09wwHE3h4Cg6gdvh09wwB94T3DAP3hBb3PAoOi/cM+HR3AYv3DPf89wwD9wwW9/z3DPcM+HT7DPx0+/z4dPsM/HT3DAYOi/cMi/cMi/f8Eov3DIv3DPcM9wyL9wwTjPeEFiQKE0QkChMilAoTTJUKE4wmChNI9wwHE1D7DAYTMJYKE1D3DAYTTPsMBxOM9wwGDqB29wz3DIv3DPeEdxKL9wz3DPcM9wz3DBQOE96LBPcM9wz3DPcM9wz7DPcM+wz3DPjs+wz7/PsMBhO+KgoT3oQKDov3DPcM9wz3DPcMEvcM9wyL9wyL9wwU4BPwiwSZChPoJAoT5JoKE+gmChPwmwoOi/cM94T3DPcM9wwBi/cM9/z3DAP3DPcMFfeE9/z7hPcM94T7DPcM+/z3DPh09wz8dPsM+wz87Af4dPcMBg77DPcMi/cM94T3DIv3DPcM9wwSi/cM9/z3DIv3DBNe9wz3DBX3/AcTbvcFChOt9wsKEy75ZAcTLSEKEy73DAoTXn4KDov3DPf89wyL9wyL9wz3DPcMEov4dPx09wz3DPcM9wz3DBOJAPeE+lQVIQoT2gD7DP5UFff8BxPcAEoKE9iALwoT3AAwChPaAEEKE6wA9/wGE8wA+wwHE6iAJAoTrAD7DAYT3ABLCg6L9wz3hPcMi/cM94R39yD3DBKL9wz3DPcM9wz3DBQHE5/3hPpUFSEK+wz+VBUT33kKE796ChPf+wwHE7/3hPv8Bg6L9wz47PcM9wz3DAGL9wz3DPcM9wz3DAMUHPeE+lQVIQr7DP5UFU0KDov3DPeE9wyL9wz3hHf3IPcMEov3DPcM9wz3DPcMFAcTn/eE+lQVIQr7DP5UFRO/9/wHE999ChO/fgoOoHb4dPcM9wz3DPcM9wwBi/cM9wz3DAP3hPpUFSEK+4T+zBVPCg6gdvh09wz3DPcM9wz3DAH3SPcMA/dI+lQVIQr+zASACg6L9wz3/PcM9wz3DPcM9wwSi/cMi/f8i/cME/T3DPpUFdkK/swEOwoT8vcM+HT7hPsM9wwGE/T7/AcT+vv8+Oz4dPcMBhP0/HQGE/jgCg77DPcM9wz3DPeE9wz3DPcMAYv3DPf89wwD9wz5ZBXZCvzsBIEKDqB2+HT3DPeEd/cg9wwBi/cM9wz3DPcM9wwDFA73hPpUFSEK+4T+zBVRCg6gdvf89wyL9wz3hHf3IPcMEov3DPcM9wz3DPcMFAcTn/eE+lQVIQr7hP7MFfcMBhPf90IKE7+DChPfhAoOoHb4dPcM94R39yD3DBKL9wyL9wz3DPcMi/cME/L3/PpUFSEKE/T7hPsMFSEKE/n7DP7MFVEKDqB29/z3DIv3DPeEd/cg9wwSi/cMi/cM9wz3DIv3DBOZAPf8+lQVIQoTmgD7hPsMFSEKE9wA+wz+zBUvChPagCQKE7qAgwoT2gD7DAcT3AC/Cg6gdvf89wz3DPcMi/cM9wz3DIv3DBKL9wz3DPcMi/cMi/cME8sA94T6VBUkChPGgCEKE8sAJgr7hP7MFdEKE+KA9zEKE+JAVQoT4oBWChPSQCEKE+KAVwoT0oBYCg6L9wyL9wz3DPcMi/cM94R39yD3DIv3DBLH9wz3DPcMi/cMEw2A98D6VBUkChMLQCEKEw2AJgoTiYD7hP7MFfcMBhNJgIcKE4mA9wwGE4lAKQoTiYD7DAYTaYBuChMZQCEKE6mAiAoOoHb4dPcMi/cM9wx39yD3DIv3DBKL9wz3DPcMi/cMi/cME5sA94T6VBUkChOWgCEKE5sAJgr7hP7MFfcMBhOzQPjsBxPTQFoKE7JA90MKE7KA+wwGE9NAJgoTs0BcCg6gdvh09wz3DPcMi/cMEov3DPcM9wyL9wyL9wwT7PeE+WQVJAoT2iEKE+wmCvuE/dwV9wz4dPcM+4T3DPeEBhPK9wwGE8n8dPcM+HQHE8qkChPM+wz7DPcM+4QHDqB2+HT3DIv3DPcMd/cg9wwSi/cM9wz3DPcM9wwUBxOf94T6VBUhCvuE/swV9wwGE7/47AcT31oKE79bChPfJgoTv1wKDqB2+HT3DPcM9wwBi/cM9wz3DPcM9wwDFBz3hPlkFSEK+4T93BWJCg6gdvf89wyL9wyL9wz3DHf3IPcMEov3DPcM9wz3DPcMFAOAE4+A94T6VBUhCvuE/swV9wwGE5+A+OwHE6+AKAoTz4BdChOvgCoKE5+AXAoOoHb4dPcM9wz3DAGL9wz3DPcM9wz3DAMUHPeE+WQVIQr7hP3cFYoKDqB2+Oz3DIv3DPcM9wyL9wwSi/cM9wz3DIv3DIv3DBOWAPeE+lQVJAoTjQAhChOWACYKE8SA+wz8dBUTpID3DAcTxIBfChOkgGAKE8SA9wwHDih294T3DPcM9wyL9wz3DPcMi/cMEov3DPcM9wyL9wyL9wwTywD3hPlkFSQKE8aAIQoTywAmCvsM/OwVE+NAiwoT00CMChPjQPsMBxPTQI0KDqB2+Oz3DIv3DPcM9wwSi/cM9wz3DPcM9wwUDhOe94T6VBUhChPe+wz8dBUTvvcMBxPeXwoTvmAKE973DAcOKHb3hPcM9wz3DIv3DPcM9wwSi/cM9wz3DPcM9wwUBxPP94T5ZBUhCvsM/OwVE++LChPfjAoT7/sMBxPfjQoOoHb4dPcMi/cMi/cM9wz3DBKL9wz3DPcM9wz3DBQHE4/3hPpUFSEKE9/7DPx0FfcMBxOv9/wGE8/7DAcTryEKE99kCg6gdvf89wyL9wz3DPcMEov3DPcM9wz3DPcMFA4TnveE+WQVIQr7hP3cFfcMBhPe6AoTvpAKE94mChO+KgoOi/cMi/cM94T3DPcM9wz3DPcMEov3DIv3/PuE9wz3DPcMEzkA94T6VBUhChO6APsM/swVOwoTeIAvChO6ADAKE7yAZQoTugD8dAYTvABGChO6AGYKE7wA+/wGE3wAMQoTvAD3DAYOi/cM9wz3DPcM9wz3DPcMAYv3DPcM9wz3DPcMAxQO94T5ZBUhCvuE/dwVkQoOoHb5ZPcM9wz3DAH3hPcMA/eE+lQVIQr+zARnCg6L9wz3/PcM94R39yD3DAH3SPcMA/dI+lQVIQr3DP7MFZIKDov3DIv3hPh0d/cg9wyL9wwSi/cMi/cMi/cMi/cMi/cMEzIA9wz6VBUkChMxAPcMBhMwgCkKEyhAIQoTMID7DAcTMQD7DAYTKQAqChMyACYKE6EA9wz+zBUkChNggCUKE2BAaQoTYIBhChOhAPuEBxOiAPsMBhNiAPeEBxNkAGoKE2IA+4QHE6IA9wwGDov3DIv3DIv3/PcM9wyL9wwSi/cMi/cMi/cMi/cMi/cMExIA9wz5ZBUkChMRAPcMBhMQgCkKEwhAIQoTEID7DAcTEQD7DAYTCQAqChMSACYKE4EA9wz93BUkChNAgCQKEyBAlAoTQICVChOBAPsMBxOCAPsMBhNCAPcMBxNEAPsMBhMkAJYKE0QA9wwGE0IA+wwHE4IA9wwGDqB29wz3DIv3DPh0d/cg9wyL9wwSi/cMi/cMi/cM9wz3DBOYwPeE+lQVJAoTmUD7DAYTlUAxChOZQPcMBhPSwPuE/swVawoTssAqChPSwGwKDov3DPh0d/cg9wyL9wwSi/cMi/cMi/cM9wz3DBPj94T5ZBUkChPl+wwGE9UxChPl9wwG+wz93BXWChPL+wz3hPsM+4T7DPh0+wz8dPcMBg6gdvcM9wyL9wz4dHf3IPcMi/cMEov3DPcM9wyL9wyL9wwTmwD3hPpUFSQKE5aAIQoTmwAmCvuE/swV9wwGE9MA9wz3DPcM9wwHE9KA+wwHE9NA7AoTswAqChPTAGwKDov3DPh0d/cg9wyL9wwSi/cM9wz3DIv3DIv3DBPs94T5ZBUkChPaIQoT7CYK+wz93BUTzZcKDqB29wz3DIv3DPh0d/cg9wwSi/cMi/cMi/cMi/cMi/cME5iA9/z6VBUhChOaAPuE+wwVIQoT3QD7DP7MFesKE9iA+wwHE91A7AoTvQAqChPdAGwKDov3DPh0d/cg9wwSi/cMi/cMi/cMi/cMi/cME+L3/PlkFSEKE+j7hPsMFSEK/dwEE/WXCg6gdvcM9wyL9wz4dHf3IPcMEov3DPcM9wz3DPcMFAcTn/eE+lQVIQr7hP7MFfcMBhPf9wz3DPcM9wz7DPcM+wz3DPnc+wz87PsMBxO/KgoT32wKDov3DPh0d/cg9wwBi/cM9wz3DPcM9wwDFBz3hPlkFSEK+wz93BWXCg6L9/yL9wz3DPcMi/cM9wz3DBKL9wyL9wyL9wyL9wyL9wwTCQD3hPpUFSEKE4wA+4T+zBUvChNKACQKE0kA9wwGE0iA+wwHE4iA9wwGE4hAVQoTiID7DAYTaID3DAcTaQAwChMogCQKExhAIQoTKIAmChMpAPsMBxMqADAKEywA+wwGExwAMQoTbAD3DAYTagBHChOMACYKDov3DIv3DPcM9wyL9wz3DPcMEov3DIv3DIv3DIv3DIv3DBMJAPeE+WQVIQoTjAD7hP3cFSQKE0oAJAoTSQD3DAYTSID7DAcTiID3DAYTiEApChOIgPsMBhNogPcMBxNpADAKEyiAJAoTGEAhChMogCYKEykA+wwHEyoAMAoTLAD7DAYTHAAxChNsAPcMBhNqAEcKE4wAJgoOi/f8i/cM9wz3DIv3DPcM9wwSi/cMi/cM9wz3DIv3DBMJAPf8+lQVIQoTCgD7hPsMFSEKE4wA+wz+zBUvChNLAG0KE4kA9wwGE4iAVQoTiQD7DAYTaQBuChMYgCEKEysAbwoTLAD7DAYTHAAxChNsAPcMBhNqAEcKE4wAJgoOi/cMi/cM9wz3DIv3DPcM9wwSi/cMi/cM9wz3DIv3DBMJAPf8+WQVIQoTCgD7hPsMFSEKE4wA+wz93BUkChNLAG0KE4kA9wwGE4iAKQoTiQD7DAYTaQBuChMYgCEKEysAbwoTLAD7DAYTHAAxChNsAPcMBhNqAEcKE4wAJgoOoHb47PcMi/cM9wz3DBKL9wyL9wyL9wyL9wyL9wwTkgD3hPpUFSEK/swE9wwGE9IA+OwHE9EAJAoTsIAhChPRACYKE9IA+wwHE9QAMAoT2AD7DAYTuAAxChPYAPcMBhPUAHEKDvsM9wz3DPcM9/x39yD3DAGL9wz3DPcM9wz3DAMUDveE+WQVIQr7hP5UFZgKDov3DPcM9wyL9wyL9wz3DPcM9wz3DIv3DBKL9wyL9wyL9wyL9wyL9wwTjID3DPpUFSQKE4xA9wwGE4wgKQoTjED7DAYTikAqChOMgCYKE8kQ+wz+zBVyChPIgCQKE6hAJAoTmCAkChOZEHMKE5ggJgoTqEAmChPIgCYKE8kQJgoOi/cM9wz3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwT9PcM+WQVJAoT8vcMBhPxKQoT8vsMBhPqKgoT9CYK+wz93BWZChPiJAoT4ZoKE+ImChPkmwoOi/cM9/z3DPeEd/cg9wwSx/cMi/cMi/cME/L3wPpUFSEKE/j7hPsMFSEKE/L3hP7MFaIKE/T7hPf8BhPyJAoT9PdhChP45goT9M8KDov3DPh0d/cg9wyL9wyL9wwSi/cMi/cMi/cMi/cMi/cME+IA94T53BUT0gD3DAcT0QD3DAYT4QD7DAcT4gD7DAYT4QApChPQgCQKE9EA+wwGE8kAKgoT0gB4Cv3cBBPFQJcKDvsM9wz3DPcM9/x39yD3DIv3DIv3DBKL9wyL9wyL9wyL9wyL9wwT8QD3hPncFRPpAPcMBxPogPcMBhPwgPsMBxPxAPsMBhPwgCkKE+hAJAoT6ID7DAYT5IAqChPpAHgKE+Ig+wz+VBXYChPhILQKE+Ig/HQGDqB2+WT3DPcM9wwS9wz3DIv3DBPo94T6VBUhChPw+wz+zBX3DPlk94T3DAYT6PuEBhPwJgoOoHb3DPcMi/cMi/cMi/cM9wz3DBKL94T7DPcM9wz3DBOlgPcMFvcMBhOmgOUKE5WAIQoTrYD7DPsM9/z3hPcM+4T7DPsM+wwHE86A5goTzYD3NwoTxoDmChPFgPcMBg6gdveE9wz3DPcM9wz3DAH3DPcMA/cMFvcM+HT3hPcM+4T3DPeE9wz7hPsM+wz7DPsM+wz3DAb7DPsM+wz3DAcOi/cM9/z3DPcM9wwSi/cM9wz3hIv3DBP0iwT3DPlk9/wGE/jEChP0LwoT+DAKE/T3DPeE/HT7DPsMBg6L9wyL94SL9wyL9wz3DPcMEov3DIv3DIv3DIv3DIv3DBOMAPcM9wwVE0wA94QHEyoAJAoTKQD3DAYTKID7DAcTSID3DAYTjEDTChOKQDYKE0hAJQoTSID7DAYTKID3DAcTKQD7DAYTGQD3DAcTGkD3EQoTGQD7hAYTGgBGChMqACYKE0wALAoOi/cM9/z3DPcM9wz3DPcMi/cMEov3DIv3DIv3DPcM9wwT8oD3DPpUFSQKE/GAWgoT6YAhChPxgCYKE+mAKgoT8oAmChPlgPsM/swVTgoOi/cM9wz3DPcM9wz3DPcMi/cMEov3DIv3DPcM9wyL9wwT8wD3DPlkFbYKE+iAIQoT8wAmChPrACoKE/MAJgoT5AD8dATMChPigMkKE+SAzQoT4gD7/AYT5IC0Cg6gdvjs9wyL9wz3DPcMi/cMEov3DIv3DIv3DIv3DIv3DBORAPeE+lQVJAoTkgD7DAYTigAxChOSAPcMBhPBAP7MBDcKE8CAJAoToEAhChPAgCYKE8EA+wwHE8IAMAoTxAD7DAYTpAAxChPEAPcMBhPCAHEKDvsM9wz3DPcM9/x39yD3DIv3DBKL9wyL9wyL9wz3DPcME/GA94T5ZBUkChPygPsMBhPqgDEKE/KA9wwGE+SA+4T+VBXYChPigLQKE+SA/HQGDqB2+Oz3DIv3DPcM9wyL9wwSi/cMi/cMi/cMi/cMi/cME5IA9wz6VBUkChORAPcMBhOQgCkKE4hAIQoTkID7DAcTkQD7DAYTiQAqChOSACYKE8EA9wz+zBU3ChPAgCQKE6BAIQoTwIAmChPBAPsMBxPCADAKE8QA+wwGE6QAMQoTxAD3DAYTwgBxCg77DPcM9wz3DPf8d/cg9wyL9wwSi/cMi/cM9wz3DIv3DBPzAPcM+WQVtgoT6IAhChPzACYKE+sAKgoT8wAmChPkgPsM/lQV2AoT4oC0ChPkgPx0Bg6L9wz3/PcMi/cMi/cMEov3DIv3DIv3DIv3DIv3DBPEgPcMFvceChPBAHUKE6iA+/z7/Ph0BxOkACQKE5IAIQoTpAAmChOoAPcrCg6L9wz3/PcM9wz3DBKL9wyL9wyL9wyL9wwT6vcMFveE9wz3DPf8BhPkdQoT8vv8+4T47AcT6CEKE/DgCg6L9wyL9wyL9wz3hPcMi/cMEov3DIv3DIv3DIv3DIv3DBOFAPcM9wwVE0UA9wwHE6EA9wwGE4IA+wwHE4QA+wwGE4IAKQoTUQDRChMQgCQKEwhAIQoTEIAmChMRAPsMBxMSADAKExQA+wwGEwwAMQoTNAD3DAYTMgBxChMhAPuEBxMiAPsMBhNFAHgKDvsM9wyL9wyL9wyL9wz3hHcSi/cMi/cMi/cM94T3DBOMgPcMFhNMgPcMBxOqgPcMBhONgCYKE4qAyQoTWoD3RQoTKoD7DAcTmYA6ChMpgPcMBxMqgKQKE0yAeAoOi/cMi/f8i/cM9wz3DBKL9wyL94SL9wyL9wwTFfcM+WQV2QoTmP1kBBNY9/wHE1T3hAYTlPv8BxOY+4QGE5SmChOS9wwGE5EpChOS+wwGE1L3/AcTMSEKE1L7DAcTVPsMBhM0kAoTWHwKDqB2+HT3DPcM9wz3DPcMEov3DIv3/Iv3DBP09wz6VBXZChP6/HQE2goT9DgKE/j7DAcT9Pf8BhP6+wwHDov3DPh0d/cg9wwS9wz3DIv3DBPw9wz5ZBXZChPo9wz93BUkChPwagoOi/cM+Oz3DPcM9wwB9wz3/AP3DPpUFdkK/swEUgoOi/cM9/z3DPcM9wwSi/cMi/f8+wz3DIv3DBPo9wz5ZBXZCv3cBDsKE+IvChPkdQoT6Pv8BxPw1woOoHb47PcMi/cM9wz3DBKL9wyL9wz3DPcMi/cME5X3DPpUFdkK9wz+zBUT0nAKE7EhChPWbwoT2PsMBhO4MQoT2PcMBhPWcQoO9/z3DAH3DPf8FdkKDvf89wwB9/wE92sKDvf89wwB9/wE+lT3DP5UBg75ZPcMEvcM9wyL9wwTwPcM+HQVJQoToCEKE8AmCg74dPcM94R3EvcM9wyL9wwT4PcM+HQVJAoT0CIKE+AnCg77DPcMEvcM9wyL9wwTwPcM+wwVJAoToCIKE8AnCg74dPeEi/cMEov3DPeE9wwTsPh0BPcM94T3DPuE9wz3hAYTcCEKE7AmChNwKgoTsCYKDvh09wyL94QSi/cM94T3DBOw+HQEtgoTcCIKE7AnChNwWAoTsCcKDvsM9wyL94QSi/cM94T3DBOw+wwEtgoTcCIKE7AnChNwWAoTsCcKDqB2+HT3DPeEdwH3hPcMA/eEFvcM+HT3hPcM+4T3hPsM+4T7hPsM94QGDqB294T3DPcM9wz3hHcB94T3DAP3hBb3AQoO94T3hAH3DPeEA/cM94QV94T3hPuEBg6L9wwBi/cM94T3DPeE9wwDFHD5ZBYhCvv8+wwVIQr7/PsMFSEKDov3hPuE9wz3hPcM9yF29wz3DBKL9wyL9wyL9wyL9wyL9wz3DPcMEzwg+OwEIgoTuCD5ZP3cFSIKE7hg+4T7hBUiChN8IPx0+4QVJAoTeiAlChN5ICQKE3igJQoTeGAhChN4oCYKE3kgJwoTeiAmChN8ICcKDov3hPuE9wz3hPcM9yF29wz3DBKL9wyL9wyL9wyL9wyL9wyL9wz3DPcMEzwQ+OwEIgoTuBD53P3cFSIKE7gw+4T7hBUiChO4kPuE+4QVIgoTfBD7/PuEFSQKE3oQJQoTeRAkChN4kCUKE3hQIQoTeJAmChN5ECcKE3oQJgoTfBAnCg747PcMi/cMEvcM9wyL9wwToPcM+OwVJAoTUCEKE6AmCg747PcMi/cMEov3DPeE9wwTsPjsBLYKE3AhChOwJgoTcCoKE7AmCg747PcMi/cMEov3DPcM9wz3hPcME7j47AT3DPcM9wz7DPcM9wz3DPsM9wz3DAYTeCEKE7gmChN4KgoTuCYKE3gqChO4JgoO+Oz3DIv3DBL3DPcMi/cME5D3hPjsFSQKE6D7DAYTYDEKE6D3DAYO+Oz3DIv3DBKL9wz3hPcME7D3DPjsFbUKE3AqChOwJgoTcDEKE7D3DAYO+Oz3DIv3DBKL9wz3hPcM9wz3DBO49wz47BX3DPcM9wz7DPcM9wz3DPsM9wz3DPsMBhN4KgoTuCYKE3gqChO4JgoTeDEKE7j3DAYO9wz3DIv3DPcM9wyL9wwS9wz3DIv3DIv3DBOC9/z3DBUkChOE+wwGE2T3DAcTaDAKEyQkChMSIQoTZCYKE2hGChNE+wwHE4T3DAYO9wz3DIv3DPcM9wyL9wwS9wz3DIv3DIv3DBOI9wz3DBUkChNkJAoTYiQKEyQwChMo+wwGExgxChNo9wwGE2RHChOIJgoOi/cMi/cMi/cMi/cMi/cMi/cMi/cMEov3DIv3DIv3DIv3DIv3DIv3DIv3DBMCIPf8+WQVIQoTEAT3/Px0FSEKExEA/WT7DBUhChOAIPf8/HQVIQoTgQD7/PsMFSQKE0CAJAoTIEAkChMgIPcMBhMgEPsMBxNAEPcMBhNACPsMBxOACPcMBhOABCkKE4AI+wwGE0AI9wwHE0AQ+wwGEyAQ9wwHEyAg+wwGExAg9wwHEwgQJAoTBAgkChMCBCEKEwQIJgoTCBAmChMQIPsMBxMQQPsMBhMIQPcMBxMIgPsMBhMEgPcMBxMFAPsMBhMDADEKEwUA9wwGEwSA+wwHEwiA9wwGEwhA+wwHExBA9wwGEyBAJgoTQIAmChOBACYKDov3DPlkdwH3DPcM9wz3DAP3/PeEFSAK+4T87BUgCveE/dwVIQr7hPsMFSEKDov3DPeE9wz3DPcMi/cMEov3DPcM9wz3DPcMFA4T3vf8+HQV94T3DPuE9wz3hPsM9wz7/AcT7isKE973DPx09wz3DPcM9wwG+4T8dBUhCg6L9wyL9wyL9wz3DPcM9wz3DBKL9wz3DPcM9wz3DPcM9wwTH4D3hPh0FTIKE5+A94T87BW1ChNfgPcMBxM/gCEKE1+AJgoTP4AxChNfgPcMBhOfgCYK/HT7DBW1ChNfgPcMBxM/gCEKE1+AJgoTP4AxChNfgPcMBhOfgCYKDov3DPcM9wyL9wz3DPcMi/cMEov3DPcM9wyL9wyL9wz3DPcME8xA+WT3hBUgChPGQPx0/OwVJAoTrUAkChOswEgKE5TAKwoTrMD3/AYTpUAnChPGQCYK+HT7/BUhCvx0+wwVIQoOi/cM9wz3DIv3DPcM9wyL9wwSi/cM9wz3DPcM9wyL9wyL9wwTxwD4dPeEFSQKE66AJAoTrkBIChOWQCsKE65A9/wGE6aAJwoTxwAmCvx0+wwV9wwGE84A+Oz7DAcThwD4dP3cFSEK/HT7DBUhCg6L9wz3/PcMEvcM9wyL9wyL9wwT4PcMFiQKE9AlChPI9wz3hPx0+wz3/AYT0CYKE+AnCg6gdvjs9wyL9wwS9wz3DPcM9wwTuPcMFvcM+WT3DP1k9wz4dPcMBhPYiwoTuPcM/Oz7DPcMBw73hPcM9wz3DAH3DPcM9wz3DAP3DPeEFTIKDih2+Oz3DAH3hPcMA/eE+HQVIQr9ZAQiCg6L9wz3DPcM9wz3DPcM9wwS9wz3DIv3DIv3DBP49wz4dBUkChP09wwGE/IpChP0MAoT8iEKE/T7DAcT+PdnCvzsBCQKE/T3DAYT8ikKE/QwChPyIQoT9PsMBxP492cKDov3DPjs9wwS9wz3DIv3DIv3DBPg9wz5ZBUhChPI94T93BUhChPg+4T7DBUlChPQLwoTyCIKE9AnChPglQoO+Oz3DIv3DBKL9wz3DPcM9wz3DPeE9wwTvPjsBPcM9wz3DPsM9wz3DPcM+wz3DPcM9wz7DPcM9wwGE3whChO8JgoTfCoKE7wmChN8KgoTvCYKE3wqChO8JgoO94T3DIv3/Iv3DBKL9wyL94SL9wwTkPcM9/wVE1D3/AcTSPeEBhOI+/wHE5D7hAYTiKYKE0QvChNI+wwGEyiQChNQfAoO+Ox39yD3DAH3hPcMA/eE+WQVIQr87ASUCg73/PcM9wx3n/cMi/cMEov3DIv3DPcM9wwT2vcM+HQV9wz7DPuE9/z7DPcM+OwHE5b7hAYTpiYKE8r7DAcTpiQKE9r3NwoO94T3DPcM9wz3DPcMEov3/Pv89wz3hPcMFOAT8PeEBDsKE+QkChPwMAoT7PdsChPw+/z3/PsM+/wHDveE9wyL9wyL9wz3DPcMEov3DIv3hIv3DBO69wz3/BX3DAcTUveEBhOU+wwHE5j7hAYTlKYKE1ohChM691oKE1RCChNafAoO+HT3DIv3hPsM9wwSi/cMi/cMi/cMi/cME4j3DPeEFSUKE4QkChNS920KE7L3DPeEBxOEJgoTiCYKDveE9wyL9wyL9wyL9wyL9wwSi/cMi/eEi/cME4T3DPf8FRNE9wwHE0L3hAYTgvsMBxOE+4QGE4KmChNBJAoTQvsMBhMi9wwHExEkChMS+wwGEwqQChMUeAoTJPcMBhMU9wwHExL3hAYTIvsMBxMk+4QGE0R4Cg73hPcM94T3DIv3DBKL9wyL94SL9wwT0PcM+OwV9wwHE6j3hAYT1KsKE6j7DAcTpPeEBhOoRQoTpC8KE6j3FAoT0HgKDvh09wwB94T3DAP3hPf8FfduCg74dPcMAfcM+HQV2QoO9/z3DPcM9wwB9wz3/AP3DPjsFdkK+/wE2QoO94T3DPf89wwS9wz3DIv3DBPQ94T3hBUkChPgLQoT0CEKE+AuCg73hPcM9/z3DBL3DPcMi/cME+D3DPeEFSQKE9AvChPg928KDvsM9wyL9/yL9wwSi/cMi/eEi/cME5D3DBYTUPf8BxNI94QGE4j7/AcTkPuEBhOIpgoTRC8KE0j7DAYTKJAKE1B8Cg77DPcM94T3DAH3hPcMA/cM+wwVrAoO+wz3DPcM9wyL9wyL9wwSi/cMi/cMi/cMi/cME8n7DAT4dPcMBhPEpwoTwiQKE6UhChOVkAoTqagKE8ImChPEeAoTyfsMBg77DPcMi/cM9wz3DIv3DBKL9wyL94T7DPcMi/cME4T3DPsMFaIKE2EkChNiMAoTISQKEyT7DAYTFJAKE2grChNk94QGE2JGChOE+wwHE4j7hAYTSDEKE4j3DAYOKHb3DPcM9wz3DIv3DBKL9wyL9wz3DPcME+r3DPcMFfcM+wz7hPf8+wz3DAcT1vjs+4QHE+YmChPq+wwHE+YkChPa9zcKDvsM9wz3DPcM9wz3DBKL9/z7/PcM94T3DBTgE/D7DAQ7ChPkJAoT8DAKE+z3bAoT8Pv89/z7DPv8Bw77DPcMi/cMi/cM9wz3DBKL9wyL94SL9wwTuvcMFvcMBxNS94QGE5T7DAcTmPuEBhOUpgoTWiEKEzr3WgoTVEIKE1p8Cg4odveE9wyL94T7DPcMEov3DIv3DIv3DIv3DBPE9wz7DBUlChPCJAoTqfdtChPZ9wz3hAcTwiYKE8QmCg77DPcMi/cMi/cMi/cMi/cMEov3DIv3hIv3DBOE9wwWE0T3DAcTQveEBhOC+wwHE4T7hAYTgqYKE0EkChNC+wwGEyL3DAcTESQKExL7DAYTCpAKExR4ChMk9wwGExT3DAcTEveEBhMi+wwHEyT7hAYTRHgKDvsM9wz3hPcMi/cMEov3DIv3hIv3DBPQ9wz3hBX3DAcTqPeEBhPUqwoTqPsMBxOk94QGE6hFChOkLwoTqPcUChPQeAoOoHb3DPcMAfeE9wwD94QW924KDvcM9wwB9wz3DBXZCg6L9wz3DPcMAfcM9/wD9wz3hBXZCvv8BNkKDvsM9wz3/PcMEvcM9wyL9wwT0PeE+wwVJAoT4C0KE9AhChPgLgoO+wz3DPf89wwS9wz3DIv3DBPg9wz7DBUkChPQLwoT4PdvCg6L9wz3DPcM9wz3DIv3DIv3DBKL9/z7hPcM94T3DBPtiwT47PcMBhPrQQoT7SQKE+swChPtJAoT6zAKE9OeChPr9wz7hPsM+wz7DAcT7eYKE+soChPt5goT6ygKE+37DAYOKHb3IXb3/PcM9wx3AYv3DPcM9wz3DPcMAxQO94T7DBX3DPh09wz7/PcM9/z7DPcM+wz3DPsM+wz7hPx09wwG9/z3DAcODg4ODqB294T3DPcM9wz3hHcB9wz3DPf89wwD94T3/BX3DPeE+wwH+/z7/BX3DPeE9/z7hPcM94T3DPcM+wz3DPcM9wz7DPeE+wwG+4T7hPcM+wz3DPsM+4T7DPsM9wz7DPsM+wz3DAcOoHb3DPcM9wz3DPcM9wz3DHcB9wz3DPcM9wz3DPcMAxQH94T4dBX3cAr7/PuEFfcM9wz7DPcM9wz3DPsM+wz7DPcM+wz3DPf89wz3DAf7DPcM9wz3DPsM9wz7DPsM+/z3DPsM+wz7DPsM9wwG+wz7DPsM9wz7/PcM9wz3DPcMBw6L9wz3/PcMAYv3DPcM9wz3DPcM9wz3DAP3/Bb4dPjs+wz8dPv894T7DPuE9wwG+/z7DBX3DPh09/z7hPcM94T7DPcM/HQGDvsM9wz3DPcM9wz3DIv3DIv3DPcMdxKL9wz3/PcME9f3DPeEFfeEBxPv94T7DPcM+wz7/PsM+HT4dPcM9wz7DPcM+wz7DPsMBhPX+wwHE+/IChPXjgr7/AQ0Cg6L9wyL9wyL9wz3DPcMi/cMi/cMEov3/PuE9wyL94SL9wwTgID3hBaiChNAQCEKE7SA+wwHE7UApwoTNgAkChM1ADAKExYAJAoTFQAwChMIgPeEBhMIQCkKEwiA+wwGEzSAkAoTNQB4ChMyAOYKEzEAKAoTIgDmChMhAPcMBhNBAPsMBxOBAPcMBg6gdvh09wz3DPcMEvcM9wz3hPcMi/cME/j3DBZUChP0VQoT+DAKE/QkChP4MAoT9CEKE/j7DPsM+wz7hPeE+wz7hPsM+wz3DAcOoHb3DPcMi/cMi/cMi/cM9wz3DBL3DPeE+wz3hPuE9wwTrID3hBb3DAYTrgD3hAcTrQAkChOuADAKE40AJAoTjID7DPcM94T3DPzs+wz3hAYT1QD7hAcT1gDmChPVACgKE8YA5goTxID3DAYO+wz3DPcM9wyL9wz3DPeEi/cMEov3DPcM9wyL9wyL9wwT1gD3/Ph0FfeEBxPVAPc3ChPWAPsM+4T7DAYTpgAqChPGAPsM+wz7DPcM9wz3DPsM9wz3DAcTtQD3DAYTtoD7hPuE+wz3hPcM9wz3hAcTtQB0ChOUgCUKE5UA+wwGE40AKgoT1gAsCg6gdveE94T7DPcM9wz3hPuE9wwS9wz3DPf89wwT1veE+HQV93AK/HT8dBX3DPeE9/wGE673DPeE9wz7DPcM9wz3DPuEBxOW9wz8dAcTrvdkCg6gdvcM9wz3DPcM9wz3DPcMdwGL9wz3DPcM9wz3DAMUB/cM94QV9/z3DPv8+wz7DPcM+wz3DPcM9wz3DPsM9wz3DPsMB/cM94T7hPcM94T3DPuE9wz7DPsM+wz7DPsM+/wGDqB294T3DPcM9wz3DPcMAfcM9wz3/PcMA/eE9/wV93AK+/z3hBX3DPsM+wz7DPsM9wz7DPsM+wz3DPuE9wz3hPf8+4QH9wz3hPcM9wz7DPcM9wz3DPsM9wz7DPcM+/z7DPf8BvsMBw6L9wz3DPcM9wz3DPcM9wwB9wz3DPcM9wz3DPcMAxQO94QW+HT3DPx09wz47PcM+/z3DPf89wz7DPcM+wz3DPx0BvsM+HT7DPzs+wz3/PsM+/z7DPcM+wz3DAcOoHb3DPcMi/cM9wz3DIv3DPcMdxKL9wyL9/z7hPcM9wz3DBPOgPcM94QV9/z3DPv8+wwHE8UA+wwHE8SAWgoTxQAkChOkQCEKE80A+wwHE8yALQoTlQD3DAYTlEApChOVAPsMBhOtAPcMBxOsgJ0KE60A+wwGE66AfAoOi/cM9/z3DPeEdxL3DPcM9wz3DIv3DBP49wwW9wz4dPcM+/z3DAYT9CkKE/gtChP0JAoT+PsM94T7DPuE+wz3hPsM+4T7DPsM9wwGDov3hPsM9wyL9wz3DPcM9wz3DBKL9wz3DPcMi/cMi/cM9wz3DBOeQIsE9wwGEz5A94QHE55A91MKE51A9wwGE57AdgoTXsA1ChM+QPcM94T7DPcM+/z3DPh09wwGE11A/HQGE15ARgoTXUD3MwoTnUD7hAYTPUAqChOeQCYKEz5AkAoOoHb4dPcM9wz3DAH3hPcMA/lkBDQK94T93BX3PAoOi/cMi/cM94T3DPcM9wwS9wz3DIv3DIv3DBOy9/wWJAoTtPsMBhN09wwHE3gwChN09wz3DPeE9wwGE3L7DPcM9wz3DPzs+wz3/PsM+/z7DAYTdPeEBhN4RgoTdPsMBxO09wwGDov3DIv3DIv3DPcM9wyL9wz3DHcSi/eE+wz3/Pv89wz3hPcMi/cME4UA9wwWOwoTREAkChMkICEKE0RAJgoTtQD7DAcTtID7hAYTNgD3hAcTNQCiChMWAPuEBhMOAPcMBxMNAKIKEwyA+4T3DPsMBhO1APuEBxO2AOYKE7UAKAoTpgDmChOkgPcMBg6L9wz3DPcMi/cM9wx3n/cMi/cMEov3DIv3DPeE9wyL9wyL9wwTwQD3/Pf8FROxAKUKE9IA+wwGE8EA+4QHE8IA5goTwUD3DPsM9wz7DPf89wz7/AYToYD3hAcTwID3DPsM9wz3DPcMBhPAQCkKE6kg90sKE4UAKgoTigB4ChOSAPcMBhOKAPcMBxOJIPcMBhORIPsMBxPIIPh0BhPAQPuEBxPBgPsMBhOhgCoKE8GA+wwHDov3/Iv3DPcMdxKL9wz3DPcM9wz3DBQcE7yLBC8KE3z3DAYTvPv89wwHE3z3/AcTvPcM+/z3DPf8+wwGE3z3ZgoTvCYKDqB294T3DPeE9wyL9wwS9wz3DPf89wwT7PeE+OwVE9z3DAcT7F8KE9z3DPx0/HT7DPsM9wz7hPcM94T3hPcM+4T3DPf8BxPs9wwHDov3DPh09wz3DHcSi/cMi/cMi/cM9wz3DBPyiwT5ZPcMBhPq/HT3DAYT9vsM9/z3DPuE9wz3hPcM+4T3DPeE9wz3DPsM9wz7DAb7DPsM9wz7DPsMBxPq+wwGE/IuChPq+wwHE/L7DAYOi/eE+wz3DIv3DIv3DIv3DIv3hPuE9wwSi/cMi/cM9wz3DIv3DBORIPcM94QV9wwHEyEg9/wGE4Eg+wwHEyEgIQoTFSD3DPv89wwHEwgg9/wGExAg+wwHEwggIQoTBMBYChMCwCYKEwSAKgoTQoD7DAcTQwD7DPzsBhNAwPcMBhOAwHEKE0DAsgoTkEBxChORIPeEBw6L9wyL9wyL9/z7hPcM9wz3DIv3DBKL9wyL9wyL9wyL9wyL9wyL9wyL9wwTgQD3hPcMFRNBAPcMBxMgkPcMBhMYkPcM94QHEwgg94QHEyEQ9wwGE0EQlQoTgRA5ChOAkDYKE0AQJAoTIAgvChMgEPsMBhMIECoKEwgg+wwHEwhQ+wwGEwRQ9wwHEwiQ9wwGEwSQRAoTCUD7DAcTJED3DAYTIID7DAcTGED3DAYTEKAmChMggPcMBxMhAPsMBhMJACoKEyIAfAoTQgD3DAYTIgD3/AcTIQD3DAYTQQD7/AcTQgD7DAYTQQD7DAcO9/z4dPv89wyL9wyL9wwS9wz3DPcM9wz3DPcM9wz3DBOP9wz3/BX3DAYTH/f89wwHE4/7/PcMBxMv94QHE09aChMv9wwGE4/7hPcM+HT7DAcTLyYKE08mChMvKgoTj/cMBxMf/HT7DPcMBg6L9wz3DPcM+HR3Afh09wwDiwT47Pnc+wz8dPuE+wz3hPsM/HQGDov3DPcM9wz3/PcMAYv3DPf89wwDiwT4dPcM9wz47PsM9wz7/PsM+wz8dPeE9wz7DPf89/wG/Oz8dAcOi/cMi/cM+Ox3Eov3DIv3DPcM9wyL9wwTsIsEJAoTbG0KE6T3DAYToikKE6z7DAYTbPcM+wz47PsM/Oz7DAcTsCYKDov3DIv3DPcM9wyL94SL9wwSi/cMi/cMi/cMi/cMi/cME4IA94T3DBUTQgD3DAcTQQD3DAYTgQD7DAcTggD7DAYTgQApChNggCQKE2FA+wz3DPcM9wwGExFAIgoTCUCQChMSQMAKEyBA+4QHEyKApAoTEgD3DAcTFQD7DAYTDQAxChMVAPcMBhMlAK4KE1EA9wwGE0IA91gKDov3DPeE9wz3DPcMi/cMEvcM9wyL9wyL9wyL9wyL9wyL9wyL9wwT2AD3DBYkChPUACUKE9IAJAoT0QD3DAYT0KDAChPQQPc+ChPRIPcM94T7/PeEBhPQgCEKE9EAJgoT0gAnChPUAPsMBxPYAK0KE+gArwoOi/cM9wz3hPsM9wz3DPcMi/cMEvcM9wyL9wyL9wyL9wyL9wyL9wyL9wwTpAD3DBYkChOiACUKE6EAJAoTwID3DAYTwFD7hPeEBxOgICsKE6CQLwoTyID3LgoTqEAhChOogCYKE6kAJwoTqgD7DAcTrACtChO0AK8KDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wyL9wyL9wyL9wyL9wwTpAD3DBYkChNiACUKE2EAJAoTYID3DAYTYED7DAcTYCDnChOgUEUKE2gQJAoTaCAwChMokPcM9wz7/PeEBhMoQCEKEyiAJgoTKQAnChMqAPsMBxMsAK0KE7QArwoOi/cMi/cM9wz3DPeE9wwSi/cMi/cMi/cMi/cMi/cMi/cMi/cMi/cME7QA9wwWJAoTcgAlChNxACQKE3CA9wwGE3BA+wwHE3Ag5woTsFBFChNwECQKE3AgMAoTsJD3DPcM+/z3hAYTsEAhChOwgCYKE7EAJwoTugD3cQoTtAD3DAYTugD3IQoTtAD3DAYTugD7DPsM+4T3hAcTtAAnCg6L9wyL9wyL94T7DPcM9wz3DIv3DBL3DPcMi/cMi/cMi/cMi/eE+4T3DPcM9wwTggD3DBYkChNRACUKExCAJAoTIED3DAYTICD7hAcTQCD3hAYTgCBFChNQCCQKE1AgMAoTEEgkChMkQPcuChMUECEKExRAJgoTFIAnChMVAPsMBxMWAK0KE5oArwoOi/cMi/cMi/eE+wz3DPeE9wwSi/cMi/cMi/cMi/cMi/cMi/eE+4T3DPcM9wwTigD3DBYkChNZACUKExiAJAoTKED3DAYTKCD7hAcTSCD3hAYTiCBFChNYCCQKE1ggMAoTGEgkChMoQPcuChOYECEKE5hAJgoTmIAnChOdAPdxChOaAPcMBhOdAPchChOaAPcMBhOdAPsM+wz7hPeEBxOKACcKDov3DIv3DIv3hPsM9wyL9wz3DPcMEvcM9wyL9wyL9wyL9wyL94T7hPcM9wz3DBOVAPeE9/wV9wz3DPsM+wwHE4YArgoTVQAlChMUgCQKEyRA9wwGEyQg+4QHE0Qg94QGE4QgRQoTVAgkChNUIDAKExRIJAoTJED3LgoTFBAhChMUQCYKExSA+4QHExUA+wwGEw0A9wwHEw6AsAoTlQCxCg6L94T7hPcM94T3DPcM9wyL9wwS9wz3DIv3DIv3DIv3/Pv89wyL9wwTYQD4dPf8FfcMBxNgQCgKE2EA+wwGE2CA+/wHE6iA9/z3hAYTqECnChMoICQKEyhAdAoTKCAhChMoQCYKEykAJwoTKgD7DAcTLACtChN0APdyChNiACUKDov3hPuE9wz3hPcMi/cMi/eE+wz3DBKL94T7DPcMi/cMi/cMi/f8+/z3DIv3DBNiAPeE9/wV9wwHE2CAKAoTYgD7DAYTYQCuChNggCUKE2BAJAoTYBAoChNgQPsMBhNAIPv8BxOkIPf894QGE6QQpwoTJAgkChMkEHQKEyQIIQoTJBAmChMgQPuEBxMggPsMBhMUgPcMBxMWQPsM9wz3DPcMBhMKAPv8+4QGExIA94QGE2IAsQoOi/cM9wz3DIv3DPcM9wyL9wwS9wz3DIv3DIv3DIv3DIv3DIv3DIv3DBPAoPjs9wwVNQoTqQCnChOogCUKE6hAIQoTqIAmChOpACcKE6oA+wwHE6wArQoTtAD3cgoTogAlChOhAPcMBhPAkPv89/wHE8Ag94QHE8AQ9wwGE6AQ94QHE6Ag+4QGE8Ag+wwHE6AQ9wwGE8CgeAoOi/cM9wz3DIv3DIv3DPcM9wwS9wz3DIv3DPcM9wyL9wyL9wyL9wwTyUD47PcMFTUKE6kApwoTmQAlChOogCEKE6sA9wwKE5oA9wwHE5wAMAoTmgC5ChOcAOcKE6oA+wz7hPsM94T3DPcM+wz7DAcTrACuChOrIPdzChPYQPeEBxPYICUKE6hA+4QGE8hA+wwHE6gg9wwGE8lAeAoOi/cM9wz3DIv3DIv3DIv3hPsM9wwSi/eE+wz3DIv3DPcM9wyL9wyL9wyL9wwTwFD47PcMFTUKE6BApwoTlEAlChOkICEKE6TA9wwKE5SA9wwHE5YAMAoThIAkChOKAPv8+4QGE5IA94QGE6IARQoToIAoChOiAPsMBhOhAK4KE6DI93MKE9AQ94QHE9AIJQoToBD7hAYTwBD7DAcToAj3DAYTwFB4Cg6L9wz3DPcMi/cM94T3DBL3DPcMi/cMi/cMi/cMi/cMi/cMi/cME9FA+Oz3DBU1ChOyAKcKE7EAJQoTsIAhChOxACYKE7IAJwoTtAD7DAcTuAB0ChO0APcMBhOyAPeE+/z7DAcTtAD3hAYTuAD7DPsM+4T3DPuE+wz7DPcM9wwHE7QAJQoTsgD3DAYT0SD7/Pf8BxPQQPeEBxPQIPcMBhOwIPeEBxOwQPuEBhPQQPsMBxOwIPcMBhPRQHgKDov3DPeE9wz3DPcMi/cMEvcM9wyL9wyL9wyL9wyL9wwT2AD3DBYkChPUACUKE9IAJAoT0QAlChPQgCEKE9EAJgoT0gAnChPUAPsMBxPYAK0KE+gArwoOi/cMi/cM9wz3DIv3hIv3DBKL9wyL9wyL9wyL9wyL9wyL9wyL9wyL9wwTogD3hPf8FfcMBxOhACgKE6IA93QKE2EAJQoTYIAkChNgQPcMBhNgIPsMBxNgEOcKE4AoRQoTYAgkChNgEDAKEyBI9wz3DPv8BhMQQPeEBxMIICEKExBAJgoTIID7hAcTIQD7DAYTEQD3hAcTEgD7DAYTCgAqChMUACwKEyQA9wwGExQA94QHExIA9wwGE6IA+4QHE6QA+wwGE6IA+wwHDvcM9wz3DPcM9wz3DBL3DPcMi/cMFOAT6PeE9wwVJAoT8PsM9wz3/PcM+/z3DAYT6CEKE/D3dQoO9/z3DIv3DBKL9wz3DPcM9wz3DBQ4E3j3hPcMFS8KE7j3DQoTePdmChO4KwoTePcMBg73DPcM9wz3DPcM9wwS94T3DIv3DBTgE/D3hPcMFSQKE+j3PwoT8HUKE+j7DPv8+wz3/AcT8CYKDveE9wyL9wwSi/cM9wz3DPcM9wwUOBO494T3DBXkChN4IQoTuPdlChN4MQoTuOcKDveE9/z7hPcMEvcM94T7DPcM94T3hPuE9wwTUPeE9wwV9wwGE2j3hPeEBxOE93YKE4j3DAYTSIsKE4j3DAcThKQKE2j7hPuEBxOQ93cKE6D7DAYTYEYKE6D7DAcTkPcMBg73hPcM94T3DPcMdwH3DPcM9/z3DAP47Ph0FfcM9wz3DPcM+wz3DPsM+wz87PsM+OwG/HT8dBX3DPcM+Oz3DPzs9wz7DPsM+wz7DPcMBg73DPeE+wz3DIv3DIv3hPuE9wwS9wz3DIv3DIv3DPcM9wz3DPcME1LA9/z3/BX3DAcTIcD4dAYTQcD7DAcTIcAhChMJwCoKExHAKgoTCcAmChMRwCoKE4nA90gKE4rA90oKE0TA+4T7DPcMBhOEwHEKE0TA9xkKE4LAcQoTUsA1Cg73hPcM9wz3DAGL9wz3DPcMA/eE9wwV9wz3DPeE9wz8dPcM+HT3DPuE9wz7DPsM+wz7DPsMBvsM9wz7DPcMBw73/PcM9wz3DAH3DPcM9wz3DAP3DPcMFfcM+HT3DPx09wz3hPcM9wz7DPcM+wz3DPsM+wz7DAb7DPsM+wz3DAcO94T3DPcM9wwB94T3DPcM9wwD94T3DBX3DPcM9wz3DPcM9wz7DPcM+wz3DPsM+wz7hPsM+HQG+wz8dPsM94QHDvcM9wz3DPcMAfcM9wz3DPcMA/eE9wwV9wz3DPcM9wz3DPcM+wz3hPsM/HT7DPh0+wz7hPsMBvsM9wz7DPcMBw73DPeE+wz3DIv3DIv3hPuE9wwSi/cM9wz3DPeE9wz3DPcME0eA9wz3/BUTJ4D3DPlkBxNHgPsM/WT7DPcMBxOHgHEKE0eA9wz3hAcTh4BxChNHgDUKEyeAIQoTD4AqChMXgCoKEw+AqwoTF4AqChMPgCYKEyeAeAoOoHb3DPcM9/z3DPcMdwH3DPcM94T3DAP4dBb3DPjs9wz3DPsM9wz7DPsM+wz7DPcMBvv8/OwV9wz3DPcM9wz7DPjs+wz87PsM+wz3DAYOi/cMi/eE9wz3DPeEdxKL9wyL9wz3DPcMi/cME7T3hPcMFRN094QHE3j7DAYTdvuEBxO2WgoTciUKE3n3DPh0+wz7hPv894T7DPx09wz3DPf8BhN2JgoTtvuEBw6L9wyL9wz3/PcMi/cMEov3DIv3hIv3DBOE9wwWogoTQiEKE5T7DAcTmPuE+OwGEyT3hAYTIikKEyT7DAYTVJAKE1hMChOI9wwGDov3DIv3DPcM9wz3DPcMi/cMEov3DIv3DPcM9wyL9wwTpID3DPcMFe0KE2UAJgoTpQCrChOjAKYKE2kAJAoTaoD3DPh0+wz3DPuEBhMygCsKE2qA94T7hPv8BhNkgCwKDov3DPeE9wz3hPcMAfh09wwDFOCLBPjs+dz87PsM+HT7hPx0+wz4dPuE/HQGDih29wz3DPeE9wz3hPcMEov3DIv3DIv3DPcM9wwT8/f8+HQV93gKE/X7hPv8FfeE94T7hAcT+/x0+4QV9wz3DPh0+dz87PsM94T7hPuE+wwGE/X3NwoT+/sMBg6L9wyL9wz3DPcM9wx3n/cMi/cMEov3DIv3DIv3DIv3DIv3DBNigPcM94QVsgoTYQD7DAcTYgD7DAYTogArChOhAPcMBhOgoDYKE6EA+/wGE2kA9wwHE2ig9wz3DPeE9wwGEyhAMAoTKKD3DAYTJKD3hPv8BxMpACYKEzIA+wwHEykgJAoTJCD3hAYTKkBXChNygPcM+wz7/AcOi/cMi/cM9wz3DPcM9wyL9wwSi/f8i/cMi/cME6SLBDsKE3IkChNxLwoTMjAKEzT7DAYTLPd5ChN09/wGE3JxChNl+wz8dPsM+HQHE2ImChOkOQoOi/cMi/cM9wz3DPcMd5/3DIv3DBKL9wz3DPcMi/cMi/cME6KA9wz3DBUTYoAqChOigPuE9/z3DAcTaoAkChNqQC8KEyqAMAoTJkAhChMqgCYKEyaA93kKEyqA9/wGEzMA+wwHEyqA9wwGE3NA+wz7DPcM+wz7DPuE+wz3DPsM9wz3DPeEBxNigCYKE6KA+wwHDov3DPcM9wz3DPcM9wz3DBKL9wyL9wyL9wwT+IsEcgoT9CQKE/IkChP0MAoT+PMKE/RHChP4JgoO9/z3DAH3/AQ0Cg6gdveE9wz3hHf3IPcMAfeE9wwD+WQENAr3hP3cFTMKDov3DIv3DPcM9wz3hPcMEvcM9wyL9wz3DPcMEzb3/AT3hPcM9wz3DAYTOjAKEza5ChM65woTNqsKE7b3/Px0Ffd6ChN2MQoTtvcMBg6L9wyL9wz3hPcM9wz3DBKL9wz3DPcM9wz3DBQOEz73DPjsFfcM+wz7hPeE+wz3DPh0+4T7DPcM+wwHE773DPzsFfd6ChN+MQoTvvcMBg73DPcMi/eEi/cMEov3DIv3hIv3DIv3hBOQ9wz3hBUTUPeEBxNI94QGE4j7hAcTkPuEBhOIpgoThPcMBhOCpgoThPuEBhNE94QHEyJCChNE+wwHE0j7DAYTKJAKE1AsCg73DPcMi/eEi/cMEov3DIv3hIv3DIv3hIv3DBOQ9wz3hBUTUPeEBxNI94QGE4j7hAcTkPuEBhOIpgoThPcMBhNE94QHE0L3hAYTgvuEBxOE+4QGE4KmChNBJQoTQvsMBhMikAoTRPsMBxNI+wwGEyiQChNQLAoOoHb53HcB9wz3DPcM9wwD9/wWnAr7hP3cFZwKDvcM94SL94SL9wwSi/cMi/cM9wz3DIv3DBOQ9wwEJQoTTPdiChOE9wwGE4LvChOM+wwGE0xYChMsKgoTSCYKE5AnCg73DPcMi/eEi/eEEov3DIv3DPcM9wyL9wwTjPeE9wwVJAoTRCUKEyIiChNMJwoTjCcKE0j3hAcTUPsMBhMw9ykKE1D3DAYTTPuEBxOM9wwGDqB2+WT3DAGL9wz3/PcMA4sE90cKDvsM9wz5ZPcMAfeE9wwD+wwE94T3DPcM+WT3hPcM+4T7DPsM/WT7hAYO+wz3DPeE9wyL9wyL9wz3DPcMEov3DIv3/PuE9wz3DPcME80A9wz3/BUTrQD3DAcT3QDIChPaAPsMBxPdAPcM+4T7hPsM94T3DPcM94QGE9oAJAoT2QAwChOqAPcMBhPKAPsMBxOogCQKE6oA+wwGE5oA9wwHE5mA+wz3DPeE9wz7hPsM+wz7DAYTmgD7DAYTrQB4Cg73DPcM9/z3DAGL9wz3DPcM9wz3DAMUOPeE+OwVIQr3hPzsFSEK/HT7DBUhCg73DPcM9/z3DAGL9wz3DPcM9wz3DAMUOPh0+OwVIQr8dPsMFSEK94T87BUhCg6L9wz4dPcMAYv3DPf89wwD+HT47BUhCvx0+wwVIQr4dP1kFSEK/HT7DBUhCg73hPcM9wz3DAGL9wwD94T4dBU0CvuE+wwVIQr3hPv8FTQK+4T7DBUhCg6gdvcM9wz3hPcMEvcM9wyL9wyL9wwT8PcMFvUKE+j7hPeE94T3DAYT5PsM9wz7DPsM+/z7DAYT6PeE+4T7hPsMBhPw9wwGDqB29wz3DPcM9wz3DPcM9wx3EvcM9wyL9wyL9wyL9wwT/AD3DBb3DPcM+HT3DAYT+gD7/PcM9/z3DAYT+QD7hPcM94T3DAYT+ID7DPcM+wz7DPx0+wwGE/kA9/z7DPv8+wwGE/oA94T7DPuE+wwGE/wA9wwGDov3DIv3DPf89wyL9wwSi/cMi/cMi/f8E4L3hBY7ChOE+/wGE2T3DAcTaC0KEyQkChMS2QoTZCYKE2guChNE+wwHE4T3DAYOi/cMi/cM9/z3DIv3DBKL9/yL9wyL9wwTiIsEOwoTZCQKE2IvChMkMAoTKPsMBhMY93kKE2j3/AYTZPsM9wz7/PsMBxOIOQoOi/cM94T3DIv3DIv3DIv3DBKL9wyL9wyL9wyL9wyL9wwT1AD3DPf8FfeE+wz7/AcTwgD3DAYTxAArChPCAPcMBhPBQDYKE8IA+/wGE8EA5QoToIAkChORQPcMBhOJQPeE+/wHE5IAJgoTlAD7DAcTkkAkChOoQPeEBhOggCYKE9UAeAoOi/cMi/cMi/cMi/cM94T3DBKL9wyL9wyL9wyL9wyL9wwTrID3DPcMFfcM+wz7hPf89wwHE0iAJAoTKEAvChMYgDAKExhAIQoTHID7DPsM9wz7/PsM9/wHExkAJwoTKgAmChMsAPsMBxMqACQKE1lAwQoTTIAnChOsgPsMBw6L9wz3DPcM9/z3DAGL9wwD9wz3hBX3ewr7DPv8FTQKDov3DPcM9wz3/PcMAfh09wwD94QE904K+/wENAoO9/z3DAGL9wwD9wwE9wz3hPh09wz8dPeE+wwGDvjs9wwB94T3DAP3hPcMFfc8Cg73DPcMAfeE9wwD9wwE93wKDveE9wz3DPcMAYv3DAP3DAT3DPcM+HT3DPx09wz4dPcM/HT3DPsMBg73DPcM9wz3DIv3DIv3DBKL9wyL9wz3DPcMi/cME8b3hPf8FSQKE6IkChORIQoTpiYKE8YmChOk9wwHE6j7DAYTmDEKE6j3DAYTpvsMBxPG9wwGE4n7hPv8FTQKDvcM9wyL9wyL9wz3DPcMEov3DIv3DPcM9wyL9wwTGfjsBDQKE5j87AQkChNWbQoTkvcMBhORKQoTlvsMBhNWKgoTNioKE1QmChOYJgoO9wz3DIv3DIv3DPcM9wwSi/cMi/cM9wz3DIv3DBMZ+OwENAoTlveE/OwVJAoTUiQKEzEhChNWJgoTliYKE1T3DAcTWPsMBhM4MQoTWPcMBhNW+wwHE5b3DAYOi/cM+WR3AYv3DPf89wwD9wwWaAoO94T3DPcM9wwB9wz3DPcM9wwD9wz3hBUyCg6L9wyL9wyL9wyL9wyL9wyL9wyL9wwSi/cMi/cMi/cMi/cMi/cMi/cMi/cME4CA94T3DBUTQID3DAcTIEAkChMQICQKEwgQJAoTRIj3GwoTgIg5ChOASDYKE0AIJAoTJAQvChMECDAKEwIEIQoTBEgmChMCSEQKEySAJgoTJQB8ChNFAC8KEwSI91UKEwgQJgoTECAmChMgQCYKE0CA+wwHE0EA+wwGE4EAKwoOi/cM9/z3DIv3DIv3DBKL9wyL9wyL9wz3DPcMi/cMi/cME8hA9wz3DBX3/PsM/HT53Ph0BxPAgDAKE8MA+wwGE6MAKgoTkwAqChOiACYKE8QAJgoTyAD7DAcTxAAkChOjAG0KE8EA9wwGE8CAcQoTyED7/AcOi/cMi/cMi/cM9wz3DIv3DIv3DBKL9wyL9wyL9wz3DPcMi/cMi/cMEzDA9/z3/BUjChOCgPv8+4QVE0KA9wwHE6CA9wwGE4EA+wwHE4IA+wwGE4EAKQoTQND3DAYTINCyChNAUPsMBxOgUCQKE0AQ9wwGE4Ag+wwHE4BA+wwGE4AgKQoTQFAhChMwUG4KEwgQJAoTCCD7DAYTBCAqChMEQPsMBxMIIPcMBhMU0PsM+wz3DPsM+wz7DPcMBxMFAKQKEwoAeAoTEgD3DAYTCgD3DAcTNQD3DAYTMoAmChMxAPsMBxMwgCgKEyEA+wwGE0KAeAoOi/cM94T3DPeE9wwBi/cM94T3DPeE9wwDFPz3DPcMFfjs94T7/PeE9wz7DPeE94T87Pzs+wz47PcM9wz47Af7DPcM/Oz7DPsM/OwGDov3/Pv89wz3hPcMi/f8+wz3DBL3DPcMi/cM9wz3DIv3DBNEgPeE9wwVE4SAWAoTRID7hPsM+wz53PcM+wwHE4CA94QHE4EA+wwGEyEA9wwHExSA9wwGEwyA94T3DPcM/dz7DPcMBxMUAPuEBxMkAPcMBhOEAPsMBxMqACQKEyyA+wz3hPf8BhMhAPdYChOBAPcMBhNEgPuEBw73DPcM9wz3hPuE9wwS94T3DBOw9/wE+Oz3DPsMBhPQ92YKE7AmCvv8BDQKDveE9/z7hPcMEov3hPuE9wz3hPeE+4T3DBOQ9wwEJAoTqPcMBhNosgoThPd2ChOI9wwGE0iLChOI9wwHE4SkChNoJwoToPcMBxOQpAoO94T3/PuE9wwS9wz3hPsM9wz3DPeE+wz3DBNQ94T3DBX3DAYTaPeE9wwHE4j7DAcThPd9ChOo+wwGE2gmChOQ93cKE6D7DAYTYEYKE6D7DAcTkPcMBg73hPf8+4T3DBKL94T7hPcM94T3hPuE9wz3hPcME5L3DAQkChOq9wwGE2qyChOG93YKE4r3DAYTSvcM9wz7hPcM+Oz7DPuE+wwHE4r3DAcThqQKE2onChOi9wwHE5KkCg73hPf8+4T3DBKL9wz3DPeE+wz3DPcM94T7DPcME3D3DAT3DPeE9wwGE7D7DAcTqOcKE3T3hPcMBxOk+wwHE6L3fQoTtPsMBhN0JgoTqPd3ChOw+wwGE3D3YAoO9/z3DBKL94T7hPcM94T3DPcM9wwTmPjs9wwVIAoTuPzs/OwVJAoT2PcM9wz3DPuE9wz47PsM+4T7DPcMBhO4pAoOi/cMi/cM9wz3DPcM9wyL9wwSi/cMi/f8+4T3DPcM9wwTogD3DBY7ChNggCEKE6oA+wwHE62A+wz3hPeE9wz7hPsM+wz7hPsM+OwGEzIA9/wGEzCAKQoTMgD7DAYTagBEChNsAEwKE6QA9wwGDvf89wwS94T3hPsM9wwToPf89wwV9wz47PsM+wwGE8CqChOg9wwGDvf89wwS9wz3hPuE9wwToPcM9wwVJAoTwPc/ChOgpAoO94T3hPuE9wz3hHcS94T3DBNw94QE+Oz3DPsMBhOw92YKE3AmCg73/PeE+wz3DBL3hPcME6D3hPeEFcEKE2D3DPcM9wz87PsM9wwHE6BxCg73DPcM9wz3DAP3/PcMFSAK+4T87BUgCg73DPjsAYv47AP3DAT47Pjs/OwGDveE9/wB9wz3/AP3DPcMFff89wz3DPf8+wz3DPv8+wz7DPv89wwGDov3DIv3DIv3/Iv3DPcMdxKL9wyL9wz3DPcM9wz3DIv3DBMJAPf8+HQVlAoTi4D7DP3cFTsKE0mAJAoTKUAvChMrgPsMBhMbgDEKEyuA9wwGE0uAlQoTi4A5ChNLAPcMBxNNAPsMBhMtAPf8BxMbACEKEy0AfAoTTQD3DAYTS4D7DAcTi4D3DAYOi/cMi/cMi/f8i/cMi/cMEov3DIv3DIv3/PuE9wz3DPcMi/cMEyCA9/z3hBWUChOCAPsM/HQVE0IA9wwHE0QA+wwGE0IA+wwHE4IA9wwGE4EANgoTQEAkChMgIC8KEyBA+wwGExBA9wwHExEA+wwGEwkARAoTEgAmChMkAHwKE0QA9wwGEyQA9/wHExIAJAoTEQD3/AYTEED7DAcTIED3DAYTQECVChOBAPsMBw6gdvncdwH3hPcMA/eEFpwKDvcM9wz3/PcMAYv3DPf89wwD9wz3hBX3/Pf8+/wH/HT7DBX47Pjs/OwGDvcM94T4dHcB9wz3/AP3DAT47PeE+wz3hPsM94T7DPuE+wz7hPsMBg73DPeE+4T3DPcM94T3hHcSi/cMi/cM9wz3DIv3DBNZ9wz3hBUTmfclChOW+wwGEzb3hPsM94T7DPuE+wwHE5j7hAcTNvdiChOS9wwGE1n7DAcO94T3/AGL94QD9wwE94T3DPeE9wz3hPcM+4T3DPuE9wz7hAYO9wz3DIv3DPcM9wyL9wwSi/eE+4T3DPcM94QTlPcM94QV9/wHE2j3DAYTYvsM94T7DPuEBxOI+wwHE2L3fgoTKPuEBhOY9wz7hPzs94T3DAcO+Oz3hAH3DPf8A/eE9wwV9wz3hPcM94T3DPeE/Oz7hPcM+4T3DAYO9/z3hIv3hPsM9wwSi/cMi/cM9wz3DIv3DBOI94T3/BX3hAcTkPsMBhOM+4T3DPuE9wz3hPcM94QHE1L3VAoTsvdVChOMLAoO94T3/AH4dPeEA/h09wwV94T47PuE+wz7hPsM+4T7DPeE+wz3hAYO9wz3DIv3DIv3DIv3DIv3DBL3hPeEi/eE+wz3DBOE+HT3hBUTRPcsChOM94QGE4r7DPeE+Oz7hAcTFasKEyWxChNF94QGEyX3DAcTFaIKE40+Cg73hPf8+4T3DBL3DPf8+4T3DBOQ94T3DBUkChOg9wwGE2CLChOg9wwHE5CdChOg+wwGE2BGChOg+wwHE5D3DAYO9wz3DIv3DIv3DIv3DIv3DBKL9wyL9wyL9wyL9wyL9wwTggD3hPeEFRNCAPcMBxNEAPsMBhNCAPsMBxOCAPcMBhOBACkKE0CAJAoTIEAkChMggPsMBhMQgPcMBxMRAPsMBhMJACoKExIAJgoTJAB4ChNEAPcMBhMkAPcMBxMSACQKExEA9wwGExCA+wwHEyCA9wwGE0CAJgoTgQD7DAcO9wz3DIv3/Iv3DBKL9wyL9/yL9wwTkPcM94QVE1D3/AcTSPf8BhOI+/wHE5D7/AYTiDYKE0QvChNI+wwGEyhEChNQfAoOi/cMi/cMi/cM9wz3DIv3DIv3DBKL9wyL9wyL9wz3DPcMi/cMi/cMEzDA9/z3/BUjChOBIPuE+4QVE0Eg9xkKE4EgOQoTgKA2ChNAICQKEygQLwoTCKCkChMEoEQKE0kg+wz3/PsM9wz7/PsM9/z7/PcM+wwHEyoAfAoTSgAvChNJAD4KE0IA+wwGE0Eg+wwHDveE94T3DHcB9wz3hAP3DPcMFfeE9wz3DPeE+wz3DPuE+wz7DPuE9wwGDveE9wz3DPcMAfcM9wz3DPcMA/eE9/wVIwr7hPsMFff89/z7/AYO94T3DIv3DIv3DBL3DPcMi/cMi/cME5D3hPf8FRNQ9wwHE0j3DAYTiPsMBxOQ+wwGE4gpChNEJAoTSPsMBhMoKgoTUHgKDvsM9wyL9wz3DPcMi/cM9wx3n/cMi/cMEov3DIv3DPcM9wyL9wz3DPcMi/cMEwJA9/z5ZBUhChMEEPf8+4QVJAoTAgghChMEECYKEwSA/Oz7DBUkChMFAPsMBhMDADEKEwUA9wwGExAI+WT7/BUhChMhAP3c+4QVIQoTYED3/PuEFRNgMPdGChMYMPeE+wz3DAcTGMD7hPsM+wwGE2DAdgoTgAj4dPv8FSQKE4AQ+wwGE0AQMQoTgBD3DAYTgCD7/PsMFSEKE4EA/HT7DBUkChNAgCEKE4EAJgoO9wz3DIv3hIv3DIv3DIv3DBKL9wz3hPcM94T3DIv3DBOHAPcM94QVE0cA94QHEycAogoTFwAkChMvAI0KE0cA9wwGE4aA+4T9ZPsM+WT3DAcTToAlChNPAPdcChMXACYKEycAqwoTRwAsCg77DPcMi/cM94T3hPuE9wz3DPcMi/cMEov3DIv3DIv3DIv3DPcM9wyL9wwTEkD3DPh0FRMiQPd/ChOQQPf8BhOAgPv8BxOBAPsMBhNBADEKE4EA9wwGE4CAKQoTUFAvChMgEPf894QGEyCg+wwGEwigKgoTBKBEChMJACYKEyIA+wwHEwkg9wz3DPf8+wwGEyAg9wwGExJQ+wwHDvsM9wyL9/yL9/z7/PcM94T3DBKL9wyL9wyL9wyL9wz3DPcMi/cME4Kg94QWE0Kg9/wHEyKg92oKExKg94QHE0Ig94QGE4Ig+/z8dAcTgSDJChNAIJQKExAgNQoTIEAwChMIICEKEyDAJgoTCMCQChMhQMAKExFA+4T7hAcTIQD3hAcTIgD7DAYTCgAxChMiAPcMBhNCAPv8BxNEAPsMBhMUADEKE0QA9wwGE0Kg+/wHDov3DIv3hPsM9wyL9wyL9wyL9wyL9wwSi/cMi/eE+wz3DIv3DIv3DIv3DIv3DBMEQPeE+OwVJAoTAiAhChMEQCYKEwgQ94T7hBUkChMECCQKEwIEIQoTBAgmChMIECYKEyAI9wz7/BUkChMQBCEKEyAIJgoTgQD8dPuEFRNBAPeEBxNAgPeEBhOAgPuEBxOBAPuEBhOAgKYKE0AgJQoTQID7DAYTEICQChNBACwKDqB29/z3hPeEdwH3/PcMA/cMFveE9wz3DPsM94T3/PcM94T7hPcM+wz3DPsM+wz7DAb7DPuE+4T3DAcOi/f8+/z3DIv3DPcM94T7DPcMi/cMi/cMEov3DIv3DIv3DIv3DIv3DIv3DIv3DBNAgPeE9wwVE4CA94QHE4EA+wwGE4Cg+/wHE0Ag90YKE0AU+wwHE4AE94QGE4AI9/wHExAUJQoTCBD7hAYTBBD3DAcTBCD7DAYTAiAqChMFQCYKEwlA+wwHExFA+4T7hAYTiUDkChMEQCQKEwQg9wwGEwQQ+wwHE4gQ9wwGE4gI+wwHE4gE9wwGE4CoJgoTQKgnChMgoCoKE0Cg+wwHDov3DPcM9wz3DPcM9wz3DBKL9wz3hPcMi/cMi/cMi/cME/kAiwT3DPlk+HQGE/oAJgoT/ABGChP6AHEKE/kA+wwHE/qA+wz7DPf89/z7DPsM+wz3DAYT/AAwChP6ACQKE/kAJAoT+ID3DPcM/dwGDvsM9wyL9wz3DPeE+4T3DPcM9wyL9wyL9wwSi/cMi/cMi/cMi/cM9wz3DIv3DBMRIPcM9/wVEyEg938KE5Ag9/wGE4BA+4QHE4CA+wwGE0CAMQoTgID3DAYTgEApChNQKCUKEyAI9/z3hAYTIBD7DAYTCBD3DAcTBAgkChMEUPsMBhMCUCoKEwRQcQoTCFAmChMEUJAKEwpAKgoTCID7hAcTCQD7DAYTBQAxChMJAPcMBhMhAPsMBxMIkPcM9wz3/PsMBhMgEPcMBhMRKPsMBw6L9wyL94T3hPeEEov3DIv3DPcM9wz3DPcMi/cME3X3DPf8FfeE94T7hPcM94T3hPuE+4QHE6auChNm9wwGE6ZxChOt94T3DPh0+wz3DPzs+wwHE7T7DPx0BhOs92oKE2z3DAcTtfcMBhN194QHDvcM9wz3DPcM9wz3DAEU4PjsBDQK+/wENAr7/AQ0Cg73DPcM9wz3DPcM9wwBFOD3/PjsFUIK+/z7DBVCCvv8BDQK+/wENAoO9wz3DPcM9wz3DPcMARTg+OwENAr3/Pv8FUIK+/z7DBVCCvv8BDQKDvcM9wz3DPcM9wz3DAGL94T3DPeEAxTg9/z47BVCCvv8+wwVQgr3/Pv8FUIK+/z7DBVCCvv8BDQKDvcM9wz3DPcM9wz3DAEU4PjsBDQK+/wENAr3/Pv8FUIK+/z7DBVCCg73DPcM9wz3DPcM9wwBi/eE9wz3hAMU4Pf8+OwVQgr7/PsMFUIK+/wENAr3/Pv8FUIK+/z7DBVCCg73DPcM9wz3DPcM9wwBi/eE9wz3hAMU4PjsBDQK9/z7/BVCCvv8+wwVQgr3/Pv8FUIK+/z7DBVCCg73DPcM9wz3DPcM9wwBi/eE9wz3hAMU4Pf8+OwVQgr7/PsMFUIK9/z7/BVCCvv8+wwVQgr3/Pv8FUIK+/z7DBVCCg73DPcMi/cM9wz3hBKL9wyL9wz3DPcMi/cMEyT3/Ph0FSIKEyj7hPuEFSIKE7L7DPzsFfcM9wz3/PsM9wz3DPsMBhNqRAoTsiYKDvcM9wyL9wz3DPeEEov3DIv3DPcM9wyL9wwTJPf8+HQVIgoTKPuE+4QVIgoTqvzsBDsKE3IhChOyOQoTcDEKE7D3DAYOi/eE+4T3DPcM94T3hPcMEov3hPuE9wz3hPcM9wz3hPsM9wwTMwD4dPh0Ffd4ChM6APv8Fvd4ChOWAPuE+4QV9wwHE5sA9wz7DPf89wwGE5KAKAoTmwD7DAYTWwA5ChOaAPcMBxOWgPsM+4QV+OwGE1KA9wwHE1MANwoTVoD7DPcM/Oz7DAYTWgD7DPzsBhNWgPcMBg77DPeE+Oz3DAGL9wz47PeEA/eE+wwV+HT3DPcM9wz3DPh0+wz3DPsM9wz7hPsM9wz7DPcMBvv8+wz7DPv89wz7DPcM+wz7hPcM+wz3DAcOoHb3DPcM9wz3/PsM9wwS9wz3DIv3DIv3DBPa94T4dBUjChPk+wz8dBUkChPiJAoT5DAKE+r3DPf8+/z7/AYT5CgKE+jmChPk9wwGDvcM9wz3DPcM9wz3DAGL9wz3DPcM9wz3DAMU/PcM94QVIwr7hPsMFff89/z3DPsM9wz3/Pv8+wz3DPsM+/wGDov3DPcM9/z7/PeEEvcM9/z7hPcME9D3DBY7ChPIMAoTsPeE94T7DAYT0PcMBxPInQoT0PsMBhOwLAoTyPdKChPQ+wwGDov3DIv3DIv3/PsM9wyL9wwSi/cMi/cMi/cMi/cMi/cME4IA94T3DBUTQgD3DAcTRAD7DAYTQgD7DAcTggD3DAYTgQApChNAgCQKEyBALwoTIID7DAYTCIAqChMRAPsMBxMSAPsMBhMKACoKEyQAfAoTRAD3DAYTJAD3/AcTEgD3DAYTEQApChMggPcMBhNAgJUKE4EA+wwHDov3DIv3DIv3hIv3DIv3DBKL9wyL9wyL9wyL9wyL9wwTggD3hPcMFRNCAPcMBxNEAPsMBhNCAPsMBxOCAPcMBhOBACkKE0CAJAoTIEAlChMggPsMBhMQgPcMBxMRAPsMBhMJACoKExIAJgoTJAAsChNEAPcMBhMkAPeEBxMSACQKExEA9wwGExCA+wwHEyCA9wwGE0CAJwoTgQD7DAcOi/cM9wz3hAH3DPf8A/cMFvf89wz7DPcM94T3hPsM94T7/PuE+wz7hPeE+wz7DAYOi/cM9wz3hPuE9wz3DPcMi/cMEov3DIv3DIv3DIv3DIv3DBOlAPeE94QVKgoTxQD3fwoToQD3SgoTokD7DPsM9/z3DAYToUAwChPAQPeE94QGE8CA+wwGE5CA9wwHE5EA+wwGE4kAKgoTkgAmChPEAPsMBxOSACQKE5EA9wwGE5CA+wwHE8CA9wwGE6BA+wwHE6CA+wwGE6UA+wwHDqB294T3/BL3DPcMi/cMi/cME9D3hBYkChPo9wz3DPcM9/z7DPcM+wz7DPsM9wz7DPsM+wz7/PcMBvsMBxPQ9wwGDqB294T3hBL3DPf8+4T3DBPQ94QWJAoT4PcM9wz3DPeE+wz3DAYT0J0KE+D7DPsM+wz7hPcM+wwGE9D3DAYOi/cM9wz3hPuE9wz3DPeE+wz3DBKL9wyL9wz3DPcMi/cME6IA94T3hBX3DAcTpAD7DAYTxAD3fwoTooD3hPsM+wz7DPf89wwGE6EAMAoTwID3hPeEBhPBAPsMBhOSgPeE+/wHE8QA+4QHE5MA9wwGE4sAsgoTkQD7DAcTwQD3DAYToID7DAcTowDmCg6L94T47HcS9wz3/PsM9wwT4PcMFvf8BhPQ+dz7DPzsBxPg+4QGDov3hPjsdxKL9/z7DPcM9wz3DBPoiwT3/AYT2Pjs9wz7DPcM94T7DPcM+4T87AcT6PuEBg6L94T7DPeE94T3DIv3DBKL9/z7DPcM9wz3/PsM9wwTqIsE9/wGEyb47PcM9wwHE1H3hPv8BhNW+4T7hPf8+WT7/AYTJvsMBxOU+4T8dAYTqPuEBg6L94T3hPcM9wz3DBKL9/z7DPcM9wz3/PsM9wwT6vf8+OwV93AKE/D9ZPzsFff8BhPq+HT3/PuEBxPk+4T7hPf8BhPq+dz87PzsBxPw+4QGDov3DPeE9wz3/HcB9wz3DPcM9wwD94T3DBX3hPcM+4T3DPf8+4T3/PsM/dz3hPcMBw6gdveE9wz3DPcM94R3AfcM9wz3DPcMA/eE9/wVIwr7/AT3DPlk+wz7DPsM94T7DP1k9wz3DPcMBg6gdvcM9wz3DPcM9wz3DPcMdxKL94T7DPcM9wz3hPuE9wwT/QD3hPf8FSMKE/oA+4T7/BX3DAYT/ID3hPcM+wz3DPeEBxP5ACQKE/iAMAoT+QAkChP4gKQKE/sA+4T7DPcM+wz7hAcT/ADmChP6ACgKE/wA5goT+gD3DAYOoHb53HcBi/ncA/f89/wVIwr8dPv8FfeACg6L9wz47PcMAYv3DPjs9wwD9wz47BUjCvf8/HQVIwr9ZPsMFfeACg6L9wz47PcMAYv3DPjs9wwD9wz47BUjCvcM+4QVIwr3DPuEFSMK/WT7DBX3gAoOi/cM9wz3/PcM9wwBi/cM9wz3/PcM9wwDFPz47PjsFSMK/OwWIwr3/Px0FSMK/OwWIwr7hPsMFfeACg6L9wz3DPf89wz3DAGL9wz3DPf89wz3DAMU/Pjs+OwVIwr87BYjCvcM+4QVIwr3DPuEFSMK/OwWIwr7hPsMFfeACg6L9wz3DPcM9wz3DPcM9wwBi/cM9wz3/PcM9wwDFA747PjsFSMK/OwWIwr3/PuEFSMK/OwWIwr3/PuEFSMK/OwWIwr7hPsMFfeACg4odveE9wyL9wz3hPcMi/cMEov3/Pv89wz3hPeEi/eE+wz3DBPEAPf894QVE6wA9wwHE6oA+4T3/AYTlAD3hAYTkUCmChOoQD4KE6CA+wwGE8EA+wwHE8QA+4QGE8EApgoTqID3hPjs+4QGE5EA+wwHE5QA+4QGE6wARAoTogD+VPcM9/wHDqB294T3DPcM9wz3DPcMAfcM9wwD9wwW9wz3hPcM9wz7DPcM94T3DPuE9wz4dPcM/Oz8dPsMBvsM9wwHDvsM9wyL9wyL94SL9wz3DPcMi/cMEov3DIv3DIv3DIv3DIv3DIv3DIv3DBOYgPf8+OwV9wwHE5hAKAoTmID7DAYTkED7DAcTkIDmChORQPcbChNBAPcMBxNCAPsMBhMiAPcpChNCAPcMBhNBAPsMBxOBAPcMBhOAkDYKE0AQJAoTIAgiChNAUCcKE5hQ+wz7DPf89wz3DPsM9wwHEwggJAoTCED7DAYTBEAqChOYgHgKDov3DIv3DIv3DPcM9wyL9wyL9wwSi/cMi/cMi/cM9wz3DIv3DIv3DBOCAIsEJAoTgQD3DAYTgIApChOBAPsMBhNBAPcMBxMgwG0KE0BA9wwGE4BAKwoTgCD3DAYTgBApChOAIPsMBhNAIPcMBxMgECEKE0Ag+wwHE0BA+wwGEzBAbgoTCCAkChMEECEKEwggJgoTEMBvChMRAPsMBhMJAPcMBxMKAPsMBhMGADEKEwoA9wwGEwkA+wwHEzEA9wwGEzCARwoTQQD7DAcTQgD7DAYTIgAxChNCAPcMBhOCACYKDg6L9wyL9wz3DPcM9wz3DIv3DBL3DPcMi/cMi/cME6T3DBYkChNyJAoTdfcM9wz3DPcM+/z3DAYTMiQKEykhChNyJgoTdfsM+wz7DPsM+wz3/AcTYiYKE6QmCg4odvcM9wz3DPf8+wz3DPcM9wwSi/cMi/cMi/cM9wz3DBPdgPcM9/wVIwoT6oD7DPx0FSQKE+mAJAoT6oAwChPtgC8KE92A9wz7DPcM9/z7/PsM9wwGE+2A+wz7/Pv8BxPqgCgKE+yA5goT6oD3DAYO+wz3DIv3/Iv3/Pv89wz3hPcMEov3DIv3DIv3DPcM9wyL9wwThUD3DBYTRUD3/AcTJUD3agoTFUD3hAcTRED3hAYThED7/Px0BxOCQMkKE0BAlAoTIYD3/PsMBxMJgJAKEyKAwAoTEoD7hPuEBxMiAFgKE0VA+/z7DPv8Bw77DPcM9wz3DIv3hIv3DIv3DIv3DBKL9wz3hPcMi/cMi/cMi/cMi/cME8Mg9wz3hBUToyD3hAcTkyCiChOLICQKE5YgjQoToiD3DAYTwpD7hAcTooD7hPcM+wwGE8KA90gKE8JA+HQGE8KAKwoTwlDkChOmECUKE6ag91wKE4sgJgoTkyCrChOjICwKDvsM9wyL9wyL9wyL9wyL9wz3hPcMEov3DIv3DIv3DIv3DIv3DPeE9wwThhD7DAQkChNFECQKEySQJAoTFFAkChMssPcM9wz3hPv89wz4dPsM9wz7DPcM/HT7DPf8+4T7DAYTFFAmChMkkCYKE0UQJgoThhAmCg77DPcMi/cMi/cM9wz3DPcMd/cg9wwSi/cMi/cMi/cMi/cMi/cMi/cMi/cMEzxQ9/z3hBX3DPcM9wz3DPsM9wz7DPsMBhM8gOYKEzxQ9wwGE5yA+/wEE1yA9wwHE10A+wwGEz0A9wwHEz4A+wwGEz0A+wwHE10A9wwGE1yA+wwHE5yA9wwGE5xAKQoTXCAkChM8ECQKEz4I9wz47P3c/Oz3DPh0+OwGEzwQYQoTXCAmChOcQPsMBw77DPcMoHb3hPcM9wz3DIv3DIv3DBKL9wyL9wyL9wz3DPcM94T3DBOw4PlkFvcM9wz7DPsM+wz3hPeE+wz3/PsMBxMo4CoKEyTg9wz7DPcM+4QHEylg+wwHEzTg94T7hPsM9wwGEzFg+wwGEylgKgoTKmD3PgoTcWD3DAYTcuD7DPcM+wz7hAcTYWD7DAcTYOD3DPsM9wz7DAYOi/cM9wz3DIv3DIv3hPsM9wwSi/cM9wz3DPcM9wz3DPcME8eA9/z3/BUTp4AxChPHgFoKE6eAJAoTl4D3DPv8/Oz3/AYTr4D3DPcM9/z7DPsMBhPHgPsMB/x0+/wV+dwGE4+A+WT93AcOi/cMi/cMi/cMi/cMi/cMi/cMi/cMEov3DIv3DIv3DIv3DIv3DIv3DIv3DBOAIPh09wwVE0Ag9wwHE0BA+wwGEyBA9wwHEyCA+wwGEyBA+wwHE0BA9wwGE0Ag+wwHE5Ag9wwGE5AU+wz3/Pf8BxMQCDAKExAQ+wwGEwgQ9wwHEwgg+wwGEwQg9wwHEwRA+wwGEwJAKgoTBID7DAcTBED3DAYTCED7DAcTCID7DAYTBIAqChMJAHgKExEA9wwGEwkA9wwHEwiA9wwGExCA+wwHExEA+wwGExCA+wwHEyCA9wwGExCA9wwHEwhAJAoTCCD3DAYTCBD7DAcTEBD3DAYTEAhxChOgBPsMBxOgKOYKDqB2+dx3Eov3DPcM9wyL9wyL9wyL9wwT9PeEFsEKE+r3hPcMBxPk94QHE+L3DPeE+wz7DAYT5PddChPo910KE/T7DPcM+wz3DPsM+4T3DPsM9wwGDqB29wz3hPcM94T3DHcSi/cMi/cM94T3DIv3DBP4iwQkChP29wz3DPeE+wz3DAYT8feEBxPyMAoT8fcM9wz3DPeE+wz7DAYT9vsM+wz7hPcM+wz7hPcM+wz7DPsMBhP4+wwGDov3DIv3DIv3DIv3DIv3DIv3DIv3DBKL9wyL9wyL9wyL9wyL9wyL9wyL9wwTkED3/Pf8FfcMBxOQICgKE5BA93QKE5Ag9wwGE5AQKQoTkCB0ChMgEPcMBhMgCPsMBxNACPcMBhNABCkKE0AI+wwGEyAI9wwHEyAQ+wwGExAQ9wwHEwgIJAoTBAQhChMICCYKExIQ+wwHExIgdAoTEhAhChMSIPsMBxMSQPsM9wz7DPsM9wz7hAYTEID7DAYTCID3DAcTCQD7DAYTBQAxChMJAPcMBhMIgPsMBxMQgPcMBhMggCYKE0EAKwoTIIAkCg6L94T7DPeE9wz3hPsM94QSi/eE+4T3DPf894T7DPcME4SLBPcMBhNE9wwHE0r3DAYTivcM94QHE0L7DAcTQfcMBhOBcQoTgveEBxOB+wwGE2H3DAcTYjAKEyH3DAYTEfcMBxMS9wwGExFYChMh+wwHEyr7DAYTGqsKEyj3DAcTJPsMBhMUKgoTGPuEBxMU9wwGE2T7DAcTaCgKE0T7DAYThPsMBxOI+wwGDov3DPf894T3DHcS9wz3DIv3DIv3DBPo94T3hBUkChP09wz3DPcM94T7DPcM+wz7DPsM9wz7DPsM+wz7hPcMBvsMBxPo9wwG+/wEIQoOoHb3/Pf89wx3Aff89wwD9/wW9wz3DPcM9wz3DPcM9wz3/PsM9wz7hPsM+wz3DPuEBvsM+wz7/PcM+wz3DPsM9wwHDov3DPlkdwH3hPcMA4sE+Oz3DPuE+WT7DP1k+4QGDqB29wz3DPh09wwB94T3DAP3hBb3DPcM9wz3DPsM+HT3hPcM/Oz7DPeEBg6L9wz3DPcM9wz3DPcM9wwBi/cM9wz3DPcM9wz3DPcMA/f89/wVIwr7hPsMFff89/z7/Ab7DPx0Ffjs+Oz87Af9ZPsMFfeACg73DPcMi/cM9wz3DIv3DPcM9wwSi/cMi/cMi/cMi/cMi/cMEwkA94T53BUhChOMAPuE/dwVJAoTSgAkChNJAPcMBhNIgPsMBxOIgPcMBhOIQCkKE4iA+wwGE2iA9wwHE2kAMAoTKIAkChMYQCEKEyiAJgoTKQD7DAcTKgAwChMsAPsMBhMcADEKE2wA9wwGE2oARwoTjAAmCg73DPeEi/eEi/cM9wz3DBKL9wyL9wyL9wyL9wyL9wwTEgD3hPncFSEKE5gA+4T93BUlChNUACUKE1IA9wwGE1EA+4QHE5EA9wwGE5CA7woTkQD7DAYTUQD3hAcTUgD7DAYTMgAqChNUACYKE5gAJwoO9wz3DIv3hIv3hPcM9wwSi/cMi/cMi/cMi/cMi/cMExIA94T53BUhChOSAP3cBCQKE1EAJQoTMIAiChNRACcKE5IA+4QHE5QA+wwGE1QA94QHE1gA+wwGEzgA9ykKE1gA9wwGE1QA+4QHE5QA9wwGDov3DPcM9wz3/PcM9wz3DAGL9wz3DPcMA/eE+lQVIQr7DP3cFfd7CvsM+/wVNAoOi/cM9wz3DPf89wz3DPcMAfeE9wz3DPcMA/eE+lQVIQr7hP3cFfdOCvv8BDQKDov3hPcM94T7DPcM94R3EvcM9wz3DPcM9wz3DBQOE973DBb3DPcM9wz3DPcM+wz3DPsM9wz3hPsM9wz3DAYTvvcM9wz3DPv894T7DPuE+/z7DPcMBxPeRwoOi/cMi/cMi/f8i/cMi/cMEov3DIv3DIv3/Iv3DIv3DBOCAPeE9wwVE0IA9wwHE0QA+wwGE0IA+wwHE4IA9wwGE4EANgoTQIAkChMgQC8KEyCA+wwGExCA9wwHExEA+wwGEwkARAoTEgAmChMkAHwKE0QA9wwGEyQA9/wHExIAJAoTEQD3/AYTEID7DAcTIID3DAYTQICVChOBAPsMBw6L9wz3hPeE+wz3DIv3DPcMdxL3DPf8+wz3DPcM9wyL9wwTnAD4dPcMFRObAPh0BxOpACgKE6iA9wwGE80A9wwKE8qAwAoTyQD3/AcTyIAlChOrAPuEBhObAPcM+wz3DPsM+wz7DPsMBxPMAPuE+4T3DPv8BhOaAKIKDov3DPeE94T7DPcMi/cM9wx3Eov3DIv3DPcM9/z7/PcME8oA94T3DBX3hAcTzAD7DAYTyoD7/PeEBxPJAPcMBxPIgCgKE8kA94T3/PcM94QGE5qA+4T3DPsM9wz7DPsM+wwGE6oA+wwHE8wA+4T7hPcMBhOsAPcMBxOqgCQKE5iA9wwGE8sA/HQHDov3DIv3DIv3DPcM9wwS+HT3DIv3DBO494T3DBX3DPeE+wwH+/z7DBUTtPh0+HT3DPcM+wz7DAYTOPsM9wz7/PsM94T7DPuEBhNURgoOi/cMi/cM94T3DIv3DPcMdxKL9wz3DPcMi/cMi/cME60AiwT3DPcM94T7DPcM9wz7DAYTLoD3QgoTHoAhChNugPsM+wz3hPsM+4T7DPsM9wz7hPsMBxOtACYKDov3DPh09wyL9wwSi/cM9/z3DBO49wz3DBX47AcT2PeE+wz3DPx0+/z7DPh0BhO4+dz7DAcT2CYKE7j3DPuE+wz7DPzsBw6L9wz3DPcM+HR3AYv3DPf89wwD9wz3DBX3DPf8+wz7/PsM9/z3DPcM+WT7DPx0+/z4dPsM/WQHDov3DIv3DIv3/PuE9wyL9wwSi/cMi/cM9wz3DIv3DPcM9wwTg0D3hBYkChNBQCQKEyDA9wwGEwjA94QHExDA9w0KEwjA9wwHEyDA+4QGE0NAlQoTg0AmChNCQPcMBxNEQPsMBhMkQJYKE0RA9wwGE0NA+wwHE4NA9wwGDov3DPeE9wyL9wwSi/cM9/z3DBO4iwT47PcM/HT3/AYT2F8KE7j3DPx0Bw77DPcM9wz3DPf8dxKL9wz3/PcMi/cME/T3DPsMFfh09wz3DPcM+wwGE/j4dPsM+/z7/Pf8+wz7/PcM+wwHE/T4dPsM/HQGDvsM9wz4dPcMEov3DPf89wyL9wwT6PcM+wwV+HT3DPcM9wwGE/D7DPf8+wz3DPx0/HT3DPf89/z7/PcMBhPo+wz8dAcOi/cMi/f8i/cM9wz3DBKL9wyL9/yL9wwTmPcM9wwVE1j3/AcTVPf8BhOU+/wHE5j7/AYTlDYKE1IvChNU+wwGEzT3DPsM9wz3DPcM+/z7DPcM+wz7DAcTWHwKDih29yF2+HT3DAGL9wz3/PcMA/h0+wwV8AoOKHb3IXb4dPcMAYv3DPf89wwD94T7DBX3DPjs9wz8dPcM+HT7DPcM+wz7DPsM9wz7hPzs9wwG+HT3DAcOi/cM9/z3DPcM9wwB9wz3DPf89wwD94T3DBX3/Pf8+/z3DPf8+wz3DPv894T7hPsM9wz9ZPh09wwHDov3DPf89wwSi/eE+4T3DPcM9wz3DPcME9T3DPcMFff8BxPkPgoTzPcM9/z3DPx09wz4dPsM9wz7DPsMBhPk+wz3DPuE/Oz3hPcMBg6gdvh09wwBi/cM9/z3DAP4dBb3DPh0+wz3DPx0+/z3DPeE9/wGDih294T3DPf89wz3DHcBi/cM9/z3DAP3DPeEFff89/z7/Pv8+wz3/PuE9wz5ZPsM9wz7/PcM+wz87AcOi/cM9/z3DBKL9wz3hPcMi/cME/D3/PcMFff89wwHE+j7/AcT8OYKE+j3hPh0BhPw+wz3DPsM+wz7DPcM+4T87PcM+HT3DPv8Bg6L9wz3/PcM9wz3DAGL9wz3/PcMA/cM9wwV9/z3/Pv8+/z7DPf89wz3DPjs+wz3DPx0+wz4dPsMB/v8+wz7DPv8Bg6gdvh09wz3DPcMAYv3DPf89wwDiwT3DPh09/z8dPcM+HT7DPcM+/z3DPh09wz8dPsM+wwGDov3DPh0dwGL9wz3DPcM9wz3DAMUOPcMFvcM9wz3DPsM94T47PsM/HT7DPh0+wz8dPsM+HT7DAb8dPcMBw6L9wz3/PcMAfcM9wz3/PcMA/eEFvh0+Oz7DPx0+/z4dPuE+wz3DPv89wwGDih294T3DPeE9wz3hHcB9wz3DPf89wwD+Oz7DBX3DPpU+wz87Pv89/z7hPsM9wz7hPcM+wz3/AYOi/cM9/z3DPeEdwGL9wz3DPcM9wz3DAMUHPcMFveE+HT3DPx09wz4dPsM9wz7DPeE+wz9ZPsM+HT7DAb8dPcMBw6L9wz4dHf3mHcBi/cM9/z3DAP3DBb4dPjs+wz8dPv8+WT7DP1k9wwGDvsM9wz3DPcM9wz3DIv3DBKL9wz3/PcME+z3DPeEFYsKE9z3DPsM/Oz3DPsM+HT3DPx09wz3/PcM9wz3hPsM9wwH+4QGE+z7DAcT3I0KDih29wz3DPh0d/eYdwGL9wz3DPcM9wz3DAMUDvh0+wwV9wz6VPsM/WT7DPh0+wz8dPsM+HT7DPx09wz7DPcMBvcM9wz7DPcMBw4odvcM9wyL9/yL9wwSi/cMi/cMi/cMi/cMi/cME8gA9wz3DBUTqAD3/AcT1AD3DAYTygCVChPEAPsMBxPCgPcM+wz3DPcM9wz3DAYToIAvChOhAPsMBhORACoKE5IA+wwHE6EA9wwGE9KA+/z7DPf8BxOUAKQKE6gAfAoOKHb47PcM94R3AfeE9wwD94T7DBX3DPjs94T3DPuE94T7DPuE+4T7DPeEBg6gdvh09wwBi/cM9/z3DAOLBIoKDih29wz3DPh0dwGL9wz3/PcMA/h0+wwV9wz5ZPsM/HT7/Ph0+wz8dPcM+wz3/AYO+wz3DPcM9wz3/HcBi/cM9/z3DAP7DASYCg4odvchdvh09wz3hHcBi/cM9/z3DAP7DAT3DPjs9/z8dPcM+HT7DPcM+/z3hPsMBg77DPcM+HT3DAGL9wz3/PcMA/cM+wwV+HT3DPx0+HT3/Pv89wz3/PsM9wz8dPzs9wwGDov3DPf89wz3hHcBi/cM9wz3DPcM9wwDFBz3DPcMFff89wz7/PsM+wz3hPh09wz8dPcM+HT7DPcM+wz3hAf7DPuE+wz7DPsM+/wGDih29yF2+HT3DAGL9wz3DPcM9wz3DAMUHPsMBPcM+Oz3DPx09wz4dPcM/HT3DPh0+wz3DPsM+wz7DAb3DPuEBw77DPcM9wz3DPcM9wyL9wwSi/cM9/z3DIv3DBPa9wz7DBX4dPcM9wz3DPsM9wz8dPeEBhPsXwoT3PcM/HT8dAcT2vjs+wz8dAYO+wz3DPcM9wz3/HcBi/cM9/z3DAP3DPsMFfh09wz8dPcM9/z3DPcM9/z7DPv8+/z3/PsM/Oz3DAYO+wz3DIv3DPcM9wyL94T7DPcMEov3DIv3DPcM9wyL9wwTYgD3hPeEFfcMBxNkAPsMBhNiAEcKE4QAKwoTYwBtChNggKIKE2EA9wcKExSA91QKE2yA91UKE2MAeAoOi/cM9/z3DAGL9wz3DPcM9wz3DAMUOIsE9wz4dPcM+/z3DPsM94T47PsM/HT7DPf8+wz3DPuEBg4odvh09wyL9wz3hHcSi/cM9/z3DBO8+wwENwoT3F8KE7z3DPv894T7DAcOi/cM9/z3DAGL9wz3/PcMA/cMFvf89wz3DPf8+wz3DPx0+wz4dPv8+/z3hPsM+4T3DAYOKHb3DPcM+HR395h3AYv3DPf89wwD+HT7DBX3DPpU+wz9ZPv8+HT7DPx09wz7DPf8Bg4odveE9wyL9/wSi/cM9wz3DPcM9wwUHBPc94T7DBX3MAoTvJQKE9w/ChO8lgoT3OcKDov3DPeE9wyL9wz3DPcMEov3DIv3hPsM9wz3DPcME7v3DPcMFff89wz7/PsMBxPVwAoT0/f89wz7/PcM9/z7DPcMBxPV+wwGE7P3hPeE9wz7/PuEBxO1+wwGE7t8Cg77DPcMi/cM9wz3DPeE9wwSi/cM9wz3DPcM9wwUDhM+94T47BUhChO++wz9ZBX3hPcM+4T7DPsM9/z3DAcTfiEKE777DPsM+HT7DPsM+wz7DPsMBxN++4QHDvf89wz3DPcMAfcM9wz3DPcMA/f8+OwVIQr7hPsMFSEK+wz7/BU0Cg6L9wz3DPcMi/cM9wz3DIv3DBKL9wyL9wyL9wz3DPcME8GA94T3hBUkChPCgPsMBhOqgPcMBxOsgHQKE5KAXwoTqoBEChOsgPcvChOigPsMBxPCgPcMBhOBgPv8BCEKDvcM9wz4EXb3hHcB94T3DAP3hPjsFSIK/WQEIQoOoHb3hPcM+HR3AfeE9wwD94QW9wz3hPeE9wz7hPh0+wz8dPuE+wz3hAYO+wz3hAH3hPcMA/eE+wwVIgoOoHb3DPcM9wz3DPcM9wz3DHcB94T3DAP3hBb3DPcM94T3DPuE9wz3hPcM+4T3DPeE9wz7hPcM+wwG+wz7hPsM94T7DPuE+wz3hPsM+4T7DPeEBw6gdvf89wz3DPcMAfeE9wwD+OwENAr3hP1kFfcM9/z3hPcM/Oz7DPeEBg6L9wz3hPcM9/x3Eov3DIv3DIv3DPcM9wwT8osE+Oz3hPsM+wz7/PeEBhPqJAoT5pQKE+qVChPyJgoO+wz3DKB2+HT3DPeEdxKL9wz3/PcME7z3hPsMFaIKE3z3DPnc+wz7hPv894T7DP3c9wz4dPf8BhO8/HT7hAcO+wz3DKB29/z3DIv3DPeEdxKL9wz3DPeEi/cME473hPsMFaIKE13RChMe9xQKE277DPsM9/z7DP3c9wz3/PcM9wwHE573hPx0+4QGDvsM9wygdveE9wz3DPcM9wz3DBL3hPcM9wz3hIv3DBO++HT7DBWiChN9JQoTfjAKE333DPeE/HT3DPeE9wz87PsM94T9ZPcM+HT3/AYTvvcWCg77DPcMoHb3hPcM9wz3DPeEdxL3DPcM9wz3hIv3DBO+9/z7DBWiChN9JQoTfjAKE333DPeE/HT3hPsM+4T7DPsM9wz8dPcM+HT3/AYTvvcWCg6gdveE9wz3DPcMAYv3DAOLBPcM94T3hPcM+4T3DPh09wz87AYOi/cM9wz3DPcM9wwBi/cM9/z3DAMU4IsEkQoOi/cMi/cMi/cM9wz3DBKL9wz3/PcM9wz3DIv3DBOe9wz3DBUTXvcMBxO+9/z7DPv8+wz47PcMBhNeJAoTPZQKE16VChO++wz7DPf8+wz3DPv8+wz3/PsM+/wHE154Cg6L9wyL9wyL9wz3DPcMEov3DPf89wz3DPcMi/cME573DPcMFRNe9wwHE773/PsM+/z7DPjs9wz7DPcM9wz7DAYTXvcMBhM+9wwHEz33DPf8+wz7hPuE9wz7DPcM+/z7DPf8+wz7/AYTXngKDov3DIv3DIv3DPcM9wz3DPcMEvcM9wyL9wyL9wyL9wwTmID4dBYkChOZAPsMBhNZAPcMBxNaAPsMBhM6APcMBxM8gPsM9wz3hPcM9wz3DPsM9wz8dPsM+HT7DPv8+4T3DAYTOgD7DAcTWgD3DAYTWQD7DAcTmQD3DAYOi/cM9wz3DPcM9wwS94T3DIv3DBTgE+j3/BYkChPw+wwGE+j3hPcM9wz7DPcM+/z7DPf8+wz7hPsMBxPw5woOi/cM+HT3DIv3DBKL9wyL9wz3hPcME9T3DPcMFfh0BxPMJAoTtPeE/Oz7/AYTrPsM9/z3DPcM+Oz7DPcM+4QHE8z7DAcT1PsMBhO0MQoT1PcM+wz7DPx0Bg6gdvlk9wwB+HT3DAP4dBb3UgoOKHb5ZPcMEvcM9wyL9wwT0PeE+wwV9wz5ZAYT4HUKDov3DIv3DIv3DPcM9wz3DPcMEov3DIv3/PuE9wz3DPcMi/cME5oA9wwWOwoTWID3DAYTukD3/PcM9wz7DPsM+wz3DAcTvEBlChO6APx0BhO8AEYKE7oA+wwHE7mA1QoTmgD7hAcTnAD7/AYTXAAxChOcAPcMBg6L9wyL9wyL9wyL9wyL9wwSi/cM9wz3DIv3DIv3DBOmgPf89wwV9wwHE0SA9wwGE4SA+wwHE0yAIQoTDQD3hAcTDID3DPcM/HQGExUAeAoTJQD3DAYTFQD3DAcTDQD3hAYTFQD7DAcTpoD7hPsM9wz7DPuE+wz4dPcMBg6L9wyL9wz3hPcMEov3DPeE9wyL9wwTtPcM9wwV1AoTeCcKE7hiChO0KQoTuPsMBhN49wwHE3T3DPeE+wz3DPv8+wz7DPv8Bg6L9wyL9wz3DPcM9/x3Eov3DIv3DPeE9wwTuosEJAoTdvcM9wz3hAYTtvuE9wz53PsM/HT7hPcMBxN69z0KE3ZHChO6JgoOi/cM+HT3DIv3DBL3DPcM94T3DBO4iwT3hPlkBhPYngoTuPcM+4T7DPsM/Oz7DAcOi/cM9wz3DPh0dxL3hPcMi/cMi/cME+SLBPjs94QGE+gwChPwagoT6HEKE+T7DPx0Bw6gdvjsd/cg9wwS94T3DIv3DBPw94T5ZBUhChPo9wz93BUvChPw+wz3hPsM+/wGE+j3DAYO94T3DIv3DIv3DPcM9wwS94T3DBMY+WQENAoTmPf8/OwVQgoTWCoKEzj3LAoTWPdKChOY9wwGDov3DPjs9wwBi/cM9/z3DAP4dPlkFSEK/HT93BVZCg74dPcM9wz3DAGL9wz3DPcM9wz3DAMUOPlkBDQK+HT7/BUhCvuE+wwVIQr7hPsMFSEKDqB29/z3DPf8dwH3/PcMA/f8FvcM+dz7DPv8+4T7DPeEBg6gdvh09wz3DPcMAfeE9wwD+WQENAr3hP3cFfc8Cg6gdvncdwH3hPcMA/eE+HQVlAr93ASUCg6gdvf89wz3IXb3hHcB94T3DAP3hPjsFSIK/HQEIQr8dAQiCg6gdvf89wz3/HcBi/cM9wz3DPcM9wwDFBz4dPf8FSEK/HT7DBUhCveE/HQVnAoOoHb3DPcM9/z3DPcMdwH3DPcM9wz3DAP3/PjsFSEK/OwEIQr7hPuEFZwKDov3DPjs9wwBi/cM9/z3DAP5ZAQhCv3cBPjs+dz7DP1k/HQGDov3DIv3DPgRdveEdxKL9wyL9wyL9wyL9wwTOPjsBCIKE7j93AQkChN0JAoTciUKE3GUChNylQoTdCcKE7gmCg6L9wyL9wz4dPcMEov3DIv3DIv3DIv3DBOwiwQkChNoJAoTZCUKE3L3DPf8/HT7DPf8BhNkJwoTaCcKE7AmCg6L9wz4dHf3IPcMAfcM9wz3DPcMA/cM+WQVIQr3hPzsFSAK/dwEIQr7hPsMFSAKDov3DPf89wz3DPcMAfeE9wz3DPcMA/eE+WQVIQr7hP3cFfjs+Oz87PsM+HT7/Px0Bg6L9wz47PcMAYv3DPeE9wwD9/z5ZBUhCvv8+wwVIQr3/P3cFSEK+/z7DBUhCg6gdvncdxL3DPcMi/cME9D3hBbRChPg+wz3/PsM/HQGE9D3DAYOi/cM+Oz3DAH4dPcMA/h094QV900K/WQEIQoO94T3DPcM9wwB9wz3DPcM9wwD9/z4dBUhCvuE+wwVIQr7DPv8FTQKDov3DPcM9wz4dHcB94T3DAP3hAT3fAr7/AQ0Cg73DPcM94T3DAGL9wz3DPcM9wz3DAMUOPeE+HQVIQr3hPx0FSEK/HT7DBUhCg6L9wz3hPcM94T3DBKL9wyL9wyL9wyL9wyL9wwU4BPw+WQEIQr93AQkChPoJQoT5CQKE+IlChPhIQoT4iYKE+QnChPoJgoT8CcKDqB2+dx3AfcM9wz3DPcMA/f8FpwK+4T93BWcCg6gdvjs9wyL9wwSi/cMi/cM9wz3DIv3DBPQiwQ3ChPM9wz3DPcM+wz3DAYTwvzs9wz47AcTzKQKE6wqChPIJgoT0CYKDqB2+HT3DPcM9wwB9wz3DPeE9wwD94T47BX3DPsM+wz7DPsM9wz8dPcM+HT3hPx09wz4dPeE9wwH+4T3DPeE9wz7hPsM+wz3DPuE+wz3hPsMBg6gdvh09wz3DPcMAfcM9wz3hPcMA/cMFvcM+HT3hPx09wz47Pv89wz3/PcM+/z7DPsM+wz7DAb7DPcMBw6L9wz3/PcM9wz3DBL3DPcM94T3DIv3DBP494T47BX3DPsM+wz7DPsM9wz8dPcM+HT3hPv89wwHE/QpChP4+wwGE/T5ZPv8+wwHE/j3SgoOoHb4dPcM9wz3DAH3DPcM94T3DPeE9wwDFBz3hPjsFfcM+wz7DPsM+wz3DPx09wz4dPeE/HT3DPh094T8dAf3DPjs+/z3DPf89wz7/PsM+wz3DPuE+wz3hPsMBg6L9wz3/PcM9wz3DBKL9wz3hPcMi/cME/iLBPcM+WT3hPsM+wz7DPcM+/z3DAYT9CkKE/gtChP0JAoT+PsMBhP094T7/PsM+wwHDvcM9wz3/HcB94T3DAP3hPf8FSIK/HQEIQoO9wz3DPcM94QB9wz3DPcM9wwD9/z3/BUiCvuE+4QVIgr8dATZCg6L9wz3DPcM94R39yD3DAGL9wz3DPcM9wz3DAMUDvlkBCEK9wz93BX3UAoOi/cM9wz3DPcM9wwB9wz3DPcM9wwDFOD3DPeEFSEK+wz7/BX3TAoOoHb3hPcM94R3AfcM9wz3DPcMA/cM94QVIQr3hPv8FSAKDov3DPcM9wz3DPcMEov3/PuE9wz3DPcMFOAT6PcM94QVIQoT8PsM+/wVOwoT5C8KE/D7DPcM+/z7DPf8+/z7/AYOi/cM9wz3DPcM9wwBi/cM9wz3DPcM9wwDFPz3hPeEFSEK+4T7/BX4dPcM9wz3/PsM9wz8dPv89wz3hPf8+/z8dAYOi/cM9wz3DPcM9wwB9wz3DPeE9wwDFOCLBPeE94T3DPcM+wz3DPeE/HT3DPh0+wz3DPx0+wz3DAb7/PsMBw6gdvjsd/cg9wwS9wz3DIv3DBPo94T5ZBUhChPw+wz93BUgCg6L9wz3/PcM9wz3DBKL9/yL9wwT8PlkBNkK/dwE+Oz3DAYT6C0KE/DbChPo+/wHE/D7/AYOi/cM9wz3DPcM9wz3DPcMAYv3DPf89wwD9wz5ZBXZCvsM/dwV908KDqB294T3DPeEdwH3hPcMA/eEFjMKDvsM9wygdvcM9wyL94T7DPcM9wx3n/cM9wx3EvcM9wyL9wyL9wyL9wyL9wwToVD3/BayChOBIPsMBxOBQPsMBhOBICkKE2EQJAoTISj3DAYTEyj3DPcM94T7DPcM+wz3DPsM9wz7DPsMBxMDQPsMBhMFiPsMBxMrCPf8+4QGEy0Q5goTLSAwChMNkPcM9wz7hPcM+wwGExGA9y8KE2GA+wwHE2FQKAoO9wz3DPeE9wwB+HQEHAUo9wwc+tgG/HQEHAUo9wwc+tgGDvcM9wz3DPcM9wz3DAEU4PjsBPeBCvv8BPeBCvv8BPeBCg4odveE9wz3hPcM94R3Evh09wyL9wyL9wwT+Ph0+wwV9wz3hPlk9wwGE/T87PeE+Oz3DAYT8vx094T7DPuE/WT7DAYT9Pjs+4T87PsMBhP4+HQGDih294T3DPcM9wz3DPcMEvnc9wyL9wyL9wwT+Pnc+wwV9wz3hPrM9wwGE/T+VPcM+lT3DP5U9wz6VPcMBhPy/dz3hPsM+4T+zPsMBhP0+lT7DP5U+wz6VPsM/lT7DAYT+PncBg77DPcM9wz3DIv3DPcM9wyL9wwS+LD3hIv3hBPC+aD3DBWiChPE+4QGE7T3DPuE9wz3hPcMBxOKQgoTtPsM+4T7DPuE+wz3hPsMBxPE94QG/HT7/BUTgvdrCg77DPcM9wz3DIv3DPcM9wyL9wwS98D3hIv3hBPE98D3DBWiChOy934KE5T7hAYTjPcsChO094QGE7L7DPeE+wz7hAcTxKsK+/wE92sKDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DPrM9wz+zPcMBhMyJAoTKSEKE3ImChN093UKE2L7DAcTovcMBg6L9wyL9wz3DPcM9wz3DIv3DBL53PcMi/cMi/cME6T53BYkChNyJAoTcfc/ChMyMAoTNPsMBhMsMQoTdPcMBhNycQoTYfsM/sz7DPrMBxNiJgoTpCYKDov3DPcM9wz3DPcM9wz3DBL53PcMi/cM9wz3DBP6+dwWJAoT9veCChP6dQoT9vsM/lT7DBwEsPsMHPtQ+wz6VAcT+iYKDov3DIv3hPsM9wyL9wyL94T7hPcM9wz3DBKL9wz3DPcMi/cM+sz3DIv3DPcM9wwTIYj3DPf8FRMRiPcMHAcIBxMhiPsMHPj4+wz3DAcTQYj7DAcToYj3DAYToUgpChOhmPsM9wwcBSgGE4EoKwoTQRj3DAYTIRg1ChMRGCEKEwUYKgoTCRj3DAcTCSj7DAYTAygxChMJKPcMBhMFmPsMHPrYBxMJiPcMBxMDSCEKEwmIJgoTBYgmChMRiHgKDov3DIv3DIv3DIv3DIv3DIv3DIv3DBKL9wyL9wyL9wyL9wz3DPcMExAQ+dz3/BUcB4D3DBz4gAYTIhD7hPuEFSAKE4AQ/dwEIQoTgDD7hPsMFSQKE4BQ+wwGE0BQ9wwHE0CQ+wwGEyCQ9wwHEyEQ+wwGExEQ9wwHEwiQJAoTBFAkChMCMCEKEwRQJgoTCJAmChMREHgKEyEQ9wwGEyCQ+wwHE0CQ9wwGE0BQ+wwHE4BQ9wwGDov3DPcM9wz3DPcM9wz3DBIcBpD3DIv3DPcM9wwT+hwGkBYkChP294IKE/p1ChP2+wwc+Pj7DBwH+PsMHPgI+wwcBwgHE/omCg6L9wz3DPcM9wz3DPcM9wwSHAlg9wyL9wz3DPcME/ocCWAWJAoT9veCChP6dQoT9vsMHPYo+wwcCsj7DBz1OPsMHAnYBxP6JgoOi/cM9wz3DPcM9wz3DPcMEhwMMPcMi/cM9wz3DBP6HAwwFiQKE/b3ggoT+nUKE/b7DBzzWPsMHA2Y+wwc8mj7DBwMqAcT+iYKDov3DPcM9wz3DPcM9wz3DBIcDwD3DIv3DPcM9wwT+hwPABYkChP294IKE/p1ChP2+wwc8Ij7DBwQaPsMHO+Y+wwcD3gHE/omCg6L9wz3DPcM9wz3DPcM9wwSHBHQ9wyL9wz3DPcME/ocEdAWJAoT9veCChP6dQoT9vsMHO24+wwcEzj7DBzsyPsMHBJIBxP6JgoOi/cM9wz3DPcM9wz3DPcMEhwUoPcMi/cM9wz3DBP6HBSgFiQKE/b3ggoT+nUKE/b7DBzq6PsMHBYI+wwc6fj7DBwVGAcT+iYKDov3DPcM9wz3DPcM9wz3DBIcF3D3DIv3DPcM9wwT+hwXcBYkChP294IKE/p1ChP2+wwc6Bj7DBwY2PsMHOco+wwcF+gHE/omCg6L9wz3DPcM9wz3DPcM9wwSHBpA9wyL9wz3DPcME/ocGkAWJAoT9veCChP6dQoT9vsMHOVI+wwcG6j7DBzkWPsMHBq4BxP6JgoOi/cM9wz3DPcM9wz3DPcMEhwdEPcMi/cM9wz3DBP6HB0QFiQKE/b3ggoT+nUKE/b7DBziePsMHB54+wwc4Yj7DBwdiAcT+iYKDov3DPcM9wz3DPcM9wz3DBIcH+D3DIv3DPcM9wwT+hwf4BYkChP294IKE/p1ChP2+wwc36j7DBwhSPsMHN64+wwcIFgHE/omCg6L9wz3DPcM9wz3DPcM9wwSHCKw9wyL9wz3DPcME/ocIrAWJAoT9veCChP6dQoT9vsMHNzY+wwcJBj7DBzb6PsMHCMoBxP6JgoOi/cM9wz3DPcM9wz3DPcMEhwlgPcMi/cM9wz3DBP6HCWAFiQKE/b3ggoT+nUKE/b7DBzaCPsMHCbo+wwc2Rj7DBwl+AcT+iYKDov3DPcM9wz3DPcM9wz3DBIcKFD3DIv3DPcM9wwT+hwoUBYkChP294IKE/p1ChP2+wwc1zj7DBwpuPsMHNZI+wwcKMgHE/omCg6L9wz3DPcM9wz3DPcM9wwSHCsg9wyL9wz3DPcME/ocKyAWJAoT9veCChP6dQoT9vsMHNRo+wwcLIj7DBzTePsMHCuYBxP6JgoOi/cM9wz3DPcM9wz3DPcMEhwt8PcMi/cM9wz3DBP6HC3wFiQKE/b3ggoT+nUKE/b7DBzRmPsMHC9Y+wwc0Kj7DBwuaAcT+iYKDov3DPcM9wz3DPcM9wz3DBIcMMD3DIv3DPcM9wwT+hwwwBYkChP294IKE/p1ChP2+wwczsj7DBwyKPsMHM3Y+wwcMTgHE/omCg6L9wz3DPcM9wz3DPcM9wwSHDOQ9wyL9wz3DPcME/ocM5AWJAoT9veCChP6dQoT9vsMHMv4+wwcNPj7DBzLCPsMHDQIBxP6JgoOi/cM9wz3DPcM9wz3DPcMEhw2YPcMi/cM9wz3DBP6HDZgFiQKE/b3ggoT+nUKE/b7DBzJKPsMHDfI+wwcyDj7DBw22AcT+iYKDov3DPcM9wz3DPcM9wz3DBIcOTD3DIv3DPcM9wwT+hw5MBYkChP294IKE/p1ChP2+wwcxlj7DBw6mPsMHMVo+wwcOagHE/omCg6L9wz3DPcM9wz3DPcM9wwSHDwA9wyL9wz3DPcME/ocPAAWJAoT9veCChP6dQoT9vsMHMOI+wwcPWj7DBzCmPsMHDx4BxP6JgoOi/cM9wz3DPcM9wz3DPcMEhw+0PcMi/cM9wz3DBP6HD7QFiQKE/b3ggoT+nUKE/b7DBzAuPsMHEA4+wwcv8j7DBw/SAcT+iYKDov3DPcM9wz3DPcM9wz3DBIcQaD3DIv3DPcM9wwT+hxBoBYkChP294IKE/p1ChP2+wwcvej7DBxDCPsMHLz4+wwcQhgHE/omCg6L9wz3DPcM9wz3DPcM9wwSHERw9wyL9wz3DPcME/ocRHAWJAoT9veCChP6dQoT9vsMHLsY+wwcRdj7DBy6KPsMHEToBxP6JgoOi/cM9wz3DPcM9wz3DPcMEhxHQPcMi/cM9wz3DBP6HEdAFiQKE/b3ggoT+nUKE/b7DBy4SPsMHEio+wwct1j7DBxHuAcT+iYKDov3DPcM9wz3DPcM9wz3DBIcShD3DIv3DPcM9wwT+hxKEBYkChP294IKE/p1ChP2+wwctXj7DBxLePsMHLSI+wwcSogHE/omCg6L9wz3DPcM9wz3DPcM9wwSHEzg9wyL9wz3DPcME/ocTOAWJAoT9veCChP6dQoT9vsMHLKo+wwcTkj7DByxuPsMHE1YBxP6JgoOi/cM9wz3DPcM9wz3DPcMEhxPsPcMi/cM9wz3DBP6HE+wFiQKE/b3ggoT+nUKE/b7DByv2PsMHFEY+wwcruj7DBxQKAcT+iYKDov3DPcM9wz3DPcM9wz3DBIcUoD3DIv3DPcM9wwT+hxSgBYkChP294IKE/p1ChP2+wwcrQj7DBxT6PsMHKwY+wwcUvgHE/omCg6L9wz3DPcM9wz3DPcM9wwSHFVQ9wyL9wz3DPcME/ocVVAWJAoT9veCChP6dQoT9vsMHKo4+wwcVrj7DBypSPsMHFXIBxP6JgoOi/cM9wz3DPcM9wz3DPcMEhxYIPcMi/cM9wz3DBP6HFggFiQKE/b3ggoT+nUKE/b7DBynaPsMHFmI+wwcpnj7DBxYmAcT+iYKDov3DPcM9wz3DPcM9wz3DBKL9wz3DPcMi/cME/r3/BYkChP8+wz3DBwHCPcMHPgI9wwcB/j3DBz4+PcMBhP6IQoT/PeDCg6L9wz3DPcM9wz3DPcM9wwSi/cM9wz3DIv3DBP69/wWJAoT/PsM9wwcCdj3DBz1OPcMHArI9wwc9ij3DAYT+iEKE/z3gwoOi/cM9wz3DPcM9wz3DPcMEov3DPcM9wyL9wwT+vf8FiQKE/z7DPcMHAyo9wwc8mj3DBwNmPcMHPNY9wwGE/ohChP894MKDov3DPcM9wz3DPcM9wz3DBKL9wz3DPcMi/cME/r3/BYkChP8+wz3DBwPePcMHO+Y9wwcEGj3DBzwiPcMBhP6IQoT/PeDCg6L9wz3DPcM9wz3DPcM9wwSi/cM9wz3DIv3DBP69/wWJAoT/PsM9wwcEkj3DBzsyPcMHBM49wwc7bj3DAYT+iEKE/z3gwoOi/cM9wz3DPcM9wz3DPcMEov3DPcM9wyL9wwT+vf8FiQKE/z7DPcMHBUY9wwc6fj3DBwWCPcMHOro9wwGE/ohChP894MKDov3DPcM9wz3DPcM9wz3DBKL9wz3DPcMi/cME/r3/BYkChP8+wz3DBwX6PcMHOco9wwcGNj3DBzoGPcMBhP6IQoT/PeDCg6L9wz3DPcM9wz3DPcM9wwSi/cM9wz3DIv3DBP69/wWJAoT/PsM9wwcGrj3DBzkWPcMHBuo9wwc5Uj3DAYT+iEKE/z3gwoOi/cM9wz3DPcM9wz3DPcMEov3DPcM9wyL9wwT+vf8FiQKE/z7DPcMHB2I9wwc4Yj3DBweePcMHOJ49wwGE/ohChP894MKDov3DPcM9wz3DPcM9wz3DBKL9wz3DPcMi/cME/r3/BYkChP8+wz3DBwgWPcMHN649wwcIUj3DBzfqPcMBhP6IQoT/PeDCg6L9wz3DPcM9wz3DPcM9wwSi/cM9wz3DIv3DBP69/wWJAoT/PsM9wwcIyj3DBzb6PcMHCQY9wwc3Nj3DAYT+iEKE/z3gwoOi/cM9wz3DPcM9wz3DPcMEov3DPcM9wyL9wwT+vf8FiQKE/z7DPcMHCX49wwc2Rj3DBwm6PcMHNoI9wwGE/ohChP894MKDov3DPcM9wz3DPcM9wz3DBKL9wz3DPcMi/cME/r3/BYkChP8+wz3DBwoyPcMHNZI9wwcKbj3DBzXOPcMBhP6IQoT/PeDCg6L9wz3DPcM9wz3DPcM9wwSi/cM9wz3DIv3DBP69/wWJAoT/PsM9wwcK5j3DBzTePcMHCyI9wwc1Gj3DAYT+iEKE/z3gwoOi/cM9wz3DPcM9wz3DPcMEov3DPcM9wyL9wwT+vf8FiQKE/z7DPcMHC5o9wwc0Kj3DBwvWPcMHNGY9wwGE/ohChP894MKDov3DPcM9wz3DPcM9wz3DBKL9wz3DPcMi/cME/r3/BYkChP8+wz3DBwxOPcMHM3Y9wwcMij3DBzOyPcMBhP6IQoT/PeDCg6L9wz3DPcM9wz3DPcM9wwSi/cM9wz3DIv3DBP69/wWJAoT/PsM9wwcNAj3DBzLCPcMHDT49wwcy/j3DAYT+iEKE/z3gwoOi/cM9wz3DPcM9wz3DPcMEov3DPcM9wyL9wwT+vf8FiQKE/z7DPcMHDbY9wwcyDj3DBw3yPcMHMko9wwGE/ohChP894MKDov3DPcM9wz3DPcM9wz3DBKL9wz3DPcMi/cME/r3/BYkChP8+wz3DBw5qPcMHMVo9wwcOpj3DBzGWPcMBhP6IQoT/PeDCg6L9wz3DPcM9wz3DPcM9wwSi/cM9wz3DIv3DBP69/wWJAoT/PsM9wwcPHj3DBzCmPcMHD1o9wwcw4j3DAYT+iEKE/z3gwoOi/cM9wz3DPcM9wz3DPcMEov3DPcM9wyL9wwT+vf8FiQKE/z7DPcMHD9I9wwcv8j3DBxAOPcMHMC49wwGE/ohChP894MKDov3DPcM9wz3DPcM9wz3DBKL9wz3DPcMi/cME/r3/BYkChP8+wz3DBxCGPcMHLz49wwcQwj3DBy96PcMBhP6IQoT/PeDCg6L9wz3DPcM9wz3DPcM9wwSi/cM9wz3DIv3DBP69/wWJAoT/PsM9wwcROj3DBy6KPcMHEXY9wwcuxj3DAYT+iEKE/z3gwoOi/cM9wz3DPcM9wz3DPcMEov3DPcM9wyL9wwT+vf8FiQKE/z7DPcMHEe49wwct1j3DBxIqPcMHLhI9wwGE/ohChP894MKDov3DPcM9wz3DPcM9wz3DBKL9wz3DPcMi/cME/r3/BYkChP8+wz3DBxKiPcMHLSI9wwcS3j3DBy1ePcMBhP6IQoT/PeDCg6L9wz3DPcM9wz3DPcM9wwSi/cM9wz3DIv3DBP69/wWJAoT/PsM9wwcTVj3DByxuPcMHE5I9wwcsqj3DAYT+iEKE/z3gwoOi/cM9wz3DPcM9wz3DPcMEov3DPcM9wyL9wwT+vf8FiQKE/z7DPcMHFAo9wwcruj3DBxRGPcMHK/Y9wwGE/ohChP894MKDov3DPcM9wz3DPcM9wz3DBKL9wz3DPcMi/cME/r3/BYkChP8+wz3DBxS+PcMHKwY9wwcU+j3DBytCPcMBhP6IQoT/PeDCg6L9wz3DPcM9wz3DPcM9wwSi/cM9wz3DIv3DBP69/wWJAoT/PsM9wwcVcj3DBypSPcMHFa49wwcqjj3DAYT+iEKE/z3gwoOi/cM9wz3DPcM9wz3DPcMEov3DPcM9wyL9wwT+vf8FiQKE/z7DPcMHFiY9wwcpnj3DBxZiPcMHKdo9wwGE/ohChP894MKDov3DIv3DPcM9wz3DPcMi/cMEhwGkPcMi/cMi/cME6QcBpAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBz4gPsMHAeABxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwJYPcMi/cMi/cME6QcCWAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBz1sPsMHApQBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwMMPcMi/cMi/cME6QcDDAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzy4PsMHA0gBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwPAPcMi/cMi/cME6QcDwAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzwEPsMHA/wBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwR0PcMi/cMi/cME6QcEdAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBztQPsMHBLABxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwUoPcMi/cMi/cME6QcFKAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzqcPsMHBWQBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwXcPcMi/cMi/cME6QcF3AWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBznoPsMHBhgBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwaQPcMi/cMi/cME6QcGkAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzk0PsMHBswBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwdEPcMi/cMi/cME6QcHRAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBziAPsMHB4ABxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwf4PcMi/cMi/cME6QcH+AWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzfMPsMHCDQBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwisPcMi/cMi/cME6QcIrAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzcYPsMHCOgBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwlgPcMi/cMi/cME6QcJYAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzZkPsMHCZwBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwoUPcMi/cMi/cME6QcKFAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzWwPsMHClABxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwrIPcMi/cMi/cME6QcKyAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzT8PsMHCwQBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwt8PcMi/cMi/cME6QcLfAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzRIPsMHC7gBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwwwPcMi/cMi/cME6QcMMAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzOUPsMHDGwBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhwzkPcMi/cMi/cME6QcM5AWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzLgPsMHDSABxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhw2YPcMi/cMi/cME6QcNmAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzIsPsMHDdQBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhw5MPcMi/cMi/cME6QcOTAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzF4PsMHDogBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhw8APcMi/cMi/cME6QcPAAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzDEPsMHDzwBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhw+0PcMi/cMi/cME6QcPtAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBzAQPsMHD/ABxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhxBoPcMi/cMi/cME6QcQaAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBy9cPsMHEKQBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhxEcPcMi/cMi/cME6QcRHAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBy6oPsMHEVgBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhxHQPcMi/cMi/cME6QcR0AWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBy30PsMHEgwBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhxKEPcMi/cMi/cME6QcShAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBy1APsMHEsABxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhxM4PcMi/cMi/cME6QcTOAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DByyMPsMHE3QBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhxPsPcMi/cMi/cME6QcT7AWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DByvYPsMHFCgBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhxSgPcMi/cMi/cME6QcUoAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DByskPsMHFNwBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhxVUPcMi/cMi/cME6QcVVAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBypwPsMHFZABxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEhxYIPcMi/cMi/cME6QcWCAWJAoTciQKE3H3PwoTMjAKEzT7DAYTLDEKE3T3DAYTcnEKE2H7DBym8PsMHFkQBxNiJgoTpCYKDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwHgPcMHPiA9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwKUPcMHPWw9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwNIPcMHPLg9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwP8PcMHPAQ9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwSwPcMHO1A9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwVkPcMHOpw9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwYYPcMHOeg9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwbMPcMHOTQ9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBweAPcMHOIA9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwg0PcMHN8w9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwjoPcMHNxg9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwmcPcMHNmQ9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwpQPcMHNbA9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwsEPcMHNPw9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwu4PcMHNEg9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBwxsPcMHM5Q9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBw0gPcMHMuA9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBw3UPcMHMiw9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBw6IPcMHMXg9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBw88PcMHMMQ9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBw/wPcMHMBA9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBxCkPcMHL1w9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBxFYPcMHLqg9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBxIMPcMHLfQ9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBxLAPcMHLUA9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBxN0PcMHLIw9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBxQoPcMHK9g9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBxTcPcMHKyQ9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBxWQPcMHKnA9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDov3DIv3DPcM9wz3DPcMi/cMEvcM9wyL9wyL9wwToff8FiQKE6L7DAYTcvcMBxN0+wz3DBxZEPcMHKbw9wwGEzIkChMpIQoTciYKE3T3dQoTYvsMBxOi9wwGDvf89wwB9/wEHAhw9wwc95AGDvf89wwB9/wEHAtA9wwc9MAGDvf89wwB9/wEHA4Q9wwc8fAGDvf89wwB9/wEHBDg9wwc7yAGDvf89wwB9/wEHBOw9wwc7FAGDvf89wwB9/wEHBaA9wwc6YAGDvf89wwB9/wEHBlQ9wwc5rAGDvf89wwB9/wEHBwg9wwc4+AGDvf89wwB9/wEHB7w9wwc4RAGDvf89wwB9/wEHCHA9wwc3kAGDvf89wwB9/wEHCSQ9wwc23AGDvf89wwB9/wEHCdg9wwc2KAGDvf89wwB9/wEHCow9wwc1dAGDvf89wwB9/wEHC0A9wwc0wAGDvf89wwB9/wEHC/Q9wwc0DAGDvf89wwB9/wEHDKg9wwczWAGDvf89wwB9/wEHDVw9wwcypAGDvf89wwB9/wEHDhA9wwcx8AGDvf89wwB9/wEHDsQ9wwcxPAGDvf89wwB9/wEHD3g9wwcwiAGDvf89wwB9/wEHECw9wwcv1AGDvf89wwB9/wEHEOA9wwcvIAGDvf89wwB9/wEHEZQ9wwcubAGDvf89wwB9/wEHEkg9wwctuAGDvf89wwB9/wEHEvw9wwctBAGDvf89wwB9/wEHE7A9wwcsUAGDvf89wwB9/wEHFGQ9wwcrnAGDvf89wwB9/wEHFRg9wwcq6AGDvf89wwB9/wEHFcw9wwcqNAGDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcMi/cME5YA+HQEJAoTTwD3hAoThwD3EwoTRwD3hAoThwD3DAYThoApChOPAPsMBhNPACoKEy8AkAoTTgAmChOOAKsKE04AKgoTLgCQChNOACYKE5YAJgoO+HT3DIv3DIv3DBKL9wyL9wz3hPcM94T3DPeE9wz3hPcM94T3DIv3DBOXgPh0BCQKE0/A94QKE4fA9xMKE0fA94QKE4fA9xMKE0fA94QKE4fA9wwGE4egKQoTj8D7DAYTT8AqChMvwJAKE0+AJgoTj4CrChNPgCoKEy+AkAoTT4AmChOPgKsKE0+AKgoTL4CQChNPgCYKE5eAJgoO+HT3DIv3DIv3DBKL9wyL9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMi/cME5fg+HQEJAoTT/D3hAoTh/D3EwoTR/D3hAoTh/D3EwoTR/D3hAoTh/D3EwoTR/D3hAoTh/D3DAYTh+gpChOP8PsMBhNP8CoKEy/wkAoTT+AmChOP4KsKE0/gKgoTL+CQChNP4CYKE4/gqwoTT+AqChMv4JAKE0/gJgoTj+CrChNP4CoKEy/gkAoTT+AmChOX4CYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMi/cME5f4+HQEJAoTT/z3hAoTh/z3EwoTR/z3hAoTh/z3EwoTR/z3hAoTh/z3EwoTR/z3hAoTh/z3EwoTR/z3hAoTh/z3DAYTh/opChOP/PsMBhNP/CoKEy/8kAoTT/gmChOP+KsKE0/4KgoTL/iQChNP+CYKE4/4qwoTT/gqChMv+JAKE0/4JgoTj/irChNP+CoKEy/4kAoTT/gmChOP+KsKE0/4KgoTL/iQChNP+CYKE5f4JgoO+HT3DIv3DIv3DBKL9wyL9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DIv3DBOX/gD4dAQkChNP/wD3hAoTh/8A9xMKE0f/APeEChOH/wD3EwoTR/8A94QKE4f/APcTChNH/wD3hAoTh/8A9xMKE0f/APeEChOH/wD3EwoTR/8A94QKE4f/APcMBhOH/oApChOP/wD7DAYTT/8AKgoTL/8AkAoTT/4AJgoTj/4AqwoTT/4AKgoTL/4AkAoTT/4AJgoTj/4AqwoTT/4AKgoTL/4AkAoTT/4AJgoTj/4AqwoTT/4AKgoTL/4AkAoTT/4AJgoTj/4AqwoTT/4AKgoTL/4AkAoTT/4AJgoTj/4AqwoTT/4AKgoTL/4AkAoTT/4AJgoTl/4AJgoO+HT3DIv3DIv3DBKL9wyL9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMi/cME5f/gPh0BCQKE0//wPeEChOH/8D3EwoTR//A94QKE4f/wPcTChNH/8D3hAoTh//A9xMKE0f/wPeEChOH/8D3EwoTR//A94QKE4f/wPcTChNH/8D3hAoTh//A9xMKE0f/wPeEChOH/8D3DAYTh/+gKQoTj//A+wwGE0//wCoKEy//wJAKE0//gCYKE4//gKsKE0//gCoKEy//gJAKE0//gCYKE4//gKsKE0//gCoKEy//gJAKE0//gCYKE4//gKsKE0//gCoKEy//gJAKE0//gCYKE4//gKsKE0//gCoKEy//gJAKE0//gCYKE4//gKsKE0//gCoKEy//gJAKE0//gCYKE4//gKsKE0//gCoKEy//gJAKE0//gCYKE5f/gCYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMi/cME5f/4Ph0BCQKE0//8PeEChOH//D3EwoTR//w94QKE4f/8PcTChNH//D3hAoTh//w9xMKE0f/8PeEChOH//D3EwoTR//w94QKE4f/8PcTChNH//D3hAoTh//w9xMKE0f/8PeEChOH//D3EwoTR//w94QKE4f/8PcMBhOH/+gpChOP//D7DAYTT//wKgoTL//wkAoTT//gJgoTj//gqwoTT//gKgoTL//gkAoTT//gJgoTj//gqwoTT//gKgoTL//gkAoTT//gJgoTj//gqwoTT//gKgoTL//gkAoTT//gJgoTj//gqwoTT//gKgoTL//gkAoTT//gJgoTj//gqwoTT//gKgoTL//gkAoTT//gJgoTj//gqwoTT//gKgoTL//gkAoTT//gJgoTj//gqwoTT//gKgoTL//gkAoTT//gJgoTl//gJgoO+HT3DIv3DIv3DBKL9wyL9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DIv3DBOX//j4dAQkChNP//z3hAoTh//89xMKE0f//PeEChOH//z3EwoTR//894QKE4f//PcTChNH//z3hAoTh//89xMKE0f//PeEChOH//z3EwoTR//894QKE4f//PcTChNH//z3hAoTh//89xMKE0f//PeEChOH//z3EwoTR//894QKE4f//PcMBhOH//opChOP//z7DAYTT//8KgoTL//8kAoTT//4JgoTj//4qwoTT//4KgoTL//4kAoTT//4JgoTj//4qwoTT//4KgoTL//4kAoTT//4JgoTj//4qwoTT//4KgoTL//4kAoTT//4JgoTj//4qwoTT//4KgoTL//4kAoTT//4JgoTj//4qwoTT//4KgoTL//4kAoTT//4JgoTj//4qwoTT//4KgoTL//4kAoTT//4JgoTj//4qwoTT//4KgoTL//4kAoTT//4JgoTj//4qwoTT//4KgoTL//4kAoTT//4JgoTl//4JgoO+HT3DIv3DIv3DBKL9wyL9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMi/cME5f//gD4dAQkChNP//8A94QKE4f//wD3EwoTR///APeEChOH//8A9xMKE0f//wD3hAoTh///APcTChNH//8A94QKE4f//wD3EwoTR///APeEChOH//8A9xMKE0f//wD3hAoTh///APcTChNH//8A94QKE4f//wD3EwoTR///APeEChOH//8A9xMKE0f//wD3hAoTh///APcTChNH//8A94QKE4f//wD3DAYTh//+gCkKE4///wD7DAYTT///ACoKEy///wCQChNP//4AJgoTj//+AKsKE0///gAqChMv//4AkAoTT//+ACYKE4///gCrChNP//4AKgoTL//+AJAKE0///gAmChOP//4AqwoTT//+ACoKEy///gCQChNP//4AJgoTj//+AKsKE0///gAqChMv//4AkAoTT//+ACYKE4///gCrChNP//4AKgoTL//+AJAKE0///gAmChOP//4AqwoTT//+ACoKEy///gCQChNP//4AJgoTj//+AKsKE0///gAqChMv//4AkAoTT//+ACYKE4///gCrChNP//4AKgoTL//+AJAKE0///gAmChOP//4AqwoTT//+ACoKEy///gCQChNP//4AJgoTl//+ACYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF4v3DBOX//+A+HQEJAoTT///wPeEChOH///A9xMKE0f//8D3hAoTh///wPcTChNH///A94QKE4f//8D3EwoTR///wPeEChOH///A9xMKE0f//8D3hAoTh///wPcTChNH///A94QKE4f//8D3EwoTR///wPeEChOH///A9xMKE0f//8D3hAoTh///wPcTChNH///A94QKE4f//8D3EwoTR///wPeEChOH///A9xMKE0f//8D3hAoTh///wPcMBhOH//+gKQoTj///wPsMBhNP///AKgoTL///wJAKE0///4AmChOP//+AqwoTT///gCoKEy///4CQChNP//+AJgoTj///gKsKE0///4AqChMv//+AkAoTT///gCYKE4///4CrChNP//+AKgoTL///gJAKE0///4AmChOP//+AqwoTT///gCoKEy///4CQChNP//+AJgoTj///gKsKE0///4AqChMv//+AkAoTT///gCYKE4///4CrChNP//+AKgoTL///gJAKE0///4AmChOP//+AqwoTT///gCoKEy///4CQChNP//+AJgoTj///gKsKE0///4AqChMv//+AkAoTT///gCYKE4///4CrChNP//+AKgoTL///gJAKE0///4AmChOP//+AqwoTT///gCoKEy///4CQChNP//+AJgoTl///gCYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcMi/cME5f//+D4dAQkChNP///w94QKE4f///D3EwoTR///8PeEChOH///w9xMKE0f///D3hAoTh///8PcTChNH///w94QKE4f///D3EwoTR///8PeEChOH///w9xMKE0f///D3hAoTh///8PcTChNH///w94QKE4f///D3EwoTR///8PeEChOH///w9xMKE0f///D3hAoTh///8PcTChNH///w94QKE4f///D3EwoTR///8PeEChOH///w9xMKE0f///D3hAoTh///8PcMBhOH///oKQoTj///8PsMBhNP///wKgoTL///8JAKE0///+AmChOP///gqwoTT///4CoKEy///+CQChNP///gJgoTj///4KsKE0///+AqChMv///gkAoTT///4CYKE4///+CrChNP///gKgoTL///4JAKE0///+AmChOP///gqwoTT///4CoKEy///+CQChNP///gJgoTj///4KsKE0///+AqChMv///gkAoTT///4CYKE4///+CrChNP///gKgoTL///4JAKE0///+AmChOP///gqwoTT///4CoKEy///+CQChNP///gJgoTj///4KsKE0///+AqChMv///gkAoTT///4CYKE4///+CrChNP///gKgoTL///4JAKE0///+AmChOP///gqwoTT///4CoKEy///+CQChNP///gJgoTj///4KsKE0///+AqChMv///gkAoTT///4CYKE5f//+AmCg74dPcMi/cMi/cMEov3DIv3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DBf3hPcM94T3DPeE9wz3hPcMi/cME5f///j4dAQkChNP///894QKE4f///z3EwoTR////PeEChOH///89xMKE0f///z3hAoTh////PcTChNH///894QKE4f///z3EwoTR////PeEChOH///89xMKE0f///z3hAoTh////PcTChNH///894QKE4f///z3EwoTR////PeEChOH///89xMKE0f///z3hAoTh////PcTChNH///894QKE4f///z3EwoTR////PeEChOH///89xMKE0f///z3hAoTh////PcTChNH///894QKE4f///z3DAYTh///+ikKE4////z7DAYTT////CoKEy////yQChNP///4JgoTj///+KsKE0////gqChMv///4kAoTT///+CYKE4////irChNP///4KgoTL///+JAKE0////gmChOP///4qwoTT///+CoKEy////iQChNP///4JgoTj///+KsKE0////gqChMv///4kAoTT///+CYKE4////irChNP///4KgoTL///+JAKE0////gmChOP///4qwoTT///+CoKEy////iQChNP///4JgoTj///+KsKE0////gqChMv///4kAoTT///+CYKE4////irChNP///4KgoTL///+JAKE0////gmChOP///4qwoTT///+CoKEy////iQChNP///4JgoTj///+KsKE0////gqChMv///4kAoTT///+CYKE4////irChNP///4KgoTL///+JAKE0////gmChOP///4qwoTT///+CoKEy////iQChNP///4JgoTl///+CYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DIv3DBOX///+APh0BCQKE0////8A94QKE4f///8A9xMKE0f///8A94QKE4f///8A9xMKE0f///8A94QKE4f///8A9xMKE0f///8A94QKE4f///8A9xMKE0f///8A94QKE4f///8A9xMKE0f///8A94QKE4f///8A9xMKE0f///8A94QKE4f///8A9xMKE0f///8A94QKE4f///8A9xMKE0f///8A94QKE4f///8A9xMKE0f///8A94QKE4f///8A9xMKE0f///8A94QKE4f///8A9xMKE0f///8A94QKE4f///8A9xMKE0f///8A94QKE4f///8A9xMKE0f///8A94QKE4f///8A9wwGE4f///6AKQoTj////wD7DAYTT////wAqChMv////AJAKE0////4AJgoTj////gCrChNP///+ACoKEy////4AkAoTT////gAmChOP///+AKsKE0////4AKgoTL////gCQChNP///+ACYKE4////4AqwoTT////gAqChMv///+AJAKE0////4AJgoTj////gCrChNP///+ACoKEy////4AkAoTT////gAmChOP///+AKsKE0////4AKgoTL////gCQChNP///+ACYKE4////4AqwoTT////gAqChMv///+AJAKE0////4AJgoTj////gCrChNP///+ACoKEy////4AkAoTT////gAmChOP///+AKsKE0////4AKgoTL////gCQChNP///+ACYKE4////4AqwoTT////gAqChMv///+AJAKE0////4AJgoTj////gCrChNP///+ACoKEy////4AkAoTT////gAmChOP///+AKsKE0////4AKgoTL////gCQChNP///+ACYKE4////4AqwoTT////gAqChMv///+AJAKE0////4AJgoTj////gCrChNP///+ACoKEy////4AkAoTT////gAmChOX///+ACYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMi/cME5f///+A+HQEJAoTT////8D3hAoTh////8D3EwoTR////8D3hAoTh////8D3EwoTR////8D3hAoTh////8D3EwoTR////8D3hAoTh////8D3EwoTR////8D3hAoTh////8D3EwoTR////8D3hAoTh////8D3EwoTR////8D3hAoTh////8D3EwoTR////8D3hAoTh////8D3EwoTR////8D3hAoTh////8D3EwoTR////8D3hAoTh////8D3EwoTR////8D3hAoTh////8D3EwoTR////8D3hAoTh////8D3EwoTR////8D3hAoTh////8D3EwoTR////8D3hAoTh////8D3EwoTR////8D3hAoTh////8D3DAYTh////6ApChOP////wPsMBhNP////wCoKEy/////AkAoTT////4AmChOP////gKsKE0////+AKgoTL////4CQChNP////gCYKE4////+AqwoTT////4AqChMv////gJAKE0////+AJgoTj////4CrChNP////gCoKEy////+AkAoTT////4AmChOP////gKsKE0////+AKgoTL////4CQChNP////gCYKE4////+AqwoTT////4AqChMv////gJAKE0////+AJgoTj////4CrChNP////gCoKEy////+AkAoTT////4AmChOP////gKsKE0////+AKgoTL////4CQChNP////gCYKE4////+AqwoTT////4AqChMv////gJAKE0////+AJgoTj////4CrChNP////gCoKEy////+AkAoTT////4AmChOP////gKsKE0////+AKgoTL////4CQChNP////gCYKE4////+AqwoTT////4AqChMv////gJAKE0////+AJgoTj////4CrChNP////gCoKEy////+AkAoTT////4AmChOP////gKsKE0////+AKgoTL////4CQChNP////gCYKE4////+AqwoTT////4AqChMv////gJAKE0////+AJgoTl////4AmCg74dPcMi/cMi/cMEov3DIv3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DBf3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMi/cME5f////g+HQEJAoTT/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3EwoTR/////D3hAoTh/////D3DAYTh////+gpChOP////8PsMBhNP////8CoKEy/////wkAoTT////+AmChOP////4KsKE0/////gKgoTL////+CQChNP////4CYKE4/////gqwoTT////+AqChMv////4JAKE0/////gJgoTj////+CrChNP////4CoKEy/////gkAoTT////+AmChOP////4KsKE0/////gKgoTL////+CQChNP////4CYKE4/////gqwoTT////+AqChMv////4JAKE0/////gJgoTj////+CrChNP////4CoKEy/////gkAoTT////+AmChOP////4KsKE0/////gKgoTL////+CQChNP////4CYKE4/////gqwoTT////+AqChMv////4JAKE0/////gJgoTj////+CrChNP////4CoKEy/////gkAoTT////+AmChOP////4KsKE0/////gKgoTL////+CQChNP////4CYKE4/////gqwoTT////+AqChMv////4JAKE0/////gJgoTj////+CrChNP////4CoKEy/////gkAoTT////+AmChOP////4KsKE0/////gKgoTL////+CQChNP////4CYKE4/////gqwoTT////+AqChMv////4JAKE0/////gJgoTj////+CrChNP////4CoKEy/////gkAoTT////+AmChOX////4CYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DIv3DBOX////+Ph0BCQKE0/////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89xMKE0f////894QKE4f////89wwGE4f////6KQoTj/////z7DAYTT/////wqChMv/////JAKE0/////4JgoTj/////irChNP////+CoKEy/////4kAoTT/////gmChOP////+KsKE0/////4KgoTL/////iQChNP////+CYKE4/////4qwoTT/////gqChMv////+JAKE0/////4JgoTj/////irChNP////+CoKEy/////4kAoTT/////gmChOP////+KsKE0/////4KgoTL/////iQChNP////+CYKE4/////4qwoTT/////gqChMv////+JAKE0/////4JgoTj/////irChNP////+CoKEy/////4kAoTT/////gmChOP////+KsKE0/////4KgoTL/////iQChNP////+CYKE4/////4qwoTT/////gqChMv////+JAKE0/////4JgoTj/////irChNP////+CoKEy/////4kAoTT/////gmChOP////+KsKE0/////4KgoTL/////iQChNP////+CYKE4/////4qwoTT/////gqChMv////+JAKE0/////4JgoTj/////irChNP////+CoKEy/////4kAoTT/////gmChOP////+KsKE0/////4KgoTL/////iQChNP////+CYKE4/////4qwoTT/////gqChMv////+JAKE0/////4JgoTj/////irChNP////+CoKEy/////4kAoTT/////gmChOX////+CYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMi/cME5f////+APh0BCQKE0//////APeEChOH/////wD3EwoTR/////8A94QKE4f/////APcTChNH/////wD3hAoTh/////8A9xMKE0f/////APeEChOH/////wD3EwoTR/////8A94QKE4f/////APcTChNH/////wD3hAoTh/////8A9xMKE0f/////APeEChOH/////wD3EwoTR/////8A94QKE4f/////APcTChNH/////wD3hAoTh/////8A9xMKE0f/////APeEChOH/////wD3EwoTR/////8A94QKE4f/////APcTChNH/////wD3hAoTh/////8A9xMKE0f/////APeEChOH/////wD3EwoTR/////8A94QKE4f/////APcTChNH/////wD3hAoTh/////8A9xMKE0f/////APeEChOH/////wD3EwoTR/////8A94QKE4f/////APcTChNH/////wD3hAoTh/////8A9wwGE4f////+gCkKE4//////APsMBhNP/////wAqChMv/////wCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOP/////gCrChNP/////gAqChMv/////gCQChNP/////gAmChOX/////gAmCg74dPcMi/cMi/cMEov3DIv3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DBf3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMi/cME5f/////gPh0BCQKE0//////wPeEChOH/////8D3EwoTR//////A94QKE4f/////wPcTChNH/////8D3hAoTh//////A9xMKE0f/////wPeEChOH/////8D3EwoTR//////A94QKE4f/////wPcTChNH/////8D3hAoTh//////A9xMKE0f/////wPeEChOH/////8D3EwoTR//////A94QKE4f/////wPcTChNH/////8D3hAoTh//////A9xMKE0f/////wPeEChOH/////8D3EwoTR//////A94QKE4f/////wPcTChNH/////8D3hAoTh//////A9xMKE0f/////wPeEChOH/////8D3EwoTR//////A94QKE4f/////wPcTChNH/////8D3hAoTh//////A9xMKE0f/////wPeEChOH/////8D3EwoTR//////A94QKE4f/////wPcTChNH/////8D3hAoTh//////A9xMKE0f/////wPeEChOH/////8D3DAYTh/////+gKQoTj//////A+wwGE0//////wCoKEy//////wJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE4//////gKsKE0//////gCoKEy//////gJAKE0//////gCYKE5f/////gCYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DIv3DBOX/////+D4dAQkChNP//////D3hAoTh//////w9xMKE0f/////8PeEChOH//////D3EwoTR//////w94QKE4f/////8PcTChNH//////D3hAoTh//////w9xMKE0f/////8PeEChOH//////D3EwoTR//////w94QKE4f/////8PcTChNH//////D3hAoTh//////w9xMKE0f/////8PeEChOH//////D3EwoTR//////w94QKE4f/////8PcTChNH//////D3hAoTh//////w9xMKE0f/////8PeEChOH//////D3EwoTR//////w94QKE4f/////8PcTChNH//////D3hAoTh//////w9xMKE0f/////8PeEChOH//////D3EwoTR//////w94QKE4f/////8PcTChNH//////D3hAoTh//////w9xMKE0f/////8PeEChOH//////D3EwoTR//////w94QKE4f/////8PcTChNH//////D3hAoTh//////w9xMKE0f/////8PeEChOH//////D3DAYTh//////oKQoTj//////w+wwGE0//////8CoKEy//////8JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE4//////4KsKE0//////4CoKEy//////4JAKE0//////4CYKE5f/////4CYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMi/cME5f/////+Ph0BCQKE0///////PeEChOH//////z3EwoTR//////894QKE4f//////PcTChNH//////z3hAoTh//////89xMKE0f//////PeEChOH//////z3EwoTR//////894QKE4f//////PcTChNH//////z3hAoTh//////89xMKE0f//////PeEChOH//////z3EwoTR//////894QKE4f//////PcTChNH//////z3hAoTh//////89xMKE0f//////PeEChOH//////z3EwoTR//////894QKE4f//////PcTChNH//////z3hAoTh//////89xMKE0f//////PeEChOH//////z3EwoTR//////894QKE4f//////PcTChNH//////z3hAoTh//////89xMKE0f//////PeEChOH//////z3EwoTR//////894QKE4f//////PcTChNH//////z3hAoTh//////89xMKE0f//////PeEChOH//////z3EwoTR//////894QKE4f//////PcTChNH//////z3hAoTh//////89wwGE4f/////+ikKE4///////PsMBhNP//////wqChMv//////yQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOP//////irChNP//////gqChMv//////iQChNP//////gmChOX//////gmCg74dPcMi/cMi/cMEov3DIv3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DBf3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMi/cME5f//////gD4dAQkChNP//////8A94QKE4f//////wD3EwoTR///////APeEChOH//////8A9xMKE0f//////wD3hAoTh///////APcTChNH//////8A94QKE4f//////wD3EwoTR///////APeEChOH//////8A9xMKE0f//////wD3hAoTh///////APcTChNH//////8A94QKE4f//////wD3EwoTR///////APeEChOH//////8A9xMKE0f//////wD3hAoTh///////APcTChNH//////8A94QKE4f//////wD3EwoTR///////APeEChOH//////8A9xMKE0f//////wD3hAoTh///////APcTChNH//////8A94QKE4f//////wD3EwoTR///////APeEChOH//////8A9xMKE0f//////wD3hAoTh///////APcTChNH//////8A94QKE4f//////wD3EwoTR///////APeEChOH//////8A9xMKE0f//////wD3hAoTh///////APcTChNH//////8A94QKE4f//////wD3EwoTR///////APeEChOH//////8A9xMKE0f//////wD3hAoTh///////APcTChNH//////8A94QKE4f//////wD3DAYTh//////+gCkKE4///////wD7DAYTT///////ACoKEy///////wCQChNP//////4AJgoTj//////+AKsKE0///////gAqChMv//////4AkAoTT//////+ACYKE4///////gCrChNP//////4AKgoTL//////+AJAKE0///////gAmChOP//////4AqwoTT//////+ACoKEy///////gCQChNP//////4AJgoTj//////+AKsKE0///////gAqChMv//////4AkAoTT//////+ACYKE4///////gCrChNP//////4AKgoTL//////+AJAKE0///////gAmChOP//////4AqwoTT//////+ACoKEy///////gCQChNP//////4AJgoTj//////+AKsKE0///////gAqChMv//////4AkAoTT//////+ACYKE4///////gCrChNP//////4AKgoTL//////+AJAKE0///////gAmChOP//////4AqwoTT//////+ACoKEy///////gCQChNP//////4AJgoTj//////+AKsKE0///////gAqChMv//////4AkAoTT//////+ACYKE4///////gCrChNP//////4AKgoTL//////+AJAKE0///////gAmChOP//////4AqwoTT//////+ACoKEy///////gCQChNP//////4AJgoTj//////+AKsKE0///////gAqChMv//////4AkAoTT//////+ACYKE4///////gCrChNP//////4AKgoTL//////+AJAKE0///////gAmChOP//////4AqwoTT//////+ACoKEy///////gCQChNP//////4AJgoTj//////+AKsKE0///////gAqChMv//////4AkAoTT//////+ACYKE4///////gCrChNP//////4AKgoTL//////+AJAKE0///////gAmChOP//////4AqwoTT//////+ACoKEy///////gCQChNP//////4AJgoTj//////+AKsKE0///////gAqChMv//////4AkAoTT//////+ACYKE4///////gCrChNP//////4AKgoTL//////+AJAKE0///////gAmChOP//////4AqwoTT//////+ACoKEy///////gCQChNP//////4AJgoTl//////+ACYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wyL9wwTl///////gPh0BCQKE0///////8D3hAoTh///////wPcTChNH///////A94QKE4f//////8D3EwoTR///////wPeEChOH///////A9xMKE0f//////8D3hAoTh///////wPcTChNH///////A94QKE4f//////8D3EwoTR///////wPeEChOH///////A9xMKE0f//////8D3hAoTh///////wPcTChNH///////A94QKE4f//////8D3EwoTR///////wPeEChOH///////A9xMKE0f//////8D3hAoTh///////wPcTChNH///////A94QKE4f//////8D3EwoTR///////wPeEChOH///////A9xMKE0f//////8D3hAoTh///////wPcTChNH///////A94QKE4f//////8D3EwoTR///////wPeEChOH///////A9xMKE0f//////8D3hAoTh///////wPcTChNH///////A94QKE4f//////8D3EwoTR///////wPeEChOH///////A9xMKE0f//////8D3hAoTh///////wPcTChNH///////A94QKE4f//////8D3EwoTR///////wPeEChOH///////A9xMKE0f//////8D3hAoTh///////wPcTChNH///////A94QKE4f//////8D3DAYTh///////oCkKE4///////8D7DAYTT///////wCoKEy///////8CQChNP//////+AJgoTj///////gKsKE0///////4AqChMv//////+AkAoTT///////gCYKE4///////4CrChNP//////+AKgoTL///////gJAKE0///////4AmChOP//////+AqwoTT///////gCoKEy///////4CQChNP//////+AJgoTj///////gKsKE0///////4AqChMv//////+AkAoTT///////gCYKE4///////4CrChNP//////+AKgoTL///////gJAKE0///////4AmChOP//////+AqwoTT///////gCoKEy///////4CQChNP//////+AJgoTj///////gKsKE0///////4AqChMv//////+AkAoTT///////gCYKE4///////4CrChNP//////+AKgoTL///////gJAKE0///////4AmChOP//////+AqwoTT///////gCoKEy///////4CQChNP//////+AJgoTj///////gKsKE0///////4AqChMv//////+AkAoTT///////gCYKE4///////4CrChNP//////+AKgoTL///////gJAKE0///////4AmChOP//////+AqwoTT///////gCoKEy///////4CQChNP//////+AJgoTj///////gKsKE0///////4AqChMv//////+AkAoTT///////gCYKE4///////4CrChNP//////+AKgoTL///////gJAKE0///////4AmChOP//////+AqwoTT///////gCoKEy///////4CQChNP//////+AJgoTj///////gKsKE0///////4AqChMv//////+AkAoTT///////gCYKE4///////4CrChNP//////+AKgoTL///////gJAKE0///////4AmChOP//////+AqwoTT///////gCoKEy///////4CQChNP//////+AJgoTj///////gKsKE0///////4AqChMv//////+AkAoTT///////gCYKE4///////4CrChNP//////+AKgoTL///////gJAKE0///////4AmChOP//////+AqwoTT///////gCoKEy///////4CQChNP//////+AJgoTj///////gKsKE0///////4AqChMv//////+AkAoTT///////gCYKE5f//////4AmCg74dPcMi/cMi/cMEov3DIv3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DBf3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DBf3hPcM94T3DPeE9wyL9wwTl///////4Ph0BCQKE0////////D3hAoTh///////8PcTChNH///////w94QKE4f///////D3EwoTR///////8PeEChOH///////w9xMKE0f///////D3hAoTh///////8PcTChNH///////w94QKE4f///////D3EwoTR///////8PeEChOH///////w9xMKE0f///////D3hAoTh///////8PcTChNH///////w94QKE4f///////D3EwoTR///////8PeEChOH///////w9xMKE0f///////D3hAoTh///////8PcTChNH///////w94QKE4f///////D3EwoTR///////8PeEChOH///////w9xMKE0f///////D3hAoTh///////8PcTChNH///////w94QKE4f///////D3EwoTR///////8PeEChOH///////w9xMKE0f///////D3hAoTh///////8PcTChNH///////w94QKE4f///////D3EwoTR///////8PeEChOH///////w9xMKE0f///////D3hAoTh///////8PcTChNH///////w94QKE4f///////D3EwoTR///////8PeEChOH///////w9xMKE0f///////D3hAoTh///////8PcTChNH///////w94QKE4f///////D3EwoTR///////8PeEChOH///////w9wwGE4f//////+gpChOP///////w+wwGE0////////AqChMv///////wkAoTT///////4CYKE4///////+CrChNP///////gKgoTL///////4JAKE0///////+AmChOP///////gqwoTT///////4CoKEy///////+CQChNP///////gJgoTj///////4KsKE0///////+AqChMv///////gkAoTT///////4CYKE4///////+CrChNP///////gKgoTL///////4JAKE0///////+AmChOP///////gqwoTT///////4CoKEy///////+CQChNP///////gJgoTj///////4KsKE0///////+AqChMv///////gkAoTT///////4CYKE4///////+CrChNP///////gKgoTL///////4JAKE0///////+AmChOP///////gqwoTT///////4CoKEy///////+CQChNP///////gJgoTj///////4KsKE0///////+AqChMv///////gkAoTT///////4CYKE4///////+CrChNP///////gKgoTL///////4JAKE0///////+AmChOP///////gqwoTT///////4CoKEy///////+CQChNP///////gJgoTj///////4KsKE0///////+AqChMv///////gkAoTT///////4CYKE4///////+CrChNP///////gKgoTL///////4JAKE0///////+AmChOP///////gqwoTT///////4CoKEy///////+CQChNP///////gJgoTj///////4KsKE0///////+AqChMv///////gkAoTT///////4CYKE4///////+CrChNP///////gKgoTL///////4JAKE0///////+AmChOP///////gqwoTT///////4CoKEy///////+CQChNP///////gJgoTj///////4KsKE0///////+AqChMv///////gkAoTT///////4CYKE4///////+CrChNP///////gKgoTL///////4JAKE0///////+AmChOP///////gqwoTT///////4CoKEy///////+CQChNP///////gJgoTj///////4KsKE0///////+AqChMv///////gkAoTT///////4CYKE4///////+CrChNP///////gKgoTL///////4JAKE0///////+AmChOP///////gqwoTT///////4CoKEy///////+CQChNP///////gJgoTl///////4CYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcMi/cME5f///////j4dAQkChNP///////894QKE4f///////z3EwoTR////////PeEChOH///////89xMKE0f///////z3hAoTh////////PcTChNH///////894QKE4f///////z3EwoTR////////PeEChOH///////89xMKE0f///////z3hAoTh////////PcTChNH///////894QKE4f///////z3EwoTR////////PeEChOH///////89xMKE0f///////z3hAoTh////////PcTChNH///////894QKE4f///////z3EwoTR////////PeEChOH///////89xMKE0f///////z3hAoTh////////PcTChNH///////894QKE4f///////z3EwoTR////////PeEChOH///////89xMKE0f///////z3hAoTh////////PcTChNH///////894QKE4f///////z3EwoTR////////PeEChOH///////89xMKE0f///////z3hAoTh////////PcTChNH///////894QKE4f///////z3EwoTR////////PeEChOH///////89xMKE0f///////z3hAoTh////////PcTChNH///////894QKE4f///////z3EwoTR////////PeEChOH///////89xMKE0f///////z3hAoTh////////PcTChNH///////894QKE4f///////z3DAYTh///////+ikKE4////////z7DAYTT////////CoKEy////////yQChNP///////4JgoTj///////+KsKE0////////gqChMv///////4kAoTT///////+CYKE4////////irChNP///////4KgoTL///////+JAKE0////////gmChOP///////4qwoTT///////+CoKEy////////iQChNP///////4JgoTj///////+KsKE0////////gqChMv///////4kAoTT///////+CYKE4////////irChNP///////4KgoTL///////+JAKE0////////gmChOP///////4qwoTT///////+CoKEy////////iQChNP///////4JgoTj///////+KsKE0////////gqChMv///////4kAoTT///////+CYKE4////////irChNP///////4KgoTL///////+JAKE0////////gmChOP///////4qwoTT///////+CoKEy////////iQChNP///////4JgoTj///////+KsKE0////////gqChMv///////4kAoTT///////+CYKE4////////irChNP///////4KgoTL///////+JAKE0////////gmChOP///////4qwoTT///////+CoKEy////////iQChNP///////4JgoTj///////+KsKE0////////gqChMv///////4kAoTT///////+CYKE4////////irChNP///////4KgoTL///////+JAKE0////////gmChOP///////4qwoTT///////+CoKEy////////iQChNP///////4JgoTj///////+KsKE0////////gqChMv///////4kAoTT///////+CYKE4////////irChNP///////4KgoTL///////+JAKE0////////gmChOP///////4qwoTT///////+CoKEy////////iQChNP///////4JgoTj///////+KsKE0////////gqChMv///////4kAoTT///////+CYKE4////////irChNP///////4KgoTL///////+JAKE0////////gmChOP///////4qwoTT///////+CoKEy////////iQChNP///////4JgoTj///////+KsKE0////////gqChMv///////4kAoTT///////+CYKE4////////irChNP///////4KgoTL///////+JAKE0////////gmChOP///////4qwoTT///////+CoKEy////////iQChNP///////4JgoTl///////+CYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wyL9wwTl////////gD4dAQkChNP////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcTChNH////////APeEChOH////////APcMBhOH///////+gCkKE4////////8A+wwGE0////////8AKgoTL////////wCQChNP///////+ACYKE4////////4AqwoTT////////gAqChMv///////+AJAKE0////////4AJgoTj////////gCrChNP///////+ACoKEy////////4AkAoTT////////gAmChOP///////+AKsKE0////////4AKgoTL////////gCQChNP///////+ACYKE4////////4AqwoTT////////gAqChMv///////+AJAKE0////////4AJgoTj////////gCrChNP///////+ACoKEy////////4AkAoTT////////gAmChOP///////+AKsKE0////////4AKgoTL////////gCQChNP///////+ACYKE4////////4AqwoTT////////gAqChMv///////+AJAKE0////////4AJgoTj////////gCrChNP///////+ACoKEy////////4AkAoTT////////gAmChOP///////+AKsKE0////////4AKgoTL////////gCQChNP///////+ACYKE4////////4AqwoTT////////gAqChMv///////+AJAKE0////////4AJgoTj////////gCrChNP///////+ACoKEy////////4AkAoTT////////gAmChOP///////+AKsKE0////////4AKgoTL////////gCQChNP///////+ACYKE4////////4AqwoTT////////gAqChMv///////+AJAKE0////////4AJgoTj////////gCrChNP///////+ACoKEy////////4AkAoTT////////gAmChOP///////+AKsKE0////////4AKgoTL////////gCQChNP///////+ACYKE4////////4AqwoTT////////gAqChMv///////+AJAKE0////////4AJgoTj////////gCrChNP///////+ACoKEy////////4AkAoTT////////gAmChOP///////+AKsKE0////////4AKgoTL////////gCQChNP///////+ACYKE4////////4AqwoTT////////gAqChMv///////+AJAKE0////////4AJgoTj////////gCrChNP///////+ACoKEy////////4AkAoTT////////gAmChOP///////+AKsKE0////////4AKgoTL////////gCQChNP///////+ACYKE4////////4AqwoTT////////gAqChMv///////+AJAKE0////////4AJgoTj////////gCrChNP///////+ACoKEy////////4AkAoTT////////gAmChOP///////+AKsKE0////////4AKgoTL////////gCQChNP///////+ACYKE4////////4AqwoTT////////gAqChMv///////+AJAKE0////////4AJgoTl////////gAmCg74dPcMi/cMi/cMEov3DIv3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DBf3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DBf3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wyL9wwTl////////4D4dAQkChNP////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcTChNH////////wPeEChOH////////wPcMBhOH////////oCkKE4/////////A+wwGE0/////////AKgoTL////////8CQChNP////////gCYKE4////////+AqwoTT////////4AqChMv////////gJAKE0////////+AJgoTj////////4CrChNP////////gCoKEy////////+AkAoTT////////4AmChOP////////gKsKE0////////+AKgoTL////////4CQChNP////////gCYKE4////////+AqwoTT////////4AqChMv////////gJAKE0////////+AJgoTj////////4CrChNP////////gCoKEy////////+AkAoTT////////4AmChOP////////gKsKE0////////+AKgoTL////////4CQChNP////////gCYKE4////////+AqwoTT////////4AqChMv////////gJAKE0////////+AJgoTj////////4CrChNP////////gCoKEy////////+AkAoTT////////4AmChOP////////gKsKE0////////+AKgoTL////////4CQChNP////////gCYKE4////////+AqwoTT////////4AqChMv////////gJAKE0////////+AJgoTj////////4CrChNP////////gCoKEy////////+AkAoTT////////4AmChOP////////gKsKE0////////+AKgoTL////////4CQChNP////////gCYKE4////////+AqwoTT////////4AqChMv////////gJAKE0////////+AJgoTj////////4CrChNP////////gCoKEy////////+AkAoTT////////4AmChOP////////gKsKE0////////+AKgoTL////////4CQChNP////////gCYKE4////////+AqwoTT////////4AqChMv////////gJAKE0////////+AJgoTj////////4CrChNP////////gCoKEy////////+AkAoTT////////4AmChOP////////gKsKE0////////+AKgoTL////////4CQChNP////////gCYKE4////////+AqwoTT////////4AqChMv////////gJAKE0////////+AJgoTj////////4CrChNP////////gCoKEy////////+AkAoTT////////4AmChOP////////gKsKE0////////+AKgoTL////////4CQChNP////////gCYKE4////////+AqwoTT////////4AqChMv////////gJAKE0////////+AJgoTj////////4CrChNP////////gCoKEy////////+AkAoTT////////4AmChOP////////gKsKE0////////+AKgoTL////////4CQChNP////////gCYKE4////////+AqwoTT////////4AqChMv////////gJAKE0////////+AJgoTj////////4CrChNP////////gCoKEy////////+AkAoTT////////4AmChOX////////gCYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMi/cME5f////////g+HQEJAoTT/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3EwoTR/////////D3hAoTh/////////D3DAYTh////////+gpChOP////////8PsMBhNP////////8CoKEy/////////wkAoTT////////+AmChOP////////4KsKE0/////////gKgoTL////////+CQChNP////////4CYKE4/////////gqwoTT////////+AqChMv////////4JAKE0/////////gJgoTj////////+CrChNP////////4CoKEy/////////gkAoTT////////+AmChOP////////4KsKE0/////////gKgoTL////////+CQChNP////////4CYKE4/////////gqwoTT////////+AqChMv////////4JAKE0/////////gJgoTj////////+CrChNP////////4CoKEy/////////gkAoTT////////+AmChOP////////4KsKE0/////////gKgoTL////////+CQChNP////////4CYKE4/////////gqwoTT////////+AqChMv////////4JAKE0/////////gJgoTj////////+CrChNP////////4CoKEy/////////gkAoTT////////+AmChOP////////4KsKE0/////////gKgoTL////////+CQChNP////////4CYKE4/////////gqwoTT////////+AqChMv////////4JAKE0/////////gJgoTj////////+CrChNP////////4CoKEy/////////gkAoTT////////+AmChOP////////4KsKE0/////////gKgoTL////////+CQChNP////////4CYKE4/////////gqwoTT////////+AqChMv////////4JAKE0/////////gJgoTj////////+CrChNP////////4CoKEy/////////gkAoTT////////+AmChOP////////4KsKE0/////////gKgoTL////////+CQChNP////////4CYKE4/////////gqwoTT////////+AqChMv////////4JAKE0/////////gJgoTj////////+CrChNP////////4CoKEy/////////gkAoTT////////+AmChOP////////4KsKE0/////////gKgoTL////////+CQChNP////////4CYKE4/////////gqwoTT////////+AqChMv////////4JAKE0/////////gJgoTj////////+CrChNP////////4CoKEy/////////gkAoTT////////+AmChOP////////4KsKE0/////////gKgoTL////////+CQChNP////////4CYKE4/////////gqwoTT////////+AqChMv////////4JAKE0/////////gJgoTj////////+CrChNP////////4CoKEy/////////gkAoTT////////+AmChOP////////4KsKE0/////////gKgoTL////////+CQChNP////////4CYKE4/////////gqwoTT////////+AqChMv////////4JAKE0/////////gJgoTj////////+CrChNP////////4CoKEy/////////gkAoTT////////+AmChOX////////4CYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wyL9wwTl/////////j4dAQkChNP/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcTChNH/////////PeEChOH/////////PcMBhOH////////+ikKE4/////////8+wwGE0/////////8KgoTL/////////yQChNP////////+CYKE4/////////4qwoTT/////////gqChMv////////+JAKE0/////////4JgoTj/////////irChNP////////+CoKEy/////////4kAoTT/////////gmChOP////////+KsKE0/////////4KgoTL/////////iQChNP////////+CYKE4/////////4qwoTT/////////gqChMv////////+JAKE0/////////4JgoTj/////////irChNP////////+CoKEy/////////4kAoTT/////////gmChOP////////+KsKE0/////////4KgoTL/////////iQChNP////////+CYKE4/////////4qwoTT/////////gqChMv////////+JAKE0/////////4JgoTj/////////irChNP////////+CoKEy/////////4kAoTT/////////gmChOP////////+KsKE0/////////4KgoTL/////////iQChNP////////+CYKE4/////////4qwoTT/////////gqChMv////////+JAKE0/////////4JgoTj/////////irChNP////////+CoKEy/////////4kAoTT/////////gmChOP////////+KsKE0/////////4KgoTL/////////iQChNP////////+CYKE4/////////4qwoTT/////////gqChMv////////+JAKE0/////////4JgoTj/////////irChNP////////+CoKEy/////////4kAoTT/////////gmChOP////////+KsKE0/////////4KgoTL/////////iQChNP////////+CYKE4/////////4qwoTT/////////gqChMv////////+JAKE0/////////4JgoTj/////////irChNP////////+CoKEy/////////4kAoTT/////////gmChOP////////+KsKE0/////////4KgoTL/////////iQChNP////////+CYKE4/////////4qwoTT/////////gqChMv////////+JAKE0/////////4JgoTj/////////irChNP////////+CoKEy/////////4kAoTT/////////gmChOP////////+KsKE0/////////4KgoTL/////////iQChNP////////+CYKE4/////////4qwoTT/////////gqChMv////////+JAKE0/////////4JgoTj/////////irChNP////////+CoKEy/////////4kAoTT/////////gmChOP////////+KsKE0/////////4KgoTL/////////iQChNP////////+CYKE4/////////4qwoTT/////////gqChMv////////+JAKE0/////////4JgoTj/////////irChNP////////+CoKEy/////////4kAoTT/////////gmChOP////////+KsKE0/////////4KgoTL/////////iQChNP////////+CYKE4/////////4qwoTT/////////gqChMv////////+JAKE0/////////4JgoTl/////////gmCg74dPcMi/cMi/cMEov3DIv3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DBf3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DBf3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wyL9wwTl/////////4A+HQEJAoTT/////////8A94QKE4f/////////APcTChNH/////////wD3hAoTh/////////8A9xMKE0f/////////APeEChOH/////////wD3EwoTR/////////8A94QKE4f/////////APcTChNH/////////wD3hAoTh/////////8A9xMKE0f/////////APeEChOH/////////wD3EwoTR/////////8A94QKE4f/////////APcTChNH/////////wD3hAoTh/////////8A9xMKE0f/////////APeEChOH/////////wD3EwoTR/////////8A94QKE4f/////////APcTChNH/////////wD3hAoTh/////////8A9xMKE0f/////////APeEChOH/////////wD3EwoTR/////////8A94QKE4f/////////APcTChNH/////////wD3hAoTh/////////8A9xMKE0f/////////APeEChOH/////////wD3EwoTR/////////8A94QKE4f/////////APcTChNH/////////wD3hAoTh/////////8A9xMKE0f/////////APeEChOH/////////wD3EwoTR/////////8A94QKE4f/////////APcTChNH/////////wD3hAoTh/////////8A9xMKE0f/////////APeEChOH/////////wD3EwoTR/////////8A94QKE4f/////////APcTChNH/////////wD3hAoTh/////////8A9xMKE0f/////////APeEChOH/////////wD3EwoTR/////////8A94QKE4f/////////APcTChNH/////////wD3hAoTh/////////8A9xMKE0f/////////APeEChOH/////////wD3EwoTR/////////8A94QKE4f/////////APcTChNH/////////wD3hAoTh/////////8A9xMKE0f/////////APeEChOH/////////wD3DAYTh/////////6AKQoTj/////////8A+wwGE0//////////ACoKEy//////////AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE4/////////+AKsKE0/////////+ACoKEy/////////+AJAKE0/////////+ACYKE5f////////+ACYKDvh09wyL9wyL9wwSi/cMi/cM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMF/eE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcM94T3DPeE9wz3hPcMi/cME5f/////////gPh0BCQKE0//////////wPeEChOH/////////8D3EwoTR//////////A94QKE4f/////////wPcTChNH/////////8D3hAoTh//////////A9xMKE0f/////////wPeEChOH/////////8D3EwoTR//////////A94QKE4f/////////wPcTChNH/////////8D3hAoTh//////////A9xMKE0f/////////wPeEChOH/////////8D3EwoTR//////////A94QKE4f/////////wPcTChNH/////////8D3hAoTh//////////A9xMKE0f/////////wPeEChOH/////////8D3EwoTR//////////A94QKE4f/////////wPcTChNH/////////8D3hAoTh//////////A9xMKE0f/////////wPeEChOH/////////8D3EwoTR//////////A94QKE4f/////////wPcTChNH/////////8D3hAoTh//////////A9xMKE0f/////////wPeEChOH/////////8D3EwoTR//////////A94QKE4f/////////wPcTChNH/////////8D3hAoTh//////////A9xMKE0f/////////wPeEChOH/////////8D3EwoTR//////////A94QKE4f/////////wPcTChNH/////////8D3hAoTh//////////A9xMKE0f/////////wPeEChOH/////////8D3EwoTR//////////A94QKE4f/////////wPcTChNH/////////8D3hAoTh//////////A9xMKE0f/////////wPeEChOH/////////8D3EwoTR//////////A94QKE4f/////////wPcTChNH/////////8D3hAoTh//////////A9xMKE0f/////////wPeEChOH/////////8D3EwoTR//////////A94QKE4f/////////wPcTChNH/////////8D3hAoTh//////////A9xMKE0f/////////wPeEChOH/////////8D3DAYTh/////////+gKQoTj//////////A+wwGE0//////////wCoKEy//////////wJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE4//////////gKsKE0//////////gCoKEy//////////gJAKE0//////////gCYKE5f/////////gCYKDvf89wwB94T3DPjs9wwD94T3DBX3DPeE+Oz7hPcM94T3hPcM+4T3hPsM+4T87PeE+wwG+4T7hPsM94QHDvf89wwB94T3DPjs9wz47PcMAxRw94T3DBX3DPeE+Oz7hPcM94T47PuE9wz3hPeE9wz7hPeE+wwG+4T87PeE+wz7hPzs94T7DPuE+4T7DPeEBw73DPjs+/z3DBL3hPcM+Oz3DPjs9wz47PcME7z3hPcMFfcMBhN894UKE7x2ChN894UKE7x2ChN894UKE7x2ChN894YKE7xYChN894cKE7xYChN894cKE7xYChN894cKE7xYChN8PQoO9wz47Pv89wwS94T3DPjs9wz47PcM+Oz3DPjs9wwTvveE9wwV9wwGE373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Cg73DPjs+/z3DBL3hPcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcME7/+94T3DBX3DAYTf/73hQoTv/52ChN//veFChO//nYKE3/+94UKE7/+dgoTf/73hQoTv/52ChN//veFChO//nYKE3/+94UKE7/+dgoTf/73hQoTv/52ChN//veFChO//nYKE3/+94UKE7/+dgoTf/73hQoTv/52ChN//veFChO//nYKE3/+94UKE7/+dgoTf/73hgoTv/5YChN//veHChO//lgKE3/+94cKE7/+WAoTf/73hwoTv/5YChN//veHChO//lgKE3/+94cKE7/+WAoTf/73hwoTv/5YChN//veHChO//lgKE3/+94cKE7/+WAoTf/73hwoTv/5YChN//veHChO//lgKE3/+94cKE7/+WAoTf/73hwoTv/5YChN//j0KDvcM+Oz7/PcMEveE9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcME7//94T3DBX3DAYTf//3hQoTv/92ChN///eFChO//3YKE3//94UKE7//dgoTf//3hQoTv/92ChN///eFChO//3YKE3//94UKE7//dgoTf//3hQoTv/92ChN///eFChO//3YKE3//94UKE7//dgoTf//3hQoTv/92ChN///eFChO//3YKE3//94UKE7//dgoTf//3hQoTv/92ChN///eGChO//1gKE3//94cKE7//WAoTf//3hwoTv/9YChN///eHChO//1gKE3//94cKE7//WAoTf//3hwoTv/9YChN///eHChO//1gKE3//94cKE7//WAoTf//3hwoTv/9YChN///eHChO//1gKE3//94cKE7//WAoTf//3hwoTv/9YChN///eHChO//1gKE3//94cKE7//WAoTf/89Cg73DPjs+/z3DBL3hPcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wwTv/+A94T3DBX3DAYTf/+A94UKE7//gHYKE3//gPeFChO//4B2ChN//4D3hQoTv/+AdgoTf/+A94UKE7//gHYKE3//gPeFChO//4B2ChN//4D3hQoTv/+AdgoTf/+A94UKE7//gHYKE3//gPeFChO//4B2ChN//4D3hQoTv/+AdgoTf/+A94UKE7//gHYKE3//gPeFChO//4B2ChN//4D3hQoTv/+AdgoTf/+A94UKE7//gHYKE3//gPeFChO//4B2ChN//4D3hgoTv/+AWAoTf/+A94cKE7//gFgKE3//gPeHChO//4BYChN//4D3hwoTv/+AWAoTf/+A94cKE7//gFgKE3//gPeHChO//4BYChN//4D3hwoTv/+AWAoTf/+A94cKE7//gFgKE3//gPeHChO//4BYChN//4D3hwoTv/+AWAoTf/+A94cKE7//gFgKE3//gPeHChO//4BYChN//4D3hwoTv/+AWAoTf/+A94cKE7//gFgKE3//gPeHChO//4BYChN//4A9Cg73DPjs+/z3DBL3hPcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcME7//wPeE9wwV9wwGE3//wPeFChO//8B2ChN//8D3hQoTv//AdgoTf//A94UKE7//wHYKE3//wPeFChO//8B2ChN//8D3hQoTv//AdgoTf//A94UKE7//wHYKE3//wPeFChO//8B2ChN//8D3hQoTv//AdgoTf//A94UKE7//wHYKE3//wPeFChO//8B2ChN//8D3hQoTv//AdgoTf//A94UKE7//wHYKE3//wPeFChO//8B2ChN//8D3hQoTv//AdgoTf//A94UKE7//wHYKE3//wPeGChO//8BYChN//8D3hwoTv//AWAoTf//A94cKE7//wFgKE3//wPeHChO//8BYChN//8D3hwoTv//AWAoTf//A94cKE7//wFgKE3//wPeHChO//8BYChN//8D3hwoTv//AWAoTf//A94cKE7//wFgKE3//wPeHChO//8BYChN//8D3hwoTv//AWAoTf//A94cKE7//wFgKE3//wPeHChO//8BYChN//8D3hwoTv//AWAoTf//A94cKE7//wFgKE3//wPeHChO//8BYChN//8A9Cg73DPjs+/z3DBL3hPcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DBO//+D3hPcMFfcMBhN//+D3hQoTv//gdgoTf//g94UKE7//4HYKE3//4PeFChO//+B2ChN//+D3hQoTv//gdgoTf//g94UKE7//4HYKE3//4PeFChO//+B2ChN//+D3hQoTv//gdgoTf//g94UKE7//4HYKE3//4PeFChO//+B2ChN//+D3hQoTv//gdgoTf//g94UKE7//4HYKE3//4PeFChO//+B2ChN//+D3hQoTv//gdgoTf//g94UKE7//4HYKE3//4PeFChO//+B2ChN//+D3hQoTv//gdgoTf//g94YKE7//4FgKE3//4PeHChO//+BYChN//+D3hwoTv//gWAoTf//g94cKE7//4FgKE3//4PeHChO//+BYChN//+D3hwoTv//gWAoTf//g94cKE7//4FgKE3//4PeHChO//+BYChN//+D3hwoTv//gWAoTf//g94cKE7//4FgKE3//4PeHChO//+BYChN//+D3hwoTv//gWAoTf//g94cKE7//4FgKE3//4PeHChO//+BYChN//+D3hwoTv//gWAoTf//g94cKE7//4FgKE3//4PeHChO//+BYChN//+A9Cg73DPjs+/z3DBL3hPcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wwTv//w94T3DBX3DAYTf//w94UKE7//8HYKE3//8PeFChO///B2ChN///D3hQoTv//wdgoTf//w94UKE7//8HYKE3//8PeFChO///B2ChN///D3hQoTv//wdgoTf//w94UKE7//8HYKE3//8PeFChO///B2ChN///D3hQoTv//wdgoTf//w94UKE7//8HYKE3//8PeFChO///B2ChN///D3hQoTv//wdgoTf//w94UKE7//8HYKE3//8PeFChO///B2ChN///D3hQoTv//wdgoTf//w94UKE7//8HYKE3//8PeFChO///B2ChN///D3hgoTv//wWAoTf//w94cKE7//8FgKE3//8PeHChO///BYChN///D3hwoTv//wWAoTf//w94cKE7//8FgKE3//8PeHChO///BYChN///D3hwoTv//wWAoTf//w94cKE7//8FgKE3//8PeHChO///BYChN///D3hwoTv//wWAoTf//w94cKE7//8FgKE3//8PeHChO///BYChN///D3hwoTv//wWAoTf//w94cKE7//8FgKE3//8PeHChO///BYChN///D3hwoTv//wWAoTf//w94cKE7//8FgKE3//8PeHChO///BYChN///A9Cg73DPjs+/z3DBL3hPcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcME7//+PeE9wwV9wwGE3//+PeFChO///h2ChN///j3hQoTv//4dgoTf//494UKE7//+HYKE3//+PeFChO///h2ChN///j3hQoTv//4dgoTf//494UKE7//+HYKE3//+PeFChO///h2ChN///j3hQoTv//4dgoTf//494UKE7//+HYKE3//+PeFChO///h2ChN///j3hQoTv//4dgoTf//494UKE7//+HYKE3//+PeFChO///h2ChN///j3hQoTv//4dgoTf//494UKE7//+HYKE3//+PeFChO///h2ChN///j3hQoTv//4dgoTf//494UKE7//+HYKE3//+PeGChO///hYChN///j3hwoTv//4WAoTf//494cKE7//+FgKE3//+PeHChO///hYChN///j3hwoTv//4WAoTf//494cKE7//+FgKE3//+PeHChO///hYChN///j3hwoTv//4WAoTf//494cKE7//+FgKE3//+PeHChO///hYChN///j3hwoTv//4WAoTf//494cKE7//+FgKE3//+PeHChO///hYChN///j3hwoTv//4WAoTf//494cKE7//+FgKE3//+PeHChO///hYChN///j3hwoTv//4WAoTf//494cKE7//+FgKE3//+PeHChO///hYChN///g9Cg73DPjs+/z3DBL3hPcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DBO///z3hPcMFfcMBhN///z3hQoTv//8dgoTf//894UKE7///HYKE3///PeFChO///x2ChN///z3hQoTv//8dgoTf//894UKE7///HYKE3///PeFChO///x2ChN///z3hQoTv//8dgoTf//894UKE7///HYKE3///PeFChO///x2ChN///z3hQoTv//8dgoTf//894UKE7///HYKE3///PeFChO///x2ChN///z3hQoTv//8dgoTf//894UKE7///HYKE3///PeFChO///x2ChN///z3hQoTv//8dgoTf//894UKE7///HYKE3///PeFChO///x2ChN///z3hQoTv//8dgoTf//894YKE7///FgKE3///PeHChO///xYChN///z3hwoTv//8WAoTf//894cKE7///FgKE3///PeHChO///xYChN///z3hwoTv//8WAoTf//894cKE7///FgKE3///PeHChO///xYChN///z3hwoTv//8WAoTf//894cKE7///FgKE3///PeHChO///xYChN///z3hwoTv//8WAoTf//894cKE7///FgKE3///PeHChO///xYChN///z3hwoTv//8WAoTf//894cKE7///FgKE3///PeHChO///xYChN///z3hwoTv//8WAoTf//894cKE7///FgKE3///PeHChO///xYChN///w9Cg73DPjs+/z3DBL3hPcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wwTv//+94T3DBX3DAYTf//+94UKE7///nYKE3///veFChO///52ChN///73hQoTv//+dgoTf//+94UKE7///nYKE3///veFChO///52ChN///73hQoTv//+dgoTf//+94UKE7///nYKE3///veFChO///52ChN///73hQoTv//+dgoTf//+94UKE7///nYKE3///veFChO///52ChN///73hQoTv//+dgoTf//+94UKE7///nYKE3///veFChO///52ChN///73hQoTv//+dgoTf//+94UKE7///nYKE3///veFChO///52ChN///73hQoTv//+dgoTf//+94UKE7///nYKE3///veFChO///52ChN///73hgoTv//+WAoTf//+94cKE7///lgKE3///veHChO///5YChN///73hwoTv//+WAoTf//+94cKE7///lgKE3///veHChO///5YChN///73hwoTv//+WAoTf//+94cKE7///lgKE3///veHChO///5YChN///73hwoTv//+WAoTf//+94cKE7///lgKE3///veHChO///5YChN///73hwoTv//+WAoTf//+94cKE7///lgKE3///veHChO///5YChN///73hwoTv//+WAoTf//+94cKE7///lgKE3///veHChO///5YChN///73hwoTv//+WAoTf//+94cKE7///lgKE3///veHChO///5YChN///49Cg73DPjs+/z3DBL3hPcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcME7////eE9wwV9wwGE3////eFChO///92ChN////3hQoTv///dgoTf///94UKE7///3YKE3////eFChO///92ChN////3hQoTv///dgoTf///94UKE7///3YKE3////eFChO///92ChN////3hQoTv///dgoTf///94UKE7///3YKE3////eFChO///92ChN////3hQoTv///dgoTf///94UKE7///3YKE3////eFChO///92ChN////3hQoTv///dgoTf///94UKE7///3YKE3////eFChO///92ChN////3hQoTv///dgoTf///94UKE7///3YKE3////eFChO///92ChN////3hQoTv///dgoTf///94UKE7///3YKE3////eGChO///9YChN////3hwoTv///WAoTf///94cKE7///1gKE3////eHChO///9YChN////3hwoTv///WAoTf///94cKE7///1gKE3////eHChO///9YChN////3hwoTv///WAoTf///94cKE7///1gKE3////eHChO///9YChN////3hwoTv///WAoTf///94cKE7///1gKE3////eHChO///9YChN////3hwoTv///WAoTf///94cKE7///1gKE3////eHChO///9YChN////3hwoTv///WAoTf///94cKE7///1gKE3////eHChO///9YChN////3hwoTv///WAoTf///94cKE7///1gKE3////eHChO///9YChN///89Cg73DPjs+/z3DBL3hPcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DBO///+A94T3DBX3DAYTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeFChO///+AdgoTf///gPeGChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gPeHChO///+AWAoTf///gD0KDvcM+Oz7/PcMEveE9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcMF/js9wwTv///wPeE9wwV9wwGE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hQoTv///wHYKE3///8D3hgoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8D3hwoTv///wFgKE3///8A9Cg73DPjs+/z3DBL3hPcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DBf47PcM+Oz3DBO////g94T3DBX3DAYTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeFChO////gdgoTf///4PeGChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4PeHChO////gWAoTf///4D0KDvcM+Oz7/PcMEveE9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcMF/js9wz47PcM+Oz3DBO////w94T3DBX3DAYTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeFChO////wdgoTf///8PeGChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8PeHChO////wWAoTf///8D0KDvcM+Oz7/PcMEveE9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcMF/js9wz47PcM+Oz3DPjs9wwTv///+PeE9wwV9wwGE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hQoTv///+HYKE3////j3hgoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////j3hwoTv///+FgKE3////g9Cg73DPjs+/z3DBL3hPcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DBf47PcM+Oz3DPjs9wz47PcM+Oz3DBO////894T3DBX3DAYTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeFChO////8dgoTf////PeGChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////PeHChO////8WAoTf////D0KDvcM+Oz7/PcMEveE9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcMF/js9wz47PcM+Oz3DPjs9wz47PcM+Oz3DBO////+94T3DBX3DAYTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veFChO////+dgoTf////veGChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////veHChO////+WAoTf////j0KDvcM+Oz7/PcMEveE9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcMF/js9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wwTv/////eE9wwV9wwGE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hQoTv////3YKE3/////3hgoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3/////3hwoTv////1gKE3////89Cg73DPjs+/z3DBL3hPcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DBf47PcM+Oz3DPjs9wz47PcM+Oz3DPjs9wz47PcM+Oz3DBO/////gPeE9wwV9wwGE3////+A94UKE7////+AdgoTf////4D3hQoTv////4B2ChN/////gPeFChO/////gHYKE3////+A94UKE7////+AdgoTf////4D3hQoTv////4B2ChN/////gPeFChO/////gHYKE3////+A94UKE7////+AdgoTf////4D3hQoTv////4B2ChN/////gPeFChO/////gHYKE3////+A94UKE7////+AdgoTf////4D3hQoTv////4B2ChN/////gPeFChO/////gHYKE3////+A94UKE7////+AdgoTf////4D3hQoTv////4B2ChN/////gPeFChO/////gHYKE3////+A94UKE7////+AdgoTf////4D3hQoTv////4B2ChN/////gPeFChO/////gHYKE3////+A94UKE7////+AdgoTf////4D3hQoTv////4B2ChN/////gPeFChO/////gHYKE3////+A94UKE7////+AdgoTf////4D3hQoTv////4B2ChN/////gPeFChO/////gHYKE3////+A94UKE7////+AdgoTf////4D3hQoTv////4B2ChN/////gPeFChO/////gHYKE3////+A94UKE7////+AdgoTf////4D3hQoTv////4B2ChN/////gPeFChO/////gHYKE3////+A94YKE7////+AWAoTf////4D3hwoTv////4BYChN/////gPeHChO/////gFgKE3////+A94cKE7////+AWAoTf////4D3hwoTv////4BYChN/////gPeHChO/////gFgKE3////+A94cKE7////+AWAoTf////4D3hwoTv////4BYChN/////gPeHChO/////gFgKE3////+A94cKE7////+AWAoTf////4D3hwoTv////4BYChN/////gPeHChO/////gFgKE3////+A94cKE7////+AWAoTf////4D3hwoTv////4BYChN/////gPeHChO/////gFgKE3////+A94cKE7////+AWAoTf////4D3hwoTv////4BYChN/////gPeHChO/////gFgKE3////+A94cKE7////+AWAoTf////4D3hwoTv////4BYChN/////gPeHChO/////gFgKE3////+A94cKE7////+AWAoTf////4D3hwoTv////4BYChN/////gPeHChO/////gFgKE3////+A94cKE7////+AWAoTf////4D3hwoTv////4BYChN/////gPeHChO/////gFgKE3////+A94cKE7////+AWAoTf////4D3hwoTv////4BYChN/////gPeHChO/////gFgKE3////+A94cKE7////+AWAoTf////4A9Cg75ZBSLFYuL+OyL94SLBvsMiweLDAr3DAr3DPcM9wz3DPcMDAz3DAv3DPcM9wz3DPcM94QMDRwAORMBXwIAAQAJABEAGQAhACcALQAzADkAPwBHAE0AWQBhAGcAcQB3AH0AhQCuAMYAzgDWAN4A5ADsAPIA+gEAAQ4BGAEeASQBLgE0ATwBRAFKAVYBYAFqAXYBlgGcAagBsAHIAeAB9AIZAjECSQJRAl0CZQJzAn0CgwKPApkCqQKzAscCzQLZAucC7QL7Aw0DJQMvAzcDRwNfA2cDcwOPA5kDowOvA7sDxQPLA9UD4QPnA/MD+QQVBB0EMwQ9BEMESwRjBG8ElAS0BNkE4wTzBP0FEQUpBTEFPwVkBXgFggWcBaIFrgXCBcgF8QYRBiUGLQYzBjsGVwZ3BoEGkQabBqMGrQa5BssG1wbdBuMG6wbzBvsHAwcJBxcHLwc9B0MHWwdjB28HgQeVB50Howe7B8MH0wfhCA4IFAgeCCQITQhdCGcIeQiBCIcIjwidCKkIvQjHCM8I5QjtCPUI/wkHCREJHwklCS0JNQk7CUkJTwlVCWUJbwl7CZMJmwmvCbsJxQnNCdcJ5QnvCf0KIAooCjIKOgpACkgKWgpsCoIKjgqeCqQKsgq6Cs4K2grqCvoLFgsgCy4LOgtjC4gLpAu0C8ILzgvYC+wL+AwADAwMFgwiDEsMVQxjDG0MeQyDDIsMkwyhDMYM7wz1DQENCQ0VDSMNLQ07DUcNTw1nDYMNjw2bDakNuQ3DDcsN1w3hDekN+Q3/DgkOEw4bDjMOOw5VDnUOjQ6TDp8Oqw67DsMO0w7fDusO+Q8RDyEPKQ83D0MPVw9fD3cPfw+LD5EPnQ+1D8EP2Q/5EB4QNhBCEEwQVhBeEGwQeBCAEJIQmhCoELQQuhDIENAQ2hDkEO4Q+hEMERoRKBE4EUYRVBFcEWQRcBF8EZQRpBGsEbgR0BHcEeoR/BIEEgwSFBIcEiwSRBJUEmIScBJ4EoASihKgEroSxBLKEtQS2vcM+Oz7DAYL9wz3DPsMBgv3DPeE+wwGC/cM9wz7DAcL9wz3DAYL9wz3hAYL+wz7DAcL+4T7DAcL9wz7DAYL+wz3DPcMBwv3DPsMBwv7DPsM+wz3DPcMBwv7DPsM+4QHC/sM9/wGC/sM+wz7/PcMBwv3DPf8Bgv7DPcMBgv3DPsM+wwHC/cM9wz3DPsM9wz3DPsM9wz3DPcM+wz7DPsM9wz7DAb7DPcM+wz7DAcL9wz3hPeE9wz7hPeE+wz7hPuE+wz3hAYL+Oz3DPzsBgv3DPcM9wwHC/sM9/z3DAcL9wz47AYL+wz3DPv8Bgv7DPv8Bwv3/PuE+4QGC/f89wwGC/cM94T7DPcM9wz3hAYL+4T7hPsM94QHC/cM+/wGC/v8+/wHC/eE9/z7hPv8Bwv7/PcMBgv3hPcM+4QGC/sM+wz8dAcL9wz7/AcL+wz7hPsM94T3DAcL+wz7DPsM9wwHC/sM9wz7DPsMBwv3DPeE+wz3DPv8Bgv3DPsM/WT3DPh09/z8dPcM+WT7DPcM+/z7DPf8+wwHC/f8+/wGC/cM/HT93Ph09wwHC/sM+wz87AcL+Oz3/Pzs9wz47PsM9wz8dP3c+HT3DAcL+Oz3DPx09/z3hPcM+4T3DPh09wz87AYL9wz4dPeE9wz7hPcM+HT3DPzsBgv3/PcM9wz4dPuE+wz3DPv8+/z47Ph09wz8dPsM+wwG/Oz3DAcL9wz4dPf8/HT3DPnc+wz7hPv894T7DAYL9/z3DPsM+Oz3DPcM+/z7DPcM/Oz7DAYL9wz5ZPsMBgv3DPh094T7DPcMBgv7/PcM9/wHC/sM9wz7DPcM9wz3DAYL+wz7DPsM+4QHC/eE+wwHC/js9wz8dPlk+wwGC/cM+wz3DPcMBgv3DPzs9wz53PsM+wz7DAYL9wz7DPcM+wwHC/cM+wz3DPv89wz53PsM+/z7DAYL9/z87AYL9/z7DPcM9wz7DAYL9wz8dP3c9wz4dPf8Bwv8dPsMBwv7DPuE+wz3hPcM9wwHC/cM+HT7DPcM+/z7DPsM/OwGC/cM/HT93PcM+HT3/Px09wz4dPsM9wwHC/v89wz4dPcMBgv7DPf8+/wHC/cM+WT3hPcM/Oz7DPeEBgv3/PcM9wz5ZPsM/WT7/Plk+wz9ZPcMBgv3DPh0+wwGC/sM+HT7DPx09wwGC/cM9wz3DPcM9wz7DPcM+wz3DPnc+wz87PsMBgv7DPsM+Oz7DAcL9wz3DPcM+wwGC/cM+wz3DPcM9wwHC/sM+wz7DPsM9wwHC/cM+Oz3DPcMBgv7DPcMBwv47PcM/HT3DAYL9wz3hPzs+wz4dAYL+wz3hAYL+wz3DPsM+wz3DAYL+4T3DAcL9/z7DPv8+wz4dPh0+wz3DPv8+wz3/PsM+/wGC/sM+wz7DAcL94T3DPcM+wz3/PsM/dz4dPcM9wwHC/f8+wz3DPuEBwv7/Pf8Bgv7DPsM+/wHC/eE+wz3DPuE+/z7DPh0+dz7DPv8+wwGC/cM+4T7DPsM+/wHC/cM+wz7/PcM+wz4dPcM/HT3DPh094T7DPcM+/z7DAf3/PsMBgv3DPh094T3DPuE9wz3hPcM+4T7DPsM+wz7DPsM9wwGC/eE9/z7hPv8+wz3/PsM/HT7DPh09wz3DPjs/HT7DAf7DPuEBgv3DPf89wz3DAYL94T8dPcM+HT7DPcM+4QGC/sM+wz3/PsMBwv3hPcM+4T4dPuE+wz3DPv89wwGC/f89wz3DPjs+wz87Pv894T7DPuE9wwGC/eE9wz7DAcL+wz7DPsM+wz4dPsMBwv3DPh09wz7hPcM94T3DPx09wz4dPsM9wz7DPsM+wwG9wz7hAcL9wz4dPf8/HT3DPh0+wz3DPx0Bgv3DPcM9wz7DAcL9wz7DP1k9wz3hPf89wz3DPeE+wz3DPuEBwv3hPuEBgv3DPuE+wz7DPuEBwv3DPf89wz3DPeE+wz3DPcM+wwGC/cM+4QHC/h09wz3DPcM+wz3DPv89wz4dPcM/HT7DPsM+wz3DAb7DPf8+wz8dAcL94T3DPuE9/z3DPcM+wz3hPsM+4T7DPsM9wz7/PcMBgv4dPjs+wz8dPv8+HT7DPx09wwGC/cM9/z7DAYL+/z7DAcL9/z7DPv8Bwv4dPjs+wz8dPsM94T7DPuE+wz4dPsM/HT3DAYL+HT3DPcM+Oz7DPv8+/z3/PsM+/z3DPsM9/z7DPx0Bgv47PcM+/z3DAYL9wz3DPcM9wz87PsM9/wGC/sM+wz7DPsMBwv3DPnc+wwGC/sM9wz7DPsMBgv3hPsM9wz3DPsMBgv7DPeE9wz3DPsM9wz3DPsMBwv7/PsM+wz3DPcMBwv7DPf8Bwv3hPcMBgv4dPcM/HQGC/sM9wz7DAYL9wz7DPcMBwv7DPeE9wwHC/uE9wwGC/sM+wz7DPcM9wz3hAcL9wz3DPf89wz3DPh0+wz8dPv8+HT7DAYL+wz7DPsM+wz3DPsMBgv7DPuEBwv3/PcM+wz4dPsM+wz7DPsM9wz7hPsMBgv7DPh0+wwGC/uE+wz7DPcM9wwHC/sM+wz7DPcM+4T3DPuE+wwHC/sM9wz3DPcM+/z7DPcM+wz3DAYL+wz7hPsMBwv3DPcMBwv3DPsM/WT3DPh09/z8dPcM+WT7DPcMBwv7DPf8+wwHC/cM9wz3DPsM9wz3DPsMBgv3DPcM9wz7DPcM9wwGC/cM+wz9ZPcM+HT3DPx09/z3DPuE9/z3DPcM+wz3DAf3hPcM/HT7DPcM+wwGC/sM+OwGC/cM9wz7/PsMBgv3DPzsBgv3/PcM9wz7DPcM9/z87PcM+Oz7DPcM/HT7hPsM+wwH9wz8dPh09wwGC/cM+/z3DPnc+wz7/PsMBgv47Pf8/Oz7/AcL+wz3/PcM9wz47PsM9wz7/AcL+wz3/PsMBgv7DPeEBwv3DPcM9wwGC/f89wz3DPlk+wz9ZAYL+/z5ZPsM/WT3DAYL+wz7hPsM94T7/PuE+wz3hPcMBwv3DPv8+wz7DAcL9/z7DPv8Bgv7DPh0+HT7DPcM+/z7DPf8+wz7/AcL9wz7DPsMBgv7DPh09wwHC/uE9wz3hPeEBgv7DPsM9wwHC/cM+wz7/PcMBwv8dPcM+HT3hPsM9wwGC/uE+wwGC/cM+/z3DAYL+HT7hPsMBwv3DPh0Bgv7DPsM9wz7hPsM94QHC/uE+/wHC/f89/wHC/eE+wz7DPsM9wz3DPcMBgv4dPjs+wz8dAYL+/z4dPsM/HT3DAYL+HT3DPcM+Oz7DPv8+/z3/PsM+/z3DAYL9/z3DPv8Bgv3DPsM/WT3DPh09/z8dPcM+WQHC/sM9wz7/PsM9/wGC/x0+wz7DPcMBwv7DPv89/wHC/f89wz3DPh0Bgv3DPv8+/z47Ph09wwGC/sM+wz87PcMBwv8dPsM+HT3DPcM+OwGC/f8+4T7/PsM9/z7DPx0+wz4dPcM9wz47Px0+wz7DAb7hAcL+WT7hPsMBwv3DPcM9wz3DAYL94T3DPcMBwv7DPsMBgv3DPsM9wwGC/f89wz3DPeE+wz3DPcM+wwHC/cM9/z7DPcM+/z3DPh09wwGC/h09wz3DPcM+wz3DPv89wz4dPcMBgv3DPcM9wz3DPcMBgv3DPsM9wz53PsM/Oz7DAYL94T3/AcL+/z3hPeE9wz7hPeEBgv7hPcM94QHC/cM+Oz7DPcM/HT87PcM+HT3/AYL+4T7/PeE+wz87AcL9wz3DPsM9wz8dPsM+HQGC/sM9wz4dPcM/Oz7hPcMBgv3DPh0+wz3DPcM94T87PsM+HT7DPuE+wz3hAYL9wz3DPf89wwGC/sM+wz7DPcM9wz3/AcL9wz3hPsM9wz7hAYL9wz3hPeE9wz7hPcM94T3DPuE94T7DPuE+4T7DPeEBvsM+4T7DPeEBwv3DPf8+wz7/PsM9/z3DPcM9/z7DPcM/HT7DPh0+wwH/HT7hAYL9wz3hPsM9wz3DPeE/Oz7DPh0+wz7hPsM94QGC/cM9wz7DPcM9wz3DPsMBgv3hPsM9wz7hPv8+wwGC/zs9wz4dPf8/HQHC/uE9wz3DPcMBgv3DPeE9wz3DPcM9/z7DPcM+/wGC/cM94T3DPuE9wwHC/sM94T7DAYL+HT7DPcM9wz7DAYL+wz7DPuE+wwHC/cM+wz3DPcM+wwGC/h09wz8dPcM94T3DPuE9wz4dPcM/HT7DPsM+wz3DAb7DPsM+wz3DAcL+wz7hPsM94QHC/cM9wz7DPcM9wz3DAYL+wz3DPeE9wwGC/cM+dz7DPv8+wwGC/cM+wz3hPcMBgv7DPcM+4QGC/sM+wz3hAcL+wz7hPsM94T7hPuEBwv3DPcM9wz7DPeE+Oz7DPx0+wz3hPsM+4T7DPh0+wwG/HT3DAcL9wz5ZPsM/HT7DPeE+wz7hPsM+HT7DPx09wz7DPcMBvcM9wz7DPcMBwv3DPf8Bwv7DPv89wz7DPv8Bwv3DPv8+wwGC/cM+Oz7DPcM+/wGC/eE+wz7hPsM94T3DAYL9/z3DPcM9/wGC/v8+/z4dPsM/HT3DAcL9wz8dPzs+HT3DAcL94T7hPsMBwv3DPeE9/z7hPcM+Oz7DPuE+/z3hPsMBgv4dPcM9wz3hPsM+4T7DPcM+wz7DPsM94T7DAYL9wz5ZPh09wz87AYL9wz7DPuE+Oz3hAcL9/z7DPeE+wz7hPsMBwv3DPlk9/z9ZPcM+dz87AYL9wz4dPcM9wwGC/eE+wz7hAcL9wz4dPsM9wz7/AYL+wz7DPx09wwHC/cM+4T7DAcL+wz3hPsM9wz7hPsM94QGC/v894QGC/sM+wz7hPcMBwv3DPeE9wz3DAYL94T7DPcMBgv4dPcM9wz5ZPsM+/z7/Pf8+wz7/PcMBgv7DPf8+4QHC/cM+HT3DPx09wz4dPcM/HT3DPh0+wz3DAYL+HT3DPcM+WT7DPv8+/z3/PsM+/z3DPsM9/z7hPx0Bgv3DPnc+wz7/Pv89/z7DPv89wz7DPf8Bgv3DPuEBgv3DPh09/z3DPx0Bgv3DPuE9wz3hPsMBgv3DPv89wz47PsM+wz7DAYL94T3hPsMBwv3DPh094T3DPzs+wz3hAYL+wz3/PsM+/z3DAYL+wz7DPuE9wz3hAcL9wz3DPcM9wz7DPcMBgv3DPh09/z8dPcM+HT7DPcM+/z3hPsMBgv7DPsM+wz3DPcM9/z7DAcL9/z3DPcMBwv3DPzs9wz53PsM+wwGC/cM9/z7DPcM+/wGC/cM+Oz7DPuE+/z3hPsM+4T3DAYL94T3DPcMBgv3DPlk9/z9ZPcM+WT7DPcM+/z7DPsMBgv7DPv8+wwHC/sM94T7DPuE9wwGC/eE+wwGC/cM94T7DPcM/HQGC/js9wz7DPf8+wz3DPv8+wz3/Pv8+/wGC/cM+Oz87PsM+HQGC/h09wz3DPf8+wz3DPx0+wz4dPv8/HQGC/h09wz3DPf8+wz3DPx0+/z3/PcM+4T3DPf8+/z8dAYL+HT47PsM/HT7/PcM9wz3DPcM94T7DPuE+wz3hPsMBvx09wwHC/eE+/z7/PsM9/z3DPcM9/z7DPcM+4QGC/cM+dz87PsM+HQGC/cM+4T3DPeEBgv3DPeE/Oz7hAYL9wz3DPf8Bgv3DPeE+wz3DPcM9wwGC/cM+wz7DPsM9wwGC/uE+wz7DAcL9wz7DPcM+wz3hPcM+4T3DAYL9wz7hPcMBwv7DPeE+wz93PcM94QGC/sM94T7DPcM+4QGC/sM+4QGC/uE94T7DP3c9wz3hAYL/dz3DPh0Bwv7DPsM94T7DAcL+wz3hPsM+4QGC/cM94T3DPuEBgv7DPeE+wz7hPsMBgv7DPsM+wz3DPsM+wz7DPcMBwv7DPsM9/z7DPv8+wwHC/cM+wz3DPsM+wz7DAcL+wz3DPsM+wz3DPsM+wwGC/cM+wz3DPnc+wz7DAYL+wz3DPsM/dz3DPcMBgv3DPuE9wwGC/lk9wz9ZAYL+4T3DPf89wz8dAYL9wz3hPx0+4T3DAYL9wz3DPcM9wz7DPcM+wz7DPsM+wz3DAYL+wz3DPsM+wz3DPv8+wwGC/cM9/z7DAcL+wz7DPcM+wz3DAcL+wz7DPsM9wz7hPcM+4T7DPsM9wz3DAcL9wz3hPcM+/z3/AYL+wz7hPsM+wz3DPcMBgv7DPsM+wz7DPsM9wz7DPcMBwv7hPcM9wwHC/eE+wz7DAcL94T3DPuEBwv3DPv8+wwHC/eE+WT3hPcM+/z9ZPsMBgv4dPcM/HT3/Ph09wz8dPsM+wz7/PcMBgv47PcM+4T4dPsM/HT7hAYL9wz7DPcM+Oz7DPsMBgv3hPcM94T3DPuE9wwGC/cM+wz7hAcL+dz53P3cBgscB/j3DBz4CAYL9wz3DPcM9wz3DPcM+wz3DPsM9wwGC/sM+wz7DPsM+wz7DPsM9wz7DPcM+wz3DAcL9wz3DPeE+wwGC/eE+OwHC/eE94T3DPuEBwv7hPzsBwsAAQAAAAwAAAAcAAAAAgACAAEFwwABBcQGnwACAAQAAAACAAAAAQAAAAoANABOAAJkZmx0AA5sYXRuABwABAAAAAD//wACAAAAAQAEAAAAAP//AAIAAAABAAJjY21wAA5saWdhABQAAAABAAEAAAABAAAAAgAGAA4ABAAAAAEAEAACAAAAAR/gAAEfxgAHABQAKASADWoWthtkG24AAgAGAA4FxwADAB4AHgXGAAIAHgAeAD4AfgC8APgBMgFqAaAB1AIGAjYCZAKQAroC4gMIAywDTgNuA4wDqAPCA9oD8AQEBBYEJgQ0BEAESgRSBp8AHwAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAaeAB4ADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMBp0AHQAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMBpwAHAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAabABsADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMBpoAGgAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMBpkAGQAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAaYABgADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMBpcAFwAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMBpYAFgAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAaVABUADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMBpQAFAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMBpMAEwAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAaSABIADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMBpEAEQAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMBpAAEAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAaPAA8ADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMBo4ADgAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMBo0ADQAMAAwADAAMAAwADAAMAAwADAAMAAwADAaMAAwADAAMAAwADAAMAAwADAAMAAwADAAMBosACwAMAAwADAAMAAwADAAMAAwADAAMBooACgAMAAwADAAMAAwADAAMAAwADAaJAAkADAAMAAwADAAMAAwADAAMBogACAAMAAwADAAMAAwADAAMBocABwAMAAwADAAMAAwADAaGAAYADAAMAAwADAAMBoUABQAMAAwADAAMBoQABAAMAAwADAaDAAMADAAMBoIAAgAMADwAegC8APwBPAF6AbgB9AIwAmoCpALcAxQDSgOAA7QD6AQaBEwEfASsBNoFCAU0BWAFigW0BdwGBAYqBlAGdAaYBroG3Ab8BxwHOgdYB3QHkAeqB8QH3Af0CAoIIAg0CEgIWghsCHwIjAiaCKgItAjACMoI1AjcCOQGKAAgAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAB8GYwAfAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBicAHwAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AHwZiAB4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBiYAHgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAB8GYQAdAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4GJQAdAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAB8GYAAcAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBiQAHAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AHwZfABsADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBiMAGwAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAB8GXgAaAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4GIgAaAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAB8GXQAZAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBiEAGQAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AHwZcABgADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBiAAGAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAB8GWwAXAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4GHwAXAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAB8GWgAWAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBh4AFgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AHwZZABUADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBh0AFQAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAB8GWAAUAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4GHAAUAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAB8GVwATAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBhsAEwAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AHwZWABIADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBhoAEgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAB8GVQARAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4GGQARAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAB8GVAAQAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBhgAEAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AHwZTAA8ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBhcADwAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAB8GUgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4GFgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAB8GUQANAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBhUADQAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AHwZQAAwADgAOAA4ADgAOAA4ADgAOAA4ADgAOBhQADAAOAA4ADgAOAA4ADgAOAA4ADgAOAB8GTwALAA4ADgAOAA4ADgAOAA4ADgAOAA4GEwALAA4ADgAOAA4ADgAOAA4ADgAOAB8GTgAKAA4ADgAOAA4ADgAOAA4ADgAOBhIACgAOAA4ADgAOAA4ADgAOAA4AHwZNAAkADgAOAA4ADgAOAA4ADgAOBhEACQAOAA4ADgAOAA4ADgAOAB8GTAAIAA4ADgAOAA4ADgAOAA4GEAAIAA4ADgAOAA4ADgAOAB8GSwAHAA4ADgAOAA4ADgAOBg8ABwAOAA4ADgAOAA4AHwZKAAYADgAOAA4ADgAOBg4ABgAOAA4ADgAOAB8GSQAFAA4ADgAOAA4GDQAFAA4ADgAOAB8GSAAEAA4ADgAOBgwABAAOAA4AHwZHAAMADgAOBgsAAwAOAB8FywACAB8AQACCAMQBBgFGAYYBxAICAj4CegK0Au4DJgNeA5QDygP+BDIEZASWBMYE9gUkBVIFfgWqBdQF/gYmBk4GdAaaBr4G4gcEByYHRgdmB4QHoge+B9oH9AgOCCYIPghUCGoIfgiSCKQItgjGCNYI5AjyCP4JCgkUCR4JKAkwCTgJQAlGBkYAIAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBgoAIAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeBkUAHwAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgYJAB8AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4GRAAeAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgYIAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeBkMAHQAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBgcAHQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeBkIAHAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgYGABwAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4GQQAbAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgYFABsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeBkAAGgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBgQAGgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeBj8AGQAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgYDABkAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4GPgAYAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgYCABgAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeBj0AFwAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBgEAFwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeBjwAFgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgYAABYAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4GOwAVAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgX/ABUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeBjoAFAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBf4AFAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeBjkAEwAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgX9ABMAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4GOAASAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgX8ABIAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeBjcAEQAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBfsAEQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeBjYAEAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgX6ABAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4GNQAPAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgX5AA8AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeBjQADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOBfgADgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeBjMADQAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgX3AA0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4GMgAMAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgX2AAwAHgAeAB4AHgAeAB4AHgAeAB4AHgAeBjEACwAOAA4ADgAOAA4ADgAOAA4ADgAOBfUACwAeAB4AHgAeAB4AHgAeAB4AHgAeBjAACgAOAA4ADgAOAA4ADgAOAA4ADgX0AAoAHgAeAB4AHgAeAB4AHgAeAB4GLwAJAA4ADgAOAA4ADgAOAA4ADgXzAAkAHgAeAB4AHgAeAB4AHgAeBi4ACAAOAA4ADgAOAA4ADgAOBfIACAAeAB4AHgAeAB4AHgAeBi0ABwAOAA4ADgAOAA4ADgXxAAcAHgAeAB4AHgAeAB4GLAAGAA4ADgAOAA4ADgXwAAYAHgAeAB4AHgAeBisABQAOAA4ADgAOBe8ABQAeAB4AHgAeBioABAAOAA4ADgXuAAQAHgAeAB4FzgAEAAIADgAOBe0AAwAeAB4GKQADAA4ADgXNAAMAHgAfBcoAAgAOBcgAAgAeACEARACGAMYBBAFAAXoBsgHoAhwCTgJ+AqwC2AMCAyoDUAN0A5YDtgPUA/AECgQiBDgETAReBG4EfASIBJIEmgSiBKgF7AAgAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB8F6wAfAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAfBeoAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB8F6QAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB8F6AAcAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAfBecAGwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB8F5gAaAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB8F5QAZAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAfBeQAGAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB8F4wAXAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB8F4gAWAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAfBeEAFQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB8F4AAUAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB8F3wATAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAfBd4AEgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB8F3QARAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB8F3AAQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAfBdsADwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB8F2gAOAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB8F2QANAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAfBdgADAAeAB4AHgAeAB4AHgAeAB4AHgAeAB8F1wALAB4AHgAeAB4AHgAeAB4AHgAeAB8F1gAKAB4AHgAeAB4AHgAeAB4AHgAfBdUACQAeAB4AHgAeAB4AHgAeAB8F1AAIAB4AHgAeAB4AHgAeAB8F0wAHAB4AHgAeAB4AHgAfBdIABgAeAB4AHgAeAB8F0QAFAB4AHgAeAB8F0AAEAB4AHgAfBc8AAwAeAB8FxQADAB4AHgXMAAIAHwXEAAIAHgABAAQFyQACAB4AHgA+AH4AvAD4ATIBagGgAdQCBgI2AmQCkAK6AuIDCAMsA04DbgOMA6gDwgPaA/AEBAQWBCYENARABEoEUgaBAB8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8GgAAeAD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwZ/AB0APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwZ+ABwAPwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8GfQAbAD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwZ8ABoAPwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwZ7ABkAPwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8GegAYAD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwZ5ABcAPwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwZ4ABYAPwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8GdwAVAD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwZ2ABQAPwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwZ1ABMAPwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8GdAASAD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwZzABEAPwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwZyABAAPwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8GcQAPAD8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwZwAA4APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwZvAA0APwA/AD8APwA/AD8APwA/AD8APwA/AD8GbgAMAD8APwA/AD8APwA/AD8APwA/AD8APwZtAAsAPwA/AD8APwA/AD8APwA/AD8APwZsAAoAPwA/AD8APwA/AD8APwA/AD8GawAJAD8APwA/AD8APwA/AD8APwZqAAgAPwA/AD8APwA/AD8APwZpAAcAPwA/AD8APwA/AD8GaAAGAD8APwA/AD8APwZnAAUAPwA/AD8APwZmAAQAPwA/AD8GZQADAD8APwZkAAIAPwABAAcAAgAMAA4AHQAeAB8APwABH6oA3AG+AcQBzAHSAdoB4AHmAewB8gH4AgACCgISAhwCKAI2AkYCWAJsAoICmgK0AtAC7gMOAzADVAN6A6IDzAP4BCYEVgSIBLwE8gUqBWQFoAXeBh4GYAZoBnIGfgaMBpwGrgbCBtgG8AcKByYHRAdkB4YHqgfQB/gIIghOCHwIrAjeCRIJSAmACboJ9go0CnQKtgq+CsgK1AriCvILBAsYCy4LRgtgC3wLmgu6C9wMAAwmDE4MeAykDNINAg00DWgNng3WDhAOTA6KDsoPDA8UDx4PKg84D0gPWg9uD4QPnA+2D9IP8BAQEDIQVhB8EKQQzhD6ESgRWBGKEb4R9BIsEmYSohLgEyATYhNqE3QTgBOOE54TsBPEE9oT8hQMFCgURhRmFIgUrBTSFPoVJBVQFX4VrhXgFhQWShaCFrwW+Bc2F3YXfBeEF44XmheoF7gXyhfeF/QYDBgmGEIYYBiAGKIYxhjsGRQZPhlqGZgZyBn6Gi4aZBqcGtYbEhtQG5AblhueG6gbtBvCG9Ib5Bv4HA4cJhxAHFwcehyaHLwc4B0GHS4dWB2EHbId4h4UHkgefh62HvAfLB9qAAIFxAABAAMFxQABAAEAAgXGAAEAAwXHAAEAAQACBcgAAQACBckAAQACBcoAAQACBcsAAQACBcwAAQADBc0AAQABAAQFzgABAAEAAQADBc8AAQABAAQF0AABAAEAAQAFBdEAAQABAAEAAQAGBdIAAQABAAEAAQABAAcF0wABAAEAAQABAAEAAQAIBdQAAQABAAEAAQABAAEAAQAJBdUAAQABAAEAAQABAAEAAQABAAoF1gABAAEAAQABAAEAAQABAAEAAQALBdcAAQABAAEAAQABAAEAAQABAAEAAQAMBdgAAQABAAEAAQABAAEAAQABAAEAAQABAA0F2QABAAEAAQABAAEAAQABAAEAAQABAAEAAQAOBdoAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAPBdsAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABAF3AABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQARBd0AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQASBd4AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABMF3wABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAUBeAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAVBeEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABYF4gABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAXBeMAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAYBeQAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABkF5QABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAaBeYAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAbBecAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABwF6AABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAdBekAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAeBeoAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAB8F6wABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAgBewAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQADBe0AAQABAAQF7gABAAEAAQAFBe8AAQABAAEAAQAGBfAAAQABAAEAAQABAAcF8QABAAEAAQABAAEAAQAIBfIAAQABAAEAAQABAAEAAQAJBfMAAQABAAEAAQABAAEAAQABAAoF9AABAAEAAQABAAEAAQABAAEAAQALBfUAAQABAAEAAQABAAEAAQABAAEAAQAMBfYAAQABAAEAAQABAAEAAQABAAEAAQABAA0F9wABAAEAAQABAAEAAQABAAEAAQABAAEAAQAOBfgAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAPBfkAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABAF+gABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQARBfsAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQASBfwAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABMF/QABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAUBf4AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAVBf8AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABYGAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAXBgEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAYBgIAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABkGAwABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAaBgQAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAbBgUAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABwGBgABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAdBgcAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAeBggAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAB8GCQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAgBgoAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQADBgsAAQABAAQGDAABAAEAAQAFBg0AAQABAAEAAQAGBg4AAQABAAEAAQABAAcGDwABAAEAAQABAAEAAQAIBhAAAQABAAEAAQABAAEAAQAJBhEAAQABAAEAAQABAAEAAQABAAoGEgABAAEAAQABAAEAAQABAAEAAQALBhMAAQABAAEAAQABAAEAAQABAAEAAQAMBhQAAQABAAEAAQABAAEAAQABAAEAAQABAA0GFQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAOBhYAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAPBhcAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABAGGAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQARBhkAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQASBhoAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABMGGwABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAUBhwAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAVBh0AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABYGHgABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAXBh8AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAYBiAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABkGIQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAaBiIAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAbBiMAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABwGJAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAdBiUAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAeBiYAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAB8GJwABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAgBigAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQADBikAAQABAAQGKgABAAEAAQAFBisAAQABAAEAAQAGBiwAAQABAAEAAQABAAcGLQABAAEAAQABAAEAAQAIBi4AAQABAAEAAQABAAEAAQAJBi8AAQABAAEAAQABAAEAAQABAAoGMAABAAEAAQABAAEAAQABAAEAAQALBjEAAQABAAEAAQABAAEAAQABAAEAAQAMBjIAAQABAAEAAQABAAEAAQABAAEAAQABAA0GMwABAAEAAQABAAEAAQABAAEAAQABAAEAAQAOBjQAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAPBjUAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABAGNgABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQARBjcAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQASBjgAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABMGOQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAUBjoAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAVBjsAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABYGPAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAXBj0AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAYBj4AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABkGPwABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAaBkAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAbBkEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABwGQgABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAdBkMAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAeBkQAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAB8GRQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAgBkYAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQADBkcAAQABAAQGSAABAAEAAQAFBkkAAQABAAEAAQAGBkoAAQABAAEAAQABAAcGSwABAAEAAQABAAEAAQAIBkwAAQABAAEAAQABAAEAAQAJBk0AAQABAAEAAQABAAEAAQABAAoGTgABAAEAAQABAAEAAQABAAEAAQALBk8AAQABAAEAAQABAAEAAQABAAEAAQAMBlAAAQABAAEAAQABAAEAAQABAAEAAQABAA0GUQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAOBlIAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAPBlMAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABAGVAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQARBlUAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQASBlYAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABMGVwABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAUBlgAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAVBlkAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABYGWgABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAXBlsAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAYBlwAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABkGXQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAaBl4AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAbBl8AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABwGYAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAdBmEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAeBmIAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAB8GYwABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQACBmQAAQADBmUAAQABAAQGZgABAAEAAQAFBmcAAQABAAEAAQAGBmgAAQABAAEAAQABAAcGaQABAAEAAQABAAEAAQAIBmoAAQABAAEAAQABAAEAAQAJBmsAAQABAAEAAQABAAEAAQABAAoGbAABAAEAAQABAAEAAQABAAEAAQALBm0AAQABAAEAAQABAAEAAQABAAEAAQAMBm4AAQABAAEAAQABAAEAAQABAAEAAQABAA0GbwABAAEAAQABAAEAAQABAAEAAQABAAEAAQAOBnAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAPBnEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABAGcgABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQARBnMAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQASBnQAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABMGdQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAUBnYAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAVBncAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABYGeAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAXBnkAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAYBnoAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABkGewABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAaBnwAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAbBn0AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABwGfgABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAdBn8AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAeBoAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAB8GgQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQACBoIAAQADBoMAAQABAAQGhAABAAEAAQAFBoUAAQABAAEAAQAGBoYAAQABAAEAAQABAAcGhwABAAEAAQABAAEAAQAIBogAAQABAAEAAQABAAEAAQAJBokAAQABAAEAAQABAAEAAQABAAoGigABAAEAAQABAAEAAQABAAEAAQALBosAAQABAAEAAQABAAEAAQABAAEAAQAMBowAAQABAAEAAQABAAEAAQABAAEAAQABAA0GjQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAOBo4AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAPBo8AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABAGkAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQARBpEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQASBpIAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABMGkwABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAUBpQAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAVBpUAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABYGlgABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAXBpcAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAYBpgAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABkGmQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAaBpoAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAbBpsAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABwGnAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAdBp0AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAeBp4AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAB8GnwABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQACAAEFxAafAAAAAQAAAAoALAAuAAJkZmx0AA5sYXRuABgABAAAAAD//wAAAAQAAAAA//8AAAAAAAAC0AAAAtAAAADwAHgAAAAAAAAAAADwAHgAeAB4AAAAeAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAeAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAB4AAAAAAB4AAAAAAAAAAAAAAA8AAAAAAA8AAAAPAA8AAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAPAAeAAAAAAA8AAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAB4AHgAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAPAA8ADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4ADwAeAA8AHgAPAB4ADwAAAAAAAAAAAAAADwAAAAAADwAAAA8AAAAPAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAHgAAADwAAAAAAAAAHgAPAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAeAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAA8ADwAPAA8AAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAADwAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AHgAeAB4AHgAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAHgAAAAAAAAAAAAAAPAAeAAAAAAA8AAAAAAAAAAAAAAA8AB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAeAB4AHgAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAB4AHgAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAeAAAAPAAeAAAAAAAAAB4AAAAAAAAAHgAAADwAHgAAAAAAHgAAAAAAHgAAAAAAAAAAAAAAHgAeAAAAAAAAAAAAHgAAAAAAAAAAAAAAAAAAADwAAAAAAAAAHgA8AAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAB4AAAAAAB4AAAAAAB4AHgAeAAAAAAAAAAAAAAAeAAAAAAAAAB4AAAAAAB4AAAAAAB4AHgAAAB4AAAAAAAAAAAAAAAAAHgA8AB4AHgAAAAAAPAAAAAAAAAAAAAAAAAAeAB4AHgAeAB4AAAAeAAAAAAAAAAAAAAAAAAAAAAAeAB4AHgAeAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAeAAAAAAAeAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAB4AHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAPAAAAAAAAAAeAAAAPAA8AAAAHgAAAAAAAAAeAAAAAAAeAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAADwAHgAAAAAAHgAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAABLAEsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAN/WylkAAAAA5KrZJAAAAADkqtkt") format('opentype');
	font-weight: normal;
	font-style: normal;
}

:root {
	--birb-border-size: 2px;
	--birb-neg-border-size: calc(var(--birb-border-size) * -1);
	--birb-double-border-size: calc(var(--birb-border-size) * 2);
	--birb-neg-double-border-size: calc(var(--birb-neg-border-size) * 2);
	--birb-highlight: #ffa3cb;
	--birb-border-color: var(--birb-highlight);
	--birb-background-color: #ffecda;
	--birb-mix-color: color-mix(in srgb, var(--birb-highlight) 50%, var(--birb-background-color));
	--birb-scale: ${BIRB_CSS_SCALE};
	--birb-ui-scale: ${UI_CSS_SCALE};
}

#birb {
	image-rendering: pixelated;
	position: fixed;
	bottom: 0;
	transform: scale(var(--birb-scale)) !important;
	transform-origin: bottom;
	z-index: 2147483638 !important;
	cursor: pointer;
}

.birb-absolute {
	position: absolute !important;
}

.birb-decoration {
	image-rendering: pixelated;
	position: fixed;
	bottom: 0;
	transform: scale(var(--birb-scale)) !important;
	transform-origin: bottom;
	z-index: 2147483630 !important;
}

.birb-window {
	font-family: "Monocraft", monospace !important;
	line-height: initial !important;
	color: #000000 !important;
	z-index: 2147483639 !important;
	position: fixed;
	background-color: var(--birb-background-color);
	box-shadow:
		var(--birb-border-size) 0 var(--birb-border-color),
		var(--birb-neg-border-size) 0 var(--birb-border-color),
		0 var(--birb-neg-border-size) var(--birb-border-color),
		0 var(--birb-border-size) var(--birb-border-color),
		var(--birb-double-border-size) 0 var(--birb-border-color),
		var(--birb-neg-double-border-size) 0 var(--birb-border-color),
		0 var(--birb-neg-double-border-size) var(--birb-border-color),
		0 var(--birb-double-border-size) var(--birb-border-color),
		0 0 0 var(--birb-border-size) var(--birb-border-color),
		0 0 0 var(--birb-double-border-size) white,
		var(--birb-double-border-size) 0 0 var(--birb-border-size) white,
		var(--birb-neg-double-border-size) 0 0 var(--birb-border-size) white,
		0 var(--birb-neg-double-border-size) 0 var(--birb-border-size) white,
		0 var(--birb-double-border-size) 0 var(--birb-border-size) white;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	transform: scale(var(--birb-ui-scale)) !important;
	animation: pop-in 0.08s;
	transition-timing-function: ease-in;
}

#birb-menu {
	transition-duration: 0.2s;
	transition-timing-function: ease-out;
	min-width: 140px;
	z-index: 2147483639 !important;
}

#birb-menu-exit {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 2147483637 !important;
}

@keyframes pop-in {
	0% {
		opacity: 1;
		transform: scale(0.1);
	}

	100% {
		opacity: 1;
		transform: scale(var(--birb-ui-scale));
	}
}

.birb-window-header {
	box-sizing: border-box;
	width: 100%;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 7px;
	padding-top: 3px;
	padding-bottom: 3px;
	padding-left: 30px;
	padding-right: 30px;
	background-color: var(--birb-highlight);
	box-shadow:
		var(--birb-border-size) 0 var(--birb-highlight),
		var(--birb-neg-border-size) 0 var(--birb-highlight),
		0 var(--birb-neg-border-size) var(--birb-highlight),
		var(--birb-neg-border-size) var(--birb-border-size) var(--birb-border-color),
		var(--birb-border-size) var(--birb-border-size) var(--birb-border-color);
	color: var(--birb-border-color) !important;
	font-size: 16px;
}

.birb-window-title {
	text-align: center;
	flex-grow: 1;
	user-select: none;
	color: var(--birb-background-color);
	white-space: nowrap;
}

.birb-window-close {
	position: absolute;
	top: 1px;
	right: 0;
	color: var(--birb-background-color);
	user-select: none;
	cursor: pointer;
	padding-left: 5px;
	padding-right: 5px;
}

.birb-window-close:hover {
	transform: scale(1.1);
}

.birb-window-content {
	box-sizing: border-box;
	background-color: var(--birb-background-color);
	margin-top: var(--birb-border-size);
	flex-grow: 1;
	box-shadow:
		var(--birb-border-size) 0 var(--birb-background-color),
		var(--birb-neg-border-size) 0 var(--birb-background-color),
		0 var(--birb-border-size) var(--birb-background-color),
		0 var(--birb-neg-border-size) var(--birb-border-color),
		0 var(--birb-border-size) var(--birb-border-color);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding-top: calc(var(--birb-double-border-size));
	padding-bottom: var(--birb-border-size);
}

.birb-pico-8-content {
	background: #111111;
	box-shadow: none;
	display: flex;
	justify-content: center;
	overflow: hidden;
	border: none;
}

.birb-pico-8-content iframe {
	width: 300px;
	margin-left: -15px;
	margin-right: -30px;
	margin-top: -10px;
	margin-bottom: -23px;
	border: none;
	aspect-ratio: 1;
}

.birb-music-player-content {
	background: var(--birb-background-color);
	box-shadow:
		var(--birb-border-size) 0 var(--birb-background-color),
		var(--birb-neg-border-size) 0 var(--birb-background-color),
		0 var(--birb-border-size) var(--birb-background-color),
		0 var(--birb-neg-border-size) var(--birb-border-color),
		0 var(--birb-border-size) var(--birb-border-color);
	display: flex;
	justify-content: center;
	overflow: hidden;
	padding: 10px;
}

.birb-menu-item {
	width: calc(100% - var(--birb-double-border-size));
	white-space: nowrap;
	font-size: 14px;
	padding-top: 4px;
	padding-bottom: 4px;
	padding-left: 10px;
	padding-right: 10px;
	box-sizing: border-box;
	opacity: 0.7 !important;
	user-select: none;
	display: flex;
	justify-content: space-between;
	cursor: pointer;
	color: black !important;
}

.birb-menu-item:hover {
	opacity: 1 !important;
	background: var(--birb-highlight) !important;
	color: white !important;
	box-shadow:
		var(--birb-border-size) 0 var(--birb-highlight),
		var(--birb-neg-border-size) 0 var(--birb-highlight),
		0 var(--birb-neg-border-size) var(--birb-highlight),
		0 var(--birb-border-size) var(--birb-highlight);
}

.birb-menu-item-arrow {
	display: inline-block;
}

.birb-window-separator {
	width: 100%;
	height: var(--birb-border-size);
	background-color: var(--birb-border-color);
	box-sizing: border-box;
	margin-top: var(--birb-double-border-size);
	margin-bottom: var(--birb-double-border-size);
	opacity: 0.4;
}

#birb-field-guide {
	width: 322px !important;
}

.birb-grid-content {
	display: grid;
	grid-template-rows: repeat(3, auto);
	grid-auto-flow: column;
	gap: 10px;
	padding-top: 8px;
	padding-bottom: 8px;
	padding-left: 10px;
	padding-right: 10px;
	box-sizing: border-box;
	justify-content: center;
	align-items: center;
}

.birb-grid-item {
	width: 64px;
	height: 64px;
	overflow: hidden;
	display: flex;
	justify-content: center;
	align-items: center;
	cursor: pointer;
}

.birb-grid-item:hover {
	border-color: var(--birb-highlight);
}

.birb-grid-item canvas {
	image-rendering: pixelated;
	transform: scale(2) !important;
	padding-bottom: var(--birb-border-size);
}

.birb-grid-item, .birb-field-guide-description, .birb-message-content {
	border: var(--birb-border-size) solid rgb(255, 207, 144);
	box-shadow: 0 0 0 var(--birb-border-size) white;
	background: rgba(255, 221, 177, 0.5);
}

.birb-grid-item-locked {
	cursor: auto;
	filter: grayscale(100%) sepia(30%);
}

.birb-grid-item-locked canvas {
	filter: contrast(90%);
}

.birb-grid-item-selected {
	border: var(--birb-border-size) solid var(--birb-highlight);
	background: var(--birb-mix-color);
}

.birb-field-guide-description {
	max-width: calc(100% - 20px);
	margin-left: 10px;
	margin-right: 10px;
	margin-top: 5px;
	padding: 8px;
	padding-top: 4px;
	padding-bottom: 4px;
	margin-bottom: 10px;
	font-size: 14px;
	box-sizing: border-box;
	color: rgb(124, 108, 75);
}

#birb-feather {
	cursor: pointer;
}

.birb-message-content {
	box-sizing: border-box;
	margin: 2px;
	width: 100%;
	padding: 10px;
	font-size: 14px;
	color: rgb(124, 108, 75);
}

.birb-sticky-note {
	position: absolute;
	box-sizing: border-box;
	animation: fade-in 0.15s ease-in;
}

@keyframes fade-in {
	0% {
		opacity: 0;
	}

	100% {
		opacity: 1;
	}
}

.birb-sticky-note > .birb-window-content {
	padding: 0;
}

.birb-sticky-note-input {
	width: 100%;
	height: 100%;
	padding: 10px !important;
	resize: both !important;
	min-width: 175px !important;
	min-height: 135px !important;
	box-sizing: border-box !important;
	font-family: "Monocraft", monospace !important;
	font-size: 14px !important;
	color: black !important;
	background-color: transparent !important;
	border: none !important;
}

.birb-sticky-note-input::placeholder {
	font-family: "Monocraft", monospace !important;
	font-size: 14px !important;
	background-color: transparent !important;
	color: rgba(0, 0, 0, 0.35) !important;
}

.birb-sticky-note-input:focus {
	outline: none !important;
	box-shadow: none !important;
}`;
	const SPRITE_SHEET = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAAgCAYAAABjE6FEAAAAAXNSR0IArs4c6QAABD5JREFUeJztnTFrFEEYht9JLAJidwju2YpdBAvzAyIWaXJXpRS0MBCwEBTJDwghhaAgGLTSyupMY2UqG9PYWQRb7yJyYJEIacxnkZ11bm5n9+7Y3Zm9ex8Imezd7Te7O9+zM7N7G4AQQgghhBBCCJkJlO8KkPAREXG9ppRiGyK1hY23BvgUkI7dbjYBAJ1ud6BcRR0IITOKxLSiSFpRNFTOkmNR8VtRJF8WF0U2NobKZccnpEzmfFeA5NNuNvG00UCn3R4qV8nB58942mgkZULqDgVYI3wJqNPtYrvfH1i23e8nQ2BCCCkFcwj8ZXEx+alqCJxWhypjE0ICQFKoOrZPAZl1oPwImTFE5Hzy3/hddXzfAvIhf0LK5ILvCtSNgxs3vMRVSikREZ+3nvB2F0JmFN3z0b0/9oKqx9cUBJleeEYfAzPp2BuqFr3v9W4XkcqPgS1dtoEZIe0CAM/AxAOy220JAG/zn3HsoNs/83R0cu8DNM+85g9yvqJVJBQwAYDdbksXvcx/KqWSOoTW+7Pzwkee1pHMiyDmzjQaH/QyETHfU0qDsIc+xnKIiITWEEl5PGh+8HqsfQp4FMxUWNvpJcvoPzdOAZriOVy7DzwCdm6/SV7f7bYH5mPKkFEIAiZE41vAGYhSKpHetHNlXsnRXynkWDhXIiIydzEaWHbveQ8f1+ew8uoMAHDy+wgA8P5JNHCWKUJGQwLGoIBvrbTxoPlBv7ewuITUDHGJ7/uPY3x9cd3LBaOyuDKvZOXVGT6uz6EICWYKELGA7r9O70JrASKWIAwZpQYb4yD4FjAJm7Wdnrx/Es36cc6VX6jD9VBwDoH1jbeu1035wZpzSGOSYfLZn96QgLX87Nj2cNy1TaPGJuFwurcsC6v7SpcBYGHVr/x8C3htp+d1Ys8VP+4I1SbPMisaCwune8vY+PUJAPDy8m0AwN3DdyMF+P7jGAAm6orr+Gk9UFvAGt0TTVkXQAnWlv/i26/8+KULuPp6mLgEZOZbySJy9j7rJMGRBWizsLqPmw8Pce3qpdTPWgdiIgH5FjAhmlDEpzndWxYzB+x8q0BA4sr/mRAgDAmmYYsPE/S+fAuYkJDpby3JxoUOMDjyqap9OwWIGkkwV4CI5/VsCZ18OwEANDYPXJ/9H2RC6fgWMCGh099aShr4nZ9vgfO2712C5oXJkPMut2JpEtLyS6OxeVDYhvsWMCEkF9GdEFuEWoIh599Ij8OKNwL9raXM9xUpP2RciTYFbNep6DoQQjJRX19cP084hwhDJleAWkJ5EixTPDo2UoRXVR0IIU4UzofeAyKcKsynYXSePU6eiqHLZT6gwPqid2r8sutACMnHfmJO6Pk41n+FU0qh8+xx8rdZRom9Lr3erPjs+RESBvGXEYAa5ONYj8Q3h6J2uQry4oe+swmZduqWg2Pfl+dcUQUb7js+IWS6+Ac8zd6eLzTjoQAAAABJRU5ErkJggg==";
	const FEATHER_SPRITE_SHEET = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAARhJREFUWIXtlbENwjAQRf8hSiZIRQ+9WQNRUFIAKzACBSsAA1Ag1mAABqCCBomG3hQQ9OMEx4ZDNH5SikSJ3/fZ5wCJRCKRSPwZ0RzMWmtLAhGvQyUAi9mXP/aFaGjJRQQiguHihMvcFMJUVUYlAMuHixPGy4en1WmVQqgHYHkuZjiEj6a2/LjtYzTY0eiZbgC37Mxh1UN3sn/dr6cCz/LHB/DJj9s+2oMdbtdz6TtfFwQHcMvOInfmQNjsgchNWLXmdfK6gyioAu/6uKrsm1kWLAciKuCuey5nYuXAh234bdmZ6INIUw4E/Ix49xtjCmXfzLL8nY/ktdgnAKwxxgIoXIyqmAOwvIqfiN0ALNd21HYBO9XXGMAdnZTYyHWzWjQAAAAASUVORK5CYII=";

	// Element IDs
	const FIELD_GUIDE_ID = "birb-field-guide";
	const FEATHER_ID = "birb-feather";

	const DEFAULT_BIRD = "bluebird";

	// Birb movement
	const HOP_SPEED = 0.07;
	const FLY_SPEED = isMobile() ? 0.175 : 0.25;
	const HOP_DISTANCE = 35;

	// Timing constants (in milliseconds)
	const UPDATE_INTERVAL = 1000 / 60; // 60 FPS
	const AFK_TIME = isDebug() ? 0 : 1000 * 5;
	const PET_BOOST_DURATION = 1000 * 60 * 5;
	const PET_MENU_COOLDOWN = 1000;
	const URL_CHECK_INTERVAL = 150;
	const HOP_DELAY = 500;

	// Random event chances per tick
	const HOP_CHANCE = 1 / (60 * 2.5); // Every 2.5 seconds
	const FOCUS_SWITCH_CHANCE = 1 / (60 * 20); // Every 20 seconds
	const FEATHER_CHANCE = 1 / (60 * 60 * 60 * 2); // Every 2 hours

	// Feathers
	const FEATHER_FALL_SPEED = 1;
	const PET_FEATHER_BOOST = 2;

	// Focus element constraints
	const MIN_FOCUS_ELEMENT_WIDTH = 100;

	/** @type {Partial<Settings>} */
	let userSettings = {};


	/** 
	 * @param {Context} context
	 */
	async function initializeApplication(context) {
		log("birbOS booting up...");
		setContext(context);
		log("Loading sprite sheets...");
		const birbPixels = await loadSpriteSheetPixels(SPRITE_SHEET);
		const featherPixels = await loadSpriteSheetPixels(FEATHER_SPRITE_SHEET);
		startApplication(birbPixels, featherPixels);
	}

	/**
	 * @param {string[][]} birbPixels
	 * @param {string[][]} featherPixels
	 */
	function startApplication(birbPixels, featherPixels) {

		const SPRITE_SHEET = birbPixels;
		const FEATHER_SPRITE_SHEET = featherPixels;

		const featherLayers = {
			feather: new Layer(getLayerPixels(FEATHER_SPRITE_SHEET, 0, FEATHER_SPRITE_WIDTH)),
		};

		const featherFrames = {
			feather: new Frame([featherLayers.feather]),
		};

		const FEATHER_ANIMATIONS = {
			feather: new Anim([
				featherFrames.feather,
			], [
				1000,
			]),
		};

		const menuItems = [
			new MenuItem(`Pet ${birdBirb()}`, pet),
			new MenuItem("Field Guide", insertFieldGuide),
			new ConditionalMenuItem("Sticky Note", () => createNewStickyNote(stickyNotes, save, deleteStickyNote), () => getContext().areStickyNotesEnabled()),
			new MenuItem(`Hide ${birdBirb()}`, () => birb.setVisible(false)),
			new DebugMenuItem("Freeze/Unfreeze", () => {
				frozen = !frozen;
			}),
			new DebugMenuItem("Reset Data", resetSaveData),
			new DebugMenuItem("Unlock All", () => {
				for (let type in SPECIES) {
					unlockBird(type);
				}
			}),
			new DebugMenuItem("Add Feather", () => {
				activateFeather();
			}),
			new DebugMenuItem("Disable Debug", () => {
				setDebug(false);
			}),
			new Separator(),
			new MenuItem("Settings", () => switchMenuItems(settingsItems, updateMenuLocation), false),
		];

		const settingsItems = [
			new MenuItem("Go Back", () => switchMenuItems(menuItems, updateMenuLocation), false),
			new Separator(),
			new MenuItem(() => `${settings().soundEnabled ? "Disable" : "Enable"} Sound`, () => {
				userSettings.soundEnabled = !settings().soundEnabled;
				save();
			}),
			new MenuItem(() => `Toggle ${birdBirb(true)} Mode`, () => {
				userSettings.birbMode = !settings().birbMode;
				save();
				const message = makeElement("birb-message-content");
				message.appendChild(document.createTextNode(`Your ${birdBirb().toLowerCase()} shall now be referred to as "${birdBirb()}"`));
				if (settings().birbMode) {
					message.appendChild(document.createElement("br"));
					message.appendChild(document.createElement("br"));
					message.appendChild(document.createTextNode("Welcome back to 2012"));
				}
				insertModal(`${birdBirb()} Mode`, message);
			}),
			new Separator(),
			new MenuItem("2026.1.18", () => { alert("Thank you for using Pocket Bird! You are on version: 2026.1.18"); }, false),
		];

		const styleElement = document.createElement("style");

		/** @type {Birb} */
		let birb;

		const States = {
			IDLE: "idle",
			HOP: "hop",
			FLYING: "flying",
		};

		const birdsong = new Birdsong();

		let frozen = false;
		let stateStart = Date.now();
		let currentState = States.IDLE;
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
		let focusedBounds = { left: 0, right: 0, top: 0 };
		let lastActionTimestamp = Date.now();
		/** @type {number[]} */
		let petStack = [];
		let currentSpecies = DEFAULT_BIRD;
		let unlockedSpecies = [DEFAULT_BIRD];
		// let visible = true;
		let lastPetTimestamp = 0;
		/** @type {StickyNote[]} */
		let stickyNotes = [];

		async function load() {
			/** @type {BirbSaveData|Object} */
			let saveData = await getContext().getSaveData();

			debug("Loaded data: " + JSON.stringify(saveData));

			if (!('settings' in saveData)) {
				log("No user settings found in save data, starting fresh");
			}

			userSettings = saveData.settings ?? {};
			unlockedSpecies = saveData.unlockedSpecies ?? [DEFAULT_BIRD];
			currentSpecies = saveData.currentSpecies ?? DEFAULT_BIRD;
			stickyNotes = [];

			if (saveData.stickyNotes) {
				for (let note of saveData.stickyNotes) {
					if (note.id) {
						stickyNotes.push(new StickyNote(note.id, note.site, note.content, note.top, note.left));
					}
				}
			}

			log(stickyNotes.length + " sticky notes loaded");
			switchSpecies(currentSpecies);
		}

		function save() {
			/** @type {BirbSaveData} */
			const saveData = {
				unlockedSpecies,
				currentSpecies,
				settings: userSettings
			};

			if (stickyNotes.length > 0) {
				saveData.stickyNotes = stickyNotes.map(note => ({
					id: note.id,
					site: note.site,
					content: note.content,
					top: note.top,
					left: note.left
				}));
			}

			getContext().putSaveData(saveData);
		}

		function resetSaveData() {
			getContext().resetSaveData();
			load();
		}

		/**
		 * Get the user settings merged with default settings
		 * @returns {Settings} The merged settings
		 */
		function settings() {
			return { ...DEFAULT_SETTINGS, ...userSettings };
		}

		/**
		 * Bird or birb, you decide
		 */
		function birdBirb(invert = false) {
			return settings().birbMode !== invert ? "Birb" : "Bird";
		}

		function init() {
			log("Sprite sheets loaded successfully, initializing bird...");

			if (window !== window.top) {
				// Skip installation if within an iframe
				log("In iframe, skipping Birb script initialization");
				return;
			}

			load().then(onLoad);
		}

		function onLoad() {
			styleElement.textContent = STYLESHEET;
			document.head.appendChild(styleElement);

			birb = new Birb(BIRB_CSS_SCALE, CANVAS_PIXEL_SIZE, SPRITE_SHEET, SPRITE_WIDTH, SPRITE_HEIGHT);
			birb.setAnimation(Animations.BOB);

			window.addEventListener("scroll", () => {
				lastActionTimestamp = Date.now();
			});

			onClick(document, (e) => {
				lastActionTimestamp = Date.now();
				if (e.target instanceof Node && document.querySelector("#" + MENU_EXIT_ID)?.contains(e.target)) {
					removeMenu();
				}
			});

			const birbElement = birb.getElement();

			onClick(birbElement, () => {
				if (birb.getCurrentAnimation() === Animations.HEART && (Date.now() - lastPetTimestamp < PET_MENU_COOLDOWN)) {
					// Currently being pet, don't open menu
					return;
				}
				insertMenu(menuItems, `${birdBirb().toLowerCase()}OS`, updateMenuLocation);
			});

			birbElement.addEventListener("mouseover", () => {
				lastActionTimestamp = Date.now();
				if (currentState === States.IDLE) {
					petStack.push(Date.now());
					if (petStack.length > 10) {
						petStack.shift();
					}
					const pets = petStack.filter((time) => Date.now() - time < 1000).length;
					if (pets >= 3) {
						pet();
						// Clear the stack
						petStack = [];
					}
				}
			});

			birbElement.addEventListener("touchmove", (e) => {
				pet();
			});

			drawStickyNotes(stickyNotes, save, deleteStickyNote);

			let lastPath = getContext().getPath().split("?")[0];
			setInterval(() => {
				const currentPath = getContext().getPath().split("?")[0];
				if (currentPath !== lastPath) {
					log("Path changed, updating sticky notes: " + currentPath);
					lastPath = currentPath;
					drawStickyNotes(stickyNotes, save, deleteStickyNote);
				}
			}, URL_CHECK_INTERVAL);

			setInterval(update, UPDATE_INTERVAL);

			focusOnElement(true);
		}

		function update() {
			ticks++;

			// Hide bird if the browser is fullscreen
			if (document.fullscreenElement) {
				birb.setVisible(false);
				// Won't be restored on fullscreen exit
			}

			if (currentState === States.IDLE && !frozen && !isMenuOpen()) {
				if (Date.now() - stateStart > HOP_DELAY && Math.random() < HOP_CHANCE && birb.getCurrentAnimation() !== Animations.HEART) {
					hop();
				} else if (Date.now() - lastActionTimestamp > AFK_TIME) {
					// Idle for a while, do something
					if (focusedElement === null) {
						// Fly to an element
						focusOnElement();
						lastActionTimestamp = Date.now();
					} else if (Math.random() < FOCUS_SWITCH_CHANCE) {
						// Fly to another element if idle for a longer while
						focusOnElement();
						lastActionTimestamp = Date.now();
					}
				}
			} else if (currentState === States.HOP) {
				if (updateParabolicPath(HOP_SPEED)) {
					setState(States.IDLE);
				}
			}

			// Double the chance of a feather if recently pet
			const petMod = Date.now() - lastPetTimestamp < PET_BOOST_DURATION ? PET_FEATHER_BOOST : 1;
			if (birb.isVisible() && Math.random() < FEATHER_CHANCE * petMod) {
				lastPetTimestamp = 0;
				activateFeather();
			}
			updateFeather();
		}

		function draw() {
			requestAnimationFrame(draw);

			if (!birb || !birb.isVisible()) {
				return;
			}

			updateFocusedElementBounds();

			// Update the bird's position
			if (currentState === States.IDLE) {
				if (focusedElement && !isWithinHorizontalBounds()) {
					flySomewhere();
				}
				birdY = getFocusedY();
			} else if (currentState === States.FLYING) {
				// Fly to target location (even if in the air)
				if (updateParabolicPath(FLY_SPEED, 2)) {
					setState(States.IDLE);
				}
			}

			const oldTargetY = targetY;
			targetY = getFocusedY();
			// Adjust startY to account for scrolling
			startY += targetY - oldTargetY;
			if (targetY < 0 || targetY > getWindowHeight()) {
				// Fly to another element or the ground if the focused element moves out of bounds
				flySomewhere();
			}

			if (birb.draw(SPECIES[currentSpecies])) {
				birb.setAnimation(Animations.STILL);
			}

			// Clamp startY, birdY, targetY to a bit above the top of the window
			const maxY = getWindowHeight() * 1.5;
			startY = Math.min(startY, maxY);
			birdY = Math.min(birdY, maxY);
			targetY = Math.min(targetY, maxY);

			// Update HTML element position
			birb.setX(birdX);
			birb.setY(birdY);
		}

		/**
		 * @param {StickyNote} stickyNote
		 */
		function deleteStickyNote(stickyNote) {
			stickyNotes = stickyNotes.filter(note => note.id !== stickyNote.id);
			save();
		}

		/**
		 * Create a window element with header and content
		 * @param {string} id
		 * @param {string} title
		 * @param {HTMLElement} contentElement
		 * @param {() => void} [onClose]
		 * @returns {HTMLElement}
		 */
		function createWindow(id, title, contentElement, onClose) {
			const window = makeElement("birb-window", undefined, id);

			const header = makeElement("birb-window-header");
			const titleElement = makeElement("birb-window-title");
			titleElement.textContent = title;
			const closeButton = makeElement("birb-window-close");
			closeButton.textContent = "x";

			header.appendChild(titleElement);
			header.appendChild(closeButton);

			const contentWrapper = makeElement("birb-window-content");
			contentWrapper.appendChild(contentElement);

			window.appendChild(header);
			window.appendChild(contentWrapper);

			document.body.appendChild(window);
			makeDraggable(header);

			makeClosable(() => {
				window.remove();
			}, closeButton);

			return window;
		}

		function activateFeather() {
			if (document.querySelector("#" + FEATHER_ID)) {
				return;
			}
			const speciesToUnlock = Object.keys(SPECIES).filter((species) => !unlockedSpecies.includes(species));
			if (speciesToUnlock.length === 0) {
				// No more species to unlock
				return;
			}
			const birdType = speciesToUnlock[Math.floor(Math.random() * speciesToUnlock.length)];
			insertFeather(birdType);
		}

		/**
		 * @param {string} birdType
		 */
		function insertFeather(birdType) {
			let type = SPECIES[birdType];
			const featherCanvas = document.createElement("canvas");
			featherCanvas.id = FEATHER_ID;
			featherCanvas.classList.add("birb-decoration");
			featherCanvas.width = FEATHER_SPRITE_WIDTH * CANVAS_PIXEL_SIZE;
			featherCanvas.height = FEATHER_SPRITE_WIDTH * CANVAS_PIXEL_SIZE;
			const x = featherCanvas.width * 2 + Math.random() * (window.innerWidth - featherCanvas.width * 4);
			featherCanvas.style.marginLeft = `${x}px`;
			featherCanvas.style.top = `${-featherCanvas.height}px`;
			const featherCtx = featherCanvas.getContext("2d");
			if (!featherCtx) {
				return;
			}
			FEATHER_ANIMATIONS.feather.draw(featherCtx, Directions.LEFT, Date.now(), CANVAS_PIXEL_SIZE, type);
			document.body.appendChild(featherCanvas);
			onClick(featherCanvas, () => {
				unlockBird(birdType);
				removeFeather();
				if (document.querySelector("#" + FIELD_GUIDE_ID)) {
					removeFieldGuide();
					insertFieldGuide();
				}
			});
		}

		function removeFeather() {
			const feather = document.querySelector("#" + FEATHER_ID);
			if (feather) {
				feather.remove();
			}
		}

		/**
		 * @param {string} birdType
		 */
		function unlockBird(birdType) {
			if (!unlockedSpecies.includes(birdType)) {
				unlockedSpecies.push(birdType);
				const message = makeElement("birb-message-content");
				message.appendChild(document.createTextNode("You've found a "));
				const bold = document.createElement("b");
				bold.textContent = SPECIES[birdType].name;
				message.appendChild(bold);
				message.appendChild(document.createTextNode(" feather! Use the Field Guide to switch your bird's species."));
				insertModal("New Bird Unlocked!", message);
			}
			save();
		}

		function updateFeather() {
			const feather = document.querySelector("#birb-feather");
			if (!feather || !(feather instanceof HTMLElement)) {
				return;
			}
			const y = parseInt(feather.style.top || "0") + FEATHER_FALL_SPEED;
			feather.style.top = `${Math.min(y, getWindowHeight() - feather.offsetHeight)}px`;
			if (y < getWindowHeight() - feather.offsetHeight) {
				feather.style.left = `${Math.sin(3.14 * 2 * (ticks / 120)) * 25}px`;
			}
		}

		/**
		 * @param {HTMLElement} element
		 */
		function centerElement(element) {
			element.style.left = `${window.innerWidth / 2 - element.offsetWidth / 2}px`;
			element.style.top = `${getWindowHeight() / 2 - element.offsetHeight / 2}px`;
		}

		/**
		 * @param {string} title
		 * @param {HTMLElement} content
		 */
		function insertModal(title, content) {
			if (document.querySelector("#" + FIELD_GUIDE_ID)) {
				return;
			}

			const modal = createWindow("birb-modal", title, content);

			modal.style.width = "270px";
			centerElement(modal);
		}

		/**
		 * @param {HTMLElement} menu
		 */
		function updateMenuLocation(menu) {
			let x = birdX;
			let y = birb.getElementTop() + birb.getElementHeight() / 2 + WINDOW_PIXEL_SIZE * 10;
			const offset = 20;
			if (x < window.innerWidth / 2) {
				// Left side
				x += offset;
			} else {
				// Right side
				x -= (menu.offsetWidth + offset) * UI_CSS_SCALE;
			}
			if (y > getWindowHeight() / 2) {
				// Top side
				y -= (menu.offsetHeight + offset + 10) * UI_CSS_SCALE;
			} else {
				// Bottom side
				y += offset;
			}
			menu.style.left = `${x}px`;
			menu.style.top = `${y}px`;
		}
		function insertFieldGuide() {
			if (document.querySelector("#" + FIELD_GUIDE_ID)) {
				return;
			}

			const contentContainer = document.createElement("div");
			const content = makeElement("birb-grid-content");
			const description = makeElement("birb-field-guide-description");
			contentContainer.appendChild(content);
			contentContainer.appendChild(description);

			const fieldGuide = createWindow(
				FIELD_GUIDE_ID,
				"Field Guide",
				contentContainer
			);

			const generateDescription = (/** @type {string} */ speciesId) => {
				const type = SPECIES[speciesId];
				const unlocked = unlockedSpecies.includes(speciesId);

				const boldName = document.createElement("b");
				boldName.textContent = type.name;

				const spacer = document.createElement("div");
				spacer.style.height = "0.3em";

				const descText = document.createTextNode(!unlocked ? "Not yet unlocked" : type.description);

				const fragment = document.createDocumentFragment();
				fragment.appendChild(boldName);
				fragment.appendChild(spacer);
				fragment.appendChild(descText);

				return fragment;
			};

			description.appendChild(generateDescription(currentSpecies));
			for (const [id, type] of Object.entries(SPECIES)) {
				const unlocked = unlockedSpecies.includes(id);
				const speciesElement = makeElement("birb-grid-item");
				if (id === currentSpecies) {
					speciesElement.classList.add("birb-grid-item-selected");
				}
				const speciesCanvas = document.createElement("canvas");
				speciesCanvas.width = SPRITE_WIDTH * CANVAS_PIXEL_SIZE;
				speciesCanvas.height = SPRITE_HEIGHT * CANVAS_PIXEL_SIZE;
				const speciesCtx = speciesCanvas.getContext("2d");
				if (!speciesCtx) {
					return;
				}
				birb.getFrames().base.draw(speciesCtx, Directions.RIGHT, CANVAS_PIXEL_SIZE, type);
				speciesElement.appendChild(speciesCanvas);
				content.appendChild(speciesElement);
				if (unlocked) {
					onClick(speciesElement, () => {
						switchSpecies(id);
						document.querySelectorAll(".birb-grid-item").forEach((element) => {
							element.classList.remove("birb-grid-item-selected");
						});
						speciesElement.classList.add("birb-grid-item-selected");
					});
				} else {
					speciesElement.classList.add("birb-grid-item-locked");
				}
				speciesElement.addEventListener("mouseover", () => {
					description.textContent = "";
					description.appendChild(generateDescription(id));
				});
				speciesElement.addEventListener("mouseout", () => {
					description.textContent = "";
					description.appendChild(generateDescription(currentSpecies));
				});
			}
			centerElement(fieldGuide);
		}

		function removeFieldGuide() {
			const fieldGuide = document.querySelector("#" + FIELD_GUIDE_ID);
			if (fieldGuide) {
				fieldGuide.remove();
			}
		}

		/**
		 * @param {string} type
		 */
		function switchSpecies(type) {
			currentSpecies = type;
			// Update CSS variable --birb-highlight to be wing color
			document.documentElement.style.setProperty("--birb-highlight", SPECIES[type].colors[PALETTE.THEME_HIGHLIGHT]);
			save();
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
			if (distance > Math.max(window.innerWidth, getWindowHeight()) / 2) {
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
				birb.setDirection(targetX > birdX ? Directions.RIGHT : Directions.LEFT);
			}
			return complete;
		}

		function getFocusedElementRandomX() {
			return Math.random() * (focusedBounds.right - focusedBounds.left) + focusedBounds.left;
		}

		function isWithinHorizontalBounds() {
			return birdX >= focusedBounds.left && birdX <= focusedBounds.right;
		}

		function getFocusedY() {
			return getWindowHeight() - focusedBounds.top;
		}

		/**
		 * Fly to either an element or the ground
		 */
		function flySomewhere() {
			// On mobile, always prefer to focus on an element
			// If not mobile, 50% chance to focus on ground
			// if ((!isMobile() && coinFlip()) || !focusOnElement()) {
			// 	focusOnGround();
			// }
			if (!focusOnElement()) {
				focusOnGround();
			}
		}

		function focusOnGround() {
			focusedElement = null;
			updateFocusedElementBounds();
			flyTo(Math.random() * window.innerWidth, 0);
		}

		/**
		 * Focus on an element within the viewport
		 * @param {boolean} [teleport] Whether to teleport to the element instead of flying
		 * @returns Whether an element to focus on was found
		 */
		function focusOnElement(teleport = false) {
			if (frozen) {
				return false;
			}
			const MIN_FOCUS_ELEMENT_TOP = getContext().getFocusElementTopMargin();
			const elements = document.querySelectorAll(getContext().getFocusableElements().join(", "));
			const inWindow = Array.from(elements).filter((img) => {
				const rect = img.getBoundingClientRect();
				return rect.left >= 0 && rect.top >= MIN_FOCUS_ELEMENT_TOP && rect.right <= window.innerWidth && rect.top <= getWindowHeight();
			});
			const visible = Array.from(inWindow).filter((img) => {
				const style = window.getComputedStyle(img);
				if (style.display === "none" || style.visibility === "hidden" || (style.opacity && parseFloat(style.opacity) < 0.25)) {
					return false;
				}
				return true;
			});
			/** @type {HTMLElement[]} */
			const largeElements = Array.from(visible).filter((img) => img instanceof HTMLElement && img !== focusedElement && img.offsetWidth >= MIN_FOCUS_ELEMENT_WIDTH);
			const nonFixedElements = largeElements.filter((el) => {
				{
					return true;
				}
			});
			if (nonFixedElements.length === 0) {
				return false;
			}
			const randomElement = nonFixedElements[Math.floor(Math.random() * nonFixedElements.length)];
			focusedElement = randomElement;
			log("Focusing on element: ", focusedElement);
			updateFocusedElementBounds();
			if (teleport) {
				teleportTo(getFocusedElementRandomX(), getFocusedY());
			} else {
				flyTo(getFocusedElementRandomX(), getFocusedY());
			}
			return randomElement !== null;
		}

		/**
		 * @param {number} x
		 * @param {number} y
		 */
		function teleportTo(x, y) {
			birdX = x;
			birdY = y;
			setState(States.IDLE);
		}

		function updateFocusedElementBounds() {
			if (focusedElement === null) {
				// Update ground location to bottom of window
				focusedBounds = { left: 0, right: window.innerWidth, top: getWindowHeight() };
				return;
			}
			let { left, right, top } = focusedElement.getBoundingClientRect();
			if (focusedElement.classList.contains("birb-sticky-note")) {
				top -= 4.5 * UI_CSS_SCALE;
				if (focusedBounds.left !== left) {
					// Sticky note has moved
					const oldWidth = focusedBounds.right - focusedBounds.left;
					const newWidth = right - left;
					if (oldWidth === newWidth) {
						// Move bird along with note
						if (currentState === States.IDLE) {
							birdX += left - focusedBounds.left;
						} else if (currentState === States.HOP) {
							startX += left - focusedBounds.left;
							startY += top - focusedBounds.top;
							targetX += left - focusedBounds.left;
							targetY += top - focusedBounds.top;
						}
					}
				}
			}
			focusedBounds = { left, right, top };
		}

		function hop() {
			if (frozen) {
				return;
			}
			if (currentState === States.IDLE) {
				setState(States.HOP);
				birb.setAnimation(Animations.FLYING);
				if ((Math.random() < 0.5 && birdX - HOP_DISTANCE > focusedBounds.left) || birdX + HOP_DISTANCE > focusedBounds.right) {
					targetX = birdX - HOP_DISTANCE;
				} else {
					targetX = birdX + HOP_DISTANCE;
				}
				targetY = getFocusedY();
			}
		}

		function pet() {
			if (currentState === States.IDLE && birb.getCurrentAnimation() !== Animations.HEART) {
				if (settings().soundEnabled) {
					birdsong.chirp();
				}
				birb.setAnimation(Animations.HEART);
				lastPetTimestamp = Date.now();
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
			birb.setAnimation(Animations.FLYING);
		}

		/**
		 * @returns {boolean} Whether the bird should be absolutely positioned
		 */
		function isAbsolute() {
			return focusedElement !== null && (currentState === States.IDLE || currentState === States.HOP);
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
				birb.setAnimation(Animations.BOB);
			}
			birb.setAbsolutePositioned(isAbsolute());
			birb.setY(birdY);
		}

		// Helper functions

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

		// Run the birb
		init();
		draw();
	}

	/**
	 * Load the sprite sheet and return the pixel-map template
	 * @param {string} dataUri
	 * @param {boolean} [templateColors]
	 * @returns {Promise<string[][]>}
	 */
	function loadSpriteSheetPixels(dataUri, templateColors = true) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.src = dataUri;
			img.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					reject(new Error('Failed to get canvas context'));
					return;
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
							row.push(PALETTE.TRANSPARENT);
							continue;
						}
						const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
						if (!templateColors) {
							row.push(hex);
							continue;
						}
						if (SPRITE_SHEET_COLOR_MAP[hex] === undefined) {
							error(`Unknown color: ${hex}`);
							row.push(PALETTE.TRANSPARENT);
						}
						row.push(SPRITE_SHEET_COLOR_MAP[hex]);
					}
					hexArray.push(row);
				}
				resolve(hexArray);
			};
			img.onerror = (err) => {
				reject(err);
			};
		});
	}

	initializeApplication(new ObsidianContext());

})();

		console.log("Pocket Bird loaded!");
	}

	onunload() {
		// Remove the birb when the plugin is unloaded
		document.getElementById('birb')?.remove();
		console.log('Pocket Bird unloaded!');
	}
};