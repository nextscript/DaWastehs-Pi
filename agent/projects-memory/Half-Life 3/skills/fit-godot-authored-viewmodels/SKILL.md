---
name: "fit-godot-authored-viewmodels"
description: "Fit Vesper Signal authored weapons and skinned sleeves while preserving grip reach, reticle clearance, and native asset behavior. Do not use for unrelated work."
version: 2
created: "2026-09-20"
updated: "2026-09-22"
skill-governor-tier: auto
skill-governor-risk: medium
---
## When to Use
Use for first-person weapon proportions, sleeve discontinuities, or carry-placement changes in the canonical Godot game.

## Procedure
1. Capture an untouched real gameplay view using run_quality_probe.py with --no-local-assets; also exercise local assets because Prism shares the authored rig.
2. Inspect FirstPersonRig weapon scale, grip landmarks, carry transform and support-arm triangle together. Preserve trigger-hand anchoring and verify that the handguard is reachable without clamping or stretching segment lengths.
3. When a farther support hand exposes a capped forearm, build a continuous shoulder/elbow/wrist sleeve through CharacterMeshFactory's profiled skinned-limb helper. Keep bone names, skin binds and material surfaces compatible with existing animations.
4. Run smoke_character_rigs.gd and verify_viewmodel_skinning.gd. Run verify_viewmodel_clearance.gd with R9700 and --no-local-assets; require visible geometry, clear reticle pixels and successful intentional-occluder control.
5. Use capture_reference_route.gd in both asset modes with ordinary ActionMap movement/combat, then inspect actual aim, reload and Prism-switch images. Preserve intermediate rejected captures rather than presenting them as final results.
6. Run the relevant suites and an isolated export; run the full suites only when the change is cross-cutting or release-bound. Check the exported executable's --help: this release template ignores unsupported --script. Its shipped --capture-preview path can verify actual package images, but cannot establish a normal-input release route.

## Pitfalls
- Correct silhouette skinning does not prove correct normals, materials or lighting.
- Increasing weapon scale alone can expose sleeve caps and cover the reticle; reachable grips do not guarantee readable framing.
- The six clearance samples do not cover complete animation cycles, recoil or sway extremes.
- Never use a smaller weapon, hidden hands, altered FOV or disabled effects just to evade an unrelated acceptance requirement.
- Preserve the original dirty baseline and optional Source pack. Use unique evidence names, child-only APPDATA, no-focus/offscreen settings and only the reserved R9700 while the user is gaming.

## Verification
1. Trigger/support landmarks, fixed segment lengths, upper-arm skin weights, eight bones and four PBR surfaces pass.
2. GPU skinning and clearance controls pass, and real in-game images show no exposed sleeve cap or obstructed reticle at the reviewed poses.
3. Both normal-input asset-mode routes pass without teleports, health edits or disabled opponents.
4. Release evidence identifies actual decoded size, GPU, executable hash, packaged content, and the limits of preview versus movement tests.