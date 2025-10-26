# Pocket Bird (Work in Progress!)

This project is still being worked on, but if you wish to help me beta test it, join the [Discord](https://discord.gg/6yxE9prcNc) and  follow the installation instructions below!

1. Install [Tampermonkey](https://www.tampermonkey.net/) on your web browser
2. Enable the Tampermonkey extension and give it the permissions requested
3. Install my Pocket Bird script by going to this link and clicking install: [https://github.com/IdreesInc/Pocket-Bird/raw/refs/heads/main/dist/birb.user.js](https://github.com/IdreesInc/Pocket-Bird/raw/refs/heads/main/dist/birb.user.js)
4. Now any websites you visit will have a little bird hopping around!

## Development

This project uses Rollup to bundle the source files.

### Building

```bash
npm run build
```

### Development Mode

Watch for changes and rebuild automatically:

```bash
npm run dev
```

The source files are in the `src/` directory. The main entry point is `src/birb.js`, which bundles all the other modules together.