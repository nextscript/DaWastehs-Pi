import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const patches = createRequire(import.meta.url)("../npm/patches/postinstall.cjs");
const safeExecutor = 'import { randomUUID } from "node:crypto";\nconst workflowRunId = asyncWorkflow ? randomUUID() : undefined;\n';
// Relevant statements from the compiled 0.70.0 tool planner. The optional
// installed-package smoke additionally exercises the complete upstream function.
const nativePlan = `export function resolvePiLaunchToolPlan(input) {
 const ceilingFilteredBuiltinTools = requestedBuiltinTools.filter((tool) => !allowedToolSet || allowedToolSet.has(tool));
 const declaredBuiltinTools = ceilingFilteredBuiltinTools;
 const effectiveDeclaredBuiltinTools = declaredBuiltinTools.filter((tool) => !excludedToolSet.has(tool));
 const requiredChildTools = explicitToolAllowlist
  ? [...(input.tools !== undefined ? effectiveDeclaredBuiltinTools : [])] : [];
 return requiredChildTools;
}`;

async function fixture(run) {
 const root = await mkdtemp(join(tmpdir(), "pi-subagents-layout-"));
 try {
  await mkdir(join(root, "src/runs/foreground"), { recursive: true });
  await mkdir(join(root, "src/runs/shared"), { recursive: true });
  await run(root);
 } finally { await rm(root, { recursive: true, force: true }); }
}

for (const extension of ["js", "ts"]) {
 test(`recognizes native ${extension} package without rewriting it, including CRLF`, async () => {
  await fixture(async (root) => {
   const executor = join(root, `src/runs/foreground/subagent-executor.${extension}`);
   const planner = join(root, `src/runs/shared/child-tool-plan.${extension}`);
   await writeFile(executor, safeExecutor);
   await writeFile(planner, nativePlan.replaceAll("\n", "\r\n"));
   for (let pass = 0; pass < 2; pass++) {
    assert.deepEqual(patches.patchPiSubagents(root), { found: true, changed: false, path: executor });
    assert.deepEqual(patches.patchPiSubagentsHostTools(root), { found: true, changed: false, path: planner, mode: "upstream-native" });
   }
   assert.equal(await readFile(executor, "utf8"), safeExecutor);
   assert.equal(await readFile(planner, "utf8"), nativePlan.replaceAll("\n", "\r\n"));
  });
 });
}

test("checks executable JS ahead of TS and never accepts declarations as runtime files", async () => {
 await fixture(async (root) => {
  const base = join(root, "src/runs/foreground/subagent-executor");
  await writeFile(base + ".d.ts", "declare const workflowRunId: string;");
  await writeFile(join(root, "package.json"), '{"name":"pi-subagents"}');
  assert.throws(() => patches.patchPiSubagents(root), /Unsupported.*layout/);
  assert.throws(() => patches.patchPiSubagentsHostTools(root), /Unsupported.*layout/);
  await writeFile(base + ".ts", safeExecutor);
  await writeFile(base + ".js", "unknown upstream");
  assert.throws(() => patches.patchPiSubagents(root), /Unsupported.*assignment/);
  assert.equal(await readFile(base + ".js", "utf8"), "unknown upstream");
 });
});

test("distinguishes absent packages from unsupported installed layouts", async () => {
 await fixture(async (root) => {
  assert.equal(patches.patchPiSubagents(root).found, false);
  assert.equal(patches.patchPiSubagentsHostTools(root).found, false);
  await writeFile(join(root, "package.json"), '{"name":"pi-subagents"}');
  assert.throws(() => patches.patchPiSubagents(root), /Unsupported.*layout/);
 });
});

test("native-plan recognition requires ceilings, exclusions and child validation, without old host pruning", () => {
 assert.equal(patches.hasNativePiSubagentsToolPlan(nativePlan), true);
 for (const changed of [
  nativePlan.replace("!allowedToolSet || allowedToolSet.has(tool)", "true"),
  nativePlan.replace("!excludedToolSet.has(tool)", "true"),
  nativePlan.replace("input.tools !== undefined ? effectiveDeclaredBuiltinTools : []", "[]"),
  nativePlan + "\nconst hostAvailableSet = new Set();",
  nativePlan + nativePlan,
  "// " + nativePlan.replaceAll("\n", "\n// "),
 ]) assert.equal(patches.hasNativePiSubagentsToolPlan(changed), false);
});

test("legacy JS UUID repair needs an existing crypto import and a unique assignment", async () => {
 await fixture(async (root) => {
  const target = join(root, "src/runs/foreground/subagent-executor.js");
  const legacy = safeExecutor.replace("asyncWorkflow ? randomUUID() : undefined", "_id");
  await writeFile(target, legacy);
  assert.equal(patches.patchPiSubagents(root).changed, true);
  assert.equal(patches.patchPiSubagents(root).changed, false);
  for (const invalid of [legacy + legacy, 'const workflowRunId = _id;']) {
   await writeFile(target, invalid);
   assert.throws(() => patches.patchPiSubagents(root), /Unsupported/);
   assert.equal(await readFile(target, "utf8"), invalid);
  }
 });
});
