---
name: "build-llama-forks"
description: "Build llama.cpp + forks (mainline/tq/2b-Bonsai/d-diffusion) via the *_llama_build.txt scripts; handle pre-b9174 vs post-b9174 UI layout and OpenSSL/cpp-httplib const breakage on old forks"
version: 3
created: "2026-06-29"
updated: "2026-06-30"
---
## When to Use
Use when building or rebuilding any llama.cpp fork in H:/LAB/ai-local via the Auto Tuner build scripts, or when a fork build fails with httplib.cpp C2440 / "tools/ui not found" errors. Covers mainline (llama_build.txt), TurboQuant (turboquant_llama_build.txt), Bonsai-Ternary (ternary_bonsai_llama_build.txt), Diffusion (diffusion_llama_build.txt).

## Procedure
1. Run the matching *_llama_build.txt in PowerShell from H:/LAB/ai-local. Each script clones the fork, derives its mainline base version (bXXXX), renames the dir to ${prefix}_${ver}_llama.cpp, builds the UI, then runs cmake.
2. UI build is now layout-tolerant: the script probes tools/ui (post-b9174) then tools/server/webui (pre-b9174); whichever has package.json wins. If neither exists it falls back to LLAMA_USE_PREBUILT_UI=ON (CMake fetches from HF bucket ggml-org/llama-ui). npm ci is guarded to fall back to npm install when package-lock.json is missing.
3. Fork directory naming convention produced by the scripts: bare bXXXX_llama.cpp (mainline), tq_bXXXX_llama.cpp (turbo), 2b_bXXXX_llama.cpp (Bonsai/Ternary), d_bXXXX_llama.cpp (diffusion).
4. If the build fails at vendor/cpp-httplib/httplib.cpp with MSVC C2440 'cannot convert from const X509_NAME* to X509_NAME*' (Conversion loses qualifiers), the fork is on an old mainline base (pre-b9174, vendored cpp-httplib 0.40.0) clashing with OpenSSL 3.2+. Add -DLLAMA_OPENSSL=OFF to the cmake line. This is already in ternary_bonsai_llama_build.txt. HTTPS is unnecessary for local 127.0.0.1 serving.
5. If Push-Location tools/ui fails with PathNotFound, the fork predates b9174 (UI was at tools/server/webui). The layout-probe in the script handles this automatically; if you see this error you are running an old unpatched script version.
6. All Vulkan builds require SPIRV-Headers installed (clone+cmake+install once) and pass -DCMAKE_PREFIX_PATH to its install dir. The ASM compiler error (Issue #22100) is worked around with CMAKE_POLICY_DEFAULT_CMP0194=OLD + CMAKE_ASM_COMPILER=cl.

## Pitfalls
## Pitfalls
- UI directory moved at b9174 (16 May 2026, PR #23064): tools/server/webui -> tools/ui; CMake vars LLAMA_BUILD_WEBUI->LLAMA_BUILD_UI (old kept as deprecated aliases). Older forks like PrismML prism-branch (b8840 base) still use the old path.
- cpp-httplib 0.40.0 (vendored in b8840-base forks) does X509_NAME *name = X509_get_subject_name(cert); OpenSSL 3.2+ returns const -> C2440. Fix is -DLLAMA_OPENSSL=OFF, NOT patching httplib.cpp.
- npm ci requires a committed package-lock.json; many forks/fresh clones lack it -> use npm install as fallback.
- Prebuilt-UI fetch needs network and the fork's CMakeLists to define the HF bucket (ggml-org/llama-ui); offline builds must build UI from source or it silently embeds an empty UI.
- **DiffusionGemma (PR #24427) needs its OWN binaries**, not the generic llama-diffusion-cli. PR #24427 forks ship three: llama-diffusion-gemma-cli, llama-diffusion-gemma-server (both fork-only) AND llama-diffusion-cli (mainline Dream/LLaDA/RND1). The Auto Tuner resolver (_resolve_diffusion_binary) picks the gemma binary automatically when arch contains 'gemma' (outer search loop = binary name, so preferred name is tried across ALL roots before the generic fallback).
- **DiffusionGemma Vulkan crash** "alloc_tensor_range: failed to allocate Vulkan0 buffer of size 1073741824" has THREE root causes: (1) KV-per-token estimate under-counts because head_count_kv=[2] is a BROADCAST scalar (1-element list for all 30 layers), not a 30-element array like Gemma-4 — must expand broadcast arrays to block_count in _kv_per_token_for_interleaved_attention or KV is ~30x too small and compute_config picks ctx=262144 (real KV ~30 GiB); (2) Vulkan0 defaults to device 0 which may be the SMALLER card (9070 XT 16GB) — must forward --main-gpu/--tensor-split in build_diffusion_command; (3) Vulkan has a ~1 GiB single-allocation ceiling — build a HIP/ROCm variant instead (diffusion_hip_llama_build.txt).
- **ROCm HIP SDK on Windows**: install via AMD-Software-PRO-Edition-XX-Win11-For-HIP.exe (current ROCm 7.1.1); user can install ONLY HIP components (skip bundled driver). hipcc lands at C:\Program Files\AMD\ROCm\<ver>\bin\hipcc.exe but the installer does NOT add it to PATH — set USER-PATH + ROCM_PATH(User) manually (Machine vars need admin). gfx1201 covers both R9700 + RX 9070 XT (both RDNA4). Validate: hipcc --version.
- **RTK/grep quirk**: RTK rewrites `grep` to `rg`; `rg -E` means ENCODING not extended-regex -> "unknown encoding: -e" exit 2. On Windows use findstr or Select-String, or grep without -E.
## Verification
## Verification
1. After build: build/bin/Release/llama-server.exe exists and is non-zero bytes.
2. Run llama-server.exe --version; it prints the build number (bXXXX) matching the fork dir name.
3. For Bonsai/Ternary: the server starts a Q2_0-class ternary model without a httplib link error (confirms OpenSSL=OFF took effect).
4. **DiffusionGemma fork (PR #24427) ships THREE binaries**: llama-diffusion-gemma-cli (single-shot), llama-diffusion-gemma-server (OpenAI HTTP server: /health, /v1/chat/completions, --host/--port default 8080), AND llama-diffusion-cli (mainline). Auto Tuner v4.4 default runner for diffusion-gemma is `llama-diffusion-gemma-server` (persistent, queryable). The server's arg parser is manual — --host/--port/--api-key/--metrics/--slots work but do NOT appear in --help. It does NOT understand --fit/--jinja/--spec-type/--cache-ram; build_diffusion_server_command() emits only supported flags. dream/llada/rnd1 (no own server) keep runner: llama-diffusion-cli (single-shot).
5. **Verify a built command's flags before launch**: every --flag in the generated command must appear in `<binary> --help` (plus the manual-parser server flags), or the binary aborts with "unknown argument".