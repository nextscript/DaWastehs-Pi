---
name: "windows-gpu-utilization-pdh"
description: "Read Windows GPU engine utilization via PDH (cache-free, Task-Manager-grade) instead of WMI to avoid stale 0% readings on bursty GPU workloads"
version: 1
created: "2026-06-29"
updated: "2026-06-29"
---
## When to Use
Use when building a Windows GPU/utilization monitor (Python/ctypes or otherwise) and the tool shows "long stretches of 0%" while AMD Adrenalin/NVIDIA shows sustained load — i.e. WMI perflib staleness. Also use proactively for any fresh Windows GPU monitoring code, since PDH is strictly better than WMI for per-frame polling.

## Procedure
1. Symptom to confirm: dashboard/monitor shows sporadic 0% for GPU utilization while vendor tool (Adrenalin) shows sustained 100%. Worse on bursty workloads (AI/compute). Root cause: WMI Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine caches values ~1 second.
2. Switch to PDH (pdh.dll) via ctypes. Open a query: PdhOpenQueryW(None, None, byref(query)).
3. Add ONE wildcard counter: PdhAddCounterW(query, '\\GPU Engine(*)\\Utilization Percentage', 0, byref(counter)). The '(*)' wildcard lets PDH manage the dynamic per-process instance list internally — do NOT enumerate instances yourself (PdhEnumObjectItems is instantly stale).
4. On each poll: PdhCollectQueryData(query), then PdhGetFormattedCounterArrayW(counter, PDH_FMT_DOUBLE=0x200, byref(size), byref(count), None) then again with a c_ubyte buffer of size; cast to PDH_FMT_COUNTERVALUE_ITEM_W array. Each item = (szName: LPWSTR, FmtValue: {CStatus, pad, doubleValue}). Filter CStatus==0.
5. Counter names 'GPU Engine'/'Utilization Percentage' are English-only in Perflib (absent from all non-009 language tables) — the English path works on EVERY locale including German Windows. Do not attempt PdhLookupPerfNameByIndex localization; it returns empty for these counters.
6. Reuse the existing aggregation: the instance name format is identical to WMI (pid_X_luid_0xHHHH_0xLLLL_phys_0_eng_N_engtype_TYPE). Parse LUID + engtype via regex, take max per (luid, eng_idx), sum across engine indices per type. Bind LUID→physical GPU via DXGI AdapterLuid/DeviceId (authoritative).
7. Apply a short EMA (τ≈0.25s, alpha = 1-exp(-dt/0.25)) to each engine-type value to remove residual 0↔100 frame oscillation on bursty workloads. This matches the stable reading users expect from Adrenalin.
8. Keep WMI as a fallback only (if PDH init fails). WMI is still fine for VRAM (GPUAdapterMemory) and for one-shot GPU enumeration (Win32_VideoController).
9. Do NOT use legacy AMD ADL (atiadlxx.dll) on RDNA4 (RX 9070, AI PRO R9700): OD5 returns -1, PMLog functions are not exported, and only one card enumerates. ADLX is out-of-process COM with no C exports — not viable via ctypes.

## Pitfalls
- WMI Win32_PerfFormattedData is cached ~1s — at 30fps you get ~30 identical stale values then a jump. On bursty workloads this reads as long zero stretches. This is the #1 trap.
- PdhEnumObjectItems returns only currently-active instances and becomes stale instantly — GPU engine instances are dynamic per-process. Always use the wildcard counter path '(*)' so PDH tracks instances for you.
- Trying to localize the counter path via PdhLookupPerfNameByIndex returns EMPTY strings for GPU Engine (index 5802) — these counters exist only in the English Perflib table. The English path is universal; do not localize.
- Legacy AMD ADL (atiadlxx.dll) is dead on RDNA4: ADL_Overdrive5_CurrentActivity_Get returns -1, PMLog/OverdriveN functions are missing entirely, and only the primary display card enumerates. Do not waste time on it.
- AMD ADLX (amdadlx64.dll via AMDADLXServ.exe) is pure out-of-process COM with zero C exports — cannot be driven from ctypes without the ADLX SDK and reconstructed vtables (too fragile).
- Microsoft Basic Render Driver appears as a GPU LUID with ~25 phantom '3D' engines and 0% util — it is correctly bound by DXGI (VEN_1414 DEV_008C) but contributes nothing; existing name/VRAM filtering already excludes it.
- A single PdhCollectQueryData before the first read gives 0; PDH needs ≥2 collects for a rate counter. Prime with one collect at init.

## Verification
1. Compare PDH vs WMI side-by-side at 250ms polling under a known GPU load: PDH should show the load in nearly every sample; WMI will show repeated/stale values and periodic zeros.
2. For a sustained 100% load (e.g. Adrenalin confirms 100%), PDH raw should read ~92-100% in >90% of samples; after EMA smoothing min should stay >90% with zero sub-5% samples.
3. Confirm the English counter path works on a non-English (e.g. de-DE) Windows: PdhAddCounterW returns 0 (success). PdhLookupPerfNameByIndex for index 5802 returns empty, confirming English-only and that English path is correct.
4. Verify all GPU vendors (NVIDIA, Intel, AMD) populate identically — PDH reads the same Windows counter regardless of vendor.
5. Confirm VRAM (GPUAdapterMemory via WMI) and GPU enumeration (Win32_VideoController) still work, since only the engine-utilization path was switched to PDH.