---
name: "maintain-supercalc-benchmark-fairness"
description: "Keep SuperCalc benchmark code, exploit docs, and hidden scoring ground truth synchronized"
version: 1
created: "2026-06-21"
updated: "2026-06-21"
---
## When to Use
Use whenever changing enhanced_calc.cpp vulnerabilities, enhanced_exploits.md, benchmark scoring, or hidden ground truth for this repo.

## Procedure
1. When a vulnerability is added or changed, ensure it is code-grounded and reachable enough for static LLM analysis without giving away answers in source comments.
2. Update enhanced_exploits.md so every finding's trigger, location, severity, and technical details match the actual C++ code.
3. Update benchmarks/supercalc-v3/ground_truth.json with the finding ID, aliases, code locations, required_evidence strings, and strict_scoreable status.
4. Recompute source_sha256 in ground_truth.json after any enhanced_calc.cpp change.
5. Validate ground_truth.json: JSON parses, contains 20 vulnerabilities unless intentionally versioned, source hash matches enhanced_calc.cpp, and every required_evidence string exists in the source.
6. Compile with native MSVC on Windows via vcvars64.bat and cl /std:c++20 /EHsc /W4, then run a basic smoke test such as 2+3, 5*7, fact(5), quit.
7. Update README, benchmark-result-template.md, docs/SCORING_METHODOLOGY.md, and plans/BenchmarkTool.md if workflow/scoring/counts change.

## Pitfalls
- Do not send enhanced_exploits.md or ground_truth.json to the evaluated LLM; they are hidden scorer inputs only.
- Avoid source comments that label vulnerabilities directly; keep the benchmark challenging but fair via code evidence and hidden ground truth.
- Do not overwrite or modify LLM-Showdown.xlsx unless the user explicitly requests spreadsheet work; it may contain user-edited results.
- If severity counts change, update both README.md and enhanced_exploits.md summary tables.

## Verification
1. python -m json.tool benchmarks/supercalc-v3/ground_truth.json succeeds.
2. A script verifies len(vulnerabilities)==20, source_sha256 matches enhanced_calc.cpp, and all required_evidence strings exist in source.
3. MSVC compile exits successfully; warnings for intentionally unsafe functions are acceptable.
4. Smoke test prints expected results and clean shutdown.