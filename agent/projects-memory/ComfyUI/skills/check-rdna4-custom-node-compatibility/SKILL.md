---
name: check-rdna4-custom-node-compatibility
description: "Check and repair H:/ComfyUI custom nodes for Windows RDNA4 compatibility after updates. Use for Triton/xformers/onnxruntime-gpu/CUDA-only import failures, DWPose/SAM acceleration issues, or custom-node requirements that corrupt the ROCm environment."
---

# ComfyUI RDNA4 Custom-Node Compatibility

## Scope
This skill owns custom-node compatibility. Launcher/device mapping belongs to `configure-rdna4-comfyui-multigpu`; workflow graph editing belongs to `comfyui-amd-workflows`.

## Audit workflow
- Work from `H:/ComfyUI`.
- Inventory custom nodes and search for CUDA-only dependencies/patterns: `xformers`, `triton`, `flash_attn`, `bitsandbytes`, `onnxruntime-gpu`, `CUDAExtension`, `.cuda(`, `CUDAExecutionProvider`, `torch.compile`.
- Run the RDNA4 launcher quick-test from the multigpu skill and focus this pass on import/runtime failures in custom nodes.

## Repair rules
- ONNX on Windows AMD: prefer `onnxruntime-directml==1.24.4` and provider `DmlExecutionProvider`; CPU fallback is acceptable.
- Requirements/pyproject files must not reinstall stock CUDA/CPU Torch over the RDNA4 ROCm wheel.
- Patch Triton/flash-attn/xformers paths to graceful fallbacks where possible. Keep explicit unsupported messages for bitsandbytes NF4 on Windows AMD.
- If DLLs are locked, stop only `H:/ComfyUI/.venv/Scripts/python.exe main.py` processes, not arbitrary Python jobs.

## Pitfalls
- The provider name is `DmlExecutionProvider`, not `DirectMLExecutionProvider`.
- `pip check` may report the known `torchscale` vs `timm` conflict; do not blindly downgrade `timm` without checking transparent-background/RMBG.
- Some SAM/DWPose fallbacks should return tensors to the original device after CPU work.

## Verification
- `python -m py_compile` passes for every patched Python file.
- `onnxruntime.get_available_providers()` includes `DmlExecutionProvider` and `CPUExecutionProvider`.
- Quick-test startup imports custom nodes, skips unsupported Triton paths without traceback, and logs accelerated ONNX providers where expected.
