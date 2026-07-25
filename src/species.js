/** @typedef {Object} Species
 * @property {string} name
 * @property {string} description
 * @property {string} latinName
 * @property {string} url
 * @property {number} spriteIndex
 * @property {string} highlightColor
 * @property {string[]} [tags]
 * @property {string} [rarity]
 */

/** @type {Record<string, Species>} */
const species = {
  "bluebird": {
    "name": "Eastern Bluebird",
    "description": "Native to North America and very social, though can be timid around people.",
    "latinName": "Sialia sialis",
    "url": "https://en.wikipedia.org/wiki/Eastern_bluebird",
    "spriteIndex": 0,
    "highlightColor": "#639bff"
  },
  "shimaEnaga": {
    "name": "Shima Enaga",
    "description": "Small, fluffy birds found in the snowy regions of Japan, these birds are highly sought after by ornithologists and nature photographers.",
    "latinName": "Aegithalos caudatus",
    "url": "https://en.wikipedia.org/wiki/Long-tailed_tit",
    "spriteIndex": 1,
    "highlightColor": "#d7ac93"
  },
  "tuftedTitmouse": {
    "name": "Tufted Titmouse",
    "description": "Native to the eastern United States, full of personality, and notably my wife's favorite bird.",
    "latinName": "Baeolophus bicolor",
    "url": "https://en.wikipedia.org/wiki/Tufted_titmouse",
    "spriteIndex": 2,
    "highlightColor": "#b9abcf",
    "tags": [
      "tuft"
    ]
  },
  "europeanRobin": {
    "name": "European Robin",
    "description": "Native to western Europe, this is the quintessential robin. Quite friendly, you'll often find them searching for worms.",
    "latinName": "Erithacus rubecula",
    "url": "https://en.wikipedia.org/wiki/European_robin",
    "spriteIndex": 3,
    "highlightColor": "#ffaf34"
  },
  "redCardinal": {
    "name": "Red Cardinal",
    "description": "Native to the eastern United States, this strikingly red bird is hard to miss.",
    "latinName": "Cardinalis cardinalis",
    "url": "https://en.wikipedia.org/wiki/Red_cardinal",
    "spriteIndex": 4,
    "highlightColor": "#e83a1b",
    "tags": [
      "tuft"
    ]
  },
  "americanGoldfinch": {
    "name": "American Goldfinch",
    "description": "Coloured a brilliant yellow, this bird feeds almost entirely on the seeds of plants such as thistle, sunflowers, and coneflowers.",
    "latinName": "Spinus tristis",
    "url": "https://en.wikipedia.org/wiki/American_goldfinch",
    "spriteIndex": 5,
    "highlightColor": "#ffcc00"
  },
  "barnSwallow": {
    "name": "Barn Swallow",
    "description": "Agile birds that often roost in man-made structures, these birds are known to build nests near Ospreys for protection.",
    "latinName": "Hirundo rustica",
    "url": "https://en.wikipedia.org/wiki/Barn_swallow",
    "spriteIndex": 6,
    "highlightColor": "#2252a9"
  },
  "mistletoebird": {
    "name": "Mistletoebird",
    "description": "Native to Australia, these birds eat mainly mistletoe and in turn spread the seeds far and wide.",
    "latinName": "Dicaeum hirundinaceum",
    "url": "https://en.wikipedia.org/wiki/Mistletoebird",
    "spriteIndex": 7,
    "highlightColor": "#352e6d"
  },
  "scarletRobin": {
    "name": "Scarlet Robin",
    "description": "Native to Australia, this striking robin can be found in Eucalyptus forests.",
    "latinName": "Petroica boodang",
    "url": "https://en.wikipedia.org/wiki/Scarlet_robin",
    "spriteIndex": 8,
    "highlightColor": "#fc5633"
  },
  "americanRobin": {
    "name": "American Robin",
    "description": "While not a true robin, this social North American bird is so named due to its orange coloring. It seems unbothered by nearby humans.",
    "latinName": "Turdus migratorius",
    "url": "https://en.wikipedia.org/wiki/American_robin",
    "spriteIndex": 9,
    "highlightColor": "#eb7a3a"
  },
  "carolinaWren": {
    "name": "Carolina Wren",
    "description": "Native to the eastern United States, these little birds are known for their curious and energetic nature.",
    "latinName": "Thryothorus ludovicianus",
    "url": "https://en.wikipedia.org/wiki/Carolina_wren",
    "spriteIndex": 10,
    "highlightColor": "#c58a5b"
  },
  "blackCappedChickadee": {
    "name": "Black-capped Chickadee",
    "description": "Native to North America, these small and curious birds are known for their distinctive call from which they get their name.",
    "latinName": "Poecile atricapillus",
    "url": "https://en.wikipedia.org/wiki/Black-capped_chickadee",
    "spriteIndex": 11,
    "highlightColor": "#363636",
    "tags": []
  },
  "blueJay": {
    "name": "Blue Jay",
    "description": "This loud and rambunctious bird is native to North America and is known for challenging anything in its path.",
    "latinName": "Cyanocitta cristata",
    "url": "https://en.wikipedia.org/wiki/Blue_jay",
    "spriteIndex": 12,
    "highlightColor": "#6391e8",
    "tags": [
      "tuft"
    ]
  },
  "darkEyedJunco": {
    "name": "Dark-eyed Junco",
    "description": "Native across North America, these social birds will often be seen hopping along the ground in winter.",
    "latinName": "Junco hyemalis",
    "url": "https://en.wikipedia.org/wiki/Dark-eyed_junco",
    "spriteIndex": 13,
    "highlightColor": "#55565e"
  },
  "houseFinch": {
    "name": "House Finch",
    "description": "Native to North America, these highly social birds sing cheerful songs and are often seen at bird feeders.",
    "latinName": "Haemorhous mexicanus",
    "url": "https://en.wikipedia.org/wiki/House_finch",
    "spriteIndex": 14,
    "highlightColor": "#ef444d"
  },
  "pigeon": {
    "name": "Rock Pigeon",
    "description": "Descended from the Rock Dove, these once domesticated birds are often found in cities worldwide. Quite friendly and intelligent, they were favored companions of Nikola Tesla.",
    "latinName": "Columba livia",
    "url": "https://en.wikipedia.org/wiki/Rock_dove",
    "spriteIndex": 15,
    "highlightColor": "#5a6c91"
  },
  "redAvadavat": {
    "name": "Red Avadavat",
    "description": "Native to India and southeast Asia, these birds are also known as Strawberry Finches due to their speckled plumage.",
    "latinName": "Amandava amandava",
    "url": "https://en.wikipedia.org/wiki/Red_avadavat",
    "spriteIndex": 16,
    "highlightColor": "#cb092b",
    "rarity": "uncommon"
  },
  "pinkRobin": {
    "name": "Pink Robin",
    "description": "Native to Australia, these bubblegum-pink puffballs are quieter than most, instead relying on their vibrant colours to attract partners.",
    "latinName": "Petroica rodinogaster",
    "url": "https://en.wikipedia.org/wiki/Pink_robin",
    "spriteIndex": 17,
    "highlightColor": "#ff82ba",
    "rarity": "uncommon"
  },
  "spangledCotinga": {
    "name": "Spangled Cotinga",
    "description": "This South American bird can be found in the Amazon rainforest, flashing its iridescent turquoise feathers high above in the canopy.",
    "latinName": "Cotinga cayana",
    "url": "https://en.wikipedia.org/wiki/Spangled_cotinga",
    "spriteIndex": 18,
    "highlightColor": "#62eafe",
    "rarity": "uncommon"
  },
  "elegantEuphonia": {
    "name": "Elegant Euphonia",
    "description": "This vividly coloured finch is found throughout Central America and is known for the distinctive blue hood that crowns its head.",
    "latinName": "Chlorophonia elegantissima",
    "url": "https://en.wikipedia.org/wiki/Elegant_euphonia",
    "spriteIndex": 19,
    "highlightColor": "#6bc6ed",
    "rarity": "uncommon"
  },
  "paintedBunting": {
    "name": "Painted Bunting",
    "description": "A remarkably colourful bird, this North American species is quite difficult to observe despite its vivid palette due to its shy nature and vulnerable habitat.",
    "latinName": "Passerina ciris",
    "url": "https://en.wikipedia.org/wiki/Painted_bunting",
    "spriteIndex": 20,
    "highlightColor": "#5567f0",
    "rarity": "uncommon"
  },
  "redWarbler": {
    "name": "Red Warbler",
    "description": "Endemic to the highlands of Mexico, this bird has the rare distinction of being one of the very few toxic birds in the world.",
    "latinName": "Cardellina rubra",
    "url": "https://en.wikipedia.org/wiki/Red_warbler",
    "spriteIndex": 21,
    "highlightColor": "#e80a28",
    "rarity": "uncommon"
  },
  "cubanTody": {
    "name": "Cuban Tody",
    "description": "As the name suggests, this little green bird is only found on the island of Cuba and is known for being particularly round.",
    "latinName": "Todus multicolor",
    "url": "https://en.wikipedia.org/wiki/Cuban_tody",
    "spriteIndex": 22,
    "highlightColor": "#4adc67",
    "rarity": "uncommon"
  },
  "violetBackedStarling": {
    "name": "Violet-backed Starling",
    "description": "Native to Sub-Saharan Africa, these small starlings are known for being the most vividly purple birds in the world.",
    "latinName": "Cinnyricinclus leucogaster",
    "url": "https://en.wikipedia.org/wiki/Violet-backed_starling",
    "spriteIndex": 23,
    "highlightColor": "#9c3af2",
    "rarity": "uncommon"
  }
}

export default species;
