import assert from "node:assert/strict";
import test from "node:test";
import { patchPiIntercomBrokerCwdSource } from "../extensions/pi-autoupdate.ts";

// Representative launcher shapes, independent of ignored node_modules state.
const legacyLauncher = (cwd) => `import { getIntercomDirPath } from "./paths.ts";
const child = spawn(command, args, {
  detached: true,
  cwd: ${cwd},
  stdio: "ignore",
});
`;
const upstreamLauncher = `export function getBrokerSpawnOptions(env = process.env, captureStderr = true) {
  const agentDir = getAgentDirPath(env);
  return {
    detached: true,
    stdio: captureStderr ? ["ignore", "ignore", "pipe"] : "ignore",
    // Windows locks a process's cwd against renames, so keep it outside the package.
    cwd: getIntercomDirPath(agentDir),
    env: { ...env, PI_CODING_AGENT_DIR: agentDir, NODE_NO_WARNINGS: "1" },
    windowsHide: true,
  };
}
`;

test("intercom cwd repair accepts the env-aware upstream launcher unchanged", () => {
  for (const source of [upstreamLauncher, upstreamLauncher.replaceAll("\n", "\r\n")]) {
    assert.deepEqual(patchPiIntercomBrokerCwdSource(source), { found: true, next: source });
  }
});

test("intercom cwd repair preserves the existing no-argument runtime cwd", () => {
  const source = legacyLauncher("getIntercomDirPath()");
  assert.deepEqual(patchPiIntercomBrokerCwdSource(source), { found: true, next: source });
});

test("intercom cwd repair patches legacy package cwd and is idempotent", () => {
  for (const newline of ["\n", "\r\n"]) {
    const source = legacyLauncher("extensionDir").replaceAll("\n", newline);
    const repaired = patchPiIntercomBrokerCwdSource(source);
    assert.equal(repaired.found, true);
    assert.equal(repaired.next, source.replace("cwd: extensionDir,", "cwd: getIntercomDirPath(), // Do not lock this package directory on Windows."));
    assert.deepEqual(patchPiIntercomBrokerCwdSource(repaired.next), { found: true, next: repaired.next });
  }
});

test("intercom cwd recognition tolerates harmless property and call spacing", () => {
  for (const value of ["getIntercomDirPath( )", "getIntercomDirPath( agentDir )"]) {
    const source = legacyLauncher(value).replace("  cwd: ", "\tcwd :\t");
    assert.deepEqual(patchPiIntercomBrokerCwdSource(source), { found: true, next: source });
  }
});

test("intercom cwd repair rejects unknown arguments and layouts without mutation", () => {
  for (const source of [
    legacyLauncher("process.cwd()"),
    legacyLauncher("getIntercomDirPath(extensionDir)"),
    legacyLauncher("getIntercomDirPath(agentDir) || extensionDir"),
    legacyLauncher("extensionDir").replace('import { getIntercomDirPath } from "./paths.ts";\n', ""),
    "export function unknownLauncher() {}\n",
    '// cwd: getIntercomDirPath(),\nconst options = {};\n',
  ]) {
    assert.deepEqual(patchPiIntercomBrokerCwdSource(source), { found: false, next: source });
  }
});

test("intercom cwd repair does not mistake a safe comment for a safe assignment", () => {
  const source = "// cwd: getIntercomDirPath(),\n" + legacyLauncher("extensionDir");
  const result = patchPiIntercomBrokerCwdSource(source);
  assert.equal(result.found, true);
  assert.notEqual(result.next, source);
  assert.doesNotMatch(result.next, /cwd: extensionDir,/);
});

test("intercom cwd repair fails closed for multiple launch assignments", () => {
  const source = legacyLauncher("getIntercomDirPath()") + legacyLauncher("extensionDir");
  assert.deepEqual(patchPiIntercomBrokerCwdSource(source), { found: false, next: source });
});
