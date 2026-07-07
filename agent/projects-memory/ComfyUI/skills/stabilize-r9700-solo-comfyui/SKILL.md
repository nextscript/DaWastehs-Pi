---
name: "stabilize-r9700-solo-comfyui"
description: "Stabilize the solo R9700 ComfyUI launcher after comfy-aimdo DynamicVRAM crashes"
version: 1
created: "2026-06-13"
updated: "2026-06-13"
---
## When to Use
Use when H:/ComfyUI on the AMD Radeon AI PRO R9700 hits access violations in comfy_aimdo (model_vbar.py or vram_buffer.py), especially with Wan 14B or other large models.

## Procedure
1. Stop and restart the entire ComfyUI Python process after any comfy_aimdo access violation; do not trust the process state after the first native crash.
2. Use H:/ComfyUI/start-r9700.ps1 as the safe solo profile: HIP_VISIBLE_DEVICES=0 and CUDA_VISIBLE_DEVICES=0, --disable-dynamic-vram, --disable-async-offload, --disable-pinned-memory, and --reserve-vram 4.
3. Verify startup logs do not contain 'DynamicVRAM support detected and enabled' or 'Using async weight offloading'.
4. Retry the workload from a clean process. If stable and speed is needed, test only one optimization at a time, starting with --async-offload 1; avoid re-enabling comfy-aimdo DynamicVRAM for Wan 14B on Windows RDNA4 until upstream fixes the VBAR/VRAMBuffer access violation.

## Pitfalls
- The first comfy_aimdo access violation poisons the running process; later LTXAVTEModel/ModelVBAR crashes in the same process are fallout, not independent workflow bugs.
- On AMD, async offload defaults to enabled in ComfyUI if not explicitly disabled, so the safe launcher must pass --disable-async-offload.
- Removing --enable-dynamic-vram is not as clear as explicitly passing --disable-dynamic-vram; use the explicit flag for safe profiles.
- Stack frames through ComfyUI-MultiGPU or TiledDiffusion can be wrappers only; the decisive frames are comfy_aimdo.model_vbar.ModelVBAR and comfy_aimdo.vram_buffer.VRAMBuffer.

## Verification
1. Parse the launcher: powershell.exe -NoProfile -ExecutionPolicy Bypass -Command '$errs=@();$tokens=@();[System.Management.Automation.Language.Parser]::ParseFile("H:\ComfyUI\start-r9700.ps1",[ref]$tokens,[ref]$errs)|Out-Null;if($errs.Count){$errs|Format-List *;exit 1}else{Write-Host "PowerShell parse OK"}'
2. Start with start-r9700.bat or start-r9700.ps1 and confirm the printed profile says DynamicVRAM=False, async-offload=0, pinned memory=False, reserve-vram=4 GB.
3. Run the previously failing Wan 14B workflow after a full restart and confirm there are no comfy_aimdo access violations.