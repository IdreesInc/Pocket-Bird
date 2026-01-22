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
const MONOCRAFT_SRC_KEY = "__MONOCRAFT_SRC__";
const CODE_KEY = "__CODE__";

const spriteSheets = [
	{
		key: "__SPRITE_SHEET__",
		path: SPRITES_DIR + "/birb.png"
	},
	{
		key: "__FEATHER_SPRITE_SHEET__",
		path: SPRITES_DIR + "/feather.png"
	},
	{
		key: "__HATS_SPRITE_SHEET__",
		path: SPRITES_DIR + "/hats.png"
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

	// Compile and insert sprite sheets
	for (const spriteSheet of spriteSheets) {
		const dataUri = readFileSync(spriteSheet.path, 'base64');
		birbJs = birbJs.replaceAll(spriteSheet.key, `data:image/png;base64,${dataUri}`);
	}

	// Insert stylesheet
	const stylesheetContent = readFileSync(STYLESHEET_PATH, 'utf8');
	birbJs = birbJs.replace(STYLESHEET_KEY, stylesheetContent);

	if (embedFont) {
		// Encode font to data URI
		const monocraftFontData = readFileSync(FONTS_DIR + '/Monocraft.otf', 'base64');
		const monocraftDataUri = `data:font/otf;base64,${monocraftFontData}`;
		birbJs = birbJs.replaceAll(MONOCRAFT_SRC_KEY, monocraftDataUri);
	} else {
		birbJs = birbJs.replaceAll(MONOCRAFT_SRC_KEY, MONOCRAFT_URL);
	}
	return birbJs;
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

	archive.on('error', (err) => {
		throw err;
	});

	archive.pipe(output);
	archive.directory(EXTENSION_DIR + '/', false);
	archive.finalize();
}

async function buildObsidian() {
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