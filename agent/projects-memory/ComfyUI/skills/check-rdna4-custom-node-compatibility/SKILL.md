---
name: "check-rdna4-custom-node-compatibility"
description: "Check and repair H:/ComfyUI custom nodes for Windows RDNA4 compatibility after updates"
version: 1
created: "2026-06-13"
updated: "2026-06-13"
---
## When to Use
Use after ComfyUI or custom-node updates on this H:/ComfyUI Windows RDNA4 setup, especially when startup shows Triton/xformers/onnxruntime-gpu/CUDA-only errors or DWPose/SAM nodes lose acceleration.

## Procedure
1. Work from H:/ComfyUI. Read the RDNA4 multigpu skill first if launcher or device mapping is involved.
2. Inventory custom nodes with `find ComfyUI/custom_nodes -maxdepth 2 -mindepth 1 -type d` and run a static grep for `xformers|triton|flash_attn|bitsandbytes|onnxruntime-gpu|CUDAExtension|\.cuda\(|CUDAExecutionProvider|DirectMLExecutionProvider|DmlExecutionProvider|torch\.compile`.
3. Run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File H:/ComfyUI/start-rdna4-multigpu.ps1 -QuickTestMode` to capture import/startup failures. The expected device probe is cuda:0 R9700 and cuda:1 RX 9070 XT.
4. For Windows ONNX acceleration, prefer `onnxruntime-directml` and provider name `DmlExecutionProvider`. Remove `onnxruntime`/`onnxruntime-gpu` if necessary and install `onnxruntime-directml==1.24.4`; if DLLs are locked, stop only H:/ComfyUI `.venv` `main.py` processes first.
5. Patch custom-node requirements/pyproject files so they do not reinstall CPU/CUDA torch wheels or `onnxruntime-gpu` over the RDNA4 ROCm environment. Use `onnxruntime-directml; platform_system == "Windows"` and `onnxruntime; platform_system != "Windows"` where ONNX is needed.
6. Patch hard Triton paths to fall back gracefully where possible: SAM3 EDT/NMS/connected-components can CPU-fallback and return tensors to the original device; KJNodes PatchTritonVAE should be skipped rather than traceback on this profile.
7. Patch xformers-only runtime paths to PyTorch SDPA fallback if the inputs are ordinary tensors. Keep explicit unsupported errors for bitsandbytes NF4 on Windows AMD/ROCm; recommend GGUF/FP8/non-NF4 weights instead.
8. Run `../.venv/Scripts/python.exe -m py_compile` on every patched Python file from `H:/ComfyUI/ComfyUI`, then run quick-test startup again.
9. Verify `onnxruntime.get_available_providers()` returns `['DmlExecutionProvider', 'CPUExecutionProvider']` and DWPose logs acceleration providers detected.

## Pitfalls
- Do not install stock `torch`/`torchvision` from custom-node requirements; it can overwrite the ROCm RDNA4 PyTorch wheel.
- The DirectML provider is named `DmlExecutionProvider`, not just `DirectMLExecutionProvider`; include both only for compatibility with custom-node assumptions.
- Do not kill arbitrary Python processes. If DLLs are locked, only stop processes whose command line is H:/ComfyUI/.venv/Scripts/python.exe running `main.py`.
- Triton/flash-attn/bitsandbytes are not fully Windows RDNA4-compatible. Prefer fallbacks or clear unsupported messages rather than encouraging installs that will fail or corrupt the environment.
- `pip check` may report the known `torchscale 0.3.0` vs `timm 1.0.27` conflict because transparent-background requires newer timm. Do not blindly downgrade timm without checking transparent-background/RMBG impact.

## Verification
1. `python -m py_compile` exits cleanly for patched files.
2. A small SAM3 fallback probe shows `HAS_TRITON False`, EDT/NMS/connected-components return tensors on cuda:0, and ONNX Runtime providers include DmlExecutionProvider.
3. `start-rdna4-multigpu.ps1 -QuickTestMode` exits 0, imports all custom nodes, loads ComfyUI-RMBG including SAM3, skips KJ PatchTritonVAE without traceback, and DWPose detects accelerated ONNX providers.
4. Startup logs still show both RDNA4 GPUs, comfy-aimdo initialized for both, DynamicVRAM enabled, and PyTorch attention active.