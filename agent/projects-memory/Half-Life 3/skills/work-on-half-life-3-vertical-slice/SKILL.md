---
name: "work-on-half-life-3-vertical-slice"
description: "Develop and verify the Half-Life 3 Borealis Signal browser vertical slice in this repo"
version: 19
created: "2026-06-05"
updated: "2026-06-29"
---
## When to Use
Use when extending or debugging this repo's TypeScript/Three.js/Rapier Half-Life-inspired vertical slice.

## Procedure
## Graphics pipeline (as of 2026-06-28)

All quality-gated via `Renderer.setVideoProfile(quality)`:
- **PostFX** (`src/render/PostFX.ts`): `EffectComposer` pipeline = `RenderPass → GTAOPass → UnrealBloomPass → Vignette ShaderPass → FXAA ShaderPass → OutputPass`. OutputPass MUST stay last (owns ACES tone-map + sRGB conversion when composer runs). `render()` returns `false` when disabled so `Renderer.update()` falls back to direct render (low-quality = zero-cost).
- **GTAO/SSAO**: ambient occlusion (contact shadows in crevices). Enabled from medium up (maximal eye-candy target).
- **EnvMap**: `PMREMGenerator` + `RoomEnvironment` baked once in `Renderer.buildEnvironment()`, `scene.environment` + `environmentIntensity=0.55`, null on 'low'.
- **Skybox**: `Renderer.setSky()` builds a procedural `CanvasTexture` (vertical gradient zenith→horizon + sparse stars) instead of flat color.
- **Profiles**: low=off, medium/high/ultra=GTAO+bloom(0.45/0.6/0.78)+vignette+fxaa+envMap.
- **Live-apply**: `MainMenu.onSettingsChange` (inGame) → `main.ts applyLiveSettings()` → `renderer.setVideoProfile` + `audio.setSettings`. Pause-menu changes apply without restart.
- **Decals** (`src/render/DecalSystem.ts`): projected bullet-hole/scorch `DecalGeometry` from real HL2 textures (`decals/metal_shot*.png`, `decals/scorch*.png`, `decals/smg_scorch*.png`). `WeaponSystem.placeImpactDecal()` projects on static hits; max 32 decals, oldest recycled.
- **God rays**: volumetric light shaft at exit beacon (`LevelArtDirector.addBeaconLightShaft`) — open `ConeGeometry` + additive blending + vertical gradient texture (robust, no custom shader).

## Weapon / Gravity Gun architecture (as of 2026-06-28)

- `WeaponKey = 'pistol' | 'smg' | 'gravityTool'` — Gravity Gun is **Slot 3** (own weapon, not overlay).
- Selection: `WeaponSystem.select(key)` (Digit1/2/3 via `Input.weaponSelect`) + `cycleNext()` (KeyQ cycles all 3).
- Gravity inputs muxed in `main.ts gravityInputs()`: `{ active: gravityMode&&fire, throwNow: gravityMode&&altFire, primaryFire: !gravityMode&&fire }`.
- **Left mouse = grab/hold**, **right mouse = throw**. `GravityTool` has `throwLocked` so after a throw you must release+re-press left to re-grab (HL2 physcannon feel).
- HUD shows '∞' ammo for gravityTool. EventBus 'weaponChanged' event type widened to include 'gravityTool'.

## Audio

- `AudioDirector.playBuffer` MUST set `source.onended = () => { gain.disconnect(); source.disconnect(); }` — otherwise BufferSource+GainNode leak per shot and saturate the graph after a few hundred rapid-fire sounds (SMG) → crackles/dropout. Also ramp gain in/out to avoid click.
## Performance-Hinweise (optional)
Ergänzend zur bestehenden Quality-Profile-/PostFX-Architektur (`setVideoProfile`):

