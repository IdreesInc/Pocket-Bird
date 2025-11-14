import {
	makeElement,
	makeDraggable,
	makeClosable
} from './shared.js';
import { getContext } from './context.js';

/**
 * @typedef {Object} SavedStickyNote
 * @property {string} id
 * @property {string} site
 * @property {string} content
 * @property {number} top
 * @property {number} left
 */

export class StickyNote {
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
export function renderStickyNote(stickyNote, page, onSave, onDelete) {
	const noteElement = makeElement("birb-window");
	noteElement.classList.add("birb-sticky-note");
	
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
		}, closeButton);
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
export function drawStickyNotes(stickyNotes, onSave, onDelete) {
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
export function createNewStickyNote(stickyNotes, onSave, onDelete) {
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
