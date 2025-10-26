(function () {
	'use strict';

	const Directions = {
		LEFT: -1,
		RIGHT: 1,
	};

	let debugMode = location.hostname === "127.0.0.1";

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
	 */
	function makeDraggable(element, parent = true, callback = () => { }) {
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
			if (isMouseDown) {
				elementToMove.style.left = `${Math.max(0, e.clientX - offsetX)}px`;
				elementToMove.style.top = `${Math.max(0, e.clientY - offsetY)}px`;
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
	 */
	function makeClosable(func, closeButton) {
		if (closeButton) {
			onClick(closeButton, func);
		}
		document.addEventListener("keydown", (e) => {
			if (closeButton && !document.body.contains(closeButton)) {
				return;
			}
			if (e.key === "Escape") {
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
	function getLayer(spriteSheet, spriteIndex, width) {
		// From an array of a horizontal sprite sheet, get the layer for a specific sprite
		const layer = [];
		for (let y = 0; y < width; y++) {
			layer.push(spriteSheet[y].slice(spriteIndex * width, (spriteIndex + 1) * width));
		}
		return layer;
	}

	/** Indicators for parts of the base bird sprite sheet */
	const SPRITE = {
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

	/** @type {Record<string, string>} */
	const SPRITE_SHEET_COLOR_MAP = {
		"transparent": SPRITE.TRANSPARENT,
		"#ffffff": SPRITE.BORDER,
		"#000000": SPRITE.OUTLINE,
		"#010a19": SPRITE.BEAK,
		"#190301": SPRITE.EYE,
		"#af8e75": SPRITE.FOOT,
		"#639bff": SPRITE.FACE,
		"#99e550": SPRITE.HOOD,
		"#d95763": SPRITE.NOSE,
		"#f8b143": SPRITE.BELLY,
		"#ec8637": SPRITE.UNDERBELLY,
		"#578ae6": SPRITE.WING,
		"#326ed9": SPRITE.WING_EDGE,
		"#c82e2e": SPRITE.HEART,
		"#501a1a": SPRITE.HEART_BORDER,
		"#ff6b6b": SPRITE.HEART_SHINE,
		"#373737": SPRITE.FEATHER_SPINE,
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
				[SPRITE.TRANSPARENT]: "transparent",
				[SPRITE.OUTLINE]: "#000000",
				[SPRITE.BORDER]: "#ffffff",
				[SPRITE.BEAK]: "#000000",
				[SPRITE.EYE]: "#000000",
				[SPRITE.HEART]: "#c82e2e",
				[SPRITE.HEART_BORDER]: "#501a1a",
				[SPRITE.HEART_SHINE]: "#ff6b6b",
				[SPRITE.FEATHER_SPINE]: "#373737",
				[SPRITE.HOOD]: colors.face,
				[SPRITE.NOSE]: colors.face,
			};
			/** @type {Record<string, string>} */
			this.colors = { ...defaultColors, ...colors, [SPRITE.THEME_HIGHLIGHT]: colors[SPRITE.THEME_HIGHLIGHT] ?? colors.hood ?? colors.face };
			this.tags = tags;
		}
	}

	/** @type {Record<string, BirdType>} */
	const SPECIES = {
		bluebird: new BirdType("Eastern Bluebird",
			"Native to North American and very social, though can be timid around people.", {
			[SPRITE.FOOT]: "#af8e75",
			[SPRITE.FACE]: "#639bff",
			[SPRITE.BELLY]: "#f8b143",
			[SPRITE.UNDERBELLY]: "#ec8637",
			[SPRITE.WING]: "#578ae6",
			[SPRITE.WING_EDGE]: "#326ed9",
		}),
		shimaEnaga: new BirdType("Shima Enaga",
			"Small, fluffy birds found in the snowy regions of Japan, these birds are highly sought after by ornithologists and nature photographers.", {
			[SPRITE.FOOT]: "#af8e75",
			[SPRITE.FACE]: "#ffffff",
			[SPRITE.BELLY]: "#ebe9e8",
			[SPRITE.UNDERBELLY]: "#ebd9d0",
			[SPRITE.WING]: "#f3d3c1",
			[SPRITE.WING_EDGE]: "#2d2d2dff",
			[SPRITE.THEME_HIGHLIGHT]: "#d7ac93",
		}),
		tuftedTitmouse: new BirdType("Tufted Titmouse",
			"Native to the eastern United States, full of personality, and notably my wife's favorite bird.", {
			[SPRITE.FOOT]: "#af8e75",
			[SPRITE.FACE]: "#c7cad7",
			[SPRITE.BELLY]: "#e4e5eb",
			[SPRITE.UNDERBELLY]: "#d7cfcb",
			[SPRITE.WING]: "#b1b5c5",
			[SPRITE.WING_EDGE]: "#9d9fa9",
		}, ["tuft"]),
		europeanRobin: new BirdType("European Robin",
			"Native to western Europe, this is the quintessential robin. Quite friendly, you'll often find them searching for worms.", {
			[SPRITE.FOOT]: "#af8e75",
			[SPRITE.FACE]: "#ffaf34",
			[SPRITE.HOOD]: "#aaa094",
			[SPRITE.BELLY]: "#ffaf34",
			[SPRITE.UNDERBELLY]: "#babec2",
			[SPRITE.WING]: "#aaa094",
			[SPRITE.WING_EDGE]: "#888580",
			[SPRITE.THEME_HIGHLIGHT]: "#ffaf34",
		}),
		redCardinal: new BirdType("Red Cardinal",
			"Native to the eastern United States, this strikingly red bird is hard to miss.", {
			[SPRITE.BEAK]: "#d93619",
			[SPRITE.FOOT]: "#af8e75",
			[SPRITE.FACE]: "#31353d",
			[SPRITE.HOOD]: "#e83a1b",
			[SPRITE.BELLY]: "#e83a1b",
			[SPRITE.UNDERBELLY]: "#dc3719",
			[SPRITE.WING]: "#d23215",
			[SPRITE.WING_EDGE]: "#b1321c",
		}, ["tuft"]),
		americanGoldfinch: new BirdType("American Goldfinch",
			"Coloured a brilliant yellow, this bird feeds almost entirely on the seeds of plants such as thistle, sunflowers, and coneflowers.", {
			[SPRITE.BEAK]: "#ffaf34",
			[SPRITE.FOOT]: "#af8e75",
			[SPRITE.FACE]: "#fff255",
			[SPRITE.NOSE]: "#383838",
			[SPRITE.HOOD]: "#383838",
			[SPRITE.BELLY]: "#fff255",
			[SPRITE.UNDERBELLY]: "#f5ea63",
			[SPRITE.WING]: "#e8e079",
			[SPRITE.WING_EDGE]: "#191919",
			[SPRITE.THEME_HIGHLIGHT]: "#ffcc00"
		}),
		barnSwallow: new BirdType("Barn Swallow",
			"Agile birds that often roost in man-made structures, these birds are known to build nests near Ospreys for protection.", {
			[SPRITE.FOOT]: "#af8e75",
			[SPRITE.FACE]: "#db7c4d",
			[SPRITE.BELLY]: "#f7e1c9",
			[SPRITE.UNDERBELLY]: "#ebc9a3",
			[SPRITE.WING]: "#2252a9",
			[SPRITE.WING_EDGE]: "#1c448b",
			[SPRITE.HOOD]: "#2252a9",
		}),
		mistletoebird: new BirdType("Mistletoebird",
			"Native to Australia, these birds eat mainly mistletoe and in turn spread the seeds far and wide.", {
			[SPRITE.FOOT]: "#6c6a7c",
			[SPRITE.FACE]: "#352e6d",
			[SPRITE.BELLY]: "#fd6833",
			[SPRITE.UNDERBELLY]: "#e6e1d8",
			[SPRITE.WING]: "#342b7c",
			[SPRITE.WING_EDGE]: "#282065",
		}),
		redAvadavat: new BirdType("Red Avadavat",
			"Native to India and southeast Asia, these birds are also known as Strawberry Finches due to their speckled plumage.", {
			[SPRITE.BEAK]: "#f71919",
			[SPRITE.FOOT]: "#af7575",
			[SPRITE.FACE]: "#cb092b",
			[SPRITE.BELLY]: "#ae1724",
			[SPRITE.UNDERBELLY]: "#831b24",
			[SPRITE.WING]: "#7e3030",
			[SPRITE.WING_EDGE]: "#490f0f",
		}),
		scarletRobin: new BirdType("Scarlet Robin",
			"Native to Australia, this striking robin can be found in Eucalyptus forests.", {
			[SPRITE.FOOT]: "#494949",
			[SPRITE.FACE]: "#3d3d3d",
			[SPRITE.BELLY]: "#fc5633",
			[SPRITE.UNDERBELLY]: "#dcdcdc",
			[SPRITE.WING]: "#2b2b2b",
			[SPRITE.WING_EDGE]: "#ebebeb",
			[SPRITE.THEME_HIGHLIGHT]: "#fc5633",
		}),
		americanRobin: new BirdType("American Robin",
			"While not a true robin, this social North American bird is so named due to its orange coloring. It seems unbothered by nearby humans.", {
			[SPRITE.BEAK]: "#e89f30",
			[SPRITE.FOOT]: "#9f8075",
			[SPRITE.FACE]: "#2d2d2d",
			[SPRITE.BELLY]: "#eb7a3a",
			[SPRITE.UNDERBELLY]: "#eb7a3a",
			[SPRITE.WING]: "#444444",
			[SPRITE.WING_EDGE]: "#232323",
			[SPRITE.THEME_HIGHLIGHT]: "#eb7a3a",
		}),
		carolinaWren: new BirdType("Carolina Wren",
			"Native to the eastern United States, these little birds are known for their curious and energetic nature.", {
			[SPRITE.FOOT]: "#af8e75",
			[SPRITE.FACE]: "#edc7a9",
			[SPRITE.NOSE]: "#f7eee5",
			[SPRITE.HOOD]: "#c58a5b",
			[SPRITE.BELLY]: "#e1b796",
			[SPRITE.UNDERBELLY]: "#c79e7c",
			[SPRITE.WING]: "#c58a5b",
			[SPRITE.WING_EDGE]: "#866348",
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
					this.pixels.unshift(new Array(this.pixels[0].length).fill(SPRITE.TRANSPARENT));
				}
				// Combine layers
				for (let i = 1; i < layers.length; i++) {
					if (layers[i].tag === "default" || layers[i].tag === tag) {
						let layerPixels = layers[i].pixels;
						let topMargin = maxHeight - layerPixels.length;
						for (let y = 0; y < layerPixels.length; y++) {
							for (let x = 0; x < layerPixels[y].length; x++) {
								this.pixels[y + topMargin][x] = layerPixels[y][x] !== SPRITE.TRANSPARENT ? layerPixels[y][x] : this.pixels[y + topMargin][x];
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
		}

		getAnimationDuration() {
			return this.durations.reduce((a, b) => a + b, 0);
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
			let time = Date.now() - timeStart;
			const duration = this.getAnimationDuration();
			if (this.loop) {
				time %= duration;
			}
			let totalDuration = 0;
			for (let i = 0; i < this.durations.length; i++) {
				totalDuration += this.durations[i];
				if (time < totalDuration) {
					this.frames[i].draw(ctx, direction, canvasPixelSize, species);
					return false;
				}
			}
			// Draw the last frame if the animation is complete
			this.frames[this.frames.length - 1].draw(ctx, direction, canvasPixelSize, species);
			return true;
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
				base: new Layer(getLayer(spriteSheet, 0, this.spriteWidth)),
				down: new Layer(getLayer(spriteSheet, 1, this.spriteWidth)),
				heartOne: new Layer(getLayer(spriteSheet, 2, this.spriteWidth)),
				heartTwo: new Layer(getLayer(spriteSheet, 3, this.spriteWidth)),
				heartThree: new Layer(getLayer(spriteSheet, 4, this.spriteWidth)),
				tuftBase: new Layer(getLayer(spriteSheet, 5, this.spriteWidth), "tuft"),
				tuftDown: new Layer(getLayer(spriteSheet, 6, this.spriteWidth), "tuft"),
				wingsUp: new Layer(getLayer(spriteSheet, 7, this.spriteWidth)),
				wingsDown: new Layer(getLayer(spriteSheet, 8, this.spriteWidth)),
				happyEye: new Layer(getLayer(spriteSheet, 9, this.spriteWidth)),
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
	 * @param {StickyNote} stickyNote
	 * @returns {boolean} Whether the given sticky note is applicable to the current site/page
	 */
	function isStickyNoteApplicable(stickyNote) {
		const stickyNoteUrl = stickyNote.site;
		const currentUrl = window.location.href;
		const stickyNoteWebsite = stickyNoteUrl.split("?")[0];
		const currentWebsite = currentUrl.split("?")[0];

		if (stickyNoteWebsite !== currentWebsite) {
			return false;
		}

		const stickyNoteParams = parseUrlParams(stickyNoteUrl);
		const currentParams = parseUrlParams(currentUrl);

		if (window.location.hostname === "www.youtube.com") {
			if (currentParams.v !== undefined && currentParams.v !== stickyNoteParams.v) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @param {StickyNote} stickyNote
	 * @param {() => void} onSave
	 * @param {() => void} onDelete
	 * @returns {HTMLElement}
	 */
	function renderStickyNote(stickyNote, onSave, onDelete) {
		let html = `
		<div class="birb-window-header">
			<div class="birb-window-title">Sticky Note</div>
			<div class="birb-window-close">x</div>
		</div>
		<div class="birb-window-content">
			<textarea class="birb-sticky-note-input" style="width: 150px;" placeholder="Write your notes here and they'll stick to the page!">${stickyNote.content}</textarea>
		</div>`;
		const noteElement = makeElement("birb-window");
		noteElement.classList.add("birb-sticky-note");
		noteElement.innerHTML = html;

		noteElement.style.top = `${stickyNote.top}px`;
		noteElement.style.left = `${stickyNote.left}px`;
		document.body.appendChild(noteElement);

		makeDraggable(noteElement.querySelector(".birb-window-header"), true, (top, left) => {
			stickyNote.top = top;
			stickyNote.left = left;
			onSave();
		});

		const closeButton = noteElement.querySelector(".birb-window-close");
		if (closeButton) {
			makeClosable(() => {
				if (confirm("Are you sure you want to delete this sticky note?")) {
					onDelete();
					noteElement.remove();
				}
			}, closeButton);
		}

		const textarea = noteElement.querySelector(".birb-sticky-note-input");
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
		for (let stickyNote of stickyNotes) {
			if (isStickyNoteApplicable(stickyNote)) {
				renderStickyNote(stickyNote, onSave, () => onDelete(stickyNote));
			}
		}
	}

	/**
	 * @param {StickyNote[]} stickyNotes
	 * @param {() => void} onSave
	 * @param {(note: StickyNote) => void} onDelete
	 */
	function createNewStickyNote(stickyNotes, onSave, onDelete) {
		const id = Date.now().toString();
		const site = window.location.href;
		const stickyNote = new StickyNote(id, site, "");
		const element = renderStickyNote(stickyNote, onSave, () => onDelete(stickyNote));
		element.style.left = `${window.innerWidth / 2 - element.offsetWidth / 2}px`;
		element.style.top = `${window.scrollY + window.innerHeight / 2 - element.offsetHeight / 2}px`;
		stickyNote.top = parseInt(element.style.top, 10);
		stickyNote.left = parseInt(element.style.left, 10);
		stickyNotes.push(stickyNote);
		onSave();
	}

	const MENU_ID = "birb-menu";
	const MENU_EXIT_ID = "birb-menu-exit";

	class MenuItem {
		/**
		 * @param {string} text
		 * @param {() => void} action
		 * @param {boolean} [removeMenu]
		 * @param {boolean} [isDebug]
		 */
		constructor(text, action, removeMenu = true, isDebug = false) {
			this.text = text;
			this.action = action;
			this.removeMenu = removeMenu;
			this.isDebug = isDebug;
		}
	}

	class DebugMenuItem extends MenuItem {
		/**
		 * @param {string} text
		 * @param {() => void} action
		 */
		constructor(text, action, removeMenu = true) {
			super(text, action, removeMenu, true);
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
		let menuItem = makeElement("birb-menu-item", item.text);
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
		header.innerHTML = `<div class="birb-window-title">${title}</div>`;
		let content = makeElement("birb-window-content");
		const removeCallback = () => removeMenu();
		for (const item of menuItems) {
			if (!item.isDebug || isDebug()) {
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
		content.innerHTML = "";
		const removeCallback = () => removeMenu();
		for (const item of menuItems) {
			if (!item.isDebug || isDebug()) {
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
		birbMode: false
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
	const STYLESHEET = `:root {
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
	width: 340px;
}

.birb-grid-content {
	width: 100%;
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	flex-direction: row;
	padding-top: 4px;
	padding-bottom: 4px;
	padding-left: 10px;
	padding-right: 10px;
	box-sizing: border-box;
}

.birb-grid-item {
	width: 64px;
	height: 64px;
	overflow: hidden;
	margin-top: 6px;
	margin-bottom: 6px;
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
	transform: scale(2);
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
	width: calc(100% - 20px);
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
	width: 100%;
	margin-top: 10px;
	padding: 8px;
	padding-top: 4px;
	padding-bottom: 4px;
	font-size: 14px;
	color: rgb(124, 108, 75);
}

.birb-sticky-note {
	position: absolute;
	box-sizing: border-box;
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

.birb-sticky-note-input:focus {
	outline: none;
}`;
	const SPRITE_SHEET = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAAgCAYAAABjE6FEAAAAAXNSR0IArs4c6QAABD5JREFUeJztnTFrFEEYht9JLAJidwju2YpdBAvzAyIWaXJXpRS0MBCwEBTJDwghhaAgGLTSyupMY2UqG9PYWQRb7yJyYJEIacxnkZ11bm5n9+7Y3Zm9ex8Imezd7Te7O9+zM7N7G4AQQgghhBBCCJkJlO8KkPAREXG9ppRiGyK1hY23BvgUkI7dbjYBAJ1ud6BcRR0IITOKxLSiSFpRNFTOkmNR8VtRJF8WF0U2NobKZccnpEzmfFeA5NNuNvG00UCn3R4qV8nB58942mgkZULqDgVYI3wJqNPtYrvfH1i23e8nQ2BCCCkFcwj8ZXEx+alqCJxWhypjE0ICQFKoOrZPAZl1oPwImTFE5Hzy3/hddXzfAvIhf0LK5ILvCtSNgxs3vMRVSikREZ+3nvB2F0JmFN3z0b0/9oKqx9cUBJleeEYfAzPp2BuqFr3v9W4XkcqPgS1dtoEZIe0CAM/AxAOy220JAG/zn3HsoNs/83R0cu8DNM+85g9yvqJVJBQwAYDdbksXvcx/KqWSOoTW+7Pzwkee1pHMiyDmzjQaH/QyETHfU0qDsIc+xnKIiITWEEl5PGh+8HqsfQp4FMxUWNvpJcvoPzdOAZriOVy7DzwCdm6/SV7f7bYH5mPKkFEIAiZE41vAGYhSKpHetHNlXsnRXynkWDhXIiIydzEaWHbveQ8f1+ew8uoMAHDy+wgA8P5JNHCWKUJGQwLGoIBvrbTxoPlBv7ewuITUDHGJ7/uPY3x9cd3LBaOyuDKvZOXVGT6uz6EICWYKELGA7r9O70JrASKWIAwZpQYb4yD4FjAJm7Wdnrx/Es36cc6VX6jD9VBwDoH1jbeu1035wZpzSGOSYfLZn96QgLX87Nj2cNy1TaPGJuFwurcsC6v7SpcBYGHVr/x8C3htp+d1Ys8VP+4I1SbPMisaCwune8vY+PUJAPDy8m0AwN3DdyMF+P7jGAAm6orr+Gk9UFvAGt0TTVkXQAnWlv/i26/8+KULuPp6mLgEZOZbySJy9j7rJMGRBWizsLqPmw8Pce3qpdTPWgdiIgH5FjAhmlDEpzndWxYzB+x8q0BA4sr/mRAgDAmmYYsPE/S+fAuYkJDpby3JxoUOMDjyqap9OwWIGkkwV4CI5/VsCZ18OwEANDYPXJ/9H2RC6fgWMCGh099aShr4nZ9vgfO2712C5oXJkPMut2JpEtLyS6OxeVDYhvsWMCEkF9GdEFuEWoIh599Ij8OKNwL9raXM9xUpP2RciTYFbNep6DoQQjJRX19cP084hwhDJleAWkJ5EixTPDo2UoRXVR0IIU4UzofeAyKcKsynYXSePU6eiqHLZT6gwPqid2r8sutACMnHfmJO6Pk41n+FU0qh8+xx8rdZRom9Lr3erPjs+RESBvGXEYAa5ONYj8Q3h6J2uQry4oe+swmZduqWg2Pfl+dcUQUb7js+IWS6+Ac8zd6eLzTjoQAAAABJRU5ErkJggg==";
	const FEATHER_SPRITE_SHEET = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAARhJREFUWIXtlbENwjAQRf8hSiZIRQ+9WQNRUFIAKzACBSsAA1Ag1mAABqCCBomG3hQQ9OMEx4ZDNH5SikSJ3/fZ5wCJRCKRSPwZ0RzMWmtLAhGvQyUAi9mXP/aFaGjJRQQiguHihMvcFMJUVUYlAMuHixPGy4en1WmVQqgHYHkuZjiEj6a2/LjtYzTY0eiZbgC37Mxh1UN3sn/dr6cCz/LHB/DJj9s+2oMdbtdz6TtfFwQHcMvOInfmQNjsgchNWLXmdfK6gyioAu/6uKrsm1kWLAciKuCuey5nYuXAh234bdmZ6INIUw4E/Ix49xtjCmXfzLL8nY/ktdgnAKwxxgIoXIyqmAOwvIqfiN0ALNd21HYBO9XXGMAdnZTYyHWzWjQAAAAASUVORK5CYII=";

	// Element IDs
	const FIELD_GUIDE_ID = "birb-field-guide";
	const FEATHER_ID = "birb-feather";

	const DEFAULT_BIRD = "bluebird";

	// Birb movement
	const HOP_SPEED = 0.07;
	const FLY_SPEED = isMobile() ? 0.125 : 0.25;
	const HOP_DISTANCE = 45;

	// Timing constants (in milliseconds)
	const UPDATE_INTERVAL = 1000 / 60; // 60 FPS
	const AFK_TIME = isDebug() ? 0 : 1000 * 30;
	const PET_BOOST_DURATION = 1000 * 60 * 5;
	const PET_MENU_COOLDOWN = 1000;
	const URL_CHECK_INTERVAL = 500;

	// Random event chances per tick
	const HOP_CHANCE = 1 / (60 * 3); // Every 3 seconds
	const FOCUS_SWITCH_CHANCE = 1 / (60 * 20); // Every 20 seconds
	const FEATHER_CHANCE = 1 / (60 * 60 * 60 * 2); // Every 2 hours

	// Feathers
	const FEATHER_FALL_SPEED = 1;
	const PET_FEATHER_BOOST = 2;

	// Focus element constraints
	const MIN_FOCUS_ELEMENT_WIDTH = 100;
	const MIN_FOCUS_ELEMENT_TOP = 80;

	/** @type {Partial<Settings>} */
	let userSettings = {};

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
							row.push(SPRITE.TRANSPARENT);
							continue;
						}
						const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
						if (!templateColors) {
							row.push(hex);
							continue;
						}
						if (SPRITE_SHEET_COLOR_MAP[hex] === undefined) {
							error(`Unknown color: ${hex}`);
							row.push(SPRITE.TRANSPARENT);
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

	log("Loading sprite sheets...");

	Promise.all([
		loadSpriteSheetPixels(SPRITE_SHEET),
		loadSpriteSheetPixels(FEATHER_SPRITE_SHEET)
	]).then(([birbPixels, featherPixels]) => {

		const SPRITE_SHEET = birbPixels;
		const FEATHER_SPRITE_SHEET = featherPixels;

		const featherLayers = {
			feather: new Layer(getLayer(FEATHER_SPRITE_SHEET, 0, FEATHER_SPRITE_WIDTH)),
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
			new MenuItem("Sticky Note", () => createNewStickyNote(stickyNotes, save, deleteStickyNote)),
			new MenuItem(`Hide ${birdBirb()}`, hideBirb),
			new DebugMenuItem("Freeze/Unfreeze", () => {
				frozen = !frozen;
			}),
			new DebugMenuItem("Reset Data", resetSaveData),
			new DebugMenuItem("Unlock All", () => {
				for (let type in SPECIES) {
					unlockBird(type);
				}
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
			new MenuItem("Toggle Birb Mode", () => {
				userSettings.birbMode = !userSettings.birbMode;
				save();
				insertModal(`${birdBirb()} Mode`, `Your ${birdBirb().toLowerCase()} shall now be referred to as "${birdBirb()}"${userSettings.birbMode ? "\n\nWelcome back to 2012" : ""}`);
			})
		];

		const styleElement = document.createElement("style");

		/** @type {Birb} */
		let birb;

		const States = {
			IDLE: "idle",
			HOP: "hop",
			FLYING: "flying",
		};

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
		let visible = true;
		let lastPetTimestamp = 0;
		/** @type {StickyNote[]} */
		let stickyNotes = [];

		/**
		 * @returns {boolean} Whether the script is running in a userscript extension context
		 */
		function isUserScript() {
			// @ts-expect-error
			return typeof GM_getValue === "function";
		}

		function isTestEnvironment() {
			return window.location.hostname === "127.0.0.1"
				|| window.location.hostname === "localhost"
				|| window.location.hostname.startsWith("192.168.");
		}

		function load() {
			/** @type {Record<string, any>} */
			let saveData = {};

			if (isUserScript()) {
				log("Loading save data from UserScript storage");
				// @ts-expect-error
				saveData = GM_getValue("birbSaveData", {}) ?? {};
			} else if (isTestEnvironment()) {
				log("Test environment detected, loading save data from localStorage");
				saveData = JSON.parse(localStorage.getItem("birbSaveData") ?? "{}");
			} else {
				log("Not a UserScript");
			}

			debug("Loaded data: " + JSON.stringify(saveData));

			if (!saveData.settings) {
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

			if (isUserScript()) {
				log("Saving data to UserScript storage");
				// @ts-expect-error
				GM_setValue("birbSaveData", saveData);
			} else if (isTestEnvironment()) {
				log("Test environment detected, saving data to localStorage");
				localStorage.setItem("birbSaveData", JSON.stringify(saveData));
			} else {
				log("Not a UserScript");
			}
		}

		function resetSaveData() {
			if (isUserScript()) {
				log("Resetting save data in UserScript storage");
				// @ts-expect-error
				GM_deleteValue("birbSaveData");
			} else if (isTestEnvironment()) {
				log("Test environment detected, resetting save data in localStorage");
				localStorage.removeItem("birbSaveData");
			} else {
				log("Not a UserScript");
			}
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
		function birdBirb() {
			return settings().birbMode ? "Birb" : "Bird";
		}

		function init() {
			if (window !== window.top) {
				// Skip installation if within an iframe
				log("In iframe, skipping Birb script initialization");
				return;
			}
			log("Sprite sheets loaded successfully, initializing bird...");

			// Preload font
			const MONOCRAFT_SRC = "https://cdn.jsdelivr.net/gh/idreesinc/Monocraft@99b32ab40612ff2533a69d8f14bd8b3d9e604456/dist/Monocraft.otf";
			const fontLink = document.createElement("link");
			fontLink.rel = "stylesheet";
			fontLink.href = `url(${MONOCRAFT_SRC}) format('opentype')`;
			document.head.appendChild(fontLink);

			// Add stylesheet font-face
			const fontFace = `
			@font-face {
				font-family: 'Monocraft';
				src: url(${MONOCRAFT_SRC}) format('opentype');
				font-weight: normal;
				font-style: normal;
			}
		`;
			const fontStyle = document.createElement("style");
			fontStyle.innerHTML = fontFace;
			document.head.appendChild(fontStyle);

			load();

			styleElement.innerHTML = STYLESHEET;
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

			let lastUrl = (window.location.href ?? "").split("?")[0];
			setInterval(() => {
				const currentUrl = (window.location.href ?? "").split("?")[0];
				if (currentUrl !== lastUrl) {
					log("URL changed, updating sticky notes");
					lastUrl = currentUrl;
					drawStickyNotes(stickyNotes, save, deleteStickyNote);
				}
			}, URL_CHECK_INTERVAL);

			setInterval(update, UPDATE_INTERVAL);
		}

		function update() {
			ticks++;

			// Hide bird if the browser is fullscreen
			if (document.fullscreenElement) {
				hideBirb();
				// Won't be restored on fullscreen exit
			}

			if (currentState === States.IDLE && !frozen && !isMenuOpen()) {
				if (Math.random() < HOP_CHANCE && birb.getCurrentAnimation() !== Animations.HEART) {
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
			if (visible && Math.random() < FEATHER_CHANCE * petMod) {
				lastPetTimestamp = 0;
				activateFeather();
			}
			updateFeather();
		}

		function draw() {
			requestAnimationFrame(draw);

			if (!birb.isVisible()) {
				return;
			}

			updateFocusedElementBounds();

			// Update the bird's position
			if (currentState === States.IDLE) {
				if (focusedElement && !isWithinHorizontalBounds()) {
					focusOnGround();
				}
				birdY = getFocusedY();
			} else if (currentState === States.FLYING) {
				// Fly to target location (even if in the air)
				if (updateParabolicPath(FLY_SPEED)) {
					setState(States.IDLE);
				}
			}

			const oldTargetY = targetY;
			targetY = getFocusedY();
			// Adjust startY to account for scrolling
			startY += targetY - oldTargetY;
			if (targetY < 0 || targetY > window.innerHeight) {
				// Fly to ground if the focused element moves out of bounds
				focusOnGround();
			}

			if (birb.draw(SPECIES[currentSpecies])) {
				birb.setAnimation(Animations.STILL);
			}

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
		 * @param {string} contentHtml
		 * @param {() => void} [onClose]
		 * @returns {HTMLElement}
		 */
		function createWindow(id, title, contentHtml, onClose) {
			const window = makeElement("birb-window", undefined, id);
			window.innerHTML = `
			<div class="birb-window-header">
				<div class="birb-window-title">${title}</div>
				<div class="birb-window-close">x</div>
			</div>
			<div class="birb-window-content">
				${contentHtml}
			</div>
		`;

			document.body.appendChild(window);
			makeDraggable(window.querySelector(".birb-window-header"));

			const closeButton = window.querySelector(".birb-window-close");
			if (closeButton) {
				makeClosable(() => {
					window.remove();
				}, closeButton);
			}

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
				insertModal("New Bird Unlocked!", `You've found a <b>${SPECIES[birdType].name}</b> feather! Use the Field Guide to switch your bird's species.`);
			}
			save();
		}

		function updateFeather() {
			const feather = document.querySelector("#birb-feather");
			if (!feather || !(feather instanceof HTMLElement)) {
				return;
			}
			const y = parseInt(feather.style.top || "0") + FEATHER_FALL_SPEED;
			feather.style.top = `${Math.min(y, window.innerHeight - feather.offsetHeight)}px`;
			if (y < window.innerHeight - feather.offsetHeight) {
				feather.style.left = `${Math.sin(3.14 * 2 * (ticks / 120)) * 25}px`;
			}
		}

		/**
		 * @param {HTMLElement} element
		 */
		function centerElement(element) {
			element.style.left = `${window.innerWidth / 2 - element.offsetWidth / 2}px`;
			element.style.top = `${window.innerHeight / 2 - element.offsetHeight / 2}px`;
		}

		/**
		 * @param {string} title
		 * @param {string} message
		 */
		function insertModal(title, message) {
			if (document.querySelector("#" + FIELD_GUIDE_ID)) {
				return;
			}

			const modal = createWindow("birb-modal", title, `
			<div class="birb-message-content">
				${message}
			</div>
		`);

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
			if (y > window.innerHeight / 2) {
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
			let html = `
			<div class="birb-window-header">
				<div class="birb-window-title">Field Guide</div>
				<div class="birb-window-close">x</div>
			</div>
			<div class="birb-window-content">
				<div class="birb-grid-content"></div>
				<div class="birb-field-guide-description"></div>
			</div>`;
			const fieldGuide = makeElement("birb-window", undefined, FIELD_GUIDE_ID);
			fieldGuide.innerHTML = html;
			document.body.appendChild(fieldGuide);
			makeDraggable(fieldGuide.querySelector(".birb-window-header"));

			const closeButton = fieldGuide.querySelector(".birb-window-close");
			if (closeButton) {
				makeClosable(() => {
					fieldGuide.remove();
				}, closeButton);
			}

			const content = fieldGuide.querySelector(".birb-grid-content");
			if (!content) {
				return;
			}
			content.innerHTML = "";

			const generateDescription = (/** @type {string} */ speciesId) => {
				const type = SPECIES[speciesId];
				const unlocked = unlockedSpecies.includes(speciesId);
				return "<b>" + type.name + "</b><div style='height: 0.3em'></div>" + (!unlocked ? "Not yet unlocked" : type.description);
			};

			const description = fieldGuide.querySelector(".birb-field-guide-description");
			if (!description) {
				return;
			}
			description.innerHTML = generateDescription(currentSpecies);
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
					log("mouseover");
					description.innerHTML = generateDescription(id);
				});
				speciesElement.addEventListener("mouseout", () => {
					description.innerHTML = generateDescription(currentSpecies);
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
			document.documentElement.style.setProperty("--birb-highlight", SPECIES[type].colors[SPRITE.THEME_HIGHLIGHT]);
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
			return getFullWindowHeight() - focusedBounds.top;
		}

		/**
		 * @returns The render-safe height of the inner browser window
		 */
		function getSafeWindowHeight() {
			// Necessary because iOS 26 Safari is terrible and won't render
			// fixed elements behind the address bar
			return window.innerHeight;
		}

		/**
		 * @returns The true height of the inner browser window
		 */
		function getFullWindowHeight() {
			return document.documentElement.clientHeight;
		}

		function focusOnGround() {
			focusedElement = null;
			focusedBounds = { left: 0, right: window.innerWidth, top: getSafeWindowHeight() };
			flyTo(Math.random() * window.innerWidth, 0);
		}

		function focusOnElement() {
			if (frozen) {
				return;
			}
			const elements = document.querySelectorAll("img, video");
			const inWindow = Array.from(elements).filter((img) => {
				const rect = img.getBoundingClientRect();
				return rect.left >= 0 && rect.top >= MIN_FOCUS_ELEMENT_TOP && rect.right <= window.innerWidth && rect.top <= window.innerHeight;
			});
			/** @type {HTMLElement[]} */
			// @ts-expect-error
			const largeElements = Array.from(inWindow).filter((img) => img instanceof HTMLElement && img !== focusedElement && img.offsetWidth >= MIN_FOCUS_ELEMENT_WIDTH);
			if (largeElements.length === 0) {
				return;
			}
			const randomElement = largeElements[Math.floor(Math.random() * largeElements.length)];
			focusedElement = randomElement;
			log("Focusing on element: ", focusedElement);
			updateFocusedElementBounds();
			flyTo(getFocusedElementRandomX(), getFocusedY());
		}

		function updateFocusedElementBounds() {
			if (focusedElement === null) {
				// Update ground location to bottom of window
				focusedBounds = { left: 0, right: window.innerWidth, top: getFullWindowHeight() };
				return;
			}
			const { left, right, top } = focusedElement.getBoundingClientRect();
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
				birb.setAnimation(Animations.HEART);
				lastPetTimestamp = Date.now();
			}
		}

		function hideBirb() {
			birb.setVisible(false);
			visible = false;
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
			setY(birdY);
		}

		/**
		 * @param {number} y
		 */
		function setY(y) {
			birb.setY(y);
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
	}).catch((e) => {
		error("Error while loading sprite sheets: ", e);
	});

})();
