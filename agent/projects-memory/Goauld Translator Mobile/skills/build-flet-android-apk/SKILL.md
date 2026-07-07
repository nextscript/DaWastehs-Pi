---
name: "build-flet-android-apk"
description: "Build the Flet Android APK for this repo on the local Linux machine"
version: 1
created: "2026-07-05"
updated: "2026-07-05"
---
## When to Use
Use when asked to produce a local Android APK for Goauld Translator Mobile from this repo.

## Procedure
1. Create/install the Python venv if needed: `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`.
2. Use a writable HOME path with no spaces, e.g. `/tmp/goauld-flet-home`; do not use the repo path or `/home/dawasteh` for Android/Java caches.
3. If Android SDK packages are missing or sdkmanager fails writing `/home/dawasteh/.android/cache`, run sdkmanager with `JAVA_TOOL_OPTIONS='-Duser.home=/tmp/goauld-flet-home'` and pipe yes to accept licenses: `HOME=/tmp/goauld-flet-home JAVA_TOOL_OPTIONS='-Duser.home=/tmp/goauld-flet-home' JAVA_HOME=/tmp/goauld-flet-home/java/17.0.13+11 ANDROID_HOME=/tmp/goauld-flet-home/Android/sdk sh -c 'yes | /tmp/goauld-flet-home/Android/sdk/cmdline-tools/12.0/bin/sdkmanager --install "cmdline-tools;latest" "platform-tools" "platforms;android-35" "build-tools;35.0.0"'`.
4. Build with the same environment: `HOME=/tmp/goauld-flet-home JAVA_TOOL_OPTIONS='-Duser.home=/tmp/goauld-flet-home' ANDROID_HOME=/tmp/goauld-flet-home/Android/sdk ANDROID_SDK_ROOT=/tmp/goauld-flet-home/Android/sdk JAVA_HOME=/tmp/goauld-flet-home/java/17.0.13+11 .venv/bin/flet build apk --arch arm64-v8a --clear-cache --verbose --yes`.
5. Find the resulting APK at `build/apk/goauld-translator-mobile.apk`.

## Pitfalls
- Flet's default Flutter installer writes to `Path.home()`; on this machine `/home/dawasteh` may be read-only for caches, causing failures.
- Do not put Android SDK/JDK under a path containing spaces; sdkmanager can misinterpret the path and fail with `ClassNotFoundException: Translator`.
- The repo's `build/` directory may appear untracked; do not commit build artifacts unless explicitly requested.

## Verification
1. Run `pytest -q` before building.
2. Check `build/apk/goauld-translator-mobile.apk` exists and optionally verify nested `assets/flutter_assets/app/app.zip` contains expected assets.
3. Record `sha256sum build/apk/goauld-translator-mobile.apk` for handoff.