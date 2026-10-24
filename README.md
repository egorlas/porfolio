# pofolio

Personal portfolio for Vuong Ngo (egorlas). It's a static site in two versions:

- **3D room** (`dist/index.html`): a desk in Ha Noi at midnight while it rains, built with three.js. Click objects or markers to open each section: the CRT for About, the binders for Work, the VHS tapes for Products, the corkboard for Stack, the phone for Contact, and the floppy to download the CV. The lamp and the radio can be switched on and off.
- **Text version** (`dist/static.html`): the original single-page layout. Visitors without WebGL are sent here automatically.

## Local preview

```powershell
python -m http.server 4173 --directory dist
```

Then open `http://localhost:4173` for the 3D room or `http://localhost:4173/static.html` for the text version.

## Structure

- `dist/index.html`: 3D shell plus all portfolio copy (sections are `<article data-page>`)
- `dist/room/scene.js`: procedural room, objects, lights, click targets
- `dist/room/main.js`: renderer, post-processing, camera poses, interaction, sheet
- `dist/room/textures.js`, `dist/room/shaders.js`: canvas textures and GLSL (city, rain, grade)
- `dist/room/audio.js`: background music (`dist/assets/background.mp3`), played from the radio or the Music button
- `dist/room/room.css`: HUD, markers and the paper sheet
- `dist/static.html`, `dist/styles.css`, `dist/script.js`: text version
- `dist/assets/`: portrait, identity visuals and the downloadable CV

three.js `0.160.0` loads from jsDelivr through the import map in `index.html`.

## Design rules and QA

See `.claude/skills/pofolio-room-design/SKILL.md` for tokens, the object-to-section map, how to add projects or sections, and the screenshot QA script.

## Deploy (Railway)

Railway builds with Railpack. The `Staticfile` at the repo root (`root: dist`) tells Railpack to serve `dist/` as a static site with Caddy, so there's no build step and no variables to set.
