---
name: "maintain-supercalc-benchmark-tool"
description: "Build and verify the SuperCalc .NET 10 benchmark CLI harness"
version: 27
created: "2026-06-21"
updated: "2026-07-04"
---
## When to Use
Use when modifying the SuperCalcBenchmark.Core/Cli/App/Tests projects, scorer, parser, llama.cpp client, prompt builder, report writer, WPF GUI, fixtures, or CI for the benchmark tool in this repo.
## Procedure
1. Keep all projects targeting net10.0; global.json pins SDK 10.0.301 with rollForward latestFeature so run dotnet commands from the repo root.
2. On Ubuntu/Linux where /home may be read-only or ~/.dotnet lacks the pinned SDK, use ./setup_linux.sh. It installs/uses ~/.pi/dotnet, sets DOTNET_CLI_HOME=~/.pi/dotnet-home and NUGET_PACKAGES=~/.pi/nuget/packages, builds the solution, and publishes a self-contained win-x64 WPF app for Wine under artifacts/linux-wine/.
3. For VS Code on Ubuntu, launch via ./code_linux.sh so the generated ignored workspace points ms-dotnettools.csharp/csdevkit at ~/.pi/dotnet/dotnet instead of the runtime-only acquisition fallback.
4. For the WPF GUI on Ubuntu, run ./start_linux.sh. It uses a writable Wine prefix under ~/.pi/wine/supercalc, unsets Linux DOTNET_ROOT for Wine, sets SUPERCALC_REPOSITORY_ROOT, and keeps the repo root as cwd so ./archive is the shared Windows/Linux archive.
5. Never put enhanced_exploits.md or benchmarks/supercalc-v3/ground_truth.json into LLM prompts for Run 1/Run 2. Prompts may include only enhanced_calc.cpp, schema/prompt templates, and for Run 2 the model's own Run-1 response. Ground-truth metadata may be loaded only after scoring for local comparison reports, except Run 3 truth_audit where ground truth is intentionally visible and must be archived as runKind="truth_audit" and groundTruthVisibleToModel=true.
6. Score changes are profile-versioned. official-v1 is frozen; new scoring behavior must be a new profile/version. Use --scoring-profile official-v1|official-v2 and migrate old archives with migrate-archive-scores rather than overwriting historical points.
7. Self-validation diagnostics, FP taxonomy, repeat metadata, comparison HTML/GUI metrics, and adjudicated scores are part of the benchmark surface; when modifying them, update Core models, ArchiveRunScore/ComparisonReport/ComparisonHtmlWriter, WPF comparison rows, CSV payloads, and tests together.
8. Optional adjudication is local-only: pass --adjudication <file> after automatic scoring, label output as <profile>+adjudicated, keep it non-official-comparable, and never send adjudication or ground truth to Run 1/Run 2 prompts.
9. Repeated runs use --repeats N and --seed-start S; each repeat must archive repeatGroupId/repeatIndex/repeatCount. For truth audit over repeats, use --with-truth-audit always|never|only-best-repeat intentionally.
10. After parser/scorer/archive/comparison/truth-audit/adjudication changes, run dotnet build SuperCalcBenchmark.slnx --configuration Release (or ./setup_linux.sh on Ubuntu).
11. Run dotnet run --project src/SuperCalcBenchmark.Tests --configuration Release to exercise ground-truth validation, lenient parsing/salvage, scoring/profile gates, duplicate handling, archive grouping/renaming, v1/v2/v3 archive loading, migration/versioning, self-validation/FP taxonomy, repeat metadata, adjudication, HTML payload/modals/help popovers, prompt-leak checks, and truth-audit accountability metrics.
12. Run dotnet run --project src/SuperCalcBenchmark.Cli --configuration Release -- validate to ensure source_sha256 and required/evidence anchors match enhanced_calc.cpp.
13. Run fixture scoring without archiving, e.g. dotnet run --project src/SuperCalcBenchmark.Cli --configuration Release -- score-fixture --response tools/response-fixtures/perfect.json --out artifacts/perfect-ci --no-archive; perfect.json should score 100/100. For v2 profile changes also run the same command with --scoring-profile official-v2.
14. For archive migrations, first run dotnet run --project src/SuperCalcBenchmark.Cli --configuration Release -- migrate-archive-scores --archive ./archive --assume-profile official-v1 --dry-run; only then use --write, which creates a backup under archive/_migration-backup by default.
## Pitfalls
- Live request interruption has two distinct semantics: global `Abbrechen` cancels the whole benchmark and intentionally does not save partial artifacts; Raw Outputs per-run manual stop cancels only the current streaming request via a separate manual-abort token, returns a successful partial result with `finish_reason` `manual_abort`/`ManuallyStopped=true`, then parses/scores/saves partial output plus visible reasoning (Run 1 continues to Run 2). Keep these paths separate when changing cancellation code.
- Do not let the WPF app treat `src/SuperCalcBenchmark.App/bin/...` as the repository root just because copied `enhanced_calc.cpp` and benchmark assets exist there. `start.vbs` should keep the working directory at the repo root, and `FindRepositoryRoot` should prefer candidates with `SuperCalcBenchmark.slnx`/`.git`; otherwise GUI archives/reports go under `bin/Release/.../archive` instead of the intended `./archive`.
## Verification
1. dotnet --info from the repo root shows global.json and SDK 10.0.301 or compatible .NET 10. On Ubuntu, ~/.pi/dotnet/dotnet --info with DOTNET_CLI_HOME=~/.pi/dotnet-home is acceptable.
2. dotnet build SuperCalcBenchmark.slnx --configuration Release exits with 0 errors, including the WPF app project. On Ubuntu, ./setup_linux.sh must build and publish artifacts/linux-wine/SuperCalcBenchmark.App-win-x64/SuperCalcBenchmark.App.exe.
3. dotnet run --project src/SuperCalcBenchmark.Tests --configuration Release prints All tests passed.
4. dotnet run --project src/SuperCalcBenchmark.Cli --configuration Release -- validate prints Valid: True.
5. Scoring tools/response-fixtures/perfect.json reports 100/100 with 20 full TPs and 0 FPs.
6. The GUI can be started locally with dotnet run --project src/SuperCalcBenchmark.App on Windows or ./start_linux.sh on Ubuntu/Wine; use it to Refresh Models and run a benchmark when llama-server is available. On headless Pi sessions, Wine may fail with no display/authorization even though the self-contained publish is valid.