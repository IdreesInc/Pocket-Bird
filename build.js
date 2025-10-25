// @ts-check

import { readFileSync, writeFileSync } from 'fs';

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

let version = "0.0.0";
// Try to read version from manifest.json
try {
	const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
	if (manifest.version) {
		version = manifest.version;
	}
} catch (e) {
	console.error("Could not read version from manifest.json");
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


let birbJs = readFileSync('birb.js', 'utf8');

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

// Build user script
const userScript = userScriptHeader + birbJs;
writeFileSync('./dist/birb.user.js', userScript);