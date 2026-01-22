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

	const TAG = {
		DEFAULT: "default",
		TUFT: "tuft",
	};

	class Layer {
		/**
		 * @param {string[][]} pixels
		 * @param {string} [tag]
		 */
		constructor(pixels, tag = TAG.DEFAULT) {
			this.pixels = pixels;
			this.tag = tag;
		}
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
		"#fff000": PALETTE.THEME_HIGHLIGHT,
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
			[PALETTE.THEME_HIGHLIGHT]: "#b9abcf",
		}, [TAG.TUFT]),
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
		}, [TAG.TUFT]),
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
		 * @param {string[]} [tags]
		 * @returns {string[][]}
		 */
		getPixels(tags = [TAG.DEFAULT]) {
			for (let i = tags.length - 1; i >= 0; i--) {
				const tag = tags[i];
				if (this.#pixelsByTag[tag]) {
					return this.#pixelsByTag[tag];
				}
			}
			return this.#pixelsByTag[TAG.DEFAULT];
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
			
			const pixels = this.getPixels(tags);
			for (let y = 0; y < pixels.length; y++) {
				const row = pixels[y];
				for (let x = 0; x < pixels[y].length; x++) {
					const cell = direction === Directions.LEFT ? row[x] : row[pixels[y].length - x - 1];
					ctx.fillStyle = colorScheme[cell] ?? cell;
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
		 * @param {{ [key: string]: string }} colorScheme The color scheme to use for the animation
		 * @param {string[]} tags The tags to use for the animation
		 * @returns {boolean} Whether the animation is complete
		 */
		draw(ctx, direction, timeStart, canvasPixelSize, colorScheme, tags) {
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
				this.frames[currentFrameIndex].draw(ctx, direction, canvasPixelSize, colorScheme, tags);
				this.lastFrameIndex = currentFrameIndex;
				this.lastDirection = direction;
			}
			
			// Return whether animation is complete (for non-looping animations)
			return !this.loop && time >= duration;
		}
	}

	const HAT_WIDTH = 12;

	const HAT = {
		NONE: "none",
		TOP_HAT: "top-hat",
		VIKING_HELMET: "viking-helmet",
		COWBOY_HAT: "cowboy-hat",
		BOWLER_HAT: "bowler-hat",
		FEZ: "fez",
		WIZARD_HAT: "wizard-hat",
		BASEBALL_CAP: "baseball-cap",
		FLOWER_HAT: "flower-hat"
	};

	/** @type {{ [hatId: string]: { name: string, description: string } }} */
	const HAT_METADATA = {
		[HAT.NONE]: {
			name: "Invisible Hat",
			description: "It's like you're wearing nothing at all!"
		},
		[HAT.TOP_HAT]: {
			name: "Top Hat",
			description: "The mark of a true gentlebird."
		},
		[HAT.VIKING_HELMET]: {
			name: "Viking Helmet",
			description: "Sure, vikings never actually wore this style of helmet, but why let facts get in the way of good fashion?"
		},
		[HAT.COWBOY_HAT]: {
			name: "Cowboy Hat",
			description: "You can't jam with the console cowboys without the appropriate attire."
		},
		[HAT.BOWLER_HAT]: {
			name: "Bowler Hat",
			description: "For that authentic, Victorian look!"
		},
		[HAT.FEZ]: {
			name: "Fez",
			description: "It's a fez. Fezzes are cool."
		},
		[HAT.WIZARD_HAT]: {
			name: "Wizard Hat",
			description: "Grants the bearer terrifying mystical power, but luckily birds only use it to summon old ladies with bread crumbs."
		},
		[HAT.BASEBALL_CAP]: {
			name: "Baseball Cap",
			description: "Birds unfortunately only ever hit 'fowl' balls..."
		},
		[HAT.FLOWER_HAT]: {
			name: "Flower Hat",
			description: "To be fair, this is less of a hat and more of a dirt clod that your pet happened to pick up."
		}
	};

	/**
	 * @param {string[][]} spriteSheet 
	 * @returns {{ base: Layer[], down: Layer[] }}
	 */
	function createHatLayers(spriteSheet) {
		const hatLayers = {
			base: [],
			down: []
		};
		for (let i = 0; i < Object.keys(HAT).length; i++) {
			const hatName = Object.keys(HAT)[i];
			if (hatName === 'NONE') {
				continue;
			}
			const index = i - 1;
			const hatKey = HAT[hatName];
			const hatLayer = buildHatLayer(spriteSheet, hatKey, index);
			const downHatLayer = buildHatLayer(spriteSheet, hatKey, index, 1);
			hatLayers.base.push(hatLayer);
			hatLayers.down.push(downHatLayer);
		}
		return hatLayers;
	}

	/**
	 * @param {string[][]} spriteSheet
	 * @param {string} hatId 
	 * @returns {Anim}
	 */
	function createHatItemAnimation(hatId, spriteSheet) {
		const hatLayer = buildHatItemLayer(spriteSheet, hatId);
		const frames = [
			new Frame([hatLayer])
		];
		return new Anim(frames, [1000], true);
	}

	/**
	 * @param {string[][]} spriteSheet 
	 * @param {string} hatName
	 * @param {number} hatIndex
	 * @param {number} [yOffset=0]
	 * @returns {Layer}
	 */
	function buildHatLayer(spriteSheet, hatName, hatIndex, yOffset = 0) {
		const LEFT_PADDING = 6;
		const RIGHT_PADDING = 14;
		const TOP_PADDING = 5 + yOffset;
		const BOTTOM_PADDING = Math.max(0, 15 - yOffset);

		let hatPixels = getLayerPixels(spriteSheet, hatIndex, HAT_WIDTH);
		hatPixels = pad(hatPixels, TOP_PADDING, BOTTOM_PADDING, LEFT_PADDING, RIGHT_PADDING);
		hatPixels = drawOutline(hatPixels, false);

		return new Layer(hatPixels, hatName);
	}

	/**
	 * @param {string[][]} spriteSheet 
	 * @param {string} hatId 
	 * @returns {Layer}
	 */
	function buildHatItemLayer(spriteSheet, hatId) {
		if (hatId === HAT.NONE) {
			return new Layer([], TAG.DEFAULT);
		}
		const hatIndex = Object.values(HAT).indexOf(hatId) - 1;
		let hatPixels = getLayerPixels(spriteSheet, hatIndex, HAT_WIDTH);
		hatPixels = pad(hatPixels, 1, 1, 1, 1);
		hatPixels = drawOutline(hatPixels, true);
		hatPixels = pushToBottom(hatPixels);
		return new Layer(hatPixels, TAG.DEFAULT);
	}

	/**
	 * Add transparent padding around the pixel array
	 * @param {string[][]} pixels 
	 * @param {number} top 
	 * @param {number} bottom 
	 * @param {number} left 
	 * @param {number} right 
	 * @returns {string[][]}
	 */
	function pad(pixels, top, bottom, left, right) {
		const paddedPixels = [];
		const rowLength = pixels[0].length + left + right;
		// Top padding
		for (let y = 0; y < top; y++) {
			paddedPixels.push(Array(rowLength).fill(PALETTE.TRANSPARENT));
		}
		// Left and right padding
		for (let y = 0; y < pixels.length; y++) {
			const row = [];
			for (let x = 0; x < left; x++) {
				row.push(PALETTE.TRANSPARENT);
			}
			for (let x = 0; x < pixels[y].length; x++) {
				row.push(pixels[y][x]);
			}
			for (let x = 0; x < right; x++) {
				row.push(PALETTE.TRANSPARENT);
			}
			paddedPixels.push(row);
		}
		// Bottom padding
		for (let y = 0; y < bottom; y++) {
			paddedPixels.push(Array(rowLength).fill(PALETTE.TRANSPARENT));
		}
		return paddedPixels;
	}

	/**
	 * Draw an outline around non-transparent pixels
	 * @param {string[][]} pixels 
	 * @param {boolean} [outlineBottom=false]
	 * @return {string[][]}
	 */
	function drawOutline(pixels, outlineBottom = false) {
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
		for (let y = 0; y < pixels.length; y++) {
			for (let x = 0; x < pixels[y].length; x++) {
				const pixel = pixels[y][x];
				if (pixel !== PALETTE.TRANSPARENT && pixel !== PALETTE.BORDER) {
					for (let [dx, dy] of neighborOffsets) {
						const newX = x + dx;
						const newY = y + dy;
						if (newY >= 0 && newY < pixels.length && newX >= 0 && newX < pixels[newY].length && pixels[newY][newX] === PALETTE.TRANSPARENT) {
							pixels[newY][newX] = PALETTE.BORDER;
						}
					}
				}
			}
		}
		return pixels;
	}

	/**
	 * Trim transparent rows from the bottom and push them to the top
	 * @param {string[][]} pixels
	 * @returns {string[][]}
	 */
	function pushToBottom(pixels) {
		let trimmedPixels = pixels.slice();
		let trimCount = 0;
		while (trimmedPixels.length > 1) {
			const firstRow = trimmedPixels[trimmedPixels.length - 1];
			if (firstRow.every(pixel => pixel === PALETTE.TRANSPARENT)) {
				trimmedPixels.pop();
				trimCount++;
			} else {
				break;
			}
		}
		trimmedPixels = pad(trimmedPixels, trimCount, 0, 0, 0);
		return trimmedPixels;
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
		 * @param {BirdType} species The species data
		 * @param {string} [hat] The name of the current hat
		 * @returns {boolean} Whether the animation has completed (for non-looping animations)
		 */
		draw(species, hat) {
			const anim = this.animations[this.currentAnimation];
			return anim.draw(this.ctx, this.direction, this.animStart, this.canvasPixelSize, species.colors, [...species.tags, hat || '']);
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

	const SAVE_KEY = "birbSaveData";

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

	class LocalContext extends Context {

		/**
		 * @override
		 * @returns {Promise<BirbSaveData|{}>}
		 */
		async getSaveData() {
			log("Loading save data from localStorage");
			return JSON.parse(localStorage.getItem(SAVE_KEY) ?? "{}");
		}

		/**
		 * @override
		 * @param {BirbSaveData} saveData
		 */
		async putSaveData(saveData) {
			log("Saving data to localStorage");
			localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
		}

		/** @override */
		resetSaveData() {
			log("Resetting save data in localStorage");
			localStorage.removeItem(SAVE_KEY);
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
	 * @property {string[]} unlockedHats
	 * @property {string} currentHat
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
	src: url("https://cdn.jsdelivr.net/gh/idreesinc/Monocraft@99b32ab40612ff2533a69d8f14bd8b3d9e604456/dist/Monocraft.otf") format('opentype');
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

.birb-item {
	image-rendering: pixelated;
	position: absolute;
	bottom: 0;
	transform: scale(calc(var(--birb-scale) * 1.5)) !important;
	transform-origin: bottom;
	transition-duration: 0.15s;
	z-index: 2147483630 !important;
	cursor: pointer;
}

.birb-item:hover {
	transform: scale(calc(var(--birb-scale) * 1.9)) !important;
	transition-duration: 0.15s;
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

#birb-wardrobe {
	width: calc(322px - 64px - 14px) !important;
}

#birb-field-guide .birb-grid-content {
	grid-template-rows: repeat(3, auto);
}

#birb-wardrobe .birb-grid-content {
	grid-template-columns: repeat(3, auto);
	grid-auto-flow: row;
}

.birb-grid-content {
	display: grid;
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
	const SPRITE_SHEET = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAAgCAYAAABjE6FEAAAAAXNSR0IArs4c6QAABD9JREFUeJztnT9rFEEYh3+TWATE7hDcsxW7CBbmA0Qs0uSuSiloYSBgIRhCPkCQFIKCYNBKK6szjZWpbEyTziLY5k6RAwsjpDGvRXbWubmd3btzd2c293vgyGRvb9/Z25ln39l/BxBCCCGEkOlC+a4ACR8REdd7Sim2IVJb2HhrgE8B6djtZhMA0Ol2B8pV1IEQMqVITCuKpBVFQ+UsORYVvxVF8nl+XmRtbahcdnxCymTGdwVIPu1mExuNBjrt9lC5SvY/fcJGo5GUCak7FGCN8CWgTreLJ/3+wLQn/X4yBCaEkFIwh8Cf5+eTV1VD4LQ6VBmbEBIAkkLVsX0KyKwD5UfIlCEiZwf/jb9Vx/ctIB/yJ6RMLviuQN3Yv3HDS1yllBIR8XnpCS93IWRK0ZmPzv6YBRFSf7hHHwNTesyGqsfe6XAbkP+FDYjUAi0/7TwRqVyAFPCUknYGlENA4gHZ6bYEgLcTQHHsoNs/++no5F4Ibe55zRdy7lEtEgqYAMBOt6WLXk4AKaWSOoSW/dn9wkc/rSOZZ4HNL9NofNDTRMScp5QGYQ99jOkQEQmtIZLyeNB873Vb+xTwKJhdYWW7l0yj/9w4BWiK53DlPvAI2L79Onl/p9seOB5ThoxCEDAhGt8CzkCUUon0zjtXZpV8+yOFbAvnQkREZi5GA9PuPevhw+oMll6eAgCOf34DALxbjwb2MkXIaEjAGBTwraU2HjTf63kLi0tIzRCX+L4e/cLB8+teThiVxZVZJUsvT/FhdQZFSDBTgIgFdP9VegqtBYhYgjBklBpsjI3gW8AkbFa2e/JuPZr27Zwrv1CH66HgHALrOw9c75vyg3XMIY1Jhsmnv3tDAtbys2Pbw3HXOo0am4TDye6izC3vKV0GgLllv/LzLeCV7Z7XA3uu+HEiVJt+llnRWFg42V3E2o+PAIAXl28DAO4evh0pwNejXwAwUSqu46dloLaANToTTVkWQAnWln/i26t8+6ULuPp6mLgEZPa3kkXkzD7rJMGRBWgzt7yHmw8Pce3qpdTPWhtiIgH5FjAhmlDEpznZXRSzD9j9rQIBiav/T4UAYUgwDVt8mCD78i1gQkKmv7Ugaxc6wODIp6r27RQgaiTBXAEiPq5nS+j4yzEAoLG57/rsvyATSse3gAkJnf7WQtLA73x/A5y1fe8SNE9MhtzvciuWJiEtvzQam/uFrbhvARNCchGdhNgi1BIMuf+N9DzAeCXQ31rInK9I+SHjTLQpYLtORdeBEJKJOnh+/azDOUQYMrkC1BLKk2CZ4tGxkSK8qupACHGicDb0HhDhucJ8Gkbn6ePkqRi6XOYDCqwbvVPjl10HQkg+9hNzQu+PY/0splIKnaePk//NMkrMuvRys+Iz8yMkDOKbEYAa9MexfhPEHIra5SrIix/6l03IeadufXDs6/KcC6pgxX3HJ4ScL/4CWsLSrzMo7i0AAAAASUVORK5CYII=";
	const FEATHER_SPRITE_SHEET = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAARhJREFUWIXtlbENwjAQRf8hSiZIRQ+9WQNRUFIAKzACBSsAA1Ag1mAABqCCBomG3hQQ9OMEx4ZDNH5SikSJ3/fZ5wCJRCKRSPwZ0RzMWmtLAhGvQyUAi9mXP/aFaGjJRQQiguHihMvcFMJUVUYlAMuHixPGy4en1WmVQqgHYHkuZjiEj6a2/LjtYzTY0eiZbgC37Mxh1UN3sn/dr6cCz/LHB/DJj9s+2oMdbtdz6TtfFwQHcMvOInfmQNjsgchNWLXmdfK6gyioAu/6uKrsm1kWLAciKuCuey5nYuXAh234bdmZ6INIUw4E/Ix49xtjCmXfzLL8nY/ktdgnAKwxxgIoXIyqmAOwvIqfiN0ALNd21HYBO9XXGMAdnZTYyHWzWjQAAAAASUVORK5CYII=";
	const HATS_SPRITE_SHEET = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAAAMCAYAAACdrrgZAAAAAXNSR0IArs4c6QAAAjVJREFUWIXtl01oE1EUhb8nim0tBikKJWiioFCUFiGuRLIRigsFUSRL6y4btSoVgnQVmhZEwY0LQdClqCshuChCq2iQQu3GiIsG2kgaYyU1xcGC10WacX4yP42xFcmBgTfzztx75p77Zt5ACy200MKGQW20gP8VIiK1sVLKsc6b1k3Rvw/xwfEXqFb8stLPjTByWwZU0bTi6ygryPXoJgAMToaryQwm2AwI79gvtcNDWCNzYjiwjJuJNcfdduI5TdUSEAi/5/6P07Ba/L5QlOtvDphoja4AmZyawaGQ1jkTxsdieozb5476SmZoCF/avvX2Im8Djhqs/Eg84zO0P+jv/IBwYedTUrOH6QtFOb/nAV2dQRPX0YDc149+80lyOEVyOIXfDhofixmNcEWt8IXKPG1b2r3ii0Sj/NQ07p5s923Cy1iC7R2bfemxrGLH2MYPb2LfNAOhhwAMHXph4tmyPg5urQ46dwMQmZurmyCby3PvSZqFd9MALC6VuHL5Kj3HjpPN5euJBuDzxO943fZ5225hDY1ggzpS9qJIJJ5h750KrL6GltP94rI7FG1gFIAvhSIAwfQtNz5KKZ5dOkU2+wGlFCJiMkcfGJe4w0Nbk8iNkZu0aSssLpX0ix27ukkmrln54tTxM1NVQwYfvXLUU6jM2+7TVr7Xe+h6Hem21ZZIPEO+WGH24ghdo0Msp/vd7pHXB8/qJ59KRc4sTHjlcMWf/Ad4LW2bYX9RS6Nw0rRu2n8BRDXduO3EyKAAAAAASUVORK5CYII=";

	// Element IDs
	const FIELD_GUIDE_ID = "birb-field-guide";
	const FEATHER_ID = "birb-feather";
	const WARDROBE_ID = "birb-wardrobe";
	const HAT_ID = "birb-hat";

	const DEFAULT_BIRD = "bluebird";
	const DEFAULT_HAT = HAT.NONE;

	// Birb movement
	const HOP_SPEED = 0.07;
	const FLY_SPEED = isMobile() ? 0.175 : 0.25;
	const HOP_DISTANCE = 35;

	// Timing constants (in milliseconds)
	const UPDATE_INTERVAL = 1000 / 60; // 60 FPS
	const AFK_TIME = isDebug() ? 0 : 1000 * 5; // 5 seconds
	const SUPER_AFK_TIME = 1000 * 60 * 60; // 1 hour
	const PET_MENU_COOLDOWN = 1000;
	const URL_CHECK_INTERVAL = 150;
	const HOP_DELAY = 500;

	// Random event chances per tick
	const HOP_CHANCE = 1 / (60 * 2.5); // Every 2.5 seconds
	const FOCUS_SWITCH_CHANCE = 1 / (60 * 20); // Every 20 seconds
	const FEATHER_CHANCE = 1 / (60 * 60 * 60 * 2); // Every 2 hours
	const HAT_CHANCE = 1 / (60 * 60 * 10); // Every 10 minutes

	// Feathers
	const FEATHER_FALL_SPEED = 1;

	// Petting boosts
	const PET_BOOST_DURATION = 1000 * 60 * 5; // 5 minutes
	const PET_FEATHER_BOOST = 2;
	const PET_HAT_BOOST = 1.5;

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
		const hatsPixels = await loadSpriteSheetPixels(HATS_SPRITE_SHEET);
		startApplication(birbPixels, featherPixels, hatsPixels);
	}

	/**
	 * @param {string[][]} birbPixels
	 * @param {string[][]} featherPixels
	 * @param {string[][]} hatsPixels
	 */
	function startApplication(birbPixels, featherPixels, hatsPixels) {

		const SPRITE_SHEET = birbPixels;
		const FEATHER_SPRITE_SHEET = featherPixels;
		const HATS_SPRITE_SHEET = hatsPixels;

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
			new MenuItem("Wardrobe", insertWardrobe),
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
				for (let hat in HAT) {
					unlockHat(HAT[hat]);
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
			new MenuItem(() => `2026.1.22 ${isPetBoostActive() ? "❤" : ""}`, () => { alert("Thank you for using Pocket Bird! You are on version: 2026.1.22"); }, false),
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
		let unlockedHats = [DEFAULT_HAT];
		let currentHat = DEFAULT_HAT;
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
			unlockedHats = saveData.unlockedHats ?? [DEFAULT_HAT];
			currentHat = saveData.currentHat ?? DEFAULT_HAT;
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
			switchHat(currentHat);
		}

		function save() {
			/** @type {BirbSaveData} */
			const saveData = {
				unlockedSpecies: unlockedSpecies,
				currentSpecies: currentSpecies,
				unlockedHats: unlockedHats,
				currentHat: currentHat,
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

			birb = new Birb(BIRB_CSS_SCALE, CANVAS_PIXEL_SIZE, SPRITE_SHEET, SPRITE_WIDTH, SPRITE_HEIGHT, HATS_SPRITE_SHEET);
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
					log("Path changed from '" + lastPath + "' to '" + currentPath + "'");
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

			if (birb.isVisible() && Date.now() - lastActionTimestamp < SUPER_AFK_TIME) {
				if (Math.random() < FEATHER_CHANCE * (isPetBoostActive() ? PET_FEATHER_BOOST : 1)) {
					lastPetTimestamp = 0;
					activateFeather();
				}
				if (Math.random() < (HAT_CHANCE * (isPetBoostActive() ? PET_HAT_BOOST : 1))) {
					lastPetTimestamp = 0;
					insertHat();
				}
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

			if (birb.draw(SPECIES[currentSpecies], currentHat)) {
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
			FEATHER_ANIMATIONS.feather.draw(featherCtx, Directions.LEFT, Date.now(), CANVAS_PIXEL_SIZE, type.colors, type.tags);
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
		 * Insert the hat as an item element in the document if possible
		 */
		function insertHat() {
			if (document.querySelector("#" + HAT_ID)) {
				return;
			}
			// Select a random hat that hasn't been unlocked yet
			const availableHats = Object.values(HAT)
				.filter(hat => hat !== HAT.NONE && !unlockedHats.includes(hat));
			if (availableHats.length === 0) {
				return;
			}
			const hatId = availableHats[Math.floor(Math.random() * availableHats.length)];

			// Find a random valid element to place the hat on
			const element = getRandomValidElement();
			if (!element) {
				return;
			}

			// Create hat element
			const hatCanvas = document.createElement("canvas");
			hatCanvas.id = HAT_ID;
			hatCanvas.classList.add("birb-item");
			hatCanvas.width = 14 * CANVAS_PIXEL_SIZE;
			hatCanvas.height = 14 * CANVAS_PIXEL_SIZE;
			const hatCtx = hatCanvas.getContext("2d");
			if (!hatCtx) {
				return;
			}
			onClick(hatCanvas, () => {
				unlockHat(hatId);
				hatCanvas.remove();
			});

			// Create hat animation
			const hatAnimation = createHatItemAnimation(hatId, HATS_SPRITE_SHEET);
			hatAnimation.draw(hatCtx, Directions.LEFT, Date.now(), CANVAS_PIXEL_SIZE, SPECIES[currentSpecies].colors, [TAG.DEFAULT]);

			// Position hat above the element
			const rect = element.getBoundingClientRect();
			hatCanvas.style.left = (rect.left + rect.width / 2 - hatCanvas.width / 2) + "px";
			hatCanvas.style.top = (rect.top - hatCanvas.height + window.scrollY) + "px";

			// Append to document
			document.body.appendChild(hatCanvas);
		}

		/**
		 * @param {string} birdType
		 */
		function unlockBird(birdType) {
			if (!unlockedSpecies.includes(birdType)) {
				unlockedSpecies.push(birdType);
				save();
				const message = makeElement("birb-message-content");
				message.appendChild(document.createTextNode("You've found a "));
				const bold = document.createElement("b");
				bold.textContent = SPECIES[birdType].name;
				message.appendChild(bold);
				message.appendChild(document.createTextNode(" feather! Use the Field Guide to switch your bird's species."));
				insertModal("New Bird Unlocked!", message);
			}
		}

		/**
		 * @param {string} hatId 
		 */
		function unlockHat(hatId) {
			if (!unlockedHats.includes(hatId)) {
				unlockedHats.push(hatId);
				save();
				switchHat(hatId);
				const message = makeElement("birb-message-content");
				message.appendChild(document.createTextNode("You've unlocked the "));
				const bold = document.createElement("b");
				bold.textContent = HAT_METADATA[hatId].name;
				message.appendChild(bold);
				message.appendChild(document.createTextNode("! To see all of your unlocked accessories, click the Wardrobe from the menu."));
				insertModal("New Hat Found!", message);
			}
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
			// Remove wardrobe if open
			removeWardrobe();

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
				birb.getFrames().base.draw(speciesCtx, Directions.RIGHT, CANVAS_PIXEL_SIZE, type.colors, type.tags);
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

		function insertWardrobe() {
			console.log("Inserting wardrobe");
			if (document.querySelector("#" + WARDROBE_ID)) {
				return;
			}
			// Remove field guide if open
			removeFieldGuide();

			const contentContainer = document.createElement("div");
			const content = makeElement("birb-grid-content");
			const description = makeElement("birb-field-guide-description");
			contentContainer.appendChild(content);
			contentContainer.appendChild(description);

			const wardrobe = createWindow(
				WARDROBE_ID,
				"Wardrobe",
				contentContainer
			);

			const generateDescription = (/** @type {string} */ hat) => {
				const metadata = HAT_METADATA[hat] ?? { name: "Unknown Hat", description: "todo" };
				const unlocked = unlockedHats.includes(hat);

				const boldName = document.createElement("b");
				boldName.textContent = metadata.name;

				const spacer = document.createElement("div");
				spacer.style.height = "0.3em";

				const descText = document.createTextNode(!unlocked ? "Not yet unlocked" : metadata.description);

				const fragment = document.createDocumentFragment();
				fragment.appendChild(boldName);
				fragment.appendChild(spacer);
				fragment.appendChild(descText);

				return fragment;
			};

			description.appendChild(generateDescription(currentHat));
			for (const hat of Object.values(HAT)) {
				const unlocked = unlockedHats.includes(hat);
				const hatElement = makeElement("birb-grid-item");
				if (hat === currentHat) {
					hatElement.classList.add("birb-grid-item-selected");
				}
				const hatCanvas = document.createElement("canvas");
				hatCanvas.width = SPRITE_WIDTH * CANVAS_PIXEL_SIZE;
				hatCanvas.height = SPRITE_HEIGHT * CANVAS_PIXEL_SIZE;
				const hatCtx = hatCanvas.getContext("2d");
				if (!hatCtx) {
					return;
				}
				birb.getFrames().base.draw(
					hatCtx,
					Directions.RIGHT,
					CANVAS_PIXEL_SIZE,
					SPECIES[currentSpecies].colors,
					[...SPECIES[currentSpecies].tags, hat]
				);
				hatElement.appendChild(hatCanvas);
				content.appendChild(hatElement);
				if (unlocked) {
					onClick(hatElement, () => {
						switchHat(hat);
						document.querySelectorAll(".birb-grid-item").forEach((element) => {
							element.classList.remove("birb-grid-item-selected");
						});
						hatElement.classList.add("birb-grid-item-selected");
					});
				} else {
					hatElement.classList.add("birb-grid-item-locked");
				}
				hatElement.addEventListener("mouseover", () => {
					description.textContent = "";
					description.appendChild(generateDescription(hat));
				});
				hatElement.addEventListener("mouseout", () => {
					description.textContent = "";
					description.appendChild(generateDescription(currentHat));
				});
			}
			centerElement(wardrobe);
		}

		function removeWardrobe() {
			const wardrobe = document.querySelector("#" + WARDROBE_ID);
			if (wardrobe) {
				wardrobe.remove();
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
		 * @param {string} hat
		 */
		function switchHat(hat) {
			currentHat = hat;
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
		 * @returns {HTMLElement|null} The random element, or null if no valid element was found
		 */
		function getRandomValidElement() {
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
				return null;
			}
			const randomElement = nonFixedElements[Math.floor(Math.random() * nonFixedElements.length)];
			return randomElement;
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
			focusedElement = getRandomValidElement();
			log("Focusing on element: ", focusedElement);
			updateFocusedElementBounds();
			if (teleport) {
				teleportTo(getFocusedElementRandomX(), getFocusedY());
			} else {
				flyTo(getFocusedElementRandomX(), getFocusedY());
			}
			return focusedElement !== null;
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

		function isPetBoostActive() {
			return Date.now() - lastPetTimestamp < PET_BOOST_DURATION;
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
							// Return the color as-is if not found in the map
							row.push(hex);
							continue;
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

	initializeApplication(new LocalContext());

})();
