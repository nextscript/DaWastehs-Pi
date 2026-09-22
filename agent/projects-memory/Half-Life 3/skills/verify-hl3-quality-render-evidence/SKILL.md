---
name: "verify-hl3-quality-render-evidence"
description: "Collect trustworthy native-resolution GPU comparisons and wall-clock performance evidence in the active Godot game. Do not use for unrelated work."
version: 2
created: "2026-09-20"
updated: "2026-09-20"
skill-governor-tier: auto
skill-governor-risk: medium
---
## When to Use
Use for visual/performance changes in game/ under the HL3 quality contract; this does not replace gameplay, campaign, fallback or release gates.

## Procedure
1. Preserve dirty source bytes, deletions and optional local-pack provenance before changes; keep a verified snapshot and hashes under ignored game/reports/raw/hl3-quality, never reset the working tree.
2. Run Godot with process-local isolated APPDATA and explicit GPU. Use tests/capture_quality_baseline.gd with --quality-view and unique --quality-output; real GPU required. Keep original captures and identify fixed cameras as such, not playthroughs.
3. Confirm actual PNG/get_image().get_size() dimensions, not only Window.size or ViewportTexture.get_size(). Run smoke_display_resolution.gd on GPU across 16:9, ultrawide and 4:3; canvas_items with default keep can pillarbox native ultrawide.
4. Use PerformanceRecorder schema 2: monotonic wall-clock intervals, retained stalls, raw samples, warm-up spikes and explicit low-FPS definition. Run smoke_performance_recorder.gd including injected stall/time_scale and diagnostic rejection.
5. Run benchmarks sequentially without competing load, at least three identical trials. Separate image readback/capture from timed samples. Record GPU identity, High/render scale, real output dimensions and render CPU/GPU timing scope; fixed-camera data is not a moving gameplay acceptance route.

## Pitfalls
- ViewportTexture.get_size() returned 640x360 under a 1280x720 scaled canvas while get_image().get_size() correctly returned 1280x720. Use real rendered image dimensions.
- Engine delta may be time-scaled/clamped; discarding delta>0.5 hides exactly the long stalls that must be reported.
- Schema 1 one_percent_low_fps was reciprocal P99; schema 2 uses reciprocal mean of slowest ceil(1%) intervals. Do not compare these as identical metrics.
- Original capture_habitat_art.gd intentionally requires R9700; use the separate quality harness for the requested RX 9070 XT without weakening the historical harness.
- Godot MovieWriter can store JPEG video chunks under 00db, not only 00dc. A custom RIFF reader must recognize both and require a nonzero decoded-frame count plus actual image dimensions; metadata or zero-error empty scans do not validate a movie.
- Retain original MovieWriter files. If the RIFF length is demonstrably short, create a separate corrected copy, change only bytes4–7 and verify the entire payload from byte8 remains identical. Do not assume the historical 70-byte error without checking.
- Fixed-30Hz movies are visual evidence, not measured FPS. CaptureExitCoordinator frees the scene and waits12 process frames; identify the uniform teardown tail explicitly instead of trimming it or labeling it an in-route blackout. Sampled contact sheets are not exhaustive temporal review.
## Verification
1. Capture, GPU identity and metadata agree on actual resolution/profile; inspect the rendered image.
2. Changed subsystem and GPU UI/resize checks pass with success markers and no engine diagnostics.
3. Unrelated initial files/deletions retain their original hashes/state; distinguish measured improvement from outstanding quality/coverage targets.