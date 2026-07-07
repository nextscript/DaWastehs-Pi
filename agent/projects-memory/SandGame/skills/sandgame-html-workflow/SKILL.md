---
name: "sandgame-html-workflow"
description: "Safely modify and validate the SandGame single-file HTML simulation"
version: 6
created: "2026-06-01"
updated: "2026-06-30"
---
## When to Use
Use when changing `sand_game.html` in the SandGame repo, especially UI, simulation-loop, rendering, input, or material behavior changes.

## Procedure
## Procedure
1. Read relevant golden-rule skills first: HTML for markup/UI changes and simulation/2D-pixel skills for engine changes.
2. Inspect `sand_game.html` around the target functions with `rg`/`read`; preserve physics, chemistry, and biology logic unless explicitly improving correctness.
3. Prefer targeted edits. For simulation changes, watch for edge wrapping (`x +/- 1` across rows), update-order bias, active-cell wake-up behavior, and typed-array bounds.
4. **TWO render paths exist** — keep them in sync. `render()` dispatches to `renderGL()` (WebGL2 GPU path) when `useGL && gl && glProgram && gpuEnabled`, else `renderCPU()` (2D-canvas `putImageData`, the source of truth for exact colors). Any change to per-cell color logic MUST be applied to BOTH `renderCPU()` (JS) and the `GL_FS` fragment shader (GLSL), or the GPU view silently drifts from the CPU view. The shader reads packed RGBA8 textures (t0: matId/temp/ph/csLow, t1: age/health/stage, t2: csHigh/salinity/rad); material base colors + dynamic flags come from uniform arrays `u_colors[77]`/`u_dyn[77]` generated from `MATS`/`DYNAMIC_COLOR` in `initGL()`.
5. After edits, validate JavaScript syntax: `node validate.cjs` (extracts the `<script>` block and runs `new Function(script)`).
6. Run the STRONGER runtime smoke test: `node smoke.cjs`. It loads the script in a mocked DOM/canvas/WebGL2 VM sandbox, runs `init()` + 30× `simulate()`/`render()` with seeded test regions (salt+water, acid+metal, gases, mold/mycelium/mushroom/spore, seed+dirt, combustion, cement, tree). It exercises BOTH the GPU packing/shader-uniform JS (`renderPath=GPU`) and, by flipping the mock `localStorage` to `'0'`, the CPU path (`renderPath=CPU`). It catches runtime errors the syntax check misses but CANNOT verify pixel/color fidelity of the shader. If mocks need extending (e.g. a new bare global or DOM/WebGL API the script reaches), edit `smoke.cjs`.
7. Review `git diff -- sand_game.html` and summarize both behavior changes and validation results.
## Procedure
1. Read relevant golden-rule skills first: HTML for markup/UI changes and simulation/2D-pixel skills for engine changes.
2. Inspect `sand_game.html` around the target functions with `rg`/`read`; preserve physics, chemistry, and biology logic unless explicitly improving correctness.
3. Prefer targeted edits. For simulation changes, watch for edge wrapping (`x +/- 1` across rows), update-order bias, active-cell wake-up behavior, and typed-array bounds.
4. After edits, validate JavaScript syntax: `node validate.cjs` (extracts the `<script>` block and runs `new Function(script)`).
5. Run the STRONGER runtime smoke test: `node smoke.cjs`. This loads the script in a mocked DOM/canvas VM sandbox, runs `init()` + 30× `simulate()`/`render()` with seeded test regions (salt+water, acid+metal, gases, mold/mycelium/mushroom/spore, seed+dirt). It catches runtime errors the syntax check misses. If mocks need extending (e.g. a new bare global or DOM API the script reaches), edit `smoke.cjs` — its mocks are intentionally permissive.
6. Review `git diff -- sand_game.html` and summarize both behavior changes and validation results.
## Performance-Hinweise (optional)
Für größere Grids oder höhere Simulationsgeschwindigkeit in `sand_game.html`:

