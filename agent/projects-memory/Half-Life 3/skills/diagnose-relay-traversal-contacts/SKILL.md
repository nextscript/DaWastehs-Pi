---
name: "diagnose-relay-traversal-contacts"
description: "Diagnose Vesper Signal ramp lips and standing headroom with normal-input routes, actual collision contacts and isolated saves. Do not use for unrelated work."
version: 1
created: "2026-09-21"
updated: "2026-09-21"
skill-governor-tier: auto
skill-governor-risk: medium
---
## When to Use
Use when an existing normal-input route stalls against static world geometry, especially the relay ruin; not as a substitute for normal-spawn or whole-game acceptance.

## Procedure
1. Retain the failed capture_reference_route report, endpoint image and last physics positions. Extend routes without teleport, invulnerability or disabled actors.
2. Reproduce near the failure with the actual game/player and normal movement input. Label initial placement as a focused fixture, log get_slide_collision collider paths, contact normals/points and player position.
3. Fix the demonstrated geometry with matching visible mesh and collider. For a longer inclined box, move the centre by half the extension in local slope coordinates to preserve the upper seam. Check the actual terrain beneath headroom, not only the nominal foundation plane.
4. Use dedicated VersionedSaveService.configure_paths for each new smoke before creating the game; clear only its test checkpoint. Separate processes in smoke_suite still share user data.
5. If a distance gate fails after changing slope length, retain its old-budget trace and observe continued motion before adjusting the time budget. Keep destination and height criteria unchanged; do not explain a genuine stall away as fixture timing.
6. Repeat focused gates, the actual normal-spawn GPU route, native/fallback smoke suites and isolated release checks. Keep failures and scope limitations in docs/hl3-quality/STATUS.md.

## Pitfalls
- Iteration14 ApproachRampCollider had a roughly 30cm entry lip; the separate RelayDeckCollider underside blocked the standing player at the rising north exit.
- A longer continuous slope reduces horizontal progress at the same commanded speed. The actor reached the slab at tick240 but crossed the unchanged distance threshold only before tick270.
- New moving tests writing the default save slot contaminated later opening tests even though each smoke had a separate process.
- Do not change player capsule, motion, enemies, quality gates or route inputs to conceal bad world geometry.

## Verification
1. Contact evidence identifies the actual collider; fixed focused and normal-spawn routes both pass without engine diagnostics.
2. Ring/relay changes retain the 20-kind/17280-ray mesh-versus-physics gate.
3. Run new tests followed by smoke_opening.gd in a shared isolated APPDATA to demonstrate save isolation.
4. Full native and fallback suites pass; preserve source-only local commits and all adverse evidence.