// @ts-check

import { rollup } from 'rollup';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, cpSync, createWriteStream } from 'fs';
import archiver from 'archiver';
import { PNG } from 'pngjs';

import species from "./src/species.js";

// Path constants
const BUILD_CACHE_PATH = "./build-cache.json";
const SRC_DIR = "./src";
const SPRITES_DIR = "./sprites";
const IMAGES_DIR = "./images";
const FONTS_DIR = "./fonts";
const DIST_DIR = "./dist";

const WEB_DIR = DIST_DIR + "/web";
const USERSCRIPT_DIR = DIST_DIR + "/userscript";
const EXTENSION_DIR = DIST_DIR + "/extension";
const OBSIDIAN_DIR = DIST_DIR + "/obsidian";

const STYLESHEET_PATH = SRC_DIR + "/stylesheet.css";

const WEB_ENTRY = SRC_DIR + "/platforms/web/web.js";
const USERSCRIPT_ENTRY = SRC_DIR + "/platforms/userscript/userscript.js";
const BROWSER_EXTENSION_ENTRY = SRC_DIR + "/platforms/extension/extension.js";
const OBSIDIAN_ENTRY = SRC_DIR + "/platforms/obsidian/obsidian.js";

const BROWSER_MANIFEST = SRC_DIR + "/platforms/extension/manifest.json";
const OBSIDIAN_MANIFEST = SRC_DIR + "/platforms/obsidian/manifest.json";
const USERSCRIPT_HEADER = SRC_DIR + "/platforms/userscript/header.txt";
const OBSIDIAN_WRAPPER = SRC_DIR + "/platforms/obsidian/wrapper.js";

const TEMP_BUNDLED_OUTPUT = DIST_DIR + "/birb.bundled.js";

const MONOCRAFT_URL = "https://cdn.jsdelivr.net/gh/idreesinc/Monocraft@99b32ab40612ff2533a69d8f14bd8b3d9e604456/dist/Monocraft.otf";

const VERSION_KEY = "__VERSION__";
const STYLESHEET_KEY = "___STYLESHEET___";
const MONOCRAFT_URL_KEY = "__MONOCRAFT_URL__";
const CODE_KEY = "__CODE__";
const BIRB_PIXELS_KEY = "__BIRB_PIXELS__";
const FEATHER_PIXELS_KEY = "__FEATHER_PIXELS__";
const HAT_PIXELS_KEY = "__HAT_PIXELS__";
const SPECIES_PALETTES_KEY = "__SPECIES_PALETTES__";

/** @type {Record<string, any>} */
let buildCache = {};
try {
	const cacheContent = readFileSync(BUILD_CACHE_PATH, 'utf8');
	buildCache = JSON.parse(cacheContent);
} catch (e) {
	console.warn("No build cache found, starting fresh");
}

const now = new Date();
const versionDate = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;

// Get current build number from the build cache
let buildNumber = 0;

if (buildCache.version && buildCache.version.startsWith(versionDate)) {
	// Same day, increment build number
	const parts = buildCache.version.split('.');
	if (parts.length === 4) {
		buildNumber = parseInt(parts[3], 10) + 1;
	}
}

// const version = `${versionDate}.${buildNumber}`;
const version = `${versionDate}`; // Disable build number for now

// Update build cache
buildCache.version = version;
writeFileSync(BUILD_CACHE_PATH, JSON.stringify(buildCache), 'utf8');

/**
 * @param {string} entryPoint
 * @param {boolean} [embedFont]
 * @returns {Promise<string>}
 */
async function generateCode(entryPoint, embedFont = false) {
	// Generate sprite data
	const birbImageData = getImageData(SPRITES_DIR + "/birb.png");
	const templateMapping = createTemplateMapping(SPRITES_DIR + "/birb.png", 32);
	const birbPixels = loadSpriteSheetPixels(SPRITES_DIR + "/birb.png", templateMapping);
	const featherPixels = loadSpriteSheetPixels(SPRITES_DIR + "/feather.png", templateMapping);
	const hatPixels = loadSpriteSheetPixels(SPRITES_DIR + "/hats.png", {});
	const speciesPalettes = Object.fromEntries(
		Object.entries(species).map(([id, data]) => [
			id,
			extractPalette(SPRITES_DIR + "/species.png", data.spriteIndex * 32, 32)
		])
	);

	// Bundle with rollup
	const bundle = await rollup({
		input: entryPoint,
	});

	await bundle.write({
		file: TEMP_BUNDLED_OUTPUT,
		format: 'iife',
	});

	await bundle.close();

	let birbJs = readFileSync(TEMP_BUNDLED_OUTPUT, 'utf8');

	// Delete bundled file
	unlinkSync(TEMP_BUNDLED_OUTPUT);

	// Replace version placeholder
	birbJs = birbJs.replaceAll(VERSION_KEY, version);

	// Replace CDN font URL placeholder
	if (embedFont) {
		// Embed as a base64 data URI so the build works fully offline.
		const monocraftFontData = readFileSync(FONTS_DIR + '/Monocraft.otf', 'base64');
		birbJs = birbJs.replaceAll(MONOCRAFT_URL_KEY, `data:font/otf;base64,${monocraftFontData}`);
	} else {
		birbJs = birbJs.replaceAll(MONOCRAFT_URL_KEY, MONOCRAFT_URL);
	}

	// Compile and insert sprite sheets
	// for (const spriteSheet of spriteSheets) {
	// 	const dataUri = readFileSync(spriteSheet.path, 'base64');
	// 	birbJs = birbJs.replaceAll(spriteSheet.key, `data:image/png;base64,${dataUri}`);
	// }

	birbJs = birbJs.replace(`"${BIRB_PIXELS_KEY}"`, JSON.stringify(birbPixels));
	birbJs = birbJs.replace(`"${FEATHER_PIXELS_KEY}"`, JSON.stringify(featherPixels));
	birbJs = birbJs.replace(`"${HAT_PIXELS_KEY}"`, JSON.stringify(hatPixels));
	birbJs = birbJs.replace(`"${SPECIES_PALETTES_KEY}"`, JSON.stringify(speciesPalettes));

	// Insert stylesheet
	const stylesheetContent = readFileSync(STYLESHEET_PATH, 'utf8');
	birbJs = birbJs.replace(STYLESHEET_KEY, stylesheetContent);

	return birbJs;
}

