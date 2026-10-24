---
name: pofolio-room-design
description: Design system and working rules for Vuong Ngo's 3D "night desk" portfolio (pofolio/dist). Use whenever changing the 3D room (room/*.js), its HUD/sheet styles (room/room.css), the portfolio copy in index.html or static.html, adding a project/role/section, tuning lights or camera, or taking QA screenshots of the site.
---

# Pofolio room design

The portfolio is one scene: **a desk in Ha Noi at midnight while it rains**. Every section is a physical object on or near that desk. Keep new work inside that world. If an idea doesn't belong in the room, it belongs in the paper sheet, not as a floating 3D widget.

## Files

| File | Role |
|---|---|
| `dist/index.html` | Hi-fi version. Holds **all real copy** in `<article data-page="…">` (SEO and screen readers read this, not the canvas). |
| `dist/static.html` + `styles.css` + `script.js` | Lo-fi text version. Used as the fallback when there's no WebGL (`?from=room`). Keep its copy in sync with index.html. |
| `dist/room/scene.js` | Builds the room procedurally (no model files). Registers clickable objects and markers. |
| `dist/room/main.js` | Renderer, bloom/grade post, camera poses, picking, sheet open/close, intro. |
| `dist/room/textures.js` | Canvas textures: CRT terminal, tape spines, binders, notes, polaroid, neon. |
| `dist/room/shaders.js` | City-through-window, rain on glass, final grade (vignette + grain). |
| `dist/room/audio.js` | Background music from `assets/background.mp3`. It loads and starts only on click, fades in and out, and pauses while the tab is hidden. |

three.js is pinned to `three@0.160.0` through the import map in `index.html`. Don't bump it casually; addons paths change between versions.

## Object → section map

| Object | Section / action | Marker |
|---|---|---|
| Amber CRT terminal, polaroid on the corkboard | `about` | About |
| Three binders (TeenCare red, Thưởng Trà amber, eJOY blue) | `work` | Work |
| Stack of VHS tapes, one per project | `products` (+ `project` key scrolls to the card) | Products |
| Sticky notes on the corkboard | `stack` | Stack |
| Red rotary phone | `contact` | Contact |
| Red floppy "CV.PDF" | downloads `assets/ngo-vuong-cv.pdf` | CV |
| Desk lamp | toggles the lamp | none, discovered by hover |
| Radio on the wall shelf (or the Music chip in the header) | plays or pauses `background.mp3` | none, discovered by hover |

Binder colours are repeated as the `.swatch` next to each role in the sheet. If you add a role, add both the binder (`roles` in scene.js) and the swatch.

## Tokens

The same names are used in `room.css` (`:root`) and as literals in scene/texture code.

| Token | Value | Use |
|---|---|---|
| `--night` | `#07080d` | scene background, fog, loader |
| `--paper` | `#f4f0e8` | sheet, HUD text, tooltip |
| `--ink` | `#141214` | text on paper, tape shells |
| `--red` | `#ff2148` | the brand: neon "egorlas", phone, floppy, pins, kickers. Use it sparingly. |
| `--amber` | `#ffb347` | CRT phosphor, lamp light, focus ring, loader |
| moonlight | `#7b92d8` | the only cool light. It comes from the window. |

Lighting rule: **warm inside, cold outside**. Lamp and CRT are warm, the window and moon are blue, and the neon is the single red accent. Don't add a fourth hue of light.

Type:
- **Archivo** (variable width): display. Expanded (`wdth 125`, 800) for the hero name only; `wdth 112` for sheet headings.
- **IBM Plex Mono**: HUD, labels, metadata, buttons.
- **Caveat**: handwriting on physical things (tape labels, notes, polaroid caption, intro line). It never appears in body text.
- **VT323**: only on the CRT canvas.

## Adding content

- **New project**: add to `PROJECTS` in `scene.js` (gives it a tape; stack height grows by 0.0425 each), add an `<article class="tape" data-project="key">` in `index.html`, and add it to `static.html`. More than 5 tapes: move the stack or start a second pile; never shrink the tapes.
- **New section**: needs an object, a `POSES` entry in `main.js`, a marker (`markers.push`), a `data-page` article, a nav button, and adding the name to `SECTIONS`. Also update the pager buttons ("Next: …") so they still form a loop.
- **Copy** lives only in HTML. Canvas text (terminal script, note scribbles) is a short echo of it, never the only source.

## Motion and performance rules

- One orchestrated moment: the intro (dolly in, then the lamp flickers on, then the neon). Everything else is ambient and slow (rain, steam, dust, plant sway, pointer parallax ≤ 0.16 m).
- Hover feedback is physical: things lift, slide out or tilt, plus an emissive glow of at most 0.14. Nothing spins or bounces.
- `prefers-reduced-motion`: no camera flights, terminal shows its final state, CSS transitions are off. Test with it on.
- Budget: shadow maps 1024, bloom at half resolution on touch devices, DPR ≤ 2 (≤ 1.5 on touch), auto-drop to DPR 1 if the first 3 s average under 32 fps. Procedural geometry only; keep draw calls low (use `InstancedMesh` for repeats like keys).
- Materials on clickable objects must be **unique per object**. Hover glow writes `emissiveIntensity` on every material the object owns, so a shared material would light up two objects.

## Accessibility rules

- Every section is reachable without the canvas: header nav, DOM markers (real `<button>`s), the skip link, and the Text version.
- `Esc` closes the sheet; focus moves to the sheet's `h2` on open and goes back to the trigger on close.
- No WebGL → redirect to `static.html?from=room`, which explains why.

## QA

1. Serve: `python -m http.server 4173 --directory dist`
2. Run `node .claude/skills/pofolio-room-design/scripts/qa.cjs <out-dir>`. It needs `puppeteer-core`; set `PUPPETEER_CORE` to its folder if it isn't resolvable, and `CHROME` to the Chrome path if needed. It captures desktop overview, an open section, phone overview and a phone tap, reports horizontal overflow, and lists console errors.
3. Look at every screenshot. Check that the title doesn't sit on top of the lit desk, that markers aren't clipped at the edges, and that the focused object stays clear of the sheet.

Plain `chrome --headless --screenshot` can't go narrower than about 500 px on Windows. Use the script for phone sizes.