- **Fixed-Timestep-Akkumulator**: Sim-Logik mit festem Intervall (z. B. 60 Hz) vom `requestAnimationFrame`-Render-Loop entkoppeln. RAF sammelt `delta`, führt ganze Sim-Ticks im festen Intervall aus, rendert dazwischen. Macht die Simulation deterministisch und unabhängig von Monitor-Hz (144 Hz vs 60 Hz).
- **Grid als flache Typed Arrays**: Material-/State-Grid als `Uint8Array(width*height)` (1D, SoA für Mehrkomponenten-State), nicht Array-of-Arrays. GC-stabil und V8-friendly.
- **Active-Region-Tracking**: nur geänderte Zellen/Dirty-Rects neu berechnen statt jedes Frame das volle Grid zu scannen — entscheidend bei Falling-Sand (meist nur ein Bruchteil des Grids aktiv).
- **Double Buffering**: neuen Zustand in zweites Array schreiben, dann swappen. Verhindert In-Place-Update-Reihenfolge-Bias (alles rutscht nach links/unten).
- **delta-clamping**: `dt` auf max ~100 ms cappen, damit Tab-Switch/Throttling den Akkumulator nicht überlaufen lässt („Simulation explodiert").
- **Bilddaten-Ausgabe**: `ImageData` direkt aus dem Typed Array über Material→RGBA-Lookup-Table aufbauen und `putImageData` statt tausender `fillRect`-Calls.
- **Web Worker/OffscreenCanvas (schwer)**: für sehr große Grids Sim-Ticks in einen Worker auslagern (`postMessage` mit transferable `ArrayBuffer`); OffscreenCanvas verlegt auch das Rendering in den Worker. Hinweis: `SharedArrayBuffer` benötigt COOP/COEP-Header und ist lokal via `python -m http.server` **nicht** verfügbar.

## Pitfalls
## Pitfalls
- Do not remove materials or simplify existing physical/chemical/biological systems to make optimization easier.
- Do not trust only visual inspection; a single syntax error in the inline script breaks the whole app. Run BOTH `validate.cjs` (syntax) AND `smoke.cjs` (runtime, both render paths).
- Beware keyboard shortcut collisions: lowercase action keys like `c`/`h` can conflict with material mappings unless exact `e.key` handling is used.
- DEAD-CODE GUARDING: reaction/special-effect blocks nested inside unrelated `if` guards (e.g. salt dissolution buried inside `if (matId===FIRE || temp>300)`) never fire. When a reaction "just doesn't happen", check its enclosing condition first, not the rates.
- New grid arrays must be plumbed through ALL THREE places: declaration, `resize()` (alloc + old→new copy), and `swap()` (transfer on particle move). Forgetting any causes silent blank/snapshot bugs.
- When tuning growth rates, remember newly grown cells inherit the parent's `plantWaterGrid`/`plantSapGrid` — otherwise they start at 0 and immediately suffer health penalties (stunted growth).
- RENDER DUAL-PATH: `renderCPU` (JS) and `GL_FS` (GLSL shader) must stay byte-for-byte equivalent in color logic. Editing only one silently desyncs GPU vs CPU visuals. The toggle reloads the page (context type changes), so a shader bug can be hidden behind the working CPU path — always port to both.
- GLSL gotchas: dynamic indexing of uniform arrays needs WebGL2 (GLSL ES 3.00); `texelFetch` + `*255` to recover integer channels from RGBA8; flip Y in the vertex shader (`v_uv = vec2(a_pos.x*0.5+0.5, -a_pos.y*0.5+0.5)`) so grid row 0 renders at the top; JS `%` on ints → GLSL integer `%`, but JS `(x)%2` on a float → GLSL `mod(x,2.0)`.
- In `node`/vm, top-level `let`/`const` are lexical and NOT exposed on the sandbox object — access them from in-context code or use numeric literals; only `function`/`var` land on the sandbox.
## Pitfalls
- Do not remove materials or simplify existing physical/chemical/biological systems to make optimization easier.
- Do not trust only visual inspection; a single syntax error in the inline script breaks the whole app. Run BOTH `validate.cjs` (syntax) AND `smoke.cjs` (runtime).
- Beware keyboard shortcut collisions: lowercase action keys like `c`/`h` can conflict with material mappings unless exact `e.key` handling is used.
- DEAD-CODE GUARDING: reaction/special-effect blocks nested inside unrelated `if` guards (e.g. salt dissolution buried inside `if (matId===FIRE || temp>300)`) never fire. When a reaction "just doesn't happen", check its enclosing condition first, not the rates.
- New grid arrays must be plumbed through ALL THREE places: declaration, `resize()` (alloc + old→new copy), and `swap()` (transfer on particle move). Forgetting any causes silent blank/snapshot bugs.
- When tuning growth rates, remember newly grown cells inherit the parent's `plantWaterGrid`/`plantSapGrid` — otherwise they start at 0 and immediately suffer health penalties (stunted growth).
## Verification
1. `node` syntax parse of the extracted script reports OK.
2. Optional mocked DOM runtime init reports OK.
3. `git diff -- sand_game.html` contains only intentional UI/simulation/input changes.