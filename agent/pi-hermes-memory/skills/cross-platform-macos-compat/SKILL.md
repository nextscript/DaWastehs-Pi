---
name: cross-platform-macos-compat
description: Write code that runs on Windows 11, Ubuntu, AND macOS. ALWAYS consult when creating or reviewing Python tools, GUI apps (tkinter/CustomTkinter), launcher/shell scripts, subprocess handling, file paths, or install instructions - even if the current request only mentions one OS. Basti ships his programs for all three platforms; macOS is the one he cannot test locally, so its pitfalls must be handled proactively.
---

# Cross-Platform Rules (Windows / Ubuntu / macOS)

## Baseline principle
Development and testing happen on Windows + Ubuntu; **macOS cannot be tested locally**. Therefore: never rely on "works here" — use platform-neutral APIs by default and gate every OS-specific branch explicitly with `sys.platform` (`win32` / `linux` / `darwin`). Every script that has a Windows branch needs a thought-through `darwin` branch, not a fallthrough into the Linux path.

## Paths & filesystem
- Always `pathlib.Path`, never hand-built separators. `Path.home()`, `tempfile`, `os.path.normcase` instead of hardcoded `C:\...` or `/home/...`.
- Config/data locations differ: Windows `%APPDATA%`, Linux `~/.config` (XDG), macOS `~/Library/Application Support/<App>`. Use `platformdirs` (pip) instead of reimplementing.
- Case sensitivity: Windows insensitive, Linux sensitive, **macOS APFS insensitive-but-preserving by default** — code must survive both. Compare via `normcase`, never create files differing only in case.
- macOS writes `.DS_Store` files everywhere — ignore them in directory scans and .gitignore.
- File watching, `mmap`, and file locking semantics differ; test-guard or use portable libs (`watchdog`, `filelock`).

## Processes & signals
- `CTRL_BREAK_EVENT` is Windows-only. Portable shutdown: `if sys.platform == "win32": send CTRL_BREAK_EVENT (CREATE_NEW_PROCESS_GROUP)` / `else: proc.send_signal(signal.SIGTERM)` then `SIGKILL` after timeout. macOS = POSIX like Linux here.
- `subprocess`: never `shell=True` with Windows-style quoting; pass argument lists. Executable discovery via `shutil.which()` (handles `.exe` suffix).
- Default shells: Windows PowerShell, Ubuntu bash, **macOS zsh** — shell snippets in docs/scripts must be POSIX-sh-safe or provided per OS.

## CLI tool differences (bites hardest on macOS)
- macOS ships **BSD userland**: `sed -i` needs `sed -i ''`, `grep -P` doesn't exist, `date`, `stat`, `readlink -f` all differ from GNU. Prefer doing text processing in Python instead of shelling out.
- No `apt`/`winget`: install instructions for macOS use **Homebrew** (`brew install cmake ninja node python`).
- `python` may not exist; call `python3` on macOS/Linux, and use `#!/usr/bin/env python3` shebangs.

## GUI (tkinter / CustomTkinter — Goa'uld translator etc.)
- macOS system Python's Tk is often broken/ancient → document `brew install python-tk` or python.org installer. Verify at startup and fail with a clear message.
- HiDPI/Retina scaling, menu bar location (top of screen, not window), and Cmd-vs-Ctrl accelerators differ: bind `<Command-c>` etc. additionally on darwin.
- Window icons: `.ico` is Windows-only; provide `.png` via `iconphoto` for macOS/Linux.
- Fonts: don't hardcode "Segoe UI" / "Consolas"; pick per platform (macOS: "SF Pro"/"Menlo", Linux: "DejaVu Sans"/"monospace") or let the toolkit default.

## GPU / AI workloads
- macOS has **no Vulkan (natively), no ROCm, no CUDA** — the GPU path is **Metal**. llama.cpp: macOS builds use `-DGGML_METAL=ON` (default on Apple Silicon); PyTorch uses the `mps` device. Any device-selection logic needs a darwin branch (`Vulkan0/1` → Metal / `mps` / CPU).
- Apple Silicon (arm64) vs Intel Macs: pin wheels/binaries per arch; `platform.machine()` check. Rosetta-x86 Python + arm64 native libs is a classic silent failure.
- Unified memory on Apple Silicon: no separate VRAM budget — sizing heuristics from the AMD dual-GPU setup do not transfer.

## Packaging & distribution
- Line endings: enforce LF in repo (`.gitattributes`: `* text=auto eol=lf`), CRLF only for `.bat`/`.ps1`.
- Scripts must be `chmod +x` with shebang for macOS/Linux; provide `.command` or plain shell entry points instead of `.bat`.
- Unsigned apps trigger **Gatekeeper** ("cannot be opened, unidentified developer"): document right-click → Open, or `xattr -d com.apple.quarantine <file>` for downloaded binaries. Don't promise notarization unless actually code-signing.
- CI: if correctness on macOS matters, add a `macos-latest` job (GitHub Actions) — it's the only practical way to test without owning a Mac.

## Review checklist (apply to every "finished" tool)
1. Any hardcoded path, drive letter, or backslash? 2. Any Windows-only API without darwin branch (winreg, CTRL_BREAK, msvcrt)? 3. Shell-outs that assume GNU tools? 4. Encoding explicit everywhere (`open(..., encoding="utf-8")`)? 5. GPU/device selection with a Metal/CPU fallback? 6. Install docs cover brew + python3? 
