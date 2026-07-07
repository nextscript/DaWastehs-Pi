---
name: "fix-comfyui-workflows-against-installed-nodes"
description: "Validate and repair ComfyUI UI-format workflows against the user's actually-installed nodes/extensions (H:/ComfyUI)"
version: 1
created: "2026-07-02"
updated: "2026-07-02"
---
## When to Use
Use when fixing/breaking ComfyUI workflows (especially ones an LLM "broke" with fictional node names), validating workflows against the current ComfyUI version + installed extensions, or diagnosing why a workflow won't load/run on this H:/ComfyUI install.

## Procedure
1. Dump object_info OFFLINE (no server/models needed): script sets sys.path to H:/ComfyUI/ComfyUI, calls `from server import PromptServer; PromptServer(asyncio.get_event_loop())` (REQUIRED so rgthree/WhatDreamsCost load), then `await nodes.init_extra_nodes(init_custom_nodes=True, init_api_nodes=True)`, serializing each NODE_CLASS_MAPPINGS entry (INPUT_TYPES, RETURN_TYPES, CATEGORY, output_node). Yields ~2232 nodes incl. all custom extensions.
2. Validate UI-format workflows against object_info: (a) node `type` must exist — but Note/MarkdownNote/Reroute/PrimitiveNode are FRONTEND-only and never appear in object_info (treat as OK); (b) dropdown widget values must be in their option list; (c) link type strings must match input type; (d) remember `control_after_generate` is an EXTRA widget inserted right after seed widgets — don't let it offset your widget-index mapping.
3. Check model-file existence ONLY on real LOADER nodes with correct folder: CLIPLoader→text_encoders, UnetLoaderGGUF/UNETLoader→unet (NOT diffusion_models for .gguf), VAELoader→vae, CheckpointLoaderSimple/ImageOnlyCheckpointLoader→checkpoints, LoraLoaderModelOnly→loras, MMAudioSuite*→mmaudio. Note/SaveImage filename_prefixes are NOT model refs.
4. Known node-name fixes for this install: QwenTTS=AILab_Qwen3TTSCustomVoice/VoiceDesign (NO loader); MMAudio=MMAudioSuite* (consolidate models into models/mmaudio/); VideoCombine/LoadVideo→VHS_*; LTX text=CLIPLoader(type=ltxv,Gemma file)+CLIPTextEncode; Hunyuan3D use CORE nodes not kijai Hy3D* wrapper; CLIPLoader type has no 'gemma' (TEModel weight-detected, use ltxv/stable_diffusion).
5. Always back up the folder before editing, fix in place, then re-validate until only placeholder/union-type warnings remain (e.g. input.mp4, example_object.png, SaveGLB MESH-in-union = all fine).

## Pitfalls
- ripgrep/rtk on this machine misparses `grep -E`/`-i` with patterns containing certain chars and returns garbage or matches everything — prefer Python one-liners for searching ComfyUI source.
- Some nodes fail to load offline without `PromptServer.instance` (rgthree, WhatDreamsCost) — instantiate PromptServer(loop) before init_external_custom_nodes.
- Widget-count validation is unreliable: connected TYPE inputs aren't widgets, and control_after_generate adds an unlisted widget after seeds — validate dropdown VALUES by name, not by raw index.
- MMAudioSuite scans models/mmaudio/ which did not exist; user's files were scattered in checkpoints/vae/syncformer/clip — they must be consolidated (move, same-drive = instant).
- The kijai Hunyuan3D wrapper (Hy3D*) loads from diffusion_models where the user has no 3D model; the user's working 3D setup uses CORE nodes (ImageOnlyCheckpointLoader from checkpoints).

## Verification
1. object_info dump prints 'OK: ~2232 nodes' and includes the extension's node names (e.g. AILab_Qwen3TTS*, MMAudioSuite*).
2. Validator reports 'OK - no real problems' for each fixed workflow (placeholders & SaveGLB union-type allowed).
3. Model-file check on loader nodes returns 'all loader-referenced model files exist'.
4. Workflow loads in the ComfyUI UI without red 'missing node' boxes.