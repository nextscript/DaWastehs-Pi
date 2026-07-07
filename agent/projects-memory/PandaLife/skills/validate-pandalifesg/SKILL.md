---
name: "validate-pandalifesg"
description: "Validate and smoke-test the PandaLifeSG single-file browser game after edits."
version: 2
created: "2026-06-05"
updated: "2026-06-29"
---
## When to Use
Use after changing `PandaLifeSG.html`, README, CI workflow, or related scripts in this repo.

## Procedure
1. Run `npm test` from the repo root to execute `scripts/smoke-check.js`.
2. If the test fails, fix the missing required snippets or JavaScript syntax reported by the script.
3. For runtime-sensitive changes, serve locally with `python -m http.server 8080` and open `http://localhost:8080/PandaLifeSG.html` in a browser to test Pointer Lock, audio, controls, Comfort Mode (`C`) and Performance Mode (`P`).
4. Check `git status --short` and `git diff --stat` before summarizing changes.

## Performance-Hinweise (optional)
Für echten Effekt des Performance Mode (`P`) und stabile FPS in `PandaLifeSG.html`:

- **Fixed-Timestep-Akkumulator**: Game-Logik mit festem Intervall (z. B. 60 Hz) über Akkumulator vom RAF-Render-Loop entkoppeln → deterministisches Gameplay unabhängig von Monitor-Hz.
- **delta-clamping**: `dt` auf max ~100 ms cappen. RAF pausiert in Hintergrund-Tabs; beim Zurückkehren ohne Cap droht ein riesiger Sim-Sprung (Spieler stirbt, Gegner überspringen Wände).
- **Performance Mode als echtes Quality-Profil**: `P` sollte konkret etwas reduzieren (Render-Distanz, Shadow/Particle-Count, Update-Rate von Nebeneffekten), nicht nur ein Flag sein — sonst hat der Modus keinen spürbaren Effekt.
- **DOM/Canvas-Minimierung**: statisches UI (HUD/Minimap) nur neu zeichnen, wenn sich Werte ändern, nicht jedes Frame; `CanvasRenderingContext2D`-State-Changes batchen (weniger `fillStyle`-Wechsel).
- **Web Worker/OffscreenCanvas (überdimensioniert)**: nur bei rechenintensiver Logik (Pathfinding, Procedural Generation), die den Main thread blockiert; für ein Single-File-Spiel meist unnötig, und `SharedArrayBuffer` braucht COOP/COEP-Header (lokal via `python -m http.server` nicht verfügbar).

## Pitfalls
- Do not execute the inline game script in Node; the smoke check should parse it with `new Function` only because it depends on browser APIs.
- The game intentionally has no dependencies/build step; avoid adding package installs unless the project direction changes.

## Verification
1. `npm test` prints `PandaLifeSG smoke check passed.`
2. Browser smoke test starts from the title screen, locks pointer after click, and renders the HUD/minimap without console syntax errors.