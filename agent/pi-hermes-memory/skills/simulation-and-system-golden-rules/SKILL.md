---
name: simulation-and-system-golden-rules
description: "Performance rules for grid simulations and Windows system monitoring. Use for cellular automata, falling-sand style grids, high-frequency telemetry, PDH/WMI choices, and CPU/GPU performance triage."
---

# Grid Simulation & Windows System Monitoring

## Grid simulation (CPU)
- Use flat 1D arrays and Structure of Arrays for hot cell state.
- Double-buffer state when deterministic neighbor reads matter; otherwise document any intentional in-place bias.
- Tile working sets conservatively. Keep sim-specific L1 targets (for example ≤32 KB including both buffers); CPU/cache facts live in `windows-cpp-golden-rules`.
- SIMD target on Pandaking is AVX2/VNNI only; never emit AVX-512 code paths for the 285K.

## GPU offload
- Offload only when the grid is large enough to amortize transfers and synchronization.
- Keep a CPU reference path for correctness checks.
- AMD device roles and llama.cpp/Vulkan/HIP inference details belong in `amd-dual-gpu-inference`; do not duplicate the card table here.

## System monitoring
- GPU engine utilization on Windows uses PDH, not WMI. Use `windows-gpu-utilization-pdh` for the canonical call sequence and pitfalls.
- WMI is acceptable for one-shot inventory/VRAM or slow async queries; never poll it synchronously in a UI thread.
- Use adaptive polling intervals and waitable timers to keep idle CPU usage near zero.

## Pitfalls
- AVX-512 intrinsics on the 285K cause illegal-instruction crashes.
- AoS or nested arrays cause cache misses on large grids.
- Tiles too large thrash L1; tiles too small waste loop overhead.
- Tight polling loops burn CPU; sync WMI blocks UI responsiveness.
- Leaked COM/PDH handles accumulate over long sessions.

## Verification
- VTune/Visual Studio Profiler confirms cache hit rates and tile-size behavior.
- Disassembly shows AVX2 instructions and no 512-bit instructions.
- Idle monitoring thread is ~0% CPU.
- Long telemetry runs show stable handle/memory counts.
- CPU and GPU paths match on deterministic test grids before trusting throughput numbers.
