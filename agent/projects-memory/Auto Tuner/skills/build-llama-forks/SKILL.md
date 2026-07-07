---
name: build-llama-forks
description: "Build llama.cpp and local forks through the Auto Tuner *_llama_build.txt scripts. Use for mainline/tq/Bonsai/diffusion builds, b9174 UI layout changes, OpenSSL/cpp-httplib failures, and DiffusionGemma Vulkan/HIP decisions."
---

# Auto Tuner — llama.cpp Fork Build Rules

## Scope
Use the checked-in `*_llama_build.txt` scripts as the source of truth. They encode repo path, generator, targets, and known fork-specific patches.

## Build workflow
- Run the matching build script for the fork instead of hand-writing CMake flags.
- For upstream llama.cpp after b9174, expect layout changes in `tools/server/webui`; preserve cached `node_modules` only when the script explicitly allows it.
- OpenSSL/cpp-httplib `const X509_NAME*` failures are solved by disabling SSL/HTTP extras or by the local patch already documented in the build scripts.
- DiffusionGemma PR #24427 ships `llama-diffusion-gemma-cli`, `llama-diffusion-gemma-server`, and `llama-diffusion-cli`; Auto Tuner default runner is the persistent server.

## DiffusionGemma Vulkan crash triage
The classic `alloc_tensor_range ... Vulkan0 buffer of size 1073741824` has three causes:
1. Broadcast `head_count_kv=[2]` must be expanded to block count or KV is ~30× under-estimated.
2. Vulkan device 0 may be the smaller 9070 XT; forward `--main-gpu` / `--tensor-split` deliberately.
3. Vulkan has a ~1 GiB single-allocation ceiling; build/use a HIP/ROCm variant for that path.

## Pitfalls
- Do not invoke `cargo`/`cmake` ad hoc from memory when a script exists; script drift is the bug source.
- Do not pass unsupported server flags to `llama-diffusion-gemma-server`; its manual parser supports only the known subset (`--host`, `--port`, `--api-key`, `--metrics`, `--slots`, core model flags).
- MXFP/quant support is model/backend-specific; benchmark rather than guessing.

## Verification
- Build log ends with the expected binaries under the fork's configured output dir.
- `llama-bench` or the Auto Tuner benchmark command runs against a real model.
- For DiffusionGemma, server `/health` responds and one prompt completes before integrating with Auto Tuner.
