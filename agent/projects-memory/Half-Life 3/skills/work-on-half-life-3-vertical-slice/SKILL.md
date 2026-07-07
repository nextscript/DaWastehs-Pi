---
name: work-on-half-life-3-vertical-slice
description: "Develop and verify the Half-Life 3 Borealis Signal browser vertical slice. Use for TypeScript/Three.js/Rapier gameplay, rendering, post-FX, gravity gun, audio, texture extraction, and headless smoke checks."
---

# Half-Life 3 — Borealis Signal Vertical Slice

## Rendering pipeline
Quality is controlled by `Renderer.setVideoProfile(quality)`.
- `PostFX.ts`: `RenderPass → GTAOPass → UnrealBloomPass → Vignette ShaderPass → FXAA ShaderPass → OutputPass`.
- `OutputPass` must stay last; it owns ACES tone mapping and sRGB conversion when the composer runs.
- `PostFX.render()` returns `false` when disabled so low quality falls back to direct `renderer.render()`.
- EnvMap is baked once with `PMREMGenerator` + `RoomEnvironment`; quality gating sets `scene.environment` to null on low and restores the cached texture otherwise.
- Decals use `DecalSystem` with max 32 recycled decals. Keep the cap; do not reintroduce unbounded allocations.

## Weapon and Gravity Gun rules
- `WeaponKey = 'pistol' | 'smg' | 'gravityTool'`; Gravity Gun is slot 3, not an overlay.
- Digit1/2/3 select, Q cycles all three.
- Left mouse grabs/holds; right mouse throws. `throwLocked` requires release+re-press before re-grab.
- HUD shows infinity ammo for gravity tool; `weaponChanged` event accepts `gravityTool`.

## Audio rule
`AudioDirector.playBuffer` must disconnect nodes on `source.onended`; otherwise rapid SMG fire leaks BufferSource/Gain nodes and causes crackle/dropout.

## Pitfalls
- Live settings apply only in-game; before `bootstrap()` active renderer/audio may be undefined.
- Run `tools/extract_hl2_textures.py` from repo root, not `tools/`, or output lands in `tools/public/...`.
- Headless verification uses system Chrome (`channel: 'chrome'`) because bundled Chromium may be missing.
- Keep Rapier/renderer loop single-RAF and clamp accumulated deltas if physics jitter appears; do not add a second game loop.

## Verification
```bash
npm run build
npm run analyze
node tools/check_404.mjs
node tools/screenshot_hl3.mjs
```

Manual smoke: start game, HUD appears, WASD/Shift/Space/mouse look work, left-click fires, right-click gravity throw works, Q/1/2/3 switch weapons, level JSON spawns geometry/physics/enemies/pickups/triggers.
