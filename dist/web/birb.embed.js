(function () {
	'use strict';

	const Directions = {
		LEFT: -1,
		RIGHT: 1,
	};

	let debugMode = location.hostname === "127.0.0.1";
	/** @type {import('./context.js').Context|null} */
	let context = null;
	/** @type {ShadowRoot|undefined} */
	let shadowRoot;

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

	/**
	 * @param {import('./context.js').Context} newContext
	 */
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
			if (closeButton && !closeButton.isConnected) {
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
	 * @param {ShadowRoot} root 
	 */
	function setShadowRoot(root) {
		shadowRoot = root;
	}

	/**
	 * @returns {ShadowRoot}
	 */
	function getShadowRoot() {
		if (!shadowRoot) {
			throw new Error("Shadow root requested before being set");
		}
		return shadowRoot;
	}

	/** @typedef {Object} Species
	 * @property {string} name
	 * @property {string} description
	 * @property {string} latinName
	 * @property {string} url
	 * @property {number} spriteIndex
	 * @property {string} highlightColor
	 * @property {string[]} [tags]
	 * @property {string} [rarity]
	 */

	/** @type {Record<string, Species>} */
	const species = {
	  "bluebird": {
	    "name": "Eastern Bluebird",
	    "description": "Native to North America and very social, though can be timid around people.",
	    "latinName": "Sialia sialis",
	    "url": "https://en.wikipedia.org/wiki/Eastern_bluebird",
	    "spriteIndex": 0,
	    "highlightColor": "#639bff"
	  },
	  "shimaEnaga": {
	    "name": "Shima Enaga",
	    "description": "Small, fluffy birds found in the snowy regions of Japan, these birds are highly sought after by ornithologists and nature photographers.",
	    "latinName": "Aegithalos caudatus",
	    "url": "https://en.wikipedia.org/wiki/Long-tailed_tit",
	    "spriteIndex": 1,
	    "highlightColor": "#d7ac93"
	  },
	  "tuftedTitmouse": {
	    "name": "Tufted Titmouse",
	    "description": "Native to the eastern United States, these birds are full of personality, and notably my wife's favorite bird.",
	    "latinName": "Baeolophus bicolor",
	    "url": "https://en.wikipedia.org/wiki/Tufted_titmouse",
	    "spriteIndex": 2,
	    "highlightColor": "#b9abcf",
	    "tags": [
	      "tuft"
	    ]
	  },
	  "europeanRobin": {
	    "name": "European Robin",
	    "description": "Native to western Europe, this is the quintessential robin. Quite friendly, you'll often find them searching for worms.",
	    "latinName": "Erithacus rubecula",
	    "url": "https://en.wikipedia.org/wiki/European_robin",
	    "spriteIndex": 3,
	    "highlightColor": "#ffaf34"
	  },
	  "redCardinal": {
	    "name": "Red Cardinal",
	    "description": "Native to the eastern United States, this strikingly red bird is hard to miss.",
	    "latinName": "Cardinalis cardinalis",
	    "url": "https://en.wikipedia.org/wiki/Red_cardinal",
	    "spriteIndex": 4,
	    "highlightColor": "#e83a1b",
	    "tags": [
	      "tuft"
	    ]
	  },
	  "americanGoldfinch": {
	    "name": "American Goldfinch",
	    "description": "Coloured a brilliant yellow, this bird feeds almost entirely on the seeds of plants such as thistle, sunflowers, and coneflowers.",
	    "latinName": "Spinus tristis",
	    "url": "https://en.wikipedia.org/wiki/American_goldfinch",
	    "spriteIndex": 5,
	    "highlightColor": "#ffcc00"
	  },
	  "barnSwallow": {
	    "name": "Barn Swallow",
	    "description": "Agile birds that often roost in man-made structures, these birds are known to build nests near Ospreys for protection.",
	    "latinName": "Hirundo rustica",
	    "url": "https://en.wikipedia.org/wiki/Barn_swallow",
	    "spriteIndex": 6,
	    "highlightColor": "#2252a9"
	  },
	  "mistletoebird": {
	    "name": "Mistletoebird",
	    "description": "Native to Australia, these birds eat mainly mistletoe and in turn spread the seeds far and wide.",
	    "latinName": "Dicaeum hirundinaceum",
	    "url": "https://en.wikipedia.org/wiki/Mistletoebird",
	    "spriteIndex": 7,
	    "highlightColor": "#352e6d"
	  },
	  "scarletRobin": {
	    "name": "Scarlet Robin",
	    "description": "Native to Australia, this striking robin can be found in Eucalyptus forests.",
	    "latinName": "Petroica boodang",
	    "url": "https://en.wikipedia.org/wiki/Scarlet_robin",
	    "spriteIndex": 8,
	    "highlightColor": "#fc5633"
	  },
	  "americanRobin": {
	    "name": "American Robin",
	    "description": "While not a true robin, this social North American bird is so named due to its orange coloring. It seems unbothered by nearby humans.",
	    "latinName": "Turdus migratorius",
	    "url": "https://en.wikipedia.org/wiki/American_robin",
	    "spriteIndex": 9,
	    "highlightColor": "#eb7a3a"
	  },
	  "carolinaWren": {
	    "name": "Carolina Wren",
	    "description": "Native to the eastern United States, these little birds are known for their curious and energetic nature.",
	    "latinName": "Thryothorus ludovicianus",
	    "url": "https://en.wikipedia.org/wiki/Carolina_wren",
	    "spriteIndex": 10,
	    "highlightColor": "#c58a5b"
	  },
	  "blackCappedChickadee": {
	    "name": "Black-capped Chickadee",
	    "description": "Native to North America, these small and curious birds are known for their distinctive call from which they get their name.",
	    "latinName": "Poecile atricapillus",
	    "url": "https://en.wikipedia.org/wiki/Black-capped_chickadee",
	    "spriteIndex": 11,
	    "highlightColor": "#363636",
	    "tags": []
	  },
	  "blueJay": {
	    "name": "Blue Jay",
	    "description": "This loud and rambunctious bird is native to North America and is known for challenging anything in its path.",
	    "latinName": "Cyanocitta cristata",
	    "url": "https://en.wikipedia.org/wiki/Blue_jay",
	    "spriteIndex": 12,
	    "highlightColor": "#6391e8",
	    "tags": [
	      "tuft"
	    ]
	  },
	  "darkEyedJunco": {
	    "name": "Dark-eyed Junco",
	    "description": "Native across North America, these social birds will often be seen hopping along the ground in winter.",
	    "latinName": "Junco hyemalis",
	    "url": "https://en.wikipedia.org/wiki/Dark-eyed_junco",
	    "spriteIndex": 13,
	    "highlightColor": "#55565e"
	  },
	  "houseFinch": {
	    "name": "House Finch",
	    "description": "Native to North America, these highly social birds sing cheerful songs and are often seen at bird feeders.",
	    "latinName": "Haemorhous mexicanus",
	    "url": "https://en.wikipedia.org/wiki/House_finch",
	    "spriteIndex": 14,
	    "highlightColor": "#ef444d"
	  },
	  "redWingedBlackbird": {
	    "name": "Red-winged Blackbird",
	    "description": "Native across North America, these birds can be seen flocking in massive groups. Their songs are often heard in wetlands around the continent.",
	    "latinName": "Agelaius phoeniceus",
	    "url": "https://en.wikipedia.org/wiki/Red-winged_blackbird",
	    "spriteIndex": 28,
	    "highlightColor": "#fc2e00"
	  },
	  "pigeon": {
	    "name": "Rock Pigeon",
	    "description": "Descended from the Rock Dove, these once domesticated birds are often found in cities worldwide. Quite friendly and intelligent, they were favored companions of Nikola Tesla.",
	    "latinName": "Columba livia",
	    "url": "https://en.wikipedia.org/wiki/Rock_dove",
	    "spriteIndex": 15,
	    "highlightColor": "#5a6c91"
	  },
	  "redAvadavat": {
	    "name": "Red Avadavat",
	    "description": "Native to India and southeast Asia, these birds are also known as Strawberry Finches due to their speckled plumage.",
	    "latinName": "Amandava amandava",
	    "url": "https://en.wikipedia.org/wiki/Red_avadavat",
	    "spriteIndex": 16,
	    "highlightColor": "#cb092b",
	    "rarity": "uncommon"
	  },
	  "pinkRobin": {
	    "name": "Pink Robin",
	    "description": "Native to Australia, these bubblegum-pink puffballs are quieter than most, instead relying on their vibrant colours to attract partners.",
	    "latinName": "Petroica rodinogaster",
	    "url": "https://en.wikipedia.org/wiki/Pink_robin",
	    "spriteIndex": 17,
	    "highlightColor": "#ff82ba",
	    "rarity": "uncommon"
	  },
	  "spangledCotinga": {
	    "name": "Spangled Cotinga",
	    "description": "This South American bird can be found in the Amazon rainforest, flashing its iridescent turquoise feathers high above in the canopy.",
	    "latinName": "Cotinga cayana",
	    "url": "https://en.wikipedia.org/wiki/Spangled_cotinga",
	    "spriteIndex": 18,
	    "highlightColor": "#4ddef4",
	    "rarity": "uncommon"
	  },
	  "elegantEuphonia": {
	    "name": "Elegant Euphonia",
	    "description": "This vividly coloured finch is found throughout Central America and is known for the distinctive blue hood that crowns its head.",
	    "latinName": "Chlorophonia elegantissima",
	    "url": "https://en.wikipedia.org/wiki/Elegant_euphonia",
	    "spriteIndex": 19,
	    "highlightColor": "#6bc6ed",
	    "rarity": "uncommon"
	  },
	  "paintedBunting": {
	    "name": "Painted Bunting",
	    "description": "A remarkably colourful bird, this North American species is quite difficult to observe despite its vivid palette due to its shy nature and vulnerable habitat.",
	    "latinName": "Passerina ciris",
	    "url": "https://en.wikipedia.org/wiki/Painted_bunting",
	    "spriteIndex": 20,
	    "highlightColor": "#5567f0",
	    "rarity": "uncommon"
	  },
	  "redWarbler": {
	    "name": "Red Warbler",
	    "description": "Endemic to the highlands of Mexico, this bird has the rare distinction of being one of the very few toxic birds in the world.",
	    "latinName": "Cardellina rubra",
	    "url": "https://en.wikipedia.org/wiki/Red_warbler",
	    "spriteIndex": 21,
	    "highlightColor": "#e80a28",
	    "rarity": "uncommon"
	  },
	  "cubanTody": {
	    "name": "Cuban Tody",
	    "description": "As the name suggests, this little green bird is only found on the island of Cuba and is known for being particularly round.",
	    "latinName": "Todus multicolor",
	    "url": "https://en.wikipedia.org/wiki/Cuban_tody",
	    "spriteIndex": 22,
	    "highlightColor": "#4adc67",
	    "rarity": "uncommon"
	  },
	  "violetBackedStarling": {
	    "name": "Violet-backed Starling",
	    "description": "Native to Sub-Saharan Africa, these small starlings are known for being the most vividly purple birds in the world.",
	    "latinName": "Cinnyricinclus leucogaster",
	    "url": "https://en.wikipedia.org/wiki/Violet-backed_starling",
	    "spriteIndex": 23,
	    "highlightColor": "#9c3af2",
	    "rarity": "uncommon"
	  },
	  "stellarsJay": {
	    "name": "Steller's Jay",
	    "description": "Native to western North America, I've always appreciated the coincidence of this bird's name and its deep blue plumage resembling the night sky.",
	    "latinName": "Cyanocitta stelleri",
	    "url": "https://en.wikipedia.org/wiki/Steller%27s_jay",
	    "spriteIndex": 27,
	    "highlightColor": "#0e5ac0",
	    "tags": [
	      "tuft"
	    ]
	  },
	  "mourningDove": {
	    "name": "Mourning Dove",
	    "description": "Native to North America, this dove always reminds me of sunny mornings and warm summer days.",
	    "latinName": "Zenaida macroura",
	    "url": "https://en.wikipedia.org/wiki/Mourning_dove",
	    "spriteIndex": 25,
	    "highlightColor": "#dba17c"
	  },
	  "whiteWingedFairywren": {
	    "name": "White-winged Fairywren",
	    "description": "Native across Australia, these birds are known for their spectacular lapis lazuli coloured feathers and contrasting white wings.",
	    "latinName": "Malurus leucopterus",
	    "url": "https://en.wikipedia.org/wiki/White-winged_fairywren",
	    "spriteIndex": 26,
	    "highlightColor": "#0a33cf",
	    "rarity": "uncommon"
	  },
	  "littleCrow": {
	    "name": "Little Crow",
	    "description": "Native to Australia, this species of crow is the smallest in the world, but no less clever than its larger siblings.",
	    "latinName": "Corvus bennetti",
	    "url": "https://en.wikipedia.org/wiki/Little_crow_(bird)",
	    "spriteIndex": 24,
	    "highlightColor": "#1a273a"
	  },
	  "redpoll": {
	    "name": "Redpoll",
	    "description": "Native to the Arctic, this incredible bird is capable of withstanding temperatures as low as -65 degrees Fahrenheit (-54 Celsius).",
	    "latinName": "Acanthis flammea",
	    "url": "https://en.wikipedia.org/wiki/Redpoll",
	    "spriteIndex": 29,
	    "highlightColor": "#ba3044",
	    "rarity": "uncommon"
	  },
	  "invisible": {
	    "name": "Invisible",
	    "description": "An unusual species, this bird is rarely seen.",
	    "latinName": "Invisibilis noseeum",
	    "url": "https://en.wikipedia.org/wiki/Invisibility",
	    "spriteIndex": 30,
	    "highlightColor": "#000000",
	    "rarity": "secret"
	  },
	};

	const RARITY = Object.freeze(/** @type {const} */ ({
		COMMON: "common",
		UNCOMMON: "uncommon",
		SECRET: "secret"
	}));

	/** @typedef {typeof RARITY[keyof typeof RARITY]} Rarity */

	class BirdType {
		/**
		 * @param {string} name
		 * @param {string} description
		 * @param {string} latinName
		 * @param {string} url
		 * @param {number} spriteIndex
		 * @param {string} highlightColor
		 * @param {string[]} [tags]
		 * @param {Rarity} [rarity]
		 */
		constructor(name, description, latinName, url, spriteIndex, highlightColor, tags = [], rarity = RARITY.COMMON) {
			this.name = name;
			this.description = description;
			this.latinName = latinName;
			this.url = url;
			this.spriteIndex = spriteIndex;
			this.highlightColor = highlightColor;
			this.tags = tags;
			/** @type {Rarity} */
			this.rarity = rarity;
		}

		/**
		 * @param {Object<string, string>} colorScheme
		 */
		setColorScheme(colorScheme) {
			this.colorScheme = colorScheme;
		}

		/**
		 * @returns {Object<string, string>}
		 */
		getColorScheme() {
			if (!this.colorScheme) {
				throw new Error("Color scheme requested before generation");
			}
			return this.colorScheme;
		}
	}

	/**
	 * @param {string} src
	 * @param {number} width
	 */
	async function createTemplateMapping(src, width) {
		/** @type {{ [key: string]: string }} */
		let map = {};
		const imageData = await getImageData(src);
		const pixels = imageData.data;
		for (let row = 0; row < imageData.height; row++) {
			for (let col = 0; col < width; col++) {
				const index = (row * imageData.width + col) * 4;
				const r = pixels[index];
				const g = pixels[index + 1];
				const b = pixels[index + 2];
				const a = pixels[index + 3];
				if (a === 0) {
					 continue;
				}
				const color = rgbToHex(r, g, b);
				if (!map[color]) {
					map[color] = key(row, col);
				}
			}
		}
		return map;
	}

	/**
	 * @param {string} src
	 * @param {number} start
	 * @param {number} width
	 * @returns {Promise<{ [key: string]: string }>}
	 */
	async function extractPalette(src, start, width) {
		/** @type {{ [key: string]: string }} */
		let map = {};
		const imageData = await getImageData(src);
		const pixels = imageData.data;
		for (let row = 0; row < imageData.height; row++) {
			for (let col = start; col < start + width; col++) {
				const index = (row * imageData.width + col) * 4;
				const r = pixels[index];
				const g = pixels[index + 1];
				const b = pixels[index + 2];
				const a = pixels[index + 3];
				const color = a === 0 ? "transparent" : rgbToHex(r, g, b);
				const id = key(row, col - start);
				if (!map[id]) {
					map[id] = color;
				}
			}
		}
		return map;
	}



	/**
	 * @param {number} row
	 * @param {number} col
	 * @returns {string}
	 */
	function key(row, col) {
		return row + "x" + col;
	}

	/**
	 * @param {string} src
	 * @returns {Promise<ImageData>}
	 */
	function getImageData(src) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.src = src;
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
				resolve(imageData);
			};
			img.onerror = (err) => {
				reject(err);
			};
		});
	}


	/**
	 * Load a sprite sheet image and convert it to a 2D array of palette color names
	 * @param {string} src URL or data URI of the sprite sheet image
	 * @param {Object<string, string>} templateMapping Mapping of template colors to location keys
	 * @returns {Promise<string[][]>}
	 */
	async function loadSpriteSheetPixels(src, templateMapping) {
		const imageData = await getImageData(src);
		const pixels = imageData.data;
		const hexArray = [];
		for (let y = 0; y < imageData.height; y++) {
			const row = [];
			for (let x = 0; x < imageData.width; x++) {
				const index = (y * imageData.width + x) * 4;
				const r = pixels[index];
				const g = pixels[index + 1];
				const b = pixels[index + 2];
				const a = pixels[index + 3];
				const color = a === 0 ? "transparent" : rgbToHex(r, g, b);
				row.push(templateMapping[color] || color);
			}
			hexArray.push(row);
		}
		return hexArray;
	}

	/**
	 * @param {number} r Red channel value (0-255)
	 * @param {number} g Green channel value (0-255)
	 * @param {number} b Blue channel value (0-255)
	 * @returns {string} The rgb color as a hex string
	 */
	function rgbToHex(r, g, b) {
		return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
	}

	/** @type {Record<string, BirdType>} */
	const SPECIES = Object.fromEntries(
		Object.entries(species).map(([id, data]) => [
			id,
			new BirdType(data.name, data.description, data.latinName, data.url, data.spriteIndex, data.highlightColor, data.tags, /** @type {Rarity|undefined} */ (data.rarity))
		]),
	);

	const TAG = {
		DEFAULT: "default"};

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
					this.pixels.unshift(new Array(this.pixels[0].length).fill("transparent"));
				}
				// Combine layers
				for (let i = 1; i < layers.length; i++) {
					if (layers[i].tag === TAG.DEFAULT || layers[i].tag === tag) {
						let layerPixels = layers[i].pixels;
						let topMargin = maxHeight - layerPixels.length;
						for (let y = 0; y < layerPixels.length; y++) {
							for (let x = 0; x < layerPixels[y].length; x++) {
								this.pixels[y + topMargin][x] = layerPixels[y][x] !== "transparent" ? layerPixels[y][x] : this.pixels[y + topMargin][x];
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
					if (colorScheme[cell]) ;
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
			/** @type {number|null} */
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
		FEZ: "fez",
		WIZARD_HAT: "wizard-hat",
		BASEBALL_CAP: "baseball-cap",
		FLOWER_HAT: "flower-hat",
		COWBOY_HAT: "cowboy-hat",
		BEANIE: "beanie",
		SUN_HAT: "sun-hat",
		VIKING_HELMET: "viking-helmet",
		STRAW_HAT: "straw-hat",
		CORDOVAN_HAT: "cordovan-hat"
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
		},
		[HAT.BEANIE]: {
			name: "Beanie",
			description: "Keeps feathers warm on those long migrations south!"
		},
		[HAT.SUN_HAT]: {
			name: "Sun Hat",
			description: "Perfect for frolicking through enchanted flower fields."
		},
		[HAT.STRAW_HAT]: {
			name: "Straw Hat",
			description: "A classic design, though keep away from water as this particular hat is seemingly unable to float."
		},
		[HAT.CORDOVAN_HAT]: {
			name: "Cordovan Hat",
			description: "A traditional Spanish hat that stays put even in the wildest of sword fights."
		}
	};

	/**
	 * @param {string[][]} spriteSheet 
	 * @returns {{ base: Layer[], down: Layer[] }}
	 */
	function createHatLayers(spriteSheet) {
		/** @type {{ base: Layer[], down: Layer[] }} */
		const hatLayers = {
			base: [],
			down: []
		};
		let index = 0;
		for (const [hatName, hatKey] of Object.entries(HAT)) {
			if (hatName === 'NONE') {
				continue;
			}
			const hatLayer = buildHatLayer(spriteSheet, hatKey, index);
			const downHatLayer = buildHatLayer(spriteSheet, hatKey, index, 1);
			hatLayers.base.push(hatLayer);
			hatLayers.down.push(downHatLayer);
			index++;
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
			paddedPixels.push(Array(rowLength).fill("transparent"));
		}
		// Left and right padding
		for (let y = 0; y < pixels.length; y++) {
			const row = [];
			for (let x = 0; x < left; x++) {
				row.push("transparent");
			}
			for (let x = 0; x < pixels[y].length; x++) {
				row.push(pixels[y][x]);
			}
			for (let x = 0; x < right; x++) {
				row.push("transparent");
			}
			paddedPixels.push(row);
		}
		// Bottom padding
		for (let y = 0; y < bottom; y++) {
			paddedPixels.push(Array(rowLength).fill("transparent"));
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
				if (pixel !== "transparent" && pixel !== "#ffffff") {
					for (let [dx, dy] of neighborOffsets) {
						const newX = x + dx;
						const newY = y + dy;
						if (newY >= 0 && newY < pixels.length && newX >= 0 && newX < pixels[newY].length && pixels[newY][newX] === "transparent") {
							pixels[newY][newX] = "#ffffff";
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
			if (firstRow.every(pixel => pixel === "transparent")) {
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
			this.canvasPixelSize = canvasPixelSize;
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

			this.ctx = /** @type {CanvasRenderingContext2D} */ (this.canvas.getContext("2d"));

			// Append to shadow dom
			getShadowRoot().appendChild(this.canvas);
		}

		/**
		 * Draw the current animation frame
		 * @param {BirdType} species The species data
		 * @param {string} [hat] The name of the current hat
		 * @returns {boolean} Whether the animation has completed (for non-looping animations)
		 */
		draw(species, hat) {
			const anim = this.animations[this.currentAnimation];
			return anim.draw(this.ctx, this.direction, this.animStart, this.canvasPixelSize, species.getColorScheme(), [...species.tags, hat || '']);
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
			return this.canvas.getBoundingClientRect().width;
		}

		/**
		 * Get the canvas height in CSS pixels
		 * @returns {number}
		 */
		getElementHeight() {
			return this.canvas.getBoundingClientRect().height;
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
			this.canvas.style.left = `${x - this.canvas.width / 2 - (this.direction === Directions.RIGHT ? 2 : -2)}px`;
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
		 * @type {AudioContext|undefined}
		 */
		audioContext;

		chirp() {
			const count = Math.floor(1 + Math.random() * 1.5);
			for (let i = 0; i < count; i++) {
				setTimeout(() => {
					if (!this.audioContext) {
						this.audioContext = new AudioContext();
					}

					const TIMES = [0, 0.06, 0.10, 0.15];
					const FREQUENCIES = [2200,
						3500 + Math.random() * 600 * count,
						2100 + Math.random() * 200 * count,
						1600 + Math.random() * 400 * count];
					const VOLUMES = [0.00005, 0.165, 0.165, 0.0001];

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
				}, i * 120);
			}
		}
	}

	const SAVE_KEY = "birbSaveData";
	const MONOCRAFT_URL = "https://cdn.jsdelivr.net/gh/idreesinc/Monocraft@99b32ab40612ff2533a69d8f14bd8b3d9e604456/dist/Monocraft.otf";

	/**
	 * @typedef {import('./application.js').BirbSaveData} BirbSaveData
	 */

	/**
	 * @abstract
	 */
	class Context {

		/**
		 * @abstract
		 * @returns {Promise<Partial<BirbSaveData>>}
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

		isLinkBackEnabled() {
			return false;
		}

		/**
		 * @returns {string}
		 */
		getFontStyles() {
			return getFontFaceImport(MONOCRAFT_URL);
		}

		getFeatherChanceMod() {
			return 1;
		}

		getHatChanceMod() {
			return 1;
		}
	}

	class LocalContext extends Context {

		/**
		 * @override
		 * @returns {Promise<Partial<BirbSaveData>>}
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
		isLinkBackEnabled() {
			return true;
		}

		/** @override */
		resetSaveData() {
			log("Resetting save data in localStorage");
			localStorage.removeItem(SAVE_KEY);
		}

		/** @override */
		getFeatherChanceMod() {
			return 4;
		}

		/** @override */
		getHatChanceMod() {
			return 2;
		}
	}

	/**
	 * @param {string} src
	 * @returns {string}
	 */
	function getFontFaceImport(src) {
		return `@font-face { font-family: 'Monocraft'; src: url("${src}") format('opentype'); font-weight: normal; font-style: normal; }`;
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
			/** @type {ReturnType<typeof setTimeout>|undefined} */
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
		 * @param {number[][]} [icon]
		 * @param {boolean} [removeMenu]
		 */
		constructor(text, action, icon, removeMenu = true) {
			this.text = text;
			this.action = action;
			this.icon = icon;
			this.removeMenu = removeMenu;
		}
	}

	class SpinnerMenuItem extends MenuItem {
		/**
		 * @param {string|(() => string)} text
		 * @param {() => void} labelAction
		 * @param {() => void} leftAction
		 * @param {() => void} rightAction
		 */
		constructor(text, labelAction, leftAction, rightAction) {
			super(text, labelAction, undefined, false);
			this.leftAction = leftAction;
			this.rightAction = rightAction;
		}
	}

	class ConditionalMenuItem extends MenuItem {
		/**
		 * @param {string} text
		 * @param {() => void} action
		 * @param {() => boolean} condition
		 * @param {number[][]} [icon]
		 * @param {boolean} [removeMenu]
		 */
		constructor(text, action, condition, icon, removeMenu = true) {
			super(text, action, icon, removeMenu);
			this.condition = condition;
		}
	}

	class DebugMenuItem extends ConditionalMenuItem {
		/**
		 * @param {string} text
		 * @param {() => void} action
		 */
		constructor(text, action, removeMenu = true) {
			super(text, action, () => isDebug(), undefined, removeMenu);
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
	function createMenuItem(item, removeMenuCallback) {
		if (item instanceof Separator) {
			return makeElement("birb-window-separator");
		}
		let menuItem = makeElement("birb-menu-item", typeof item.text === "function" ? item.text() : item.text);
		if (item.icon) {
			const iconCanvas = document.createElement("canvas");
			iconCanvas.width = 7;
			iconCanvas.height = 6;
			iconCanvas.classList.add("birb-menu-item-icon");
			const ctx = iconCanvas.getContext("2d");
			if (ctx) {
				for (let row = 0; row < item.icon.length; row++) {
					for (let col = 0; col < item.icon[row].length; col++) {
						if (item.icon[row][col]) {
							ctx.fillStyle = "black";
							ctx.fillRect(col, row, 1, 1);
						}
					}
				}
			}
			menuItem.prepend(iconCanvas);
		}
		if (item instanceof SpinnerMenuItem) {
			menuItem.classList.add("birb-menu-item-spinner");
			const container = makeElement("birb-menu-item-spinner-container");
			// Prevent accidental resets
			onClick(container, (e) => e.stopPropagation());
			menuItem.appendChild(container);
			const leftButton = makeElement("birb-spinner-button", "-");
			leftButton.classList.add("birb-spinner-button-negative");
			const rightButton = makeElement("birb-spinner-button", "+");
			rightButton.classList.add("birb-spinner-button-positive");
			onClick(leftButton, (e) => {
				item.leftAction();
				e.stopPropagation();
			});
			onClick(rightButton, (e) => {
				item.rightAction();
				e.stopPropagation();
			});
			container.appendChild(leftButton);
			container.appendChild(rightButton);
		}
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
	 * @param {() => void} [titleClickCallback]
	 */
	function insertMenu(menuItems, title, updateLocationCallback, titleClickCallback) {
		if (getShadowRoot().querySelector("#" + MENU_ID)) {
			return;
		}
		let menu = makeElement("birb-window", undefined, MENU_ID);
		let header = makeElement("birb-window-header");
		const titleDiv = makeElement("birb-window-title", title);
		header.appendChild(titleDiv);
		let content = makeElement("birb-window-content");
		const removeCallback = () => removeMenu();
		if (titleClickCallback) {
			onClick(titleDiv, () => {
				removeCallback();
				titleClickCallback();
			});
			titleDiv.classList.add("birb-window-title-clickable");
		}
		for (const item of menuItems) {
			if (!(item instanceof ConditionalMenuItem) || item.condition()) {
				content.appendChild(createMenuItem(item, removeCallback));
			}
		}
		menu.appendChild(header);
		menu.appendChild(content);
		getShadowRoot().appendChild(menu);
		makeDraggable(getShadowRoot().querySelector(".birb-window-header"));

		let menuExit = makeElement("birb-window-exit", undefined, MENU_EXIT_ID);
		onClick(menuExit, removeCallback);
		getShadowRoot().appendChild(menuExit);
		makeClosable(removeCallback);

		updateLocationCallback(menu);
	}

	/**
	 * Remove the menu from the page
	 */
	function removeMenu() {
		const menu = getShadowRoot().querySelector("#" + MENU_ID);
		if (menu) {
			menu.remove();
		}
		const exitMenu = getShadowRoot().querySelector("#" + MENU_EXIT_ID);
		if (exitMenu) {
			exitMenu.remove();
		}
	}

	/**
	 * @returns {boolean} Whether the menu element is on the page
	 */
	function isMenuOpen() {
		return getShadowRoot().querySelector("#" + MENU_ID) !== null;
	}

	/**
	 * @param {MenuItem[]} menuItems
	 * @param {(menu: HTMLElement) => void} updateLocationCallback
	 */
	function switchMenuItems(menuItems, updateLocationCallback) {
		const menu = getShadowRoot().querySelector("#" + MENU_ID);
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
				content.appendChild(createMenuItem(item, removeCallback));
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
		soundEnabled: true,
		birbScaleMultiplier: 1,
		uiScaleMultiplier: 1,
		name: "",
		firstTime: true
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
	--birb-scale: 1;
	--birb-ui-scale: 1;
}

#birb {
	image-rendering: pixelated;
	position: fixed;
	bottom: 0;
	transform: scale(var(--birb-scale));
	transform-origin: bottom;
	z-index: 2147483638;
	cursor: pointer;
}

#birb.birb-absolute {
	position: absolute;
}

.birb-decoration {
	image-rendering: pixelated;
	position: fixed;
	bottom: 0;
	transform: scale(var(--birb-scale));
	transform-origin: bottom;
	z-index: 2147483630;
}

.birb-item {
	image-rendering: pixelated;
	position: absolute;
	bottom: 0;
	transform: scale(calc(var(--birb-scale) * 1.5));
	transform-origin: bottom;
	transition-duration: 0.15s;
	z-index: 2147483630;
	cursor: pointer;
}

.birb-item:hover {
	transform: scale(calc(var(--birb-scale) * 1.9));
	transition-duration: 0.15s;
}

.birb-window {
	font-family: "Monocraft", monospace;
	line-height: initial;
	color: #000000;
	z-index: 2147483639;
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
	transform: scale(var(--birb-ui-scale));
	animation: pop-in 0.08s;
	transition-timing-function: ease-in;
}

#birb-menu {
	transition-duration: 0.2s;
	transition-timing-function: ease-out;
	min-width: 140px;
	z-index: 2147483639;
}

#birb-menu-exit {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 2147483637;
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
	color: var(--birb-border-color);
	font-size: 16px;
}

.birb-window-title {
	text-align: center;
	flex-grow: 1;
	user-select: none;
	color: var(--birb-background-color);
	white-space: nowrap;
}

.birb-window-title-clickable {
	cursor: pointer;
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
	padding-left: 2px;
	padding-right: 10px;
	box-sizing: border-box;
	opacity: 0.7;
	user-select: none;
	display: flex;
	justify-content: left;
	align-items: center;
	cursor: pointer;
	color: black;
	transition: background 0.1s, color 0.1s;
}

.birb-menu-item:hover:not(.birb-menu-item-spinner) {
	opacity: 1;
	background: var(--birb-highlight);
	color: white;
	box-shadow:
		var(--birb-border-size) 0 var(--birb-highlight),
		var(--birb-neg-border-size) 0 var(--birb-highlight),
		0 var(--birb-neg-border-size) var(--birb-highlight),
		0 var(--birb-border-size) var(--birb-highlight);
	transition: none;
}

.birb-menu-item-icon {
	height: calc(6 * var(--birb-border-size));
	padding-right: calc(5 * var(--birb-border-size));
	flex-shrink: 0;
	image-rendering: pixelated;
	color: var(--birb-highlight);
	opacity: 0.9;
}

.birb-menu-item:hover > .birb-menu-item-icon {
	filter: invert(1);
}

.birb-menu-item-arrow {
	display: inline-block;
}

.birb-menu-item-spinner {
	display: flex;
	justify-content: space-between;
}

.birb-menu-item-spinner-container {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	gap: 8px;
	margin-left: 10px;
	justify-content:end;
	width: 40px;
}

.birb-spinner-button {
	box-sizing: border-box;
	width: 1em;
	height: calc(7 * var(--birb-border-size));
	display: flex;
	justify-content: center;
	align-items: center;
	--button-color: var(--birb-highlight);
	background-color: var(--button-color);
	color: white;
	font-size: 14px;
	padding-top: 0.5px;
	padding-left: 0.75px;
	margin-top: -0.5px;
	text-align: center;
	box-shadow:
		var(--birb-border-size) 0 var(--button-color),
		var(--birb-neg-border-size) 0 var(--button-color),
		0 var(--birb-neg-border-size) var(--button-color),
		0 var(--birb-border-size) var(--button-color);
	/* border-radius: 3px; */
	cursor: pointer;
}

.birb-spinner-button:active {
	--button-color: #ffcf90;
}

.birb-spinner-button-negative {
	--button-color: #ff7c7c;
}

.birb-spinner-button-positive {
	--button-color: #79bcff;
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
	width: 388px;
}

#birb-field-guide .birb-window-content {
	max-height: 90vh;
	overflow-x: hidden;
	overflow-y: auto;
	justify-content: flex-start;
}

#birb-wardrobe {
	width: 322px;
}

#birb-field-guide .birb-grid-content {
	grid-template-columns: repeat(5, auto);
}

#birb-wardrobe .birb-grid-content {
	grid-template-columns: repeat(4, auto);
	grid-auto-flow: row;
}

.birb-grid-content {
	display: grid;
	grid-auto-flow: row;
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
	transition: border-color 0.1s;
}

.birb-grid-item:hover {
	border-color: var(--birb-highlight);
	transition: none;
}

.birb-grid-item canvas {
	image-rendering: pixelated;
	transform: scale(2);
	padding-bottom: var(--birb-border-size);
}

.birb-grid-item, .birb-field-guide-description {
	border: var(--birb-border-size) solid #ffcf90;
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

.birb-field-guide-section-label {
	padding-top: 4px;
	/* padding-left: calc(10px + var(--birb-border-size) / 2); */
	color: #876c4e;
	text-align: center;
	/* Italics */
	font-style: italic;
}

.birb-field-guide-description {
	max-width: calc(100% - 20px);
	min-height: 120px;
	margin-left: 10px;
	margin-right: 10px;
	margin-top: 5px;
	padding: 8px;
	padding-right: 4px;
	padding-top: 4px;
	padding-bottom: 4px;
	margin-bottom: 2px;
	font-size: 14px;
	box-sizing: border-box;
	color: #7c6c4b;
}

.birb-field-guide-latin-name {
	text-decoration: underline;
	font-style: italic;
	font-weight: bold;
	color: inherit;
}

#birb-feather {
	cursor: pointer;
}

.birb-modal-content {
	box-sizing: border-box;
	/* background: red; */
	display: flex;
	flex-direction: column;
	margin: 2px;
}

.birb-modal-buttons {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	gap: 20px;
	margin: 3px 0;
}

.birb-modal-button {
	flex-grow: 0;
	box-sizing: border-box;
	padding: 0px 6px;
	cursor: pointer;
	text-align: center;
	user-select: none;
	--button-color: var(--birb-highlight);
	background-color: var(--button-color);
	color: white;
	font-size: 14px;
	margin-top: calc(var(--birb-border-size) * 2);
	text-align: center;
	box-shadow:
		var(--birb-border-size) 0 var(--button-color),
		var(--birb-neg-border-size) 0 var(--button-color),
		0 var(--birb-neg-border-size) var(--button-color),
		0 var(--birb-border-size) var(--button-color);
}

.birb-modal-button:active {
	--button-color: #ffcf90;
}

.birb-modal-negative-button {
	--button-color: #ff7c7c;
}

.birb-modal-action-button {
	--button-color: #79bcff;
}

.birb-message-content {
	box-sizing: border-box;
	margin: 2px;
	margin-left: 4px;
	margin-right: 4px;
	width: 270px;
	padding: 10px;
	font-size: 14px;
	color: #7c6c4b;
	border: var(--birb-border-size) solid #ffcf90;
	box-shadow: 0 0 0 var(--birb-border-size) white;
	background: rgba(255, 221, 177, 0.5);
}

.birb-message-input {
	all: unset;
	box-sizing: border-box;
	margin-top: 12px;
	padding: 3px 3px;
	width: 100%;
	border: var(--birb-border-size) solid #ffcf90;
	background: rgba(255, 255, 255, 0.5);
	color: #7c6c4b;
}

.birb-sticky-note {
	position: absolute;
	box-sizing: border-box;
	animation: fade-in 0.15s ease-in;
	z-index: 2147483637;
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
	padding: 10px;
	resize: both;
	min-width: 175px;
	min-height: 135px;
	box-sizing: border-box;
	font-family: "Monocraft", monospace;
	font-size: 14px;
	color: black;
	background-color: transparent;
	border: none;
}

.birb-sticky-note-input::placeholder {
	font-family: "Monocraft", monospace;
	font-size: 14px;
	background-color: transparent;
	color: rgba(0, 0, 0, 0.35);
}

.birb-sticky-note-input:focus {
	outline: none;
	box-shadow: none;
}

@media print {
	#birb {
		display: none;
	}
}`;
	const SPRITE_SHEET = "data:image/png;base64,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";
	const SPECIES_SPRITE_SHEET = "data:image/png;base64,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";
	const FEATHER_SPRITE_SHEET = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAARhJREFUWIXtlSEOwjAUhv9HwHECFG4Ch2nCLQgCxxGQHAGB5Ag4BOEcGDzBIAgKh0QUw8i/bnQtPILpl0ys2fb9fa/tgEQikUgk/oxofsxaa0sCEa9DJQCL2ZcP+0I0tOQiAhFBf3rAdW4KYaoqoxKA5f3pAePFBQDQ7rVLIdQDsDwXMxzCR1Nb3tpNMMCKRjLdAG7ZmdNmiO5o+7pfzzrwtD8+gE/e2k1wNyscz7fSe75dEBzALTuL3JkjcPaIXYRVPa+T1x1EQRV4t4+ryr5fZsFyxFTA7XsuZ2Ll+HQbflt2Jvog0pQj5GfEq98YUyj7fpnlz3wkr8U+AWCNMRZA4WJUxRyA5VX8ROwGYLm2o3YXsFO9xwAeGaDXaICHtP0AAAAASUVORK5CYII=";
	const HATS_SPRITE_SHEET = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAAAMCAYAAACjpxUSAAAAAXNSR0IArs4c6QAAA29JREFUWIXtl11oW2UYx3+v3ZCuc1ktIpvowrCBjmkdtl6ouBthWMeGTkQxuA9QKCiym20OBfVG3YUVOobYIszLyXY16HYxvOicns3NRoR267ZG04aOdc3Jx8lJsujjRZOzeE5y+raETjR/CJyc9/98vv/zvOdAAw000EADDWhB3e0E6gURkfK1Uuo/U9dS4567GFs0OHqOymJIKud/JeoV5/8AjyBaV7bJhrWdEmxtl3pumgv195tUEO1wRAGwdzg4F6whCm14BHFvU/NCfYjrp4WWF05TV2EEBIKjfFN4CUpi6Fy3mf0/hfys3Hnr1rDQenW4futLJmiPIO5vaSNrZ3XtZebJ5/k51M13wY3IhQA6hXf1GgQCqxaTb1U47wwBYc8DJ/h0YhOd6zaz65GjtK18yNf2Un/Yyavv1Wd0wkksFsMwDAzDQKfeQmSQxNkvAETMqnwZvvgrNYTpXvPYLuaBrIVl7htlMUQT4wt2drinFbkAqjspfi+sZ187SPvXn+u6dRdZ1a9SSpWPhoPrR4ARdslR9m38ft4Al/rDZFImFyOJeXOJxWLE43HGx7X6I4XIIFY6RcacRkwg2oGYo6JW1+yPHO47gplI8sEn788vttFDpNIWtpXEti1CPQM1ex9sbZcVzSugtM8Ve+zwPYI4/9R6bs3Okk88CsATV6/qFO5AdSd9C+jqNdj0bROUjg1raIufeCR84EcArv8+TTGf4vyJnb5iU0px8r1tjI1dRimFiFT76nAafeXUhHNzjXe90k6Mjh1ce/ZtJuNTACRu5+gnxLtcqZaTAJzbdryCH+IdcxS12pv3WHSKgeND5P+YwEwkSc6m2f36Wzz9ysuMRaeq9gZgePsxUnkb888imcl05VrNHvmdAI5RWT1ZO0smlwJgxr5RletOys+vm9/Va2AVmvjlzf20fbYPa2iLL/+5HX1YmQT54nIAfjvzoR9fF1JxVJBJmc51eUrsPfaDO44zHcooT4lwOOzhFiKDAFjp1J045rRz/fDWQx6bj/q+Ij85STH/FzO3bpLNZVnz+GN8+fEBr/9rg1CYnZsOudvY6ZtzKyVWqGfAbcOL7W9IJmuRy88JIkcGgMjMOYe31N/rugKab1QuOm8RkdLEWGgMLf6/0L8APHjfWpqXtVB5ZNhFixvp+D+M/gZZI68eaJ1OpQAAAABJRU5ErkJggg==";

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
	const UNCOMMON_FEATHER_CHANCE = 0.15; // 15% of feathers are uncommon
	const HAT_CHANCE = 1 / (60 * 60 * 25); // Every 25 minutes

	// Feathers
	const FEATHER_FALL_SPEED = 1;

	// Petting boosts
	const PET_BOOST_DURATION = 1000 * 60 * 5; // 5 minutes
	const PET_FEATHER_BOOST = 2;
	const PET_HAT_BOOST = 1.5;

	// Focus element constraints
	const MIN_FOCUS_ELEMENT_WIDTH = 100;

	/** @type {Record<string, string>} */
	const SECRET_BIRDS = {
		"invisible": "invisible",
	};

	/** @type {Partial<Settings>} */
	let userSettings = {};

	/** 
	 * @param {Context} context
	 */
	async function initializeApplication(context) {
		log("birbOS booting up...");
		setContext(context);
		log("Loading sprite sheets...");
		const templateMapping = await createTemplateMapping(SPRITE_SHEET, 32);
		const birbPixels = await loadSpriteSheetPixels(SPRITE_SHEET, templateMapping);
		const featherPixels = await loadSpriteSheetPixels(FEATHER_SPRITE_SHEET, templateMapping);
		const hatsPixels = await loadSpriteSheetPixels(HATS_SPRITE_SHEET, {});

		for (const species of Object.values(SPECIES)) {
			species.setColorScheme(await extractPalette(SPECIES_SPRITE_SHEET, species.spriteIndex * 32, 32));
		}
		
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
			new MenuItem(() => `Pet ${birdBirb()}`, pet, [
				[0, 1, 1, 0, 1, 1, 0],
				[1, 0, 0, 1, 0, 0, 1],
				[1, 0, 0, 0, 0, 0, 1],
				[0, 1, 0, 0, 0, 1, 0],
				[0, 0, 1, 0, 1, 0, 0],
				[0, 0, 0, 1, 0, 0, 0],
			]),
			new MenuItem("Field Guide", insertFieldGuide, [
				[0, 1, 1, 0, 1, 1, 0],
				[1, 0, 0, 1, 0, 0, 1],
				[1, 0, 0, 1, 0, 0, 1],
				[1, 0, 0, 1, 0, 0, 1],
				[1, 0, 0, 1, 0, 0, 1],
				[1, 1, 1, 0, 1, 1, 1],
			]),
			new MenuItem("Wardrobe", insertWardrobe, [
				[0, 1, 1, 0, 1, 1, 0],
				[1, 0, 0, 1, 0, 0, 1],
				[1, 1, 0, 0, 0, 1, 1],
				[0, 1, 0, 0, 0, 1, 0],
				[0, 1, 0, 0, 0, 1, 0],
				[0, 1, 1, 1, 1, 1, 0],
			]),
			new ConditionalMenuItem("Sticky Note", () => createNewStickyNote(stickyNotes, save, deleteStickyNote), () => getContext().areStickyNotesEnabled(), [
				[0, 0, 1, 1, 1, 1, 0],
				[0, 1, 0, 0, 0, 1, 0],
				[1, 0, 0, 1, 0, 1, 0],
				[1, 0, 1, 0, 0, 1, 0],
				[1, 0, 0, 0, 0, 1, 0],
				[1, 1, 1, 1, 1, 1, 0],
			]),
			new MenuItem(() => `Hide ${birdBirb()}`, () => birb.setVisible(false), [
				[0, 1, 0, 1, 0, 1, 0],
				[1, 0, 0, 1, 0, 0, 1],
				[1, 0, 0, 1, 0, 0, 1],
				[1, 0, 0, 0, 0, 0, 1],
				[0, 1, 0, 0, 0, 1, 0],
				[0, 0, 1, 1, 1, 0, 0],
			]),
			new DebugMenuItem("Freeze", () => {
				frozen = !frozen;
			}),
			new DebugMenuItem("Reset Data", resetSaveData),
			new DebugMenuItem("Unlock All", () => {
				for (let type in SPECIES) {
					unlockBird(type);
				}
				for (let hat in HAT) {
					// @ts-ignore
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
			new ConditionalMenuItem(`Adopt A ${birdBirb()}`, () => {
				const URL = "https://idreesinc.itch.io/pocket-bird";
				window.open(URL, "_blank");
			}, () => getContext().isLinkBackEnabled(), [
				[0, 0, 1, 1, 0, 0, 0],
				[0, 1, 0, 0, 1, 0, 0],
				[1, 0, 1, 0, 0, 1, 0],
				[1, 0, 0, 1, 0, 1, 0],
				[1, 0, 0, 0, 0, 1, 0],
				[0, 1, 1, 1, 1, 0, 0],
			]),
			new MenuItem("Settings", () => switchMenuItems(settingsItems, updateMenuLocation), [
				[0, 0, 0, 0, 1, 1, 1],
				[1, 1, 1, 1, 1, 0, 1],
				[0, 0, 0, 0, 1, 1, 1],
				[1, 1, 1, 0, 0, 0, 0],
				[1, 0, 1, 1, 1, 1, 1],
				[1, 1, 1, 0, 0, 0, 0],
			], false),
		];

		const settingsItems = [
			new MenuItem("Go Back", () => switchMenuItems(menuItems, updateMenuLocation), undefined, false),
			new Separator(),
			new MenuItem(() => `Rename Your ${birdBirb()}`, () => {
				requestNewName();
			}),
			new SpinnerMenuItem(() => `${birdBirb()} Scale`,
				() => {
					userSettings.birbScaleMultiplier = 1;
					save();
					updateBirbScale();
				},
				() => {
				const currentMultiplier = settings().birbScaleMultiplier;
				let newMultiplier;
				if (currentMultiplier <= 2) {
					newMultiplier = currentMultiplier - 0.25;
				} else {
					newMultiplier = currentMultiplier - 1;
				}
				newMultiplier = Math.max(0.25, Math.round(newMultiplier * 4) / 4);
				userSettings.birbScaleMultiplier = newMultiplier;
				save();
				updateBirbScale();
			}, () => {
				const currentMultiplier = settings().birbScaleMultiplier;
				let newMultiplier;
				if (currentMultiplier < 2) {
					newMultiplier = currentMultiplier + 0.25;
				} else {
					newMultiplier = currentMultiplier + 1;
				}
				newMultiplier = Math.max(0.25, Math.round(newMultiplier * 4) / 4);
				userSettings.birbScaleMultiplier = newMultiplier;
				save();
				updateBirbScale();
			}),
			new SpinnerMenuItem("UI Scale",
				() => {
					userSettings.uiScaleMultiplier = 1;
					save();
					updateUIScale();
				},
				() => {
				const currentMultiplier = settings().uiScaleMultiplier;
				userSettings.uiScaleMultiplier = Math.max(0.1, Math.round((currentMultiplier - 0.1) * 10) / 10);
				save();
				updateUIScale();
			}, () => {
				const currentMultiplier = settings().uiScaleMultiplier;
				userSettings.uiScaleMultiplier = Math.round((currentMultiplier + 0.1) * 10) / 10;
				save();
				updateUIScale();
			}),
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
				insertModal(`${birdBirb()} Mode`, message, settings().birbMode ? "radical, dude" : "sounds good");
			}),
			new Separator(),
			new MenuItem(() => `Source Code ${isPetBoostActive() ? " ❤" : ""}`, () => { window.open("https://github.com/IdreesInc/Pocket-Bird"); }),
			new MenuItem("Build 2026.7.26", () => { alert("Thank you for using Pocket Bird! You are on version: 2026.7.26"); }, undefined, false),
		];

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
		/** Locking value to avoid race conditions during save/load */
		let loadNonce = 0;
		/** @type {StickyNote[]} */
		let stickyNotes = [];

		async function load() {
			const nonce = ++loadNonce;
			/** @type {Partial<BirbSaveData>} */
			let saveData = await getContext().getSaveData();
			if (nonce !== loadNonce) {
				console.warn("Aborting load due to newer load call");
				return;
			}

			if (!('settings' in saveData)) {
				log("No user settings found in save data, starting fresh");
			}

			saveData = mergeSaves(saveData, {
				unlockedSpecies,
				unlockedHats});

			debug("Loaded data: " + JSON.stringify(saveData));

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
			switchSpecies(currentSpecies, false);
			switchHat(currentHat, false);
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

		/**
		 * Merge new save data with the currently stored save data, ensuring that unlocks are not lost
		 * @param {Partial<BirbSaveData>} storedSave
		 * @param {Partial<BirbSaveData>} currentSave 
		 * @returns {Partial<BirbSaveData>}
		 */
		function mergeSaves(storedSave, currentSave) {
			const mergedUnlockedSpecies = Array.from(new Set([...(storedSave.unlockedSpecies ?? []), ...(currentSave.unlockedSpecies ?? [])]));
			const mergedUnlockedHats = Array.from(new Set([...(storedSave.unlockedHats ?? []), ...(currentSave.unlockedHats ?? [])]));
			return {
				...storedSave,
				unlockedSpecies: mergedUnlockedSpecies,
				unlockedHats: mergedUnlockedHats
			};
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

			// Create shadow dom
			const shadowHost = document.createElement("div");
			shadowHost.id = "birb-shadow-host";
			document.body.appendChild(shadowHost);
			const shadowRoot = shadowHost.attachShadow({ mode: "open" });
			setShadowRoot(shadowRoot);

			load().then(onLoad);
		}

		function onLoad() {
			injectStyleElement(getContext().getFontStyles());
			injectStyleElement(STYLESHEET);
			updateBirbScale();
			updateUIScale();
			birb = new Birb(BIRB_CSS_SCALE, CANVAS_PIXEL_SIZE, SPRITE_SHEET, SPRITE_WIDTH, SPRITE_HEIGHT, HATS_SPRITE_SHEET);
			birb.setAnimation(Animations.BOB);

			window.addEventListener("scroll", () => {
				lastActionTimestamp = Date.now();
			});
			window.addEventListener("focus", () => {
				load();
			});

			onClick(document, (e) => {
				lastActionTimestamp = Date.now();
				const path = e.composedPath();
				if (path.some(el => el instanceof Element && el.id === MENU_EXIT_ID)) {
					removeMenu();
				}
			});

			const birbElement = birb.getElement();

			onClick(birbElement, () => {
				if (birb.getCurrentAnimation() === Animations.HEART && (Date.now() - lastPetTimestamp < PET_MENU_COOLDOWN)) {
					// Currently being pet, don't open menu
					return;
				}
				if (settings().firstTime) {
					firstTimeSetup();
				} else {
					let menuTitle = `${birdBirb().toLowerCase()}OS`;
					if (hasName()) {
						menuTitle = settings().name;
					}
					insertMenu(menuItems, menuTitle, updateMenuLocation, requestNewName);
				}
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

			flyToElement(true);
		}

		function firstTimeSetup() {
			requestNewName();
			userSettings.firstTime = false;
			save();
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
						flyToElement();
						lastActionTimestamp = Date.now();
					} else if (Math.random() < FOCUS_SWITCH_CHANCE) {
						// Fly to another element if idle for a longer while
						flyToElement();
						lastActionTimestamp = Date.now();
					}
				}
			} else if (currentState === States.HOP) {
				if (updateParabolicPath(HOP_SPEED)) {
					setState(States.IDLE);
				}
			}

			if (birb.isVisible() && document.hasFocus() && Date.now() - lastActionTimestamp < SUPER_AFK_TIME) {
				const featherMod = getContext().getFeatherChanceMod();
				const hatMod = getContext().getHatChanceMod();
				if (Math.random() < FEATHER_CHANCE * featherMod * (isPetBoostActive() ? PET_FEATHER_BOOST : 1)) {
					lastPetTimestamp = 0;
					activateFeather();
				}
				if (Math.random() < (HAT_CHANCE * hatMod * (isPetBoostActive() ? PET_HAT_BOOST : 1))) {
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
					flyToElement();
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
				flyToElement();
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
		 * Set the given CSS variable to the given value in the shadow dom and regular dom
		 * @param {string} name The name of the CSS variable (including --)
		 * @param {any} value The value to set the CSS variable to
		 */
		function setProperty(name, value) {
			/** @type {HTMLElement} */ (getShadowRoot().host).style.setProperty(name, value);
			document.documentElement.style.setProperty(name, value);
		}

		function updateBirbScale() {
			setProperty("--birb-scale", settings().birbScaleMultiplier * BIRB_CSS_SCALE);
		}

		function updateUIScale() {
			setProperty("--birb-ui-scale", settings().uiScaleMultiplier * UI_CSS_SCALE);
		}

		/**
		 * @param {string|null} stylesheetContents
		 */
		function injectStyleElement(stylesheetContents) {
			if (!stylesheetContents) {
				return;
			}
			// Insert into shadow dom
			const element = document.createElement("style");
			element.textContent = stylesheetContents;
			getShadowRoot().appendChild(element);
			// Insert into actual dom
			const documentElement = document.createElement("style");
			documentElement.textContent = stylesheetContents;
			document.head.appendChild(documentElement);
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

			getShadowRoot().appendChild(window);
			makeDraggable(header);

			makeClosable(() => {
				window.remove();
			}, closeButton);

			return window;
		}

		function activateFeather() {
			if (getShadowRoot().querySelector("#" + FEATHER_ID)) {
				return;
			}
			const rarity = Math.random() < UNCOMMON_FEATHER_CHANCE ? RARITY.UNCOMMON : RARITY.COMMON;
			const speciesToUnlock = Object.keys(SPECIES).filter((species) => !unlockedSpecies.includes(species) && SPECIES[species].rarity === rarity);
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
			FEATHER_ANIMATIONS.feather.draw(featherCtx, Directions.LEFT, Date.now(), CANVAS_PIXEL_SIZE, type.getColorScheme(), type.tags);
			getShadowRoot().appendChild(featherCanvas);
			onClick(featherCanvas, () => {
				unlockBird(birdType);
				removeFeather();
			});
		}

		function removeFeather() {
			const feather = getShadowRoot().querySelector("#" + FEATHER_ID);
			if (feather) {
				feather.remove();
			}
		}

		/**
		 * Insert the hat as an item element in the document if possible
		 */
		function insertHat() {
			if (getShadowRoot().querySelector("#" + HAT_ID)) {
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
			hatAnimation.draw(hatCtx, Directions.LEFT, Date.now(), CANVAS_PIXEL_SIZE, {}, [TAG.DEFAULT]);

			// Position hat above the element
			const rect = element.getBoundingClientRect();
			hatCanvas.style.left = (rect.left + rect.width / 2 - hatCanvas.width / 2) + "px";
			hatCanvas.style.top = (rect.top - hatCanvas.height + window.scrollY) + "px";

			// Append to shadow dom
			getShadowRoot().appendChild(hatCanvas);
		}

		/**
		 * @param {string} birdType
		 * @param {boolean} [showMessage]
		 */
		function unlockBird(birdType, showMessage = true) {
			if (!unlockedSpecies.includes(birdType)) {
				unlockedSpecies.push(birdType);
				save();
				const message = makeElement("birb-message-content");
				message.appendChild(document.createTextNode("You've found a "));
				const bold = document.createElement("b");
				bold.textContent = SPECIES[birdType].name;
				message.appendChild(bold);
				message.appendChild(document.createTextNode(" feather! Use the Field Guide to switch your bird's species."));
				removeFieldGuide();
				if (showMessage) {
					insertModal("New Bird Unlocked!", message, "love it");
				}
			}
		}

		/**
		 * @param {string} hatId 
		 */
		function unlockHat(hatId) {
			if (!unlockedHats.includes(hatId)) {
				unlockedHats.push(hatId);
				save();
				const message = makeElement("birb-message-content");
				message.appendChild(document.createTextNode("You've unlocked the "));
				const bold = document.createElement("b");
				bold.textContent = HAT_METADATA[hatId].name;
				message.appendChild(bold);
				message.appendChild(document.createTextNode("! To see all of your unlocked accessories, click the Wardrobe from the menu."));
				removeWardrobe();
				insertModal("New Hat Found!", message, "good stuff");
			}
		}

		function updateFeather() {
			const feather = getShadowRoot().querySelector("#birb-feather");
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
		 * @param {string} closeText
		 * @param {string} [actionText]
		 * @param {() => void} [actionCallback]
		 */
		function insertModal(title, content, closeText, actionText, actionCallback) {
			if (getShadowRoot().querySelector("#" + FIELD_GUIDE_ID)) {
				return;
			}
			const innerContainer = makeElement("birb-modal-content");
			const buttonContainer = makeElement("birb-modal-buttons");
			const defaultButton = makeElement("birb-modal-button", closeText);
			const actionButton = actionText ? makeElement("birb-modal-button", actionText) : null;
			innerContainer.appendChild(content);
			buttonContainer.appendChild(defaultButton);
			if (actionButton) {
				actionButton.classList.add("birb-modal-action-button");
				defaultButton.classList.add("birb-modal-negative-button");
				buttonContainer.appendChild(actionButton);
			}
			innerContainer.appendChild(buttonContainer);

			const modal = createWindow("birb-modal", title, innerContainer);
			makeClosable(() => {
				modal.remove();
			}, defaultButton);
			if (actionButton) {
				buttonContainer.appendChild(actionButton);
				onClick(actionButton, () => {
					if (actionCallback) {
						actionCallback();
					}
					modal.remove();
				});
			}

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
		/**
		 * @returns Whether the user has unlocked any secret birds
		 */
		function hasUnlockedSecrets() {
			for (const [id, type] of Object.entries(SPECIES)) {
				const unlocked = unlockedSpecies.includes(id);
				if (type.rarity === RARITY.SECRET && unlocked) {
					return true;
				}
			}
			return false;
		}

		function insertFieldGuide() {
			if (getShadowRoot().querySelector("#" + FIELD_GUIDE_ID)) {
				return;
			}
			// Remove wardrobe if open
			removeWardrobe();

			const contentContainer = document.createElement("div");
			const familiarBirds = makeElement("birb-grid-content");
			const uncommonBirds = makeElement("birb-grid-content");
			const secretBirds = makeElement("birb-grid-content");

			const familiarLabel = document.createElement("div");
			familiarLabel.className = "birb-field-guide-section-label";
			familiarLabel.textContent = `----- Familiar ${birdBirb()}s -----`;

			const uncommonLabel = document.createElement("div");
			uncommonLabel.className = "birb-field-guide-section-label";
			uncommonLabel.textContent = `----- Uncommon ${birdBirb()}s -----`;
			uncommonLabel.title = "Arbitrarily classified birds that are a little harder to find, but worth the wait!";

			const secretLabel = document.createElement("div");
			secretLabel.className = "birb-field-guide-section-label";
			secretLabel.textContent = `----- Secret ${birdBirb()}s -----`;
			secretLabel.title = "Why wait for Easter to collect easter eggs?";

			const description = makeElement("birb-field-guide-description");
			contentContainer.appendChild(familiarLabel);
			contentContainer.appendChild(familiarBirds);
			contentContainer.appendChild(uncommonLabel);
			contentContainer.appendChild(uncommonBirds);
			if (hasUnlockedSecrets()) {
				contentContainer.appendChild(secretLabel);
				contentContainer.appendChild(secretBirds);
			}
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


				const spacerOne = document.createElement("div");
				spacerOne.style.height = "0.3em";

				const latinName = document.createElement("a");
				latinName.className = "birb-field-guide-latin-name";
				latinName.textContent = type.latinName;
				latinName.href = type.url;
				latinName.target = "_blank";

				const spacerTwo = document.createElement("div");
				spacerTwo.style.height = "0.4em";

				const descText = document.createTextNode(!unlocked ? "Not yet unlocked" : type.description);

				const fragment = document.createDocumentFragment();
				fragment.appendChild(boldName);
				fragment.appendChild(spacerOne);
				fragment.appendChild(latinName);
				fragment.appendChild(spacerTwo);
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
				birb.getFrames().base.draw(speciesCtx, Directions.RIGHT, CANVAS_PIXEL_SIZE, type.getColorScheme(), type.tags);
				speciesElement.appendChild(speciesCanvas);
				let section = familiarBirds;
				if (type.rarity === RARITY.UNCOMMON) {
					section = uncommonBirds;
				} else if (type.rarity === RARITY.SECRET) {
					section = secretBirds;
				}
				section.appendChild(speciesElement);
				if (unlocked) {
					onClick(speciesElement, () => {
						switchSpecies(id);
						getShadowRoot().querySelectorAll(".birb-grid-item").forEach((element) => {
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
			const fieldGuide = getShadowRoot().querySelector("#" + FIELD_GUIDE_ID);
			if (fieldGuide) {
				fieldGuide.remove();
			}
		}

		function insertWardrobe() {
			if (getShadowRoot().querySelector("#" + WARDROBE_ID)) {
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
					SPECIES[currentSpecies].getColorScheme(),
					[...SPECIES[currentSpecies].tags, hat]
				);
				hatElement.appendChild(hatCanvas);
				content.appendChild(hatElement);
				if (unlocked) {
					onClick(hatElement, () => {
						switchHat(hat);
						getShadowRoot().querySelectorAll(".birb-grid-item").forEach((element) => {
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
			const wardrobe = getShadowRoot().querySelector("#" + WARDROBE_ID);
			if (wardrobe) {
				wardrobe.remove();
			}
		}

		/**
		 * @param {string} type
		 * @param {boolean} [updateSave]
		 */
		function switchSpecies(type, updateSave = true) {
			if (!SPECIES[type]) {
				console.warn(`Species ${type} missing, falling back to bluebird`);
				type = DEFAULT_BIRD;
			}
			currentSpecies = type;
			setProperty("--birb-highlight", SPECIES[type].highlightColor);
			/** @type {HTMLElement} */ (getShadowRoot().host).style.setProperty("--birb-highlight", SPECIES[type].highlightColor);
			if (updateSave) {
				save();
			}
		}

		/**
		 * @param {string} hat
		 * @param {boolean} [updateSave]
		 */
		function switchHat(hat, updateSave = true) {
			currentHat = hat;
			if (updateSave) {
				save();
			}
		}

		/**
		 * Prompt the user for a new name for their pet
		 */
		function requestNewName() {
			const message = makeElement("birb-message-content");
			let text = `What would you like to name your ${birdBirb().toLowerCase()}?`;
			if (settings().firstTime) {
				text = "Congratulations on adopting your new friend! " + text + "\n (You can always change this later in the settings)";
			}
			message.appendChild(document.createTextNode(text));
			const input = document.createElement("input");
			input.placeholder = "Type here...";
			if (settings().name) {
				input.value = settings().name;
			}
			input.maxLength = 25;
			input.className = "birb-message-input";
			message.appendChild(input);
			insertModal(`Name Your Pet`, message, "never mind", "go for it", () => {
				const name = input.value.trim();
				setName(name);
				if (name === "") {
					const confirm = makeElement("birb-message-content", `Your ${birdBirb().toLowerCase()} shall remain nameless for now!`);
					insertModal(`Name Reset`, confirm, "no worries");
				} else if (SECRET_BIRDS[name] !== undefined) {
					const speciesId = name;
					unlockBird(speciesId, false);
					const confirm = makeElement("birb-message-content", `Well done, you've found a secret ${birdBirb().toLowerCase()}! Check the field guide to see your new discovery.`);
					insertModal(`Easter Egg`, confirm, "oh dang");
				} else {
					const confirm = makeElement("birb-message-content", `Great choice, your ${birdBirb().toLowerCase()} shall now be known as ${name}!`);
					insertModal(`Name Confirmed`, confirm, "nice");
				}
			});
		}
		
		/**
		 * Set the name of the bird and save it to settings
		 * @param {string} name
		 */
		function setName(name) {
			name = name.trim();
			userSettings.name = name;
			save();
		}

		/**
		 * @returns Whether the user has set a name or not
		 */
		function hasName() {
			return settings().name && settings().name != "";
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
			const largeElements = /** @type {HTMLElement[]} */ (Array.from(visible).filter((img) => img instanceof HTMLElement && img !== focusedElement && img.offsetWidth >= MIN_FOCUS_ELEMENT_WIDTH));
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
		 * Fly to an element within the viewport
		 * @param {boolean} [teleport] Whether to teleport to the element instead of flying
		 * @returns Whether an element to fly to was found (null if flying to the ground)
		 */
		function flyToElement(teleport = false) {
			if (frozen) {
				return false;
			}
			const previousElement = focusedElement;
			focusedElement = getRandomValidElement();
			updateFocusedElementBounds();
			if (teleport) {
				teleportTo(getFocusedElementRandomX(), getFocusedY());
			} else if (focusedElement !== previousElement) {
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

	initializeApplication(new LocalContext());

})();
