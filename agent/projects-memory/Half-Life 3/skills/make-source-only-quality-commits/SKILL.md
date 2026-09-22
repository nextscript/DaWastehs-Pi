---
name: "make-source-only-quality-commits"
description: "Create regular local source checkpoints for Vesper Signal while preserving private evidence, inherited work and working-file bytes. Do not use for unrelated work."
version: 1
created: "2026-09-20"
updated: "2026-09-20"
skill-governor-tier: auto
skill-governor-risk: medium
---
## When to Use
Use after coherent verified game/ quality changes when local commits are authorized. Prefer ordinary scoped commits; archived-history reconstruction is only for a deliberate catch-up from verified source snapshots.

## Procedure
1. Inspect HEAD, branch, staged changes, hooks and signing policy. Never sweep foreign staged or untracked files into a commit; retain .pi as runtime state.
2. For normal progress, stage explicit changed source/test/documentation paths and small required original assets, run relevant gates, and make a descriptive local commit. Do not push without a separate request.
3. Keep game/reports/raw/hl3-quality, exported EXEs, movies, saves, caches and assets/local_source out of new commits. Existing already-versioned historical reports may remain unchanged.
4. For an authorized archive catch-up, verify baseline/manifest.json plus working-tree.zip and each iteration's source-manifest/source-delta archive. Separate inherited pre-quality edits from assistant changes and state that commits are reconstructed now, not backdated.
5. Prepare reconstructed trees in a separate Git index. Preserve file modes and use normal path-aware clean filters so core.autocrlf matches ordinary staging. Validate every archive hash, new path and final tree against current source. Never checkout historical trees over the live workspace.
6. Do not use plumbing to bypass hooks or signing. If such policies exist, use the configured commit path or seek a compatible procedure. Before attaching prepared history, recheck branch/HEAD, real index and guarded file hashes; append only, with a compare-and-swap ref update.
7. Synchronize only the index to an attached verified final tree, never the working tree. Verify all guarded raw file hashes and existing deletions again, clean tracked source/index, commit ancestry and no publication. Record commit-to-source-checkpoint mapping under ignored evidence.

## Pitfalls
- A blanket reports/ rejection also matches already-tracked historical screenshots and manifests. Permit only unchanged HEAD blobs there; never permit new raw evidence.
- Raw archived CRLF bytes and Git-normalized blobs differ. Git hash-object --path applies repository clean filters without rewriting the working files.
- A failed preparation may leave only a temporary index or dangling objects. Preserve diagnostic artifacts and prove HEAD/real index are untouched before retrying; do not reset the user's tree.
- A new runtime GDScript adds compiled .gdc plus .gd.remap entries to the exported package. Inspect actual package-file differences before changing a count expectation.
- Millimetre mesh ray tests can fail the engine's absolute intersection epsilon. Demonstrate the same geometry/ray at different uniform unit scales, retain a positive control, and never silently weaken the hit contract.

## Verification
1. Relevant tests and actual rendering evidence exist for the committed source; remaining acceptance failures are disclosed.
2. git log clearly separates inherited baseline and quality steps; reconstructed commits are not backdated.
3. Tracked working source and index are clean after the checkpoint, unrelated untracked state remains untouched, and raw working-file hashes are preserved.
4. No new private packs, saves, builds, videos or raw reports appear in the commit diff; no push occurred.