export const Directions = {
	LEFT: -1,
	RIGHT: 1,
};

let debugMode = location.hostname === "127.0.0.1";

/**
 * @returns {boolean} Whether debug mode is enabled
 */
export function isDebug() {
	return debugMode;
}

/**
 * @param {boolean} value
 */
export function setDebug(value) {
	debugMode = value;
}

/**
 * Create an HTML element with the specified parameters
 * @param {string} className
 * @param {string} [textContent]
 * @param {string} [id]
 * @returns {HTMLElement}
 */
export function makeElement(className, textContent, id) {
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
export function onClick(element, action) {
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
export function makeDraggable(element, parent = true, callback = () => { }) {
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
export function makeClosable(func, closeButton) {
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
export function isMobile() {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function log() {
	console.log("Birb: ", ...arguments);
}

export function debug() {
	if (isDebug()) {
		console.debug("Birb: ", ...arguments);
	}
}

export function error() {
	console.error("Birb: ", ...arguments);
}

/**
 * Get a layer from a sprite sheet array
 * @param {string[][]} spriteSheet The sprite sheet pixel array
 * @param {number} spriteIndex The sprite index
 * @param {number} width The width of each sprite
 * @returns {string[][]}
 */
export function getLayer(spriteSheet, spriteIndex, width) {
	// From an array of a horizontal sprite sheet, get the layer for a specific sprite
	const layer = [];
	for (let y = 0; y < width; y++) {
		layer.push(spriteSheet[y].slice(spriteIndex * width, (spriteIndex + 1) * width));
	}
	return layer;
}