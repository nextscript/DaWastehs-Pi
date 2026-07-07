---
name: "windows-cpp-golden-rules"
description: "Golden Rules für professionelles C/C++- und System-Programming auf Windows 11 (MSVC, CMake, Ninja, WinAPI, Kernel), getunt für Intel Core Ultra 9 285K (AVX2, Hybrid 8P/16E)."
version: 2
created: "2026-05-29"
updated: "2026-06-29"
---
## When to Use
Wenn C oder C++ Code für Windows 11 (User-Mode oder Kernel-Mode) geschrieben oder debuggt wird. Tuned für Intel Core Ultra 9 285K (Arrow Lake-S: 8 P-Cores Lion Cove + 16 E-Cores Skymont, 24C/24T, kein HT) und AMD-GPU-Compute.

## Procedure
### 1. Build System & Toolchain
- **Toolchain**: MSVC (Latest) + CMake + Ninja für maximale Build-Geschwindigkeit.
- **Dependency Management**: `vcpkg` im Manifest-Modus (`vcpkg.json`).
- **Configuration**: `CMakePresets.json` zum Standardisieren der Build-Umgebungen.
- **Standard**: C++20/C++23 (oder neuestes verfügbar), `/W4` (Warning Level 4) + `/WX` (Warnings as Errors).

### 2. CPU-Tuning für den 285K (Arrow Lake)
- **SIMD-Codepaths**: Maximales CPU-Target ist `/arch:AVX2` (plus `/arch:AVXVNNI`/AVX10-Optionen für Int8/VNNI-Workloads). **KEIN AVX-512** — der 285K unterstützt nur AVX2/AVX-VNNI; `/arch:AVX512` erzeugt Code, der mit Illegal-Instruction faultet. Runtime-Dispatch über `__cpuid`/`IsProcessorFeaturePresent` anbieten.
- **Hybrid-Scheduling**: 24 logische Cores = 8 P- (Lion Cove) + 16 E-Cores (Skymont), kein Hyperthreading. Latenz-kritische Threads (Audio/Render/Game-Loop) bevorzugt auf P-Cores; Hintergrundlast (Build, Decoding, Asset-Loading) auf E-Cores via `SetThreadInformation(ThreadPowerThrottling)` oder `GetSystemCpuSetInformation`/`SetThreadSelectedCpuSets`. Keine SMT-Paar-Annahmen.
- **Cache-bewusst**: P-Core L1d 48 KB / L2 2 MB privat; E-Core L1d 64 KB / L2 4 MB je 4er-Cluster; 36 MB shared L3. Datenstrukturen (Tiles, SoA) auf diese Working-Sets zuschneiden.

### 3. Memory & Resource Management
- **RAII Everywhere**: nie rohe `new`/`delete`; `std::unique_ptr`/`std::shared_ptr`.
- **WinAPI Handles**: alle `HANDLE`/`HMODULE`/`HKEY` in Smart Pointern mit Custom Deleter (`std::unique_ptr<void, decltype(&CloseHandle)>`).
- **Aligned Allocation (MSVC-korrekt!)**: MSVC unterstützt `std::aligned_alloc` **NICHT**. Nutze `_aligned_malloc`/`_aligned_free`, C++17 `std::pmr` mit aligned Polymorphic Resource, oder C++17/20 aligned `new` (`alignas(64) T* p = new T;` → ruft `operator new(size, align_val)`).

### 4. Windows API & String Handling
- **Unicode First**: `std::wstring`/`wchar_t` an der WinAPI-Grenze; interne Logik UTF-8 (`std::string`), nur an der Boundary konvertieren.
- **API Selection**: stets 'W'-Suffix (`CreateFileW` etc.).
- **Filesystem**: `std::filesystem` für Pfade (Long Paths, cross-plat).

### 5. System & Kernel Programming
- **IRQL Awareness**: im Kernel Mode IRQL prüfen, bevor paged Memory berührt wird.
- **Pool Choice**: `NonPagedPoolNx` für residenten Speicher; keine executable Pools außer wenn zwingend nötig.
- **Error Handling**: `NTSTATUS` (Kernel) / `HRESULT` (User-Mode COM), gewrappt in `std::expected` (C++23).

### 6. Concurrency & Synchronization
- **Primitives**: `std::mutex`/`std::condition_variable`; `SRWLock` für High-Perf.
- **Thread Safety**: kein `volatile` für Sync → `std::atomic`.
- **Asynchronous I/O**: IOCP oder `std::async`.

## Pitfalls
- **`/arch:AVX512` auf dem 285K**: ILLEGAL — nur AVX2/VNNI; führt zu Illegal-Instruction-Crashes.
- **`std::aligned_alloc` unter MSVC**: nicht verfügbar → Compiler/Linker-Fehler. MSVC-Pfade verwenden.
- ANSI APIs ('A'-Versionen) → Encoding-Bugs; stets 'W'.
- MAX_PATH (260) annehmen → Long-Path-Prefix (`\\?\`) bzw. Manifest `<longPathAware>`.
- Handle Leaks: `CloseHandle`/`Release` vergessen → RAII-Wrapper nutzen.
- Kernel IRQL: paged-Funktionen bei DISPATCH_LEVEL+ → sofortiger BSOD.
- UTF-8/UTF-16-Mixing mit veralteten APIs → `WideCharToMultiByte`/`MultiByteToWideChar`.

## Verification
1. MSVC Static Analysis (`/analyze`) auf API-Misuse.
2. AddressSanitizer (`/fsanitize=address`) + UBSan für Memory-Corruption/UB.
3. App-Manifest `<longPathAware>true</longPathAware>`.
4. WinAPI-Calls prüfen (`NULL`/`FALSE` + `GetLastError()`).
5. `rg`/`grep` über Codebase: keine 'A'-Versionen, kein `std::aligned_alloc`, keine `/arch:AVX512`.
6. CPUID-Dispatch-Test: AVX2-Pfad läuft nativ, Fallback-Pfad auf Systemen ohne VNNI.