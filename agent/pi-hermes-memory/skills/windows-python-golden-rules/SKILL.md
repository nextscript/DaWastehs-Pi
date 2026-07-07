---
name: windows-python-golden-rules
description: "Modern Python 3.12+ rules on Windows 11 including uv, pathlib, async/process behavior, native wheels, and AMD GPU ML via ROCm/HIP or DirectML. Use whenever writing Python tools or local AI code on Windows."
---

# Windows Python Golden Rules (3.12+ / AMD GPU)

## Environment baseline
- Prefer `uv` for packages/tools and the `py` launcher for selecting Python versions.
- Use per-project venvs; never rely on global site-packages.
- Paths use `pathlib.Path`; enable LongPaths and test deep paths.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -U uv
.\.venv\Scripts\python.exe -m uv pip install -r requirements.txt
```

## Windows runtime rules
- Async I/O uses the default Proactor loop on Windows.
- CPU-bound work uses `multiprocessing` with spawn semantics; protect entry points with `if __name__ == "__main__"`.
- Free-threaded Python (`3.13t`/`3.14t`) is opt-in only after every C extension is known no-GIL-safe.
- Native packages need MSVC Build Tools / Visual Studio C++ workload.

## ML / AMD GPU
- There is no CUDA on Pandaking. Use ROCm/HIP, DirectML, Vulkan, or CPU.
- Device roles and llama.cpp inference flags are canonical in `amd-dual-gpu-inference`; this skill owns Python packaging/runtime choices.
- Use `HIP_VISIBLE_DEVICES` or framework-specific device selection deliberately; defaults may not pick the 32 GB R9700.
- DirectML (`torch-directml`, `onnxruntime-directml`) is the fallback when native ROCm/HIP wheels do not support the workload.

## Pitfalls
- Defender can slow/block subprocess launches from temp directories; keep build/cache dirs stable when possible.
- PowerShell execution policy and PATH freshness are covered in `powershell-windows-scripting`; do not debug those from scratch here.
- C extensions without PEP-703 support can crash in free-threaded Python.
- Tutorials are often CUDA-only; translate them to ROCm/HIP/DirectML or reject them.

## Verification
- Path test covers >260-character paths.
- Test suite runs under the intended Python version and venv.
- Free-threaded smoke tests are separate from standard-GIL tests.
- ML startup prints the selected backend/device and expected VRAM before model load.
