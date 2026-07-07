---
name: harden-autotuner-cross-platform-launch
description: "Debug and harden Auto Tuner model-launch crashes across Windows/Linux/macOS. Use when Auto Tuner crashes or aborts while loading/launching a model, after changing llama.cpp builds, on Ubuntu/macOS, or with older/forked llama.cpp binaries."
---

# Auto Tuner — Cross-Platform Launch Hardening

## Diagnosis workflow
1. Inspect `auto_tuner.py` and `qt_launcher.py` binary discovery first: native POSIX builds are extensionless and executable; Windows builds are `.exe`. Never let Linux/macOS auto-select a Windows `.exe` from a shared build folder.
2. Check the final argv built by `tuner.build_command` / `build_diffusion_*` and pass it through `tuner.prepare_command_for_binary(cmd)` before launch. That helper probes the selected binary's `--help` and prunes unsupported flags (e.g. `--fit`, `--cache-ram`, `--metrics`) that older/forked binaries would reject before model load.
3. For GUI launches on POSIX, read `app_data_dir()/logs/llama-server-*.log` — server stdout/stderr is redirected there, not to a terminal.
4. For frozen update/release work, keep platform assets distinct: Windows matches Windows/`.exe`, Linux matches Linux, and macOS/Darwin only matches macOS/darwin/osx assets (never Linux fallback).
5. When adding new llama.cpp flags, update `tuner._ARG_FLAGS_WITH_VALUES` and `_FLAG_ALIAS_GROUPS` if the flag takes a value or has short/long aliases, then add/adjust smoke tests.

## Pitfalls
- Do not re-add `.exe` candidates to POSIX auto-discovery; it recreates Ubuntu Exec-format/PermissionError launch crashes.
- Do not blindly strip command arguments without a usable `--help` parse; `prepare_command_for_binary` keeps commands unchanged if probing fails or core flags like `-m/--model` are absent.
- Avoid multiple readers on stdout and stderr pipes in `ServerProcess`; use `stderr=STDOUT` or concurrent readers to prevent deadlocks.

## Verification
```bash
python3 -m pytest -q
.venv_linux/bin/python -m ruff check .
python3 -m py_compile <changed files>
```

- Smoke tests covering resolver behavior and unsupported-flag pruning pass.
- A POSIX GUI launch logs the exact server output path after starting.
