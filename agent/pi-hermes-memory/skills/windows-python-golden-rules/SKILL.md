---
name: "windows-python-golden-rules"
description: "Golden Rules für moderne Python-Entwicklung (v3.12+) auf Windows 11 inkl. lokalem ML/AI auf AMD-GPU (ROCm HIP SDK, DirectML)."
version: 2
created: "2026-05-29"
updated: "2026-06-29"
---
## When to Use
Wenn moderne Python-Skripte oder -Apps (v3.12+) für Windows 11 geschrieben, debuggt oder optimiert werden — inkl. lokalem ML/AI auf AMD-GPU.

## Procedure
1. **Environment Management**: `uv` als primärer Package-/Tool-Manager; `py` Launcher zur Versionsteuerung.
2. **Pfad-Handling**: ausschließlich `pathlib`, keine String-Konkatenation; System-Wide `LongPathsEnabled` in der Registry.
3. **Asynchrone I/O**: `ProactorEventLoop` (IOCP-basiert, Windows-Standard ab 3.8) für Files/Sockets.
4. **Parallelisierung**: CPU-bound via `multiprocessing` ('spawn'). free-threaded Python (3.13t/3.14t) nur nach Thread-Safety-Check aller C-Extensions.
5. **Performance**: experimenteller JIT (3.13/3.14) für rechenintensive Loops.
6. **Native Kompilierung**: MSVC als Compiler-Standard; 'Desktop development with C++' Workload in Visual Studio installiert.
7. **Lokales ML/AI auf AMD-GPU** (Radeon AI PRO R9700 32 GB + RX 9070 XT 16 GB):
   - **ROCm HIP SDK auf Windows**: ab RDNA4 supported (gfx1201) — PyTorch via HIP/Wheels; `HIP_VISIBLE_DEVICES` zur Device-Auswahl. Für große Modelle gezielt die 32-GB-Karte (R9700) wählen, die 16-GB 9070 XT für kleinere/parallele Workloads.
   - **DirectML-Fallback**: `torch-directml` / `onnxruntime-directml` für Frameworks/Pfade ohne native ROCm-Unterstützung; breite Abdeckung auf RDNA3.5/RDNA4.
   - **llama.cpp / ONNX-EP**: Vulkan- oder HIP-Backend für lokale LLM-Inferenz auf der AMD-GPU.
   - **free-threaded Python + ML**: GIL-freie Builds können ML-Data-Pipelines beschleunigen, aber C-Extensions (Torch-ROCm, onnxruntime) müssen no-GIL-safe sein — sonst Race Conditions. Bei Zweifel Standard-GIL-Build.

## Pitfalls
- Virenscanner (Defender) blockieren oft den Subprozess-Start aus dem Temp-Verzeichnis.
- PowerShell ExecutionPolicy verhindert venv-Aktivierung (`Set-ExecutionPolicy RemoteSigned`).
- C-Extensions ohne PEP-703-Support → Crash/Memory Corruption in free-threaded 3.13t.
- MAX_PATH (260) → `FileNotFoundError` bei tiefen Pfaden (Registry `LongPathsEnabled` / `\\?\`).
- Fehlende MSVC Build Tools → Pakete mit nativer Kompilierung scheitern.
- **CUDA-only-Annahmen**: viele Tutorials/Docs sind CUDA-zentriert; auf diesem System ROCm/HIP oder DirectML verwenden — CUDA funktioniert nicht.
- **Falsches GPU-Device**: Default ist nicht zwingend die 32-GB-Karte — Device-Index via HIP/DML explizit setzen.

## Verification
1. Pfad-Robustheit mit Pfaden > 260 Zeichen testen.
2. Testsuite unter free-threaded Build (`python3.13t`) → Race Conditions in Native Extensions aufspüren.
3. Async-Loop-Performance unter Last auf Windows Proactor-Basis.
4. CI: GitHub Actions `windows-latest` Runner mit explizitem Build-Tools-Check.
5. ML: HIP/DirectML-Device liefert die richtige Karte; VRAM-Check (16 vs 32 GB) vor Modell-Load.