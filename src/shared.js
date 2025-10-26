export const Directions = {
	LEFT: -1,
	RIGHT: 1,
};

let debug = location.hostname === "127.0.0.1";

/**
 * @returns {boolean} Whether debug mode is enabled
 */
export function isDebug() {
	return debug;
}

/**
 * @param {boolean} debugMode
 */
export function setDebug(debugMode) {
	debug = debugMode;
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
		console.error("Birb: Parent element not found");
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