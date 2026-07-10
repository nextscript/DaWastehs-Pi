---
name: "work-on-half-life-3-vertical-slice"
description: "Develop and verify the Half-Life 3 Borealis Signal browser vertical slice. Use for TypeScript/Three.js/Rapier gameplay, rendering, post-FX, gravity gun, audio, texture extraction, and headless smoke checks."
version: 3
created: "2026-07-09"
updated: "2026-07-10"
---

# Half-Life 3 — Borealis Signal Vertical Slice

## Rendering pipeline
Quality is controlled by `Renderer.setVideoProfile(quality)`.
- `PostFX.ts`: `RenderPass → GTAOPass → UnrealBloomPass → Vignette ShaderPass → FXAA ShaderPass → OutputPass`. `OutputPass` stays last (owns ACES tone mapping + sRGB when the composer runs).
- `PostFX.render()` returns `false` when disabled so low quality falls back to direct `renderer.render()`.
- EnvMap is baked once with `PMREMGenerator` + `RoomEnvironment`; low quality sets `scene.environment = null`, otherwise the cached texture is restored.
- `DecalSystem` caps at 32 recycled decals — keep the cap, no unbounded allocations.

## Weapon and Gravity Gun rules
- `WeaponKey = 'pistol' | 'smg' | 'gravityTool'`; Gravity Gun is slot 3, not an overlay. Digit1/2/3 select, Q cycles.
- Left mouse grabs/holds, right mouse throws; `throwLocked` requires release+re-press before re-grab.
- HUD shows infinity ammo for gravity tool; `weaponChanged` event accepts `gravityTool`.

## Audio rule
`AudioDirector.playBuffer` must disconnect nodes on `source.onended`; otherwise rapid SMG fire leaks BufferSource/Gain nodes and causes crackle/dropout.

## Pitfalls
- Live settings apply only in-game; before `bootstrap()` the active renderer/audio may be undefined.
- Run `tools/extract_hl2_textures.py` from repo root, not `tools/`, or output lands in `tools/public/...`.
- Refresh local HL2-derived assets with `python tools/extract_hl2_sounds.py`, `python tools/extract_hl2_textures.py`, then `.venv/Scripts/python.exe tools/extract_pbr.py`; never commit generated `public/assets/legacy_hl2/*`, `public/assets/pbr/`, `public/assets/rtx/`.
- `public/sw.js` (+ `SourceStyleAssetCache`) is a browser service-worker entry, intentionally ignored by fallow.
- Headless verification uses system Chrome (`channel: 'chrome'`); bundled Chromium may be missing.
- Keep the Rapier/renderer loop single-RAF and clamp accumulated deltas; do not add a second game loop.

## Verification
```bash
npm run build
npm run analyze
node tools/check_404.mjs
node tools/screenshot_hl3.mjs
```

Manual smoke: HUD appears, WASD/Shift/Space/mouse look, left-click fires, right-click gravity throw, Q/1/2/3 switch weapons, level JSON spawns geometry/physics/enemies/pickups/triggers.
