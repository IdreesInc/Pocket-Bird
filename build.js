// @ts-check

import { rollup } from 'rollup';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';

const spriteSheets = [
	{
		key: "__SPRITE_SHEET__",
		path: "./sprites/birb.png"
	},
	{
		key: "__FEATHER_SPRITE_SHEET__",
		path: "./sprites/feather.png"
	},
	{
		key: "__DECORATIONS_SPRITE_SHEET__",
		path: "./sprites/decorations.png"
	}
];

const STYLESHEET_PATH = "./stylesheet.css";
const STYLESHEET_KEY = "___STYLESHEET___";

const now = new Date();
const versionDate = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;

// Get current build number from manifest.json
let buildNumber = 0;
try {
	const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
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
	console.error("Could not read version from manifest.json");
	throw e;
}

// Update manifest.json with new version
const version = `${versionDate}.${buildNumber}`;
try {
	const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
	manifest.version = version;
	writeFileSync('manifest.json', JSON.stringify(manifest, null, 4), 'utf8');
} catch (e) {
	console.error("Could not update version in manifest.json");
	throw e;
}

const userScriptHeader =
`// ==UserScript==
// @name         Pocket Bird
// @namespace    https://idreesinc.com
// @version      ${version}
// @description  birb
// @author       Idrees
// @downloadURL  https://github.com/IdreesInc/Pocket-Bird/raw/refs/heads/main/dist/birb.user.js
// @updateURL    https://github.com/IdreesInc/Pocket-Bird/raw/refs/heads/main/dist/birb.user.js
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

`;

// Bundle with rollup
const bundle = await rollup({
	input: 'src/birb.js',
});

await bundle.write({
	file: 'dist/birb.bundled.js',
	format: 'iife',
});

await bundle.close();

let birbJs = readFileSync('dist/birb.bundled.js', 'utf8');

// Compile and insert sprite sheets
for (const spriteSheet of spriteSheets) {
	const dataUri = readFileSync(spriteSheet.path, 'base64');
	birbJs = birbJs.replaceAll(spriteSheet.key, `data:image/png;base64,${dataUri}`);
}

// Insert stylesheet
const stylesheetContent = readFileSync(STYLESHEET_PATH, 'utf8');
birbJs = birbJs.replace(STYLESHEET_KEY, stylesheetContent);

// Build standard javascript file
writeFileSync('./dist/birb.js', birbJs);

// Delete bundled file
unlinkSync('./dist/birb.bundled.js');

// Build user script
const userScript = userScriptHeader + birbJs;
writeFileSync('./dist/birb.user.js', userScript);