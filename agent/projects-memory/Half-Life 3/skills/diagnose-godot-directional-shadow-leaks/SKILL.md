---
name: "diagnose-godot-directional-shadow-leaks"
description: "Diagnose real interior sunlight leaks from large procedural shell triangles without disabling lights or hiding material response. Do not use for unrelated work."
version: 1
created: "2026-09-20"
updated: "2026-09-20"
skill-governor-tier: auto
skill-governor-risk: medium
---
## When to Use
Use when native GPU captures show sunlight or solar specular highlights inside a physically closed Godot campaign room.

## Procedure
1. Capture the actual campaign camera before changing lighting; pair it with physics rays toward the sun to establish whether the receiving surface should be occluded.
2. Use capture_quality_baseline.gd diagnostic light probes to isolate specular source. Label these ablations explicitly; never present them as production acceptance.
3. Compare shadow bias and directional_shadow_pancake_size in diagnostics. A larger pancake fixing the leak while lower bias does not implicates giant caster triangles/cascade clipping, not roughness or insufficient bloom suppression.
4. Prefer bounding wall/ceiling slab tessellation in ZoneComplex._add_slab while preserving shape, UV projection, material and collision. Do not permanently disable sun/specular or extend the global depth range without checking quality/performance costs.
5. Run verify_sun_occlusion.gd on the authorized GPU: compare normal sun against diagnostic specular-off samples at physically blocked points. Run --coarse-shell-control separately to prove the detector catches reconstructed coarse-caster leakage.
6. Run industrial/habitat gates, native/fallback suites, equal-camera captures, real input movement and sequential diagnostic benchmarks after the correction.

## Pitfalls
- A blocked physics ray alone does not prove correct rendered shadows.
- Low shadow bias can introduce acne without fixing pancake clipping.
- Negative-control fixtures may temporarily replace shadow casters; keep this confined to the test and never confuse the expected-fault pass with production image quality.
- Rounded furnishings should derive convex collision from original mesh vertices. Mesh.create_convex_shape(false) avoids clean-hull vertex changes when exact render/physics point parity is required.
- StandardMaterial3D emission textures default to additive composition; explicitly use EMISSION_OP_MULTIPLY for a textured display tinted by white rather than adding a white emission term.

## Verification
1. Closed-shell production samples have negligible solar specular difference; coarse negative control shows the leak and trips the production threshold.
2. Source lights, specular strength, shadow quality and gameplay mechanics remain enabled.
3. Real pictures are visually inspected; performance and fixed-step video are clearly distinguished.