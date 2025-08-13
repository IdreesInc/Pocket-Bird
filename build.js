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

let birbJs = readFileSync('birb.js', 'utf8');

for (const spriteSheet of spriteSheets) {
	const dataUri = readFileSync(spriteSheet.path, 'base64');
	birbJs = birbJs.replaceAll(spriteSheet.key, `data:image/png;base64,${dataUri}`);
}

writeFileSync('./dist/birb.js', birbJs);