---
name: "author-machined-props-with-matched-collision"
description: "Develop procedural rounded/turned Vesper Signal props with exact static collision, shared prototypes and real visual evidence. Do not use for unrelated work."
version: 2
created: "2026-09-20"
updated: "2026-09-20"
skill-governor-tier: auto
skill-governor-risk: medium
---
## When to Use
Use when refining existing HabitatArt machinery or furniture without moving gameplay footprints or adding inventory features.

## Procedure
1. Capture the real existing bench/storage-close view before changing geometry, using run_quality_probe.py and a unique evidence folder.
2. Build rounded boxes or radius/height revolved profiles in MachinedPrimitives. Axis-ended profiles close solid bodies; repeated endpoints close rings. Omit collapsed axis triangles and preserve deliberate profile creases.
3. Use convex_for for convex rounded boxes and triangles_for for static rings/recessed profiles. Never replace an open ring with a solid convex hull. Transform render and collision from the same local geometry.
4. Share immutable prototypes using exact serialized geometry parameters, including resolution and smoothing. Keep placement outside the key. Do not mutate cached meshes or shape resources.
5. Extend smoke_machined_art for manifold seams, winding, normals, physics parity and cache non-aliasing. Run habitat route/collider gates, industrial checks and actual GPU movement.
6. Compare matched images, scene_build_ms and repeated native-resolution diagnostics. Run full native/fallback regressions and preserve source hashes at a coherent checkpoint.

## Pitfalls
- A smooth-looking ring can still contain degenerate axis triangles or an invisible solid collision bore. Probe empty space as well as visible parts; bidirectional rays against actual triangle intersections expose both ghost colliders and missing collision.
- Float-formatted cache keys can alias nearby dimensions; var_to_bytes parameter serialization avoids decimal truncation.
- Shared shapes are safe only while immutable; CollisionShape3D placement must stay per-instance.
- Detailed repeated geometry can substantially increase build time even when frame rendering remains acceptable.
- Concurrent-game R9700 probes and fixed-step movies never replace uncontended final RX acceptance.
- SurfaceTool commit followed by append_from can introduce an additional normal encoding/decoding pass. For a collision-only fix, leave the original render append path intact and gather a separate collision surface; verify faces, normals and UVs against baseline.
- A failed assert inside a SceneTree test callback may leave the engine idling rather than exiting. Use explicit failure accounting/quit and a bounded native process runner.
## Verification
1. Every relevant render surface and physical surface agrees, including bores and recesses.
2. Existing navigation capsules, normal-input movement, shooting and reload still pass.
3. No engine diagnostics; native/fallback suites pass; original user bytes/deletions outside the explicit change set remain intact.