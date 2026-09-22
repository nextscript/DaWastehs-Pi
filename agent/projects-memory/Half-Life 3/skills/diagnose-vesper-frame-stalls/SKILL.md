---
name: "diagnose-vesper-frame-stalls"
description: "Investigate Vesper Signal frame spikes with bounded wall-clock traces and isolated cache/timing controls without weakening rendering or acceptance. Do not use for unrelated work."
version: 1
created: "2026-09-20"
updated: "2026-09-20"
skill-governor-tier: auto
skill-governor-risk: medium
---
## When to Use
Use for measured GPU-gameplay frame stalls or cold-start pauses; not as a substitute for actual graphical improvements, active gameplay, or whole-game acceptance.

## Procedure
1. Preserve baseline runs, bad tails and raw intervals. Keep the game/profile/view/resolution and measurement duration comparable; use only authorized GPUs and sequential processes.
2. Use game/tools/run_quality_probe.py with an explicit GPU identity and truthful --conditions. Add --benchmark-trace after -- for bounded observations that retain warmup, wall intervals, frame IDs, clock anchor and cumulative pipeline counters.
3. Interpret TIME_PROCESS/TIME_PHYSICS_PROCESS/TIME_NAVIGATION_PROCESS as periodically refreshed monitor observations, not per-frame CPU timings. Viewport CPU/GPU timings can be reported on later observations; inspect neighboring rows and never correlate independent maxima as proof.
4. Use --watch-pipeline-cache only for metadata in the fresh child's APPDATA. Inspect requested interval, actual poll count/max gap and the bounded wall/monotonic anchor when comparing file events with frame intervals.
5. For a specific cache-write hypothesis, --pipeline-cache-save-mb is a probe-only override. Verify the actual setting and observed file behavior. No observed disk write does not exclude driver-internal cache queries or other renderer work.
6. Use --benchmark-no-render-timing only as an explicit measurement-overhead control. It preserves wall-clock samples and graphics, marks render timings unavailable, and must not silently replace normal acceptance measurements.
7. When spikes persist, distinguish own-process CPU consumption, I/O and system scheduling/other load before editing production code. Repeat in an active input-driven route, not only staged cameras.
8. Validate the recorder's clean/error/stall/bounded-trace cases, normal default GPU path and observer success/error recording. Commit a coherent diagnostic step locally; keep unresolved performance and final acceptance open.

## Pitfalls
- Longer sample windows change how many frames enter the slowest 1%; an apparent better low after increasing duration is not a fix.
- Cumulative pipeline creation counters do not fully describe asynchronous compilation completion or driver internals.
- Fresh APPDATA also makes shader/pipeline caches cold; this is distinct from subsequent launches using the same isolated cache. Never touch the owner's saves or global GPU caches to test it.
- Optional tracing/metadata polling has overhead and scheduling uncertainty; record it in both control arms.
- Package previews and fixed-step movies remain narrower than normal exported gameplay and measured FPS.

## Verification
1. Trace rows reproduce exactly the recorder's sample intervals, including deliberately injected long stalls, and cap only their own storage.
2. Default runs contain no optional trace, retain viewport timing and unchanged production cache/render settings.
3. Each causal claim has matching observed evidence and a control; unsupported hypotheses remain explicitly unresolved.
4. Relevant regression logs are clean, scoped local commits exist, and raw diagnostics/private assets are not newly committed.