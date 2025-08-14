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
const userScriptHeader =
`// ==UserScript==
// @name         birb
// @namespace    https://idreesinc.com
// @version      2025-08-14
// @description  birb
// @author       Idrees
// @updateURL    https://github.com/IdreesInc/Birb/raw/refs/heads/main/dist/birb.user.js
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

`;


let birbJs = readFileSync('birb.js', 'utf8');

for (const spriteSheet of spriteSheets) {
	const dataUri = readFileSync(spriteSheet.path, 'base64');
	birbJs = birbJs.replaceAll(spriteSheet.key, `data:image/png;base64,${dataUri}`);
}

writeFileSync('./dist/birb.js', birbJs);

const userScript = userScriptHeader + birbJs;
writeFileSync('./dist/birb.user.js', userScript);