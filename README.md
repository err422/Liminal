# LIMINAL — Build 0.7 Modular (Static)

This is a modularized version of the Build 0.7 prototype. It keeps the original classic-script runtime and Three.js global build, but divides the game into the requested source folders.

## Run it

- **Quick local test:** open `index.html` in a modern desktop browser. The game loads Three.js from jsDelivr, so an internet connection is required.
- **GitHub Pages:** upload the contents of this folder to the repository root (or publish this folder as the Pages source). Enable Pages from the `main` branch and `/ (root)`.
- No Node.js, npm, Vite, backend, or build command is required.

## Source layout

```text
src/
├── config.js
├── core/
│   ├── scene.js
│   └── loop.js
├── world/
│   ├── generation.js
│   ├── materials.js
│   ├── water.js
│   └── collision.js
├── player/
│   ├── movement.js
│   ├── flashlight.js
│   ├── vision.js
│   └── weapon.js
├── enemies/
│   ├── monster.js
│   └── ai.js
├── systems/
│   ├── audio.js
│   ├── pickups.js
│   └── scoring.js
└── ui/
    └── hud.js
```

## Important architecture note

These files are **classic browser scripts**, not ES modules. They intentionally share the page's global lexical scope so the game can remain directly hostable on GitHub Pages and can be opened as a local HTML file. The script order in `index.html` is significant; preserve it when adding or moving scripts.

The current split is functional rather than a full dependency-injection rewrite: some modules still communicate through shared game state (`P`, `scene`, `mons`, etc.). This keeps the migration low-risk while making each system much easier to locate. A later refactor can move those shared values behind explicit module APIs without changing the static deployment model.

## Notes

- Three.js is loaded from `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js`.
- Procedural geometry and textures are generated at runtime, so the asset folders are placeholders for future authored assets.
- `randFree()` now falls back to the farthest valid navigation cell it found rather than blindly returning the map origin. This prevents an unlucky spawn search from placing a monster or pickup at `(0, 0)`.
- Best score is stored in browser `localStorage`.
