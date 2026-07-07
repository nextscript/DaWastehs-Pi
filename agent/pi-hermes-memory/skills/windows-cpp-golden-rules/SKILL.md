---
name: windows-cpp-golden-rules
description: "Professional Windows 11 C/C++ and systems-programming rules for MSVC, CMake/Ninja, WinAPI, kernel-mode, and Intel Core Ultra 9 285K tuning. Use whenever writing or reviewing native Windows code."
---

# Windows C/C++ Golden Rules (285K / Arrow Lake-S)

## Toolchain baseline
- MSVC latest + CMake + Ninja is the default fast path; use `vcpkg.json` manifest mode for dependencies.
- Standardize builds with `CMakePresets.json`.
- Treat `/W4 /WX`, `/analyze`, ASan (`/fsanitize=address`), and tests as normal development tools, not optional polish.

## CPU tuning on Intel Core Ultra 9 285K
- 24 logical cores = 8 P-cores + 16 E-cores, no Hyper-Threading. Do not assume SMT pairs.
- Maximum safe SIMD target is AVX2/AVX-VNNI. **No AVX-512** on this CPU.
- Runtime-dispatch feature-specific code paths with `__cpuid` / `IsProcessorFeaturePresent`.
- Latency-critical render/audio/game threads prefer P-cores; asset loading/logging/background work can use E-cores via `GetSystemCpuSetInformation` / `SetThreadSelectedCpuSets`.
- Cache facts: P L1d 48 KB, P L2 2 MB private; E L1d 64 KB, E L2 4 MB per 4-core cluster; 36 MB shared L3.

## Memory and resources
- RAII everywhere. No raw owning `new`/`delete` in application code.
- Wrap `HANDLE`, `HMODULE`, `HKEY`, COM interfaces, PDH queries, and other WinAPI resources with custom deleters.
- MSVC does not support `std::aligned_alloc`; use `_aligned_malloc/_aligned_free`, aligned `operator new`, or a PMR resource.

```cpp
using unique_handle = std::unique_ptr<std::remove_pointer_t<HANDLE>, decltype(&CloseHandle)>;
unique_handle h(CreateFileW(path, GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING, 0, nullptr), CloseHandle);
if (h.get() == INVALID_HANDLE_VALUE) throw_last_error();
```

## WinAPI and strings
- Use `W` APIs (`CreateFileW`) at OS boundaries. Internal text may stay UTF-8, but convert deliberately.
- Use `std::filesystem` and enable long paths via manifest when shipping apps.
- Never assume `MAX_PATH` unless the target API explicitly requires it.

## Kernel/system code
- Check IRQL before touching paged memory.
- Use `NonPagedPoolNx`; executable pools only when truly required.
- Model errors as `NTSTATUS`, `HRESULT`, or `std::expected`, not silent booleans.

## Verification
```powershell
rg "std::aligned_alloc|/arch:AVX512|CreateFileA|RegOpenKeyA|strcpy|sprintf|gets" .
```

- Build with `/W4 /WX /analyze` and ASan where supported.
- Manifest contains `<longPathAware>true</longPathAware>` for app targets.
- CPUID dispatch smoke test exercises AVX2 and fallback paths.
- Static search finds no ANSI WinAPI calls, banned C functions, or AVX-512 flags.
