export class MenuItem {
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

export class DebugMenuItem extends MenuItem {
	/**
	 * @param {string} text
	 * @param {() => void} action
	 */
	constructor(text, action, removeMenu = true) {
		super(text, action, removeMenu, true);
	}
}

export class Separator extends MenuItem {
	constructor() {
		super("", () => { });
	}
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
 * @param {string} menuId
 * @param {string} menuExitId
 * @param {MenuItem[]} menuItems
 * @param {string} title
 * @param {boolean} debugMode
 * @param {(menu: HTMLElement) => void} updateLocationCallback
 */
export function insertMenu(menuId, menuExitId, menuItems, title, debugMode, updateLocationCallback) {
	if (document.querySelector("#" + menuId)) {
		return;
	}
	let menu = makeElement("birb-window", undefined, menuId);
	let header = makeElement("birb-window-header");
	header.innerHTML = `<div class="birb-window-title">${title}</div>`;
	let content = makeElement("birb-window-content");
	const removeCallback = () => removeMenu(menuId, menuExitId);
	for (const item of menuItems) {
		if (!item.isDebug || debugMode) {
			content.appendChild(makeMenuItem(item, removeCallback));
		}
	}
	menu.appendChild(header);
	menu.appendChild(content);
	document.body.appendChild(menu);
	makeDraggable(document.querySelector(".birb-window-header"));

	let menuExit = makeElement("birb-window-exit", undefined, menuExitId);
	onClick(menuExit, removeCallback);
	document.body.appendChild(menuExit);
	makeClosable(removeCallback);

	updateLocationCallback(menu);
}

/**
 * Remove the menu from the page
 * @param {string} menuId
 * @param {string} menuExitId
 */
export function removeMenu(menuId, menuExitId) {
	const menu = document.querySelector("#" + menuId);
	if (menu) {
		menu.remove();
	}
	const exitMenu = document.querySelector("#" + menuExitId);
	if (exitMenu) {
		exitMenu.remove();
	}
}

/**
 * @param {string} menuId
 * @returns {boolean} Whether the menu element is on the page
 */
export function isMenuOpen(menuId) {
	return document.querySelector("#" + menuId) !== null;
}

/**
 * @param {string} menuId
 * @param {MenuItem[]} menuItems
 * @param {boolean} debugMode
 * @param {(menu: HTMLElement) => void} updateLocationCallback
 */
export function switchMenuItems(menuId, menuItems, debugMode, updateLocationCallback) {
	const menu = document.querySelector("#" + menuId);
	if (!menu || !(menu instanceof HTMLElement)) {
		return;
	}
	const content = menu.querySelector(".birb-window-content");
	if (!content) {
		console.error("Birb: Content not found");
		return;
	}
	content.innerHTML = "";
	const removeCallback = () => removeMenu(menuId, menuId + "-exit");
	for (const item of menuItems) {
		if (!item.isDebug || debugMode) {
			content.appendChild(makeMenuItem(item, removeCallback));
		}
	}
	updateLocationCallback(menu);
}
