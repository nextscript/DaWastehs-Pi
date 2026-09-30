---
name: "verify-calculator-editor-semantics"
description: "Audit calculator-only math, format conversion, memory and UI in Math Predictor. Manual-only; do not use for AI or inference testing."
skill-governor-tier: manual
skill-governor-risk: high
disable-model-invocation: true
version: 1
created: "2026-09-27"
updated: "2026-09-27"
---
## When to Use
Use for calculator regressions in this repository, especially SymPy/MathLive parsing, RAD/DEG, format switching, memory recall and history.

## Procedure
1. Keep model/inference/AI code outside calculator-only scope. Shared CAS corrections are allowed by the user's explicit clarification; do not launch model or GPU tests.
2. Run .venv/Scripts/python.exe -m pytest tests/test_engine.py tests/test_calculator_regressions.py tests/test_calculator_api.py tests/test_api.py::test_health tests/test_api.py::test_security tests/test_api.py::test_calculate_api tests/test_api.py::test_worker_errors_are_contained -q.
3. Build with npm run build, then run npm run test:e2e -- --grep-invert 'honest model availability'. The excluded legacy test mixes calculator and AI coverage; pure calculator replacements live in calculator.spec.ts.
4. For editor conversion compare semantic values in BOTH RAD and DEG, retain equation sides and singularities before simplification, and test text-to-LaTeX-to-text. Reject unsupported conversions without overwriting the draft.
5. For MS/MR verify exact scalar replay in both editors and angle modes, and reject nonfinite or non-representable literals. Validate history data before rendering/restoring.
6. For native Windows smoke use desktop.py --smoke-test with MATH_PREDICTOR_AUTOSTART_MODEL=0. Inspect .appdata/desktop-smoke.txt and keep platform gaps explicit.

## Pitfalls
- MathLive AsciiMath conversion is not compatible with this backend's whitelist syntax for every function; never assume its output preserves asin/log10/abs/cbrt semantics.
- SymPy LaTeX parsing can turn pi into a Symbol and eagerly collapse equalities. Initialize the lazy ANTLR imports outside s.evaluate(False); importing units with evaluation disabled breaks dimensional constants.
- SymPy singularities() omits the base of an unevaluated two-argument log; account for bases zero and one. Direct s.limit(dir='+-') can return zoo for divergent opposite sides; compare sides explicitly.
- Do not compare Playwright innerText snapshots with textContent expectations for KaTeX output. MathML, visual HTML and annotations have different text representations.
- Preserve the source distinction between real indexed odd roots and complex fractional powers; the underlying parser can map both to the same Pow.

## Verification
1. Relevant calculator pytest suite, TypeScript/Vite build and calculator-only Edge suite pass with no page errors.
2. Boundary/roundtrip tests cover the specific changed semantics, not only displayed output strings.
3. docs/CALCULATOR_AUDIT.md or the current report states reproducible defects, successful checks and remaining platform/numerical limitations.