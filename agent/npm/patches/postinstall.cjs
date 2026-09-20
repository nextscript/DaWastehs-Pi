"use strict";

const fs = require("node:fs");
const path = require("node:path");

/** Published packages use JS since 0.68; source checkouts still use TS.
 * Prefer executable JS, never declarations or source maps. Missing source in an
 * installed package is an unsupported layout, not an absent package.
 */
function resolvePiSubagentsSource(packageRoot, relativePath) {
  for (const extension of [".js", ".ts"]) {
    const target = path.join(packageRoot, relativePath + extension);
    if (fs.existsSync(target)) return target;
  }
  if (fs.existsSync(path.join(packageRoot, "package.json"))) {
    throw new Error(`Unsupported pi-subagents layout in ${packageRoot}: missing ${relativePath}.{js,ts}.`);
  }
  return undefined;
}

/** Recognize workflow IDs that are always either a UUID or absent. */
function hasFilesystemSafePiSubagentsAsyncWorkflowId(source) {
  return /\bconst\s+workflowRunId\s*=\s*(?:randomUUID\(\)|[^\r\n;?]+\?\s*randomUUID\(\)\s*:\s*undefined)\s*;/.test(source);
}

/**
 * Keep pi-subagents async workflow directories valid on Windows.
 * Pi 0.84 tool-call IDs may contain `|`, so they cannot be path components.
 * Current pi-subagents releases already use a conditional UUID assignment;
 * only the legacy `_id` implementation still needs rewriting.
 */
function patchPiSubagents(packageRoot = path.join(__dirname, "..", "node_modules", "pi-subagents")) {
  const executorPath = resolvePiSubagentsSource(packageRoot, "src/runs/foreground/subagent-executor");

  if (!executorPath) {
    return { found: false, changed: false, path: executorPath };
  }

  const source = fs.readFileSync(executorPath, "utf8");
  if (hasFilesystemSafePiSubagentsAsyncWorkflowId(source)) {
    return { found: true, changed: false, path: executorPath };
  }

  const vulnerable = "const workflowRunId = _id;";
  if (!source.includes(vulnerable)) {
    throw new Error(`Unsupported pi-subagents async workflow ID assignment in ${executorPath}.`);
  }

  if (source.split(vulnerable).length !== 2 || !/import\s*\{[^}]*\brandomUUID\b[^}]*\}\s*from\s*["']node:crypto["']/.test(source)) {
    throw new Error(`Unsupported pi-subagents UUID import or duplicate assignment in ${executorPath}.`);
  }
  const patched = source.replace(
    vulnerable,
    "const workflowRunId = randomUUID(); // Filesystem-safe on Windows; tool-call ids may contain `|`.",
  );
  fs.writeFileSync(executorPath, patched, "utf8");
  return { found: true, changed: true, path: executorPath };
}

/**
 * Pi's registry reports a builtin override with the extension's provenance.
 * Availability is the registered canonical NAME, not source === "builtin".
 * This changes discovery only: ceilings, excludes and child runtime validation
 * remain in pi-subagents. Never synthesize absent tools or forward providers.
 * @param {string} source
 */
function patchPiSubagentsHostToolSource(source) {
  const vulnerable = [
    '\t\t\t.filter((tool) => {',
    '\t\t\t\tconst source = (tool.sourceInfo as { source?: string } | undefined)?.source;',
    '\t\t\t\treturn source === "builtin" || (source === "auto" && PI_BUILTIN_TOOL_NAMES.has(tool.name));',
    '\t\t\t})',
  ].join("\n");
  const replacement = '\t\t\t.filter((tool) => PI_BUILTIN_TOOL_NAMES.has(tool.name))';
  const normalized = source.replace(/\r\n/g, "\n");
  const signature = 'export function getHostBuiltinToolNames(pi: Pick<ExtensionAPI, "getAllTools">): string[] | undefined {';
  if (normalized.split(signature).length !== 2) return { status: "unsupported", next: source };
  const start = normalized.indexOf(signature);
  const end = normalized.indexOf("\n}", start);
  const body = normalized.slice(start, end);
  if (body.includes(replacement) && !body.includes(vulnerable)) {
    return { status: "already-patched", next: source };
  }
  if (!body.includes(vulnerable) || normalized.split(vulnerable).length !== 2) {
    return { status: "unsupported", next: source };
  }
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  return { status: "patched", next: source.replace(vulnerable.replaceAll("\n", eol), replacement) };
}

