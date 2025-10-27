import {
	isDebug,
	makeElement,
	onClick,
	makeDraggable,
	makeClosable,
	error
} from './shared.js';

export const MENU_ID = "birb-menu";
export const MENU_EXIT_ID = "birb-menu-exit";

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
export function insertMenu(menuItems, title, updateLocationCallback) {
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
export function removeMenu() {
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
export function isMenuOpen() {
	return document.querySelector("#" + MENU_ID) !== null;
}

/**
 * @param {MenuItem[]} menuItems
 * @param {(menu: HTMLElement) => void} updateLocationCallback
 */
export function switchMenuItems(menuItems, updateLocationCallback) {
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
		if (!item.isDebug || isDebug()) {
			content.appendChild(makeMenuItem(item, removeCallback));
		}
	}
	updateLocationCallback(menu);
}
