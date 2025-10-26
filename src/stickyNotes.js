import {
	makeElement,
	makeDraggable,
	makeClosable
} from './shared.js';

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
 * Parse URL parameters into a key-value map
 * @param {string} url
 * @returns {Record<string, string>}
 */
export function parseUrlParams(url) {
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
export function isStickyNoteApplicable(stickyNote) {
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
export function renderStickyNote(stickyNote, onSave, onDelete) {
	let html = `
		<div class="birb-window-header">
			<div class="birb-window-title">Sticky Note</div>
			<div class="birb-window-close">x</div>
		</div>
		<div class="birb-window-content">
			<textarea class="birb-sticky-note-input" style="width: 150px;" placeholder="Write your notes here and they'll stick to the page!">${stickyNote.content}</textarea>
		</div>`
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
export function drawStickyNotes(stickyNotes, onSave, onDelete) {
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
export function createNewStickyNote(stickyNotes, onSave, onDelete) {
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
