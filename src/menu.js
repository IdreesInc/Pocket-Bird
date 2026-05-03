import {
	isDebug,
	makeElement,
	onClick,
	makeDraggable,
	makeClosable,
	error,
	getShadowRoot
} from './shared.js';

export const MENU_ID = "birb-menu";
export const MENU_EXIT_ID = "birb-menu-exit";

export class MenuItem {
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

export class SpinnerMenuItem extends MenuItem {
	/**
	 * @param {string} text
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

export class ConditionalMenuItem extends MenuItem {
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

export class DebugMenuItem extends ConditionalMenuItem {
	/**
	 * @param {string} text
	 * @param {() => void} action
	 */
	constructor(text, action, removeMenu = true) {
		super(text, action, () => isDebug(), undefined, removeMenu);
	}
}

export class Separator extends MenuItem {
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
		const rightButton = makeElement("birb-spinner-button", "+");
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
 */
export function insertMenu(menuItems, title, updateLocationCallback) {
	if (getShadowRoot().querySelector("#" + MENU_ID)) {
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
export function removeMenu() {
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
export function isMenuOpen() {
	return getShadowRoot().querySelector("#" + MENU_ID) !== null;
}

/**
 * @param {MenuItem[]} menuItems
 * @param {(menu: HTMLElement) => void} updateLocationCallback
 */
export function switchMenuItems(menuItems, updateLocationCallback) {
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
