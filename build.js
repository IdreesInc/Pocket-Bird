// @ts-check

import { rollup } from 'rollup';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, cpSync, createWriteStream } from 'fs';
import archiver from 'archiver';

// Path constants
const BUILD_CACHE_PATH = "./build-cache.json";
const SRC_DIR = "./src";
const SPRITES_DIR = "./sprites";
const IMAGES_DIR = "./images";
const FONTS_DIR = "./fonts";
const DIST_DIR = "./dist";

const BROWSER_MANIFEST = "./browser-manifest.json";
const OBSIDIAN_MANIFEST = "./obsidian-manifest.json";
const USERSCRIPT_DIR = DIST_DIR + "/userscript";
const EXTENSION_DIR = DIST_DIR + "/extension";
const OBSIDIAN_DIR = DIST_DIR + "/obsidian";

const STYLESHEET_PATH = SRC_DIR + "/stylesheet.css";
const APPLICATION_ENTRY = SRC_DIR + "/application.js";
const BUNDLED_OUTPUT = DIST_DIR + "/birb.bundled.js";
const BIRB_OUTPUT = DIST_DIR + "/birb.js";

const VERSION_KEY = "__VERSION__";
const STYLESHEET_KEY = "___STYLESHEET___";

const spriteSheets = [
	{
		key: "__SPRITE_SHEET__",
		path: SPRITES_DIR + "/birb.png"
	},
	{
		key: "__FEATHER_SPRITE_SHEET__",
		path: SPRITES_DIR + "/feather.png"
	}
];

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

const version = `${versionDate}.${buildNumber}`;

// Update build cache
buildCache.version = version;
writeFileSync(BUILD_CACHE_PATH, JSON.stringify(buildCache), 'utf8');

// Bundle with rollup
const bundle = await rollup({
	input: APPLICATION_ENTRY,
});

await bundle.write({
	file: BUNDLED_OUTPUT,
	format: 'iife',
});

await bundle.close();

let birbJs = readFileSync(BUNDLED_OUTPUT, 'utf8');

// Delete bundled file
unlinkSync(BUNDLED_OUTPUT);

// Replace version placeholder
birbJs = birbJs.replaceAll(VERSION_KEY, version);

// Compile and insert sprite sheets
for (const spriteSheet of spriteSheets) {
	const dataUri = readFileSync(spriteSheet.path, 'base64');
	birbJs = birbJs.replaceAll(spriteSheet.key, `data:image/png;base64,${dataUri}`);
}

// Insert stylesheet
const stylesheetContent = readFileSync(STYLESHEET_PATH, 'utf8');
birbJs = birbJs.replace(STYLESHEET_KEY, stylesheetContent);

// Build standard javascript file
writeFileSync(BIRB_OUTPUT, birbJs);

// Build user script
const userScriptHeader =
	`// ==UserScript==
// @name         Pocket Bird
// @namespace    https://idreesinc.com
// @version      ${version}
// @description  It's a bird that hops around your web browser, the future is here 
// @author       Idrees
// @downloadURL  https://github.com/IdreesInc/Pocket-Bird/raw/refs/heads/main/dist/userscript/birb.user.js
// @updateURL    https://github.com/IdreesInc/Pocket-Bird/raw/refs/heads/main/dist/userscript/birb.user.js
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

`;
mkdirSync(USERSCRIPT_DIR, { recursive: true });
const userScript = userScriptHeader + birbJs;
writeFileSync(USERSCRIPT_DIR + '/birb.user.js', userScript);

// Build browser extension
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

archive.on('error', (err) => {
	throw err;
});

archive.pipe(output);
archive.directory(EXTENSION_DIR + '/', false);
archive.finalize();

// Build Obsidian plugin
mkdirSync(OBSIDIAN_DIR, { recursive: true });

// Wrap birb.js with plugin boilerplate
const obsidianPlugin = `
const { Plugin, Notice } = require('obsidian');
module.exports = class PocketBird extends Plugin {
	onload() {
		const OBSIDIAN_PLUGIN = this;
		${birbJs}
	}

	onunload() {
		// Remove the birb when the plugin is unloaded
		document.getElementById('birb')?.remove();
		console.log('Pocket Bird unloaded!');
	}
};`

// Create main.js with plugin code
writeFileSync(OBSIDIAN_DIR + '/main.js', obsidianPlugin);

// Copy manifest.json
let obsidianManifest = readFileSync(OBSIDIAN_MANIFEST, 'utf8');
obsidianManifest = obsidianManifest.replace(/"version":\s*".*"/, `"version": "${version}"`);
writeFileSync(OBSIDIAN_DIR + '/manifest.json', obsidianManifest);

console.log(`Build complete: ${version}`);