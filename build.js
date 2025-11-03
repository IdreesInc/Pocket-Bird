// @ts-check

import { rollup } from 'rollup';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, cpSync, createWriteStream } from 'fs';
import archiver from 'archiver';

const spriteSheets = [
	{
		key: "__SPRITE_SHEET__",
		path: "./sprites/birb.png"
	},
	{
		key: "__FEATHER_SPRITE_SHEET__",
		path: "./sprites/feather.png"
	}
];

const STYLESHEET_PATH = "./src/stylesheet.css";
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
	input: 'src/application.js',
});

await bundle.write({
	file: 'dist/birb.bundled.js',
	format: 'iife',
});

await bundle.close();

let birbJs = readFileSync('dist/birb.bundled.js', 'utf8');

// Delete bundled file
unlinkSync('./dist/birb.bundled.js');

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
writeFileSync('./dist/birb.js', birbJs);

// Build user script
mkdirSync('./dist/userscript', { recursive: true });
const userScript = userScriptHeader + birbJs;
writeFileSync('./dist/userscript/birb.user.js', userScript);

// Build browser extension
mkdirSync('./dist/extension', { recursive: true });
// Copy birb.js
writeFileSync('./dist/extension/birb.js', birbJs);
// Copy manifest.json
const manifestContent = readFileSync('./manifest.json', 'utf8');
writeFileSync('./dist/extension/manifest.json', manifestContent);
// Copy icons folder
mkdirSync('./dist/extension/images/icons', { recursive: true });
cpSync('./images/icons/transparent', './dist/extension/images/icons/transparent', { recursive: true });
// Copy fonts folder
mkdirSync('./dist/extension/fonts', { recursive: true });
cpSync('./fonts', './dist/extension/fonts', { recursive: true });

// Compress extension folder into zip
const output = createWriteStream('./dist/extension.zip');
const archive = archiver('zip');

output.on('close', () => {
	console.log(`Created zip file: ${archive.pointer()} total bytes`);
});

archive.on('error', (err) => {
	throw err;
});

archive.pipe(output);
archive.directory('./dist/extension/', false);
archive.finalize();

console.log(`Build completed: version ${version}`);