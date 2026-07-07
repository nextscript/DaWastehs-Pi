---
name: "configure-rdna4-comfyui-multigpu"
description: "Enable and validate native RDNA4 multi-GPU ComfyUI on this Windows setup"
version: 7
created: "2026-06-13"
updated: "2026-06-13"
---
## When to Use
Use when adjusting, debugging, or recreating the H:/ComfyUI Windows RDNA4 multi-GPU launcher/patch for the R9700 + RX 9070 XT setup.

## Procedure
1. Inspect `H:/ComfyUI/start-rdna4-multigpu.ps1` and keep `HIP_VISIBLE_DEVICES`/`CUDA_VISIBLE_DEVICES` set before any Python/Torch import; use `0,1` so R9700 is primary and RX 9070 XT is secondary.
2. Keep the ROCm/RDNA4 BLAS workaround environment variables set before Python/Torch import: `TORCH_BLAS_PREFER_HIPBLASLT=0`, `TORCH_BLAS_PREFER_CUBLASLT=0`, and `DISABLE_ADDMM_CUDA_LT=1`. These avoid unsupported hipBLASLt retry warnings seen on gfx1201 shapes and should make `torch.backends.cuda.preferred_blas_library()` report Cublas/classic hipBLAS in the launcher probe.
3. Keep explicit CPU helper-library thread env vars (`OMP_NUM_THREADS`, `MKL_NUM_THREADS`, `OPENBLAS_NUM_THREADS`, `NUMEXPR_NUM_THREADS`) at `[Environment]::ProcessorCount`; this documents the 24-thread setup, although most WAN sampling work is GPU-bound and Python orchestration remains single-threaded.
4. Current crash-avoidance MultiGPU launcher profile is intentionally more conservative than the solo launchers: `--cuda-device 0,1 --default-device 0 --enable-dynamic-vram --async-offload 1 --reserve-vram 4 --disable-pinned-memory`, plus a separate sqlite `--database-url` for the multigpu profile.
5. Keep `MGPU_DISABLE_P2P=1` in the MultiGPU launcher on this Windows/ROCm/WDDM setup. `ComfyUI-MultiGPU/p2p_registry.py` should assume no direct P2P on Windows ROCm and force CPU staging for cross-GPU DLPack unless `MGPU_FORCE_P2P_QUERY=1` is deliberately set for diagnostics.
6. Keep the Torch probe guard that fails unless cuda:0 contains R9700 and cuda:1 contains 9070. This prevents silent bad mapping if driver/HIP enumeration changes.
7. Verify the Torch probe reports two devices: cuda:0 R9700 (~31.86GB) and cuda:1 RX 9070 XT (~15.92GB) for the default `0,1` mapping, plus `preferred blas: _BlasBackend.Cublas` and `torch threads: 24 interop: 24` on this machine.
8. Startup logs for the safe profile should show async offload(1), pinned memory disabled, and P2P disabled/CPU staging. Do not require comfy-aimdo DynamicVRAM on every visible device; for devices where aimdo readiness is missing/unverified, the MultiGPU patch should fall back to legacy ModelPatcher per device.
9. ComfyUI-MultiGPU is installed at `H:/ComfyUI/ComfyUI/custom_nodes/ComfyUI-MultiGPU`; use `H:/ComfyUI/RDNA4-DISTORCH-WEG-A.md` for the current DisTorch donor-VRAM test recipe.
10. For DisTorch donor testing, replace the normal loader with `CheckpointLoaderSimpleDisTorch2MultiGPU`, `UNETLoaderDisTorch2MultiGPU`, or `UnetLoaderGGUFDisTorch2MultiGPU`; set compute_device=`cuda:0`, donor_device=`cuda:1`, start virtual_vram_gb at 4.0, and keep eject_models=true.
11. For core workflow-level acceleration, add advanced/multigpu -> MultiGPU CFG Split after model/LoRA nodes and before KSampler; use Select Model/CLIP/VAE Device nodes when manually routing components to gpu:1.
12. Keep the ROCm safety patch in `ComfyUI/comfy/samplers.py` that synchronizes `output_device` for non-NVIDIA CUDA API backends after multigpu device-to-device copies.
## Pitfalls
- Do not rely on `CUDA_VISIBLE_DEVICES` alone for ROCm; `HIP_VISIBLE_DEVICES` must be set too.
- Do not call Python/Torch before setting visibility environment variables in the launcher.
- Do not re-enable direct P2P/DLPack peer probing on this Windows RDNA4/ROCm setup unless intentionally diagnosing driver behavior; `MGPU_DISABLE_P2P=1` is the safe default.
- If MultiGPU causes hard PC resets/TDRs, first keep pinned memory disabled, async offload at 1 stream, reserve-vram at 4 GB, and avoid direct P2P. Only re-enable one optimization at a time after a stable run.
- PowerShell may garble quotes when passing multi-line Python code to `python -c`; write probes to a temp `.py` file instead. When invoking PowerShell from Bash, quote `$vars` with single quotes or escape `$` to avoid Bash expansion.
- Core ComfyUI multi-GPU is not llama.cpp-style VRAM pooling; it exposes both devices, supports selector nodes, and can split CFG work units, but model sharding/virtual VRAM requires a separate custom-node approach such as ComfyUI-MultiGPU/DisTorch.
## Verification
1. Syntax-only checks: `cd H:/ComfyUI/ComfyUI && ../.venv/Scripts/python.exe -m py_compile custom_nodes/ComfyUI-MultiGPU/p2p_registry.py custom_nodes/ComfyUI-MultiGPU/__init__.py comfy/samplers.py`.
2. Parse the launcher without starting ComfyUI: `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command '$errs = @(); $tokens = @(); [System.Management.Automation.Language.Parser]::ParseFile("H:\ComfyUI\start-rdna4-multigpu.ps1", [ref]$tokens, [ref]$errs) | Out-Null; if ($errs.Count -gt 0) { $errs | Format-List *; exit 1 } else { Write-Host "PowerShell parse OK" }'`.
3. Only with user consent on this machine, run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File H:\ComfyUI\start-rdna4-multigpu.ps1 -QuickTestMode` and require exit code 0.
4. For a real workflow test after startup, start with `virtual_vram_gb=4.0`, compute `cuda:0`, donor `cuda:1`, and watch for `[MultiGPU P2P] ... = False` plus `[MultiGPU DLPack] CPU-staging ...` instead of direct P2P.