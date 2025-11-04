// @ts-check

import { rollup } from 'rollup';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, cpSync, createWriteStream } from 'fs';
import archiver from 'archiver';

// Path constants
const SRC_DIR = "./src";
const SPRITES_DIR = "./sprites";
const IMAGES_DIR = "./images";
const FONTS_DIR = "./fonts";
const DIST_DIR = "./dist";

const BROWSER_MANIFEST = "./browser-manifest.json";
const STYLESHEET_PATH = SRC_DIR + "/stylesheet.css";
const APPLICATION_ENTRY = SRC_DIR + "/application.js";
const BUNDLED_OUTPUT = DIST_DIR + "/birb.bundled.js";
const BIRB_OUTPUT = DIST_DIR + "/birb.js";
const USERSCRIPT_DIR = DIST_DIR + "/userscript";
const EXTENSION_DIR = DIST_DIR + "/extension";
const EXTENSION_ZIP = DIST_DIR + "/extension.zip";

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

const STYLESHEET_KEY = "___STYLESHEET___";

const now = new Date();
const versionDate = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;

// Get current build number from the browser-manifest.json
let buildNumber = 0;
try {
	const manifest = JSON.parse(readFileSync(BROWSER_MANIFEST, 'utf8'));
	if (manifest.version) {
		if (manifest.version.startsWith(versionDate)) {
			// Same day, increment build number
			const parts = manifest.version.split('.');
			if (parts.length === 4) {
				buildNumber = parseInt(parts[3], 10) + 1;
			}
		}
	}
} catch (e) {
	console.error("Could not read version from browser manifest");
	throw e;
}

// Update manifest.json with new version
const version = `${versionDate}.${buildNumber}`;
try {
	const manifest = JSON.parse(readFileSync(BROWSER_MANIFEST, 'utf8'));
	manifest.version = version;
	writeFileSync(BROWSER_MANIFEST, JSON.stringify(manifest, null, 4), 'utf8');
} catch (e) {
	console.error("Could not update version in browser manifest");
	throw e;
}

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
birbJs = birbJs.replaceAll('__VERSION__', version);

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
mkdirSync(USERSCRIPT_DIR, { recursive: true });
const userScript = userScriptHeader + birbJs;
writeFileSync(USERSCRIPT_DIR + '/birb.user.js', userScript);

// Build browser extension
mkdirSync(EXTENSION_DIR, { recursive: true });

// Copy birb.js
writeFileSync(EXTENSION_DIR + '/birb.js', birbJs);

// Copy manifest.json
const manifestContent = readFileSync(BROWSER_MANIFEST, 'utf8');
writeFileSync(EXTENSION_DIR + '/manifest.json', manifestContent);

// Copy icons folder
mkdirSync(EXTENSION_DIR + '/images/icons', { recursive: true });
cpSync(IMAGES_DIR + '/icons/transparent', EXTENSION_DIR + '/images/icons/transparent', { recursive: true });

// Copy fonts folder
mkdirSync(EXTENSION_DIR + '/fonts', { recursive: true });
cpSync(FONTS_DIR, EXTENSION_DIR + '/fonts', { recursive: true });

// Compress extension folder into zip
const output = createWriteStream(EXTENSION_ZIP);
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

console.log(`Build complete: ${version}`);