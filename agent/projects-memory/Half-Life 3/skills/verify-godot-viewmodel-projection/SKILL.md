---
name: "verify-godot-viewmodel-projection"
description: "Diagnose Vesper Signal first-person depth/projection and skinning with reserved-R9700 GPU controls. Do not use for unrelated work."
version: 2
created: "2026-09-20"
updated: "2026-09-22"
skill-governor-tier: auto
skill-governor-risk: medium
---
## When to Use
Use for first-person clipping, detached weapon/hand projections, or suspected custom-shader skinning faults in game/.

## Procedure
1. Run tests/verify_viewmodel_depth.gd through tools/run_quality_probe.py on reserved R9700 with isolated APPDATA and no focus. Preserve failed evidence separately.
2. For Forward+/Mobile reverse-Z, near clip depth is z/w=1. Compress toward clip.w with mix(clip.w, clip.z, depth_compression); multiplying clip.z moves geometry away.
3. Keep carried Prism materials on the same viewmodel shader/FOV as the arms. PrismWeaponMesh.create(true) converts the carried instance; default create() retains ordinary world pickup materials and depth.
4. Run verify_viewmodel_skinning.gd at 1280x720: fully framed arms in rest/bent poses, identical FOV and neutral material masks, compare against ordinary Godot skinning before changing skeleton logic.
5. Run smoke_character_rigs.gd in both asset modes and capture_reference_route.gd for actual movement, combat and automatic Prism pickup; inspect actual images.
6. Run the full native/fallback suites and package export/start only when a coherent fix is complete and release-bound. Do not call diagnostic fixtures, fixed-step movies or concurrent-game R9700 results whole-game acceptance.

## Pitfalls
- Dummy rendering returns null for unset ShaderMaterial defaults. Compare shared shader plus matching overrides, including both unset, rather than float(null).
- Changing viewmodel projection on world pickups would make them incorrectly draw through walls.
- Ensure skinning comparison contains the full arms, not only tiny clipped tips. A positive comparison does not establish asset/pose quality.
- CaptureExitCoordinator intentionally produces twelve empty teardown frames after gameplay ends. Preserve originals and label this tail rather than claiming an in-route blackout.
- A custom projection must preserve x/y/w while altering only clip depth.

## Verification
1. GPU depth test passes all four cases, including uncompressed foreground and true occlusion controls.
2. Full-arm silhouette IoU is at least 0.97 in both poses.
3. Actual campaign route completes 16 waypoints with normal inputs and retained encounters/pickups; no gameplay-state cheats.
4. Full suite logs contain the expected marker and no ERROR/WARNING/FAILURE.