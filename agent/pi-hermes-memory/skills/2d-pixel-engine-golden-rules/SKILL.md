---
name: 2d-pixel-engine-golden-rules
description: "Architecture and rendering rules for deterministic 2D pixel-art games. Use whenever designing a game loop, ECS/data layout, sprite renderer, camera, particles, or performance pass for a 2D browser/native pixel engine."
---

# 2D Pixel-Art Engine Golden Rules

## Fixed timestep
- Simulation is fixed-rate (usually 60 Hz); rendering is as fast as the display allows.
- Use an accumulator and clamp huge frame gaps after tab switches or pauses.
- Interpolate render positions from the previous/current simulation states; never make physics speed depend on monitor Hz.

```ts
const STEP = 1 / 60;
let acc = 0;
function frame(nowDt: number) {
  acc += Math.min(nowDt, 0.1);
  while (acc >= STEP) { previous = current.clone(); update(STEP); acc -= STEP; }
  render(acc / STEP);
}
```

## Data layout and allocation
- Prefer ECS/SoA data for hot simulation loops; composition beats deep inheritance trees.
- Pool bullets, particles, enemies, decals, and transient effects. Stable gameplay should allocate zero objects per frame.
- Keep grid/tile data flat (`index = y * width + x`); avoid array-of-arrays in hot paths.

## Pixel-perfect rendering
- Render into an internal low-resolution buffer (for example 320×180), then upscale by an integer factor.
- Round final camera/entity draw coordinates (`Math.round`/`floor`) after camera transforms to avoid subpixel jitter.
- Sprite sheets need padding/edge extrusion so nearest/bilinear sampling cannot bleed into neighboring frames.

## System-specific performance hooks
- Do not duplicate hardware tuning here. For 285K P/E-core scheduling, AVX2-only SIMD, cache facts, and Windows-native C++ details, use `windows-cpp-golden-rules`.
- For AMD GPU/inference roles on Pandaking, use `amd-dual-gpu-inference`; gameplay rendering normally targets the display GPU and keeps AI workloads separate.

## Pitfalls
- `position += speed * deltaTime` inside collision/physics creates different gameplay at 30/60/144 Hz.
- Floating render coordinates cause shimmering even when the simulation is correct.
- Spawning/destroying particles per frame causes GC or allocator spikes.
- Texture bleeding usually means missing padding, wrong UVs, or non-integer scaling.

## Verification
- Logic behaves identically at 30, 60, and 144 FPS.
- Slow camera pan over a checkerboard shows stable square pixels with no shimmer.
- Profiler shows no per-frame allocations during a steady gameplay sequence.
- Scaling tests at odd window sizes preserve square pixels and expected letterboxing.