/** Only intersect builtin names with the builtin registry, not extension tools.
 * Extension tools still need their declared provider and strict child validation.
 * @param {string} source
 */
function patchPiSubagentsBuiltinPruningSource(source) {
  const replacements = [
    ['ceilingFilteredBuiltinTools.filter((tool) => hostAvailableSet.has(tool) || NATIVE_COORDINATION_TOOL_NAMES.has(tool))',
     'ceilingFilteredBuiltinTools.filter((tool) => !PI_BUILTIN_TOOL_NAMES.has(tool) || hostAvailableSet.has(tool))'],
    ['ceilingFilteredBuiltinTools.filter((tool) => !hostAvailableSet.has(tool) && !NATIVE_COORDINATION_TOOL_NAMES.has(tool))',
     'ceilingFilteredBuiltinTools.filter((tool) => PI_BUILTIN_TOOL_NAMES.has(tool) && !hostAvailableSet.has(tool))'],
  ];
  let next = source;
  for (const [before, after] of replacements) {
    const oldCount = next.split(before).length - 1;
    const newCount = next.split(after).length - 1;
    if (oldCount === 1 && newCount === 0) next = next.replace(before, after);
    else if (oldCount !== 0 || newCount !== 1) return { status: "unsupported", next: source };
  }
  return { status: next === source ? "already-patched" : "patched", next };
}

/** Upstream now resolves declared tools in the child, not the parent registry.
 * Recognize the inspected implementation without reintroducing the old filter.
 * Ceilings, excludes and required-child validation must still be present.
 */
function hasNativePiSubagentsToolPlan(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, "").replace(/\s+/g, " ");
  return /export function resolvePiLaunchToolPlan\(/.test(code)
    && !/getHostBuiltinToolNames|hostAvailableSet|hostAvailableBuiltinTools/.test(code)
    && code.split("const declaredBuiltinTools = ceilingFilteredBuiltinTools;").length === 2
    && code.includes(".filter((tool) => !allowedToolSet || allowedToolSet.has(tool))")
    && code.includes("const effectiveDeclaredBuiltinTools = declaredBuiltinTools.filter((tool) => !excludedToolSet.has(tool));")
    && code.includes("const requiredChildTools = explicitToolAllowlist")
    && code.includes("input.tools !== undefined ? effectiveDeclaredBuiltinTools : []");
}

function patchPiSubagentsHostTools(packageRoot = path.join(__dirname, "..", "node_modules", "pi-subagents")) {
  const target = resolvePiSubagentsSource(packageRoot, "src/runs/shared/child-tool-plan");
  if (!target) return { found: false, changed: false, path: target };
  const source = fs.readFileSync(target, "utf8");
  if (hasNativePiSubagentsToolPlan(source)) {
    return { found: true, changed: false, path: target, mode: "upstream-native" };
  }
  const result = patchPiSubagentsHostToolSource(source);
  if (result.status === "unsupported") {
    throw new Error(`Unsupported pi-subagents host tool discovery in ${target}; inspect upstream before updating the compatibility patch.`);
  }
  const pruning = patchPiSubagentsBuiltinPruningSource(result.next);
  if (pruning.status === "unsupported") {
    throw new Error(`Unsupported pi-subagents builtin tool pruning in ${target}; inspect upstream before updating the compatibility patch.`);
  }
  if (pruning.next !== source) fs.writeFileSync(target, pruning.next, "utf8");
  return { found: true, changed: pruning.next !== source, path: target };
}

if (require.main === module) {
  const result = patchPiSubagents();
  if (result.found) {
    console.log(`pi-subagents async workflow IDs: ${result.changed ? "patched" : "filesystem-safe"} (${result.path}).`);
  }
  const hostTools = patchPiSubagentsHostTools();
  if (hostTools.found) {
    console.log(`pi-subagents tool plan: ${hostTools.mode ?? (hostTools.changed ? "patched" : "already compatible")} (${hostTools.path}).`);
  }
}

module.exports = { resolvePiSubagentsSource, hasFilesystemSafePiSubagentsAsyncWorkflowId, hasNativePiSubagentsToolPlan, patchPiSubagents, patchPiSubagentsHostToolSource, patchPiSubagentsBuiltinPruningSource, patchPiSubagentsHostTools };
