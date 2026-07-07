---
name: "build-goauld-flet-android-apk"
description: "Build and debug the Goa'uld Translator Mobile Flet Android APK"
version: 5
created: "2026-06-02"
updated: "2026-06-29"
---
## When to Use
Use when building, packaging, or debugging Android startup/blue-screen issues for this Flet mobile project.

## Procedure
1. Run source-level smoke checks with `PYTHONPATH=. python -m pytest -q` and `PYTHONPATH=. python -m compileall -q app goauld_engine main.py app.py`.
2. Keep `pyproject.toml` and `requirements.txt` synchronized on `flet==0.85.3` / `flet[cli]==0.85.3` (0.85.3 = patch release 08.06.2026; hard pin keeps APK builds reproducible), include explicit `certifi>=2024.8.30`, and keep `[tool.flet.app] module = "main"`.
3. Before a phone build, remove stale generated artifacts (`build/` at minimum, especially `build/site-packages` and `build/flutter`) so an emulator/x86_64 site-packages bundle cannot be reused for ARM64.
4. Build from repo root with `flet build apk --arch arm64-v8a --clear-cache --verbose --yes` or run `build_apk.bat`.
5. If Gradle/Lint fails with Windows file locks, close Android Studio, stop/kill GradleDaemon/KotlinCompileDaemon (`jps -l`, then `taskkill /PID <PID> /F /T` in PowerShell/CMD), delete `build/`, and rerun the Flet build.
6. Do not treat `build/flutter` as primary source. If invoking Flutter/Android Studio directly from `build/flutter`, set `SERIOUS_PYTHON_SITE_PACKAGES=<repo>\\build\\site-packages` and use a valid Java 17+ `JAVA_HOME`.
7. Use `adb logcat | findstr /i "goauld python flutter serious"` for device-side startup failures.
## Pitfalls
- A stale or missing `build/flutter/app/app.zip` causes Python not to start in the APK.
- The S25 Ultra/certifi startup error can be caused by an APK that contains `lib/x86_64/libpythonsitepackages.so` but not `lib/arm64-v8a/libpythonsitepackages.so`. Emulator success does not prove the phone APK is valid.
- `[tool.flet.assets] src = "assets"` is not enough if stale build artifacts are reused; use `--clear-cache` and remove `build/` for device builds.
- Direct Gradle/Android Studio builds fail with `SERIOUS_PYTHON_SITE_PACKAGES environment variable is not set` unless that env var is supplied.
- Flet module names are file stems; dotted `app.main` gets reduced to `app`, which collides with the `app/` package.
- Windows Gradle/Kotlin daemons can lock lint/cache files; stop daemons or close Android Studio before retrying.
## Verification
1. `PYTHONPATH=. python -m pytest -q` passes.
2. `build/flutter/app/app.zip` is small and contains `main.py`, `app/`, `goauld_engine/`, and `assets/` including `assets/goa_uld_lexicon.yaml` and `assets/goauld_overrides.yaml`.
3. `build/flutter/lib/main.dart` has `const pythonModuleName = "main"`.
4. The final APK `build/apk/goauld-translator-mobile.apk` contains `assets/flutter_assets/app/app.zip`, `lib/arm64-v8a/libpythonsitepackages.so`, and `lib/arm64-v8a/libyaml.so`; it must not rely on `x86_64/libpythonsitepackages.so` for phone installs.
5. Install/update on device with `adb install -r build/apk/goauld-translator-mobile.apk`.