- **Fixed-Timestep für Rapier**: `world.step(fixedDt)` mit konstantem `fixedDt` (z. B. 1/60) aus einem Akkumulator-Loop, entkoppelt vom RAF-Render. Bei FPS-Einbrüchen mehrere Sub-Steps, dann interpolieren. Rapier ist iterativ → variables `dt` erzeugt Jitter/Tunneling. Prüfen, falls noch nicht so vorhanden.
- **Single RAF-Loop**: nur ein `requestAnimationFrame` für Renderer + Game-Update; keine konkurrierenden `setInterval`/`setTimeout`-Game-Loops, die das Frame-Submitting stören.
- **Frame-Budget-Profiling**: `performance.now()`-Marker um GTAO/Bloom/Physics, `stats.js`-Overlay im Dev-Build. GTAO ist der teuerste PostFX-Pass — bei FPS-Einbrüchen zuerst auf medium/low profilieren. Auf der lokalen RX 9070 XT (RDNA4) läuft ultra-PostFX locker; das Budget gilt für schwächere Ziel-GPUs.
- **Decal/Impact-Pool**: `DecalSystem` recycelt bereits max 32 (ältestes raus) — kein GC-Druck durch ständiges `new`. Nicht auf dynamische Array ohne Cap umstellen.
- **VRAM-Hygiene bei Level-Wechsel**: nicht mehr gebrauchte Assets via `geometry.dispose()`/`material.dispose()`/`texture.dispose()` freigeben, sonst leakt Three.js VRAM (relevant bei langen Playtesting-Sessions).
- **Web Worker für Nebenarbeit**: Level-Loading, Asset-Dekodierung, Pathfinding in Worker auslagern, main thread frei halten. `@dimforge/rapier3d-compat` kann bedingt in einem Worker laufen; fürs Vertical Slice single-thread meist ausreichend.
- **Pointer-Lock-/Input-Delta-Clamping**: Maus-Deltas cappen, damit ein Tab-Wechsel mit aufgestauter Bewegung keinen Kamera-Ruck erzeugt.

## Pitfalls
- **Post-processing OutputPass must stay LAST** in `src/render/PostFX.ts`. When the EffectComposer runs, OutputPass owns ACES tone mapping + sRGB conversion (reading `renderer.toneMapping`/`outputColorSpace`). Omit it → scene over-bright/clipped. `PostFX.render()` returns `false` when disabled so `Renderer.update()` falls back to a direct `renderer.render()` — keep that path intact so 'low' quality is zero-cost.
- **EnvMap is quality-gated**: `Renderer.buildEnvironment()` bakes a `RoomEnvironment` via `PMREMGenerator` once and stores it in `this.environmentTexture`; `setVideoProfile` sets `scene.environment = null` on 'low' and back to the texture otherwise. Do not re-bake per frame.
- **Live settings apply only while in-game**: `MainMenu.onSettingsChange` fires from `persistAndApplySettings()` only when `this.inGame`. Before the first `bootstrap()`, `activeRenderer`/`activeAudio` in `main.ts` are undefined — the callback must null-check them.
- **Texture extraction must run from repo root**, not `tools/`: `extract_hl2_textures.py` uses relative `OUT_DIR = public/assets/legacy_hl2/textures` and will otherwise write into `tools/public/...`. Run as `python tools/extract_hl2_textures.py` from `H:/LAB/Half-Life 3`.
- **Headless verification**: Playwright/Puppeteer aren't a runtime dep; install `playwright` as devDep and launch with `channel: 'chrome'` to reuse system Chrome (bundled Chromium is missing in this env). `tools/screenshot_hl3.mjs` clicks Start + renders an in-game frame; `tools/check_404.mjs` lists any 4xx/pageerror.
## Verification
1. `npm run build` completes without TypeScript or Vite errors.
2. `npm run analyze` completes with no dead-code, duplication, circular-dependency, or complexity-threshold issues.
3. Opening the dev server shows the HUD and playable FPS controls: WASD/Shift/Space, mouse look, left-click weapons, right-click Gravity Tool, Q weapon switch, E use.
4. The level JSON spawns geometry, physics props, enemies, pickups, triggers, and the energy-cell puzzle.