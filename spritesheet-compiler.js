
// @ts-check

const TRANSPARENT = 0;
const OUTLINE = 1;
const BORDER = 2;
const FOOT = 3;
const BEAK = 4;
const EYE = 5;
const FACE = 6;
const BELLY = 7;
const UNDERBELLY = 8;
const WING = 9;
const WING_EDGE = 10;
const HEART = 11;
const HEART_BORDER = 12;
const HEART_SHINE = 13;

const SPRITESHEET_COLOR_MAP = {
	"transparent": TRANSPARENT,
	"#ffffff": BORDER,
	"#000000": OUTLINE,
	"#010a19": BEAK,
	"#190301": EYE,
	"#af8e75": FOOT,
	"#639bff": FACE,
	"#f8b143": BELLY,
	"#ec8637": UNDERBELLY,
	"#578ae6": WING,
	"#326ed9": WING_EDGE,
	"#c82e2e": HEART,
	"#501a1a": HEART_BORDER,
	"#ff6b6b": HEART_SHINE
};

const SPRITE_SHEET_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASAAAAAgCAYAAACy9KU0AAAAAXNSR0IArs4c6QAABBdJREFUeJztnL9LHEEUx79zWkgk3RFwTRvsDKS5KpWpbDSVVQgkjSCYKkfIHyDBIhAhIAiBkOoqsUmVVDbaBFKkkLTxhHBgEQM28aU4Z53d25lddXfm1vt+4Ni5X/vm9t77znfm9hYghBBCCCGEEOIJFboDhOQhImJ7TinFHK4x/PJILiEFQMd+PD0NANg+PEy0ffSBEBIIOWcximQxigbaLnEqK/5iFMne7KzIyspAu+r4pFrGQ3eAFCOr0HyN/I+np/Gq2UTr4cOBtnYhPtjf3cWrZjNuk/rTCN0Bkk96GqK3vkf/UAKwfXiIN71e4rE3vZ5X8SNkZDGnIebWhwCZU7C92dn45msKltUHn7FJtdABFUQyCNEP7UB8oad5pgsx3YePaWC6D1x8JiOHiPQXP42tz9ihHYDZh1ACHFr8SflwBCmIiMj+/fvx/db3715HYHMdKJQDMAuf7oMQj+iRV7sfOgBCrk+hUcyW8KM2CtIBEFIuuUWkiy5db7oWfRQiBZDUCeZrcZwnIpri83wreUyVUhAR8zWVHFyXAIqI8Eslw0BadGwDNkliFSCX+ADA8y2JD3JVYjAMAkhIUcwUXFrvxu1OOwrRncqYGlNy9E9KqTenA2pMRlC3pvDhRf8APnvXxeflBuY3zwBcHOQqxGAYBJCQgohSKiE6N5WpMSXzm2f4vNwoRYSsO8gTAAA4OT6K21rlXVbzMgIhItKYTI4caQHU8TvtKBGXQkQ8Ii7hMeuCeTmI1QEppZTr515TfICkG8riKi7l7G93QAC1+KRjp91Q1v6YAKRknOJjwNSzUOjf8O/vPMLK7y9xGwCeHn/KfG36C/n56w+Ai2laUYZBAAmxsbTezU3mKtd+bPGNmLXIc2cnzwsWpztzA89NLHzFg9UD3Lt7O/O9Wni+bczoffUDXnIapuMPCOBBtgC6+kEbTMoiT4A67QhL61102lFV+WZ1X+ciVIs8v/L1gE535jCxMAOsHmQ+nxYe4Ho+VAuPptOOriSAhJTBx5kn1kHQg/gA6Oe4Lf/rQq4DAvrTmrQLOvlxAgBovt63vfciyBWFx+XAgAsXlkXZAkhImt5aS1bGtwEkp1s+xAeAuAbgurigQmdCp0VAi08Wzdf7pZ0lHVoACcmjt9aKE80QI1/5ZhUh85fhYc7/S/0Vo7fWcr62TPEx44cSQEJqgOhZQFqItAgNcx3krgHpX6POP4hVhKosfB0bgFMEKT5kBFHfNmb6SW8RohuBcRkI2X77UgDEN32/qstEpC5D4YzPS1WQEUbQd0TyYPWg0pr0SlbxZ92vWoBCxSekLui60LcbURPpYrdtqxSgkPEJqQuSQeg+uSh8HpBeh3FtqyR0fELqQN3WPi91VnLuzir88KHjE0LK5z8tFuzphqiPOAAAAABJRU5ErkJggg==";
console.log(stringifyPixels(compress(loadSpritesheetPixels(SPRITE_SHEET_URI))))

function compress(pixels) {
	let counts = [];
	let rowCounts = [];
	let count = null;
	for (let row of pixels) {
		console.log("Row length: " + row.length);
		for (let pixel of row) {
			if (count === null) {
				count = [pixel, 1];
			} else if (pixel === count[0]) {
				count[1] = count[1] + 1;
			} else {
				rowCounts.push(count);
				count = [pixel, 1];
			}
		}
		rowCounts.push(count);
		counts.push([...rowCounts]);
		rowCounts = [];
		count = null;
	}
	return counts;
}

function stringifyPixels(pixels) {
	// Add newlines between every row
	let str = "";
	for (let row of pixels) {
		str += JSON.stringify(row) + ",\n";
	}
	str = str.slice(0, -2);
	return "[" + str + "]";
}

/**
 * Load the spritesheet and return the pixelmap template
 * @param {string} dataUri
 * @param {boolean} [templateColors]
 * @returns {string[][]}
 */
function loadSpritesheetPixels(dataUri, templateColors = true) {
	const img = new Image();
	img.src = dataUri;
	const canvas = document.createElement('canvas');
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return [];
	}
	ctx.drawImage(img, 0, 0);
	const imageData = ctx.getImageData(0, 0, img.width, img.height);
	const pixels = imageData.data;
	const hexArray = [];
	for (let y = 0; y < img.height; y++) {
		const row = [];
		for (let x = 0; x < img.width; x++) {
			const index = (y * img.width + x) * 4;
			const r = pixels[index];
			const g = pixels[index + 1];
			const b = pixels[index + 2];
			const a = pixels[index + 3];
			if (a === 0) {
				row.push(TRANSPARENT);
				continue;
			}
			const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
			if (!templateColors) {
				row.push(hex);
				continue;
			}
			if (SPRITESHEET_COLOR_MAP[hex] === undefined) {
				console.error(`Unknown color: ${hex}`);
				row.push(TRANSPARENT);
			}
			row.push(SPRITESHEET_COLOR_MAP[hex]);
		}
		hexArray.push(row);
	}
	return hexArray;
}

export {};