---
name: "fix-windows-cargo-home"
description: "Move Cargo/RTK binaries out of an accidental project-local CARGO_HOME on Windows"
version: 1
created: "2026-06-23"
updated: "2026-06-23"
---
## When to Use
Use when `where cargo`/`where rtk` resolves inside a project directory because user-level `CARGO_HOME` points there, but global Rust tools should live under the user's default Cargo home.

## Procedure
1. Inspect current process/user/machine env with PowerShell: print `$env:CARGO_HOME`, `[Environment]::GetEnvironmentVariable('CARGO_HOME','User')`, and `where.exe cargo rtk`.
2. Copy binaries non-destructively from the misplaced `<project>\.cargo\bin` to `%USERPROFILE%\.cargo\bin`; copy `.crates.toml`, `.crates2.json`, and `config.toml` only if the destination lacks them.
3. Unset user `CARGO_HOME` with `[Environment]::SetEnvironmentVariable('CARGO_HOME',$null,'User')`.
4. Edit user PATH: remove `<project>\.cargo\bin`, ensure `%USERPROFILE%\.cargo\bin` is present.
5. Verify by simulating a fresh environment: clear `$env:CARGO_HOME`, rebuild `$env:Path` from Machine+User env, then run `where.exe rtk`, `rtk --version`, `where.exe cargo`, `cargo --version`.
6. Do not delete the old project `.cargo` directory without explicit user confirmation; it may contain caches or project config.

## Pitfalls
- A child PowerShell launched from the current agent inherits stale process `CARGO_HOME` and PATH. Verify registry/user env separately or simulate fresh env manually.
- `cargo install rtk-ai` is wrong; RTK installs from GitHub: `cargo install --git https://github.com/rtk-ai/rtk`.

## Verification
1. User-level `CARGO_HOME` is empty or unset.
2. User PATH no longer contains the project `.cargo\bin` and does contain `%USERPROFILE%\.cargo\bin`.
3. Fresh-env `where rtk` resolves to `%USERPROFILE%\.cargo\bin\rtk.exe` and `rtk --version` succeeds.