/**
 * @param {string} src
 * @returns {{width: number, height: number, data: Uint8Array}}
 */
function getImageData(src) {
	return PNG.sync.read(readFileSync(src));
}

/**
 * Load a sprite sheet image and convert it to a 2D array of palette color names
 * @param {string} src URL or data URI of the sprite sheet image
 * @param {Object<string, string>} templateMapping Mapping of template colors to location keys
 * @returns {string[][]}
 */
function loadSpriteSheetPixels(src, templateMapping) {
	const imageData = getImageData(src);
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
 * @param {string} src
 * @param {number} start
 * @param {number} width
 * @returns {{ [key: string]: string }}
 */
function extractPalette(src, start, width) {
	/** @type {{ [key: string]: string }} */
	let map = {};
	const imageData = getImageData(src);
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
 * @param {string} src
 * @param {number} width
 */
function createTemplateMapping(src, width) {
	/** @type {{ [key: string]: string }} */
	let map = {};
	const imageData = getImageData(src);
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
 * @param {number} row
 * @param {number} col
 * @returns {string}
 */
function key(row, col) {
	return row + "x" + col;
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

/**
 * @param {string} hex The hex color to convert
 * @returns {[number, number, number]} The RGB values as an array of [red, green, blue]
 */
function hexToRgb(hex) {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

async function buildWeb() {
	const birbJs = await generateCode(WEB_ENTRY);
	mkdirSync(WEB_DIR, { recursive: true });
	writeFileSync(WEB_DIR + '/birb.js', birbJs);
	writeFileSync(WEB_DIR + '/birb.embed.js', birbJs);
}

async function buildUserscript() {
	const birbJs = await generateCode(USERSCRIPT_ENTRY);

	// Get userscript header
	const userScriptHeader = readFileSync(USERSCRIPT_HEADER, 'utf8').replaceAll(VERSION_KEY, version);

	mkdirSync(USERSCRIPT_DIR, { recursive: true });
	const userScript = userScriptHeader + "\n" + birbJs;
	writeFileSync(USERSCRIPT_DIR + '/birb.user.js', userScript);
}

async function buildExtension() {
	const birbJs = await generateCode(BROWSER_EXTENSION_ENTRY);

	mkdirSync(EXTENSION_DIR, { recursive: true });

	// Copy birb.js
	writeFileSync(EXTENSION_DIR + '/birb.js', birbJs);

	// Copy manifest.json
	let browserManifest = readFileSync(BROWSER_MANIFEST, 'utf8');
	browserManifest = browserManifest.replace(VERSION_KEY, version);
	writeFileSync(EXTENSION_DIR + '/manifest.json', browserManifest);

	// Copy icons folder
	mkdirSync(EXTENSION_DIR + '/images/icons', { recursive: true });
	cpSync(IMAGES_DIR + '/icons/transparent', EXTENSION_DIR + '/images/icons/transparent', { recursive: true });

	// Copy fonts folder
	mkdirSync(EXTENSION_DIR + '/fonts', { recursive: true });
	cpSync(FONTS_DIR, EXTENSION_DIR + '/fonts', { recursive: true });

	// Compress extension folder into zip
	const output = createWriteStream(DIST_DIR + "/extension.zip");
	const archive = archiver('zip');

	output.on('close', () => {
		console.log(`Created zip file: ${archive.pointer()} total bytes`);
	});

	archive.on('error', /** @param {Error} err */ (err) => {
		throw err;
	});

	archive.pipe(output);
	archive.directory(EXTENSION_DIR + '/', false);
	archive.finalize();
}

async function buildObsidian() {
	// embedFont=true: bakes the font as base64 so the plugin works fully offline.
	const birbJs = await generateCode(OBSIDIAN_ENTRY, true);

	mkdirSync(OBSIDIAN_DIR, { recursive: true });

	// Wrap birb.js with plugin boilerplate
	let obsidianPlugin = readFileSync(OBSIDIAN_WRAPPER, 'utf8').replace(VERSION_KEY, version).replace(CODE_KEY, birbJs);

	// Create main.js with plugin code
	writeFileSync(OBSIDIAN_DIR + '/main.js', obsidianPlugin);

	// Copy manifest.json
	let obsidianManifest = readFileSync(OBSIDIAN_MANIFEST, 'utf8');
	obsidianManifest = obsidianManifest.replace(/"version":\s*".*"/, `"version": "${version}"`);
	writeFileSync(OBSIDIAN_DIR + '/manifest.json', obsidianManifest);
}

console.log("Starting build...");

await buildWeb();
await buildUserscript();
await buildExtension();
await buildObsidian();

console.log("Build completed successfully!");