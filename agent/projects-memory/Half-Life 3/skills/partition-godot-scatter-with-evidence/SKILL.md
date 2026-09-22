---
name: "partition-godot-scatter-with-evidence"
description: "Optimize large Godot MultiMeshes without losing placements, imported LODs, shadows or collision contracts. Do not use for unrelated work."
version: 1
created: "2026-09-20"
updated: "2026-09-20"
skill-governor-tier: auto
skill-governor-risk: medium
---
## When to Use
Use when profiling game/ implicates globally batched landscape instances; not as an unmeasured universal optimization.

## Procedure
1. Measure identical real campaign cameras with GPU profile enabled before changing code. Use game/tools/run_quality_probe.py for no-focus, isolated R9700 runs while the owner games; label concurrent-load measurements diagnostic.
2. Keep authoritative scatter_placements/scatter_tints and collision consumers intact. SpatialScatter retains the original Mesh resource including LODs and renders indexed subsets with conservative mesh-plus-wind bounds.
3. Retain the source node as a non-drawing catalog using visible_instance_count=0; do not hide the parent. Rebuild render chunks after any footprint removal so old instances cannot remain on screen.
4. Test every source index exactly once, original GPU transforms/colors, shared mesh resource, shadow/GI settings and bounds. Run smoke_spatial_scatter.gd on GPU and headless plus habitat/project/rock-cover regressions.
5. Use capture_quality_baseline.gd --quality-reference-scatter only for controlled A/B reconstruction of the prior renderer. Alternate at least three equal runs and inspect interior/exterior captures; retain moving-camera tests as a separate required check.

## Pitfalls
- Appending to a PackedInt32Array obtained by a cast from Dictionary can update a temporary copy. Read to a local variable, append, and assign it back; assert complete source/render coverage.
- Chunking may increase reported draw calls/primitives while lowering GPU time. Report the actual time and count changes, not an invented triangle reduction.
- Do not remove mesh LODs by rebuilding ArrayMesh base arrays, introduce cell-center distance pop, or silently remove shadow casters.
- Reference-mode fixed cameras and concurrent gaming do not satisfy final moving-gameplay performance acceptance.

## Verification
1. GPU parity and footprint-rebuild tests pass without diagnostics.
2. Actual image comparisons show retained tree silhouettes, materials and shadows; separately check motion/cell boundaries.
3. No personal saves, unrelated dirty source or original asset bytes were changed; keep exact source hashes alongside evidence.