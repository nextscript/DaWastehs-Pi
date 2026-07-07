---
name: validate-pandalifesg
description: "Validate and smoke-test the PandaLifeSG single-file browser game after edits. Use after touching PandaLifeSG.html, README, CI workflow, smoke scripts, controls, audio, pointer lock, or performance-mode behavior."
---

# PandaLifeSG — Static App Validation

## Workflow
- Run `npm test` from repo root; it executes `scripts/smoke-check.js`.
- Fix missing required snippets or JavaScript syntax reported by the smoke script before doing browser tests.
- For runtime-sensitive changes, serve locally and test the browser APIs directly:

```bash
python -m http.server 8080
# open http://localhost:8080/PandaLifeSG.html
```

## Performance-mode expectations
- `P` should be a real quality profile: reduce render distance, shadows, particle count, or secondary update rates. A flag with no visible effect is not enough.
- Clamp large RAF deltas after background-tab pauses.
- Keep the single-file/no-build nature unless the project direction explicitly changes.

## Pitfalls
- Do not execute the inline game script in Node; parse with `new Function` only because it depends on browser APIs.
- Avoid adding dependencies/package installs to this no-build app without explicit approval.
- Pointer Lock and audio require real browser interaction; Node checks cannot prove those paths.

## Verification
- `npm test` prints `PandaLifeSG smoke check passed.`
- Browser smoke starts from title, locks pointer after click, renders HUD/minimap, and tests Comfort Mode (`C`) plus Performance Mode (`P`) with no console syntax errors.
- `git diff --stat` contains only intentional app/docs/workflow changes.
