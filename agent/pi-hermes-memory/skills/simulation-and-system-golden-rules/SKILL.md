---
name: "simulation-and-system-golden-rules"
description: "Best Practices für performante Grid-Simulationen und effizientes Windows-System-Monitoring, getunt für Intel Core Ultra 9 285K (Cache/AVX2/Hybrid) und AMD-GPU-Offload."
version: 2
created: "2026-05-29"
updated: "2026-06-29"
---
## When to Use
Wenn performante Grid-Simulationen (Cellular Automata) oder System-Monitoring-Tools gebaut werden. Tuned für Intel Core Ultra 9 285K (Arrow Lake-S) und AMD-GPU-Offload.

## Procedure
1. **Datenlayout**: flache 1D-Arrays für Speicher-Kontiguität; Structure of Arrays (SoA) statt Array of Structs (AoS).
2. **Tiling an 285K-Cache**: Tiles so wählen, dass der Working-Set in L1d/L2 passt — P-Core L1d 48 KB, E-Core L1d 64 KB, P-Core L2 2 MB privat, E-Core L2 4 MB je 4er-Cluster, 36 MB shared L3. Bei Double Buffering beide Buffer einrechnen → konservativ ≤ 32 KB L1-Target.
3. **Double Buffering**: Race-Free und SIMD-Vektorisierung-freundlich.
4. **SIMD**: AVX2 (`__m256d`, 4 doubles) — **nicht AVX-512** (285K hat keins). VNNI ggf. für Int8-Daten. Auto-Vectorization via `#pragma omp simd` / MSVC `#pragma loop(ivdep)`.
5. **Hybrid-Kern-Parallelität**: 8 P- + 16 E-Cores, 24 Threads, kein HT. Latenz-kritische Sim-Ticks auf P-Cores (`SetThreadSelectedCpuSets`); Pre-/Post-Processing, Logging, Visualisierung auf E-Cores. Work-Stealing-Executor vermeidet Lastungleichgewicht zwischen P/E-Clustern.
6. **GPU-Offload** für große Grids: 32 GB Radeon AI PRO R9700 oder 16 GB RX 9070 XT via HIP (Compute-Kernel), D3D12 Compute Shader oder OpenCL. Grid jenseits CPU-Hauptspeicher-Vorteil → GPU; CPU-Pfad als Fallback.
7. **System-Monitoring**: hochfrequente Daten über PDH-API (Performance Data Helper), nicht WMI. WMI ausschließlich asynchron (`ExecQueryAsync`).
8. **Power/Idle**: adaptive Polling-Intervalle + WaitableTimers zur Reduzierung der CPU-Idle-Last; strikte Ressourcen-Bereinigung (COM `Release`, PDH `PdhCloseQuery`).

## Pitfalls
- **AVX-512-Intrinsics** auf dem 285K → Illegal-Instruction.
- CPU-Auslastung durch tight Polling-Loops ohne präzise Timer.
- Cache-Misses durch AoS/mehrdimensionale Arrays bei großen Grids.
- Tiles zu groß für L1 → Thrashing; zu klein → Loop-Overhead.
- Memory-Leaks durch nicht geschlossene WMI/PDH-Handles.
- UI-Thread blockiert durch synchrone WMI-Abfragen.
- Thread-Affinität blind auf "alle Cores" → P/E-Lastungleichgewicht.

## Verification
1. Profiler (VTune, Visual Studio Profiler, FlameGraphs): L1/L2-Hit-Raten und Cache-Miss-Rate pro Tile-Größe; optimale Tile-Größe empirisch ermitteln.
2. SIMD-Check: Disassembly zeigt AVX2 (`vaddpd` etc.), keine 512-Bit-Instruktionen.
3. Monitoring-Thread im Ressourcenmonitor ~0 % im Idle.
4. Memory Profiler: keine steigenden Heap-Allokationen über lange Polling-Zyklen.
5. GPU-Pfad vs. CPU-Pfad Benchmark (Durchsatz bei identischem Grid).