---
name: "fix-ltx23-textencoder-av-crash"
description: "Fix LTX-2.3 (LTXAV) ComfyUI workflows crashing in preprocess_text_embeds (\"got 4 and 3\") due to raw-Gemma text encoder + missing AV latent pipeline"
version: 3
created: "2026-07-02"
updated: "2026-07-02"
---
## When to Use
Use when an LTX-2.3 (LTXAV architecture) text/image-to-video workflow in H:/ComfyUI crashes with "RuntimeError: Tensors must have same number of dimensions: got 4 and 3" inside comfy/ldm/lightricks/av_model.py preprocess_text_embeds / embeddings_connector, OR when building/repairing any LTX-2.3 workflow that uses a Gemma 3 12B text encoder.

## Procedure
1. Confirm root cause: the workflow loads text via core CLIPLoader(type 'ltxv') + a single generic gemma_3_12B file. ComfyUI auto-detects TEModel.GEMMA_3_12B -> raw gemma3_te (4D output, no projection, no unprocessed_ltxav_embeds flag) -> LTXAV.preprocess_text_embeds crashes.
2. Ensure the LTX-2.3 text projection is readable from models/checkpoints: copy models/text_encoders/LTX/ltx-2.3_text_projection_bf16.safetensors into models/checkpoints/ (LTXAVTextEncoderLoader hardcodes that folder for its 2nd input).
3. Swap the CLIPLoader node -> LTXAVTextEncoderLoader (core node, comfy_extras/nodes_lt_audio.py): widgets = [Gemma file (text_encoders), 'ltx-2.3_text_projection_bf16.safetensors' (checkpoints), 'default']. Keep its CLIP output links to the CLIPTextEncode nodes.
4. Insert the AV latent pipeline the LTXAV model requires: add LTXVEmptyLatentAudio, LTXVConcatAVLatent, LTXVSeparateAVLatent. NOTE: current ComfyUI `LTXVEmptyLatentAudio` REQUIRES an `audio_vae` (VAE) input at slot index 3 — it is NOT optional.
5. Add the Audio VAE (comfy_extras/nodes_lt_audio.py): add `LTXVAudioVAELoader` (reads from the `checkpoints` folder; widget = the audio VAE file) and `LTXVAudioVAEDecode`. Wire LTXVAudioVAELoader.out0 -> LTXVEmptyLatentAudio.audio_vae (slot 3) AND -> LTXVAudioVAEDecode.audio_vae. Audio VAE source options: (a) standalone `LTX23_audio_vae_bf16.safetensors` (348MB, has audio_vae./vocoder. prefixes) copied from models/vae/LTX into models/checkpoints/LTX — lightweight, preferred; (b) the full `ltx-2.3-22b-dev-fp8.safetensors` 22B checkpoint (loader extracts audio_vae+vocoder via filter_keys) — official template way but reads 27GB.
6. Rewire latents: EmptyLTXVLatentVideo.out -> LTXVConcatAVLatent.video_latent; LTXVEmptyLatentAudio.out -> LTXVConcatAVLatent.audio_latent; LTXVConcatAVLatent.out -> SamplerCustomAdvanced.latent_image(in4); SamplerCustomAdvanced.out0 -> LTXVSeparateAVLatent.av_latent; LTXVSeparateAVLatent.out0(video_latent) -> VAEDecodeTiled.samples(in0); LTXVSeparateAVLatent.out1(audio_latent) -> LTXVAudioVAEDecode.samples; LTXVAudioVAEDecode.out0(AUDIO) -> CreateVideo.audio (muxes audio into the saved video, matches official template).
7. Leave the MODEL/LoRA/sampler/CFG/scheduler nodes untouched. Look nodes up by TYPE, not id — the distilled workflows have shifted ids because of an extra LoraLoaderModelOnly. Reusable scripts: text-encoder/AV fix at H:/ComfyUI/_fix_ltx23.py, audio-VAE wiring at H:/ComfyUI/_fix_ltx23_audiovae.py (idempotent, by-type).
8. Validate the JSON: no duplicate link ids, no dangling node-side link refs, sampler.in4 fed by LTXVConcatAVLatent, VAEDecodeTiled.in0 fed by LTXVSeparateAVLatent, EmptyLatentAudio.audio_vae + decode chain wired, last_node_id/last_link_id updated.
9. Tell the user to RELOAD the workflow file from disk in ComfyUI (the open copy is cached in memory).
## Pitfalls
- ComfyUI keeps the currently-open workflow in memory; file edits only take effect after the user reopens the workflow from disk.
- LTXAVTextEncoderLoader reads its 2nd file (projection) from the 'checkpoints' folder, NOT text_encoders -- the projection must be copied/copied there or the node errors.
- A single-file generic Gemma ALWAYS routes to raw gemma3_te regardless of CLIPLoader 'type' (te_model auto-detection wins); the ltxav_te path needs len(clip_data)==2 + CLIPType.LTXV.
- Video-only latent (no AV concat) is not enough for LTX-2.3 -- the official LTX-2.3 blueprints all use LTXVConcatAVLatent + LTXVEmptyLatentAudio and LTXVSeparateAVLatent.
- Do not replicate the full official 'Text to Video (LTX-2.3)' blueprint (46 nodes, img2vid+upscale+2-stage) for a simple t2v -- only the text encoder + AV latent pipeline are required.
- `LTXVEmptyLatentAudio` REQUIRES an `audio_vae` input (current ComfyUI). The earlier _fix_ltx23.py created it WITHOUT that input, so those workflows now error ("Audio VAE model is required") until LTXVAudioVAELoader is wired in. Always provide audio_vae.
- LTXVAudioVAELoader reads ONLY from the `checkpoints` folder. The standalone audio VAE lives in models/vae/LTX -- copy it into models/checkpoints/LTX before referencing it, or point the loader at the full 22B checkpoint instead.
- Don't leave LTXVSeparateAVLatent.audio_latent dangling: route it through LTXVAudioVAEDecode into CreateVideo.audio so the output video actually contains sound.
## Verification
1. Workflow JSON parses; CLIPLoader node is gone, LTXAVTextEncoderLoader present with Gemma + ltx-2.3_text_projection_bf16 widgets.
2. All three AV nodes present: LTXVEmptyLatentAudio, LTXVConcatAVLatent, LTXVSeparateAVLatent.
3. No dangling link references on any node input/output; no duplicate link ids.
4. Queueing the workflow in ComfyUI no longer raises 'got 4 and 3' at SamplerCustomAdvanced / preprocess_text_embeds.