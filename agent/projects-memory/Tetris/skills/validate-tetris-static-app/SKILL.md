---
name: validate-tetris-static-app
description: "Validate this repo's no-build Tetris static app after code or workflow changes"
---

# Tetris — Static App Validation

## Scope
Use after editing tetris.html, tetris-logic.js, index.html, smoke-test.cjs, or GitHub Actions workflow for this Tetris repo.

## Workflow
1. Run `node smoke-test.cjs` to validate pure game rules, critical wiring, and workflow hardening checks.
2. Run `npx --yes htmlhint@1.9.2 index.html tetris.html` for HTML validation; keep the version pinned and do not use `--compact` because current htmlhint CLI rejects it.
3. Run `node --check tetris-logic.js && node --check smoke-test.cjs` for JS syntax checks.
4. If deploy paths changed, verify build artifact includes `index.html`, `tetris.html`, and `tetris-logic.js`.
## Pitfalls
- Do not restore `.github/workflows/ci.yml`; deploy.yml is the single CI/deploy workflow.
- Do not add runtime dependencies or a build step for simple static changes.

## Verification
1. All commands exit 0.
2. GitHub Actions deploy.yml has no `|| true` on HTMLHint.
3. Pages artifact copies `index.html`, `tetris.html`, and `tetris-logic.js`.
4. Workflow actions stay pinned by SHA, use Node 24-compatible major versions, and the Pages job keeps `concurrency: group: pages` with `cancel-in-progress: false`.
