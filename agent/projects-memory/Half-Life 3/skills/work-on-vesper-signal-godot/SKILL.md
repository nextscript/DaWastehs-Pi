---
name: "work-on-vesper-signal-godot"
description: "Develop and verify the canonical Vesper Signal Godot game under game/, including local assets, UI/input, lifecycle rollback, and isolated acceptance tests; not the historical browser app. Do not use for unrelated work."
version: 1
created: "2026-09-12"
updated: "2026-09-12"
skill-governor-tier: auto
skill-governor-risk: medium
---
## When to Use
Use for the active Godot project in L:/LAB/Half-Life 3/game. Confirm project.godot and current code first. The old Borealis Signal TypeScript/browser skill describes a historical implementation, not the active launcher target.

## Procedure
1. Inspect current HEAD, staged diff and pre-existing dirty/untracked files before mutation. In governed shared-cwd workflows keep exactly one source/index writer. Preserve unrelated files and record scoped commit bases for reviewers; do not rely on unstaged diff after a writer commits.
2. Read game/docs/architecture.md and game/docs/local-visual-assets.md for the changed subsystem. Start-Game.bat/ps1 launches game/, not historical dist/. Discover Godot using the launcher or GODOT_EXE rather than assuming a release version remains installed.
3. Run Godot with child-only isolated APPDATA and dedicated save paths. Headless import: --headless --path game --editor --import. Functional suite: --headless --path game --script res://scripts/testing/smoke_suite.gd. Repeat with -- --no-local-assets. Require suite markers AND diagnostic-free logs: Godot can exit zero after Script Errors.
4. For local art run smoke_local_source.gd and smoke_scanned_assets.gd. Optional proprietary Source pack stays in ignored/export-excluded game/assets/local_source; CC0 scans and original machine assets must work from a clean committed-tree copy without that pack or accidental loose local dependencies.
5. Review rollback at lifecycle boundaries: kill then immediately load without awaiting; repeat lifetimes; invalidate detached rigs before deferred collapse/animation/weapon work; verify WeakRefs, colliders, independent drops and stable pickup IDs. Also restore living enemies during charge/burst/lunge/recovery, not just dead actors.
6. For UI changes run smoke_ui_flow.gd headless and with a real GPU at 1280x720. Assert the actual focus owner is visible for every control, not just the final item. Test first Settings open before container layout settles, rapid focus changes, page close/reopen, large text/locale/resize, actual mouse/Tab events, held-click suppression, real lethal damage and checkpoint loading.
7. Deferred focus delivery alone may precede container layout. Use layout-aware scrolling with current-owner/page/visibility checks after waiting, avoiding competing scrolling mechanisms and stale callback targets. Prove the failure red before attributing it to closure capture or another guessed cause.
8. Collect actual gameplay/campaign captures, inspect them, and distinguish manual per-role fixtures from simultaneous encounters or playthroughs. Physical LOS cannot prove visual cover if large visible meshes lack matching collision. Validate rendering, collision and authored navigation together.
9. For delivery, reconstruct an exact scoped clean tree, import it and run fallback tests/export checks there. Keep user saves, ignored packs, generated caches and historical reports outside staging. Make local scoped checkpoints only under current user authorization; never infer push authorization.
10. Benchmark both GPUs sequentially with identical resolution, quality, scene, warmup and duration, without Comfy/generation contention. Record actual device identity and render scale, not just index; Godot and HIP indices differ. Preserve older reports and never extrapolate a previous FPS/AAA/whole-roster claim to a new asset pass.

## Pitfalls
- Do not use browser npm/Playwright gates to accept the Godot game.
- Imported scan ArrayMeshes must preserve automatic distance LODs; rebuilding only base surface arrays caused severe foliage/shadow cost.
- Source animated humanoids were measured with +X forward; model-space orientation must be measured against world aim/muzzle, not guessed from a standing pose.
- Standing native death-pose clips are not physical falls. Humanoid ragdolls and machine fold-down animations must be described accurately.
- In save rollback fixtures, automatic checkpoint writes can overwrite the intended pre-action save. Control the fixture's checkpoint/autosave state without changing runtime autosave semantics.
- Three starting weapons and an unlockable fourth slot coexist; legacy saves and full-capacity/accepted-only loot behavior must remain valid.
- A green end-of-test marker or script exit zero is not sufficient if earlier engine errors occurred. Retain red iteration logs separately from final acceptance.
- Do not fix world cover using collider shapes that visibly block empty space or assume authored navmesh automatically updates after adding colliders.

## Verification
1. Native and no-local-assets suites emit their current expected markers with no ERROR/WARNING/FAILURE diagnostics.
2. Changed lifecycle/input boundaries have adversarial red-to-green regressions and real GPU evidence where rendering/input matters.
3. Scoped committed-tree import/fallback tests pass without proprietary or unmanifested dependencies.
4. Pre-existing unrelated file hashes/dirty set remain unchanged, staged index is empty after the scoped checkpoint, and no publication occurred.
5. Report exact implemented coverage and remaining visual, performance, navigation and testing limitations.