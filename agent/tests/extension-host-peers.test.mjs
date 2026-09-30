import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import test from "node:test";

const { HOST_PROVIDED_EXTENSION_PACKAGES, patchExtensionHostPeers, patchInstalledExtensionHostPeers } = createRequire(import.meta.url)("../npm/patches/postinstall.cjs");

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "pi-host-peers-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function put(root, manifest, indent = 2, eol = "\n", bom = "") {
  await mkdir(root, { recursive: true });
  const source = bom + (JSON.stringify(manifest, null, indent) + "\n").replaceAll("\n", eol);
  await writeFile(join(root, "package.json"), source);
  return source;
}
const extension = { name: "fixture", pi: { extensions: ["./index.ts"] } };

test("host peers repair fixes the three warning shapes without losing runtime dependencies", async (t) => {
  const root = await fixture(t);
  for (const [name, host] of [["pi-hermes-memory", "@earendil-works/pi-tui"], ["@juicesharp/rpiv-todo", "typebox"], ["@juicesharp/rpiv-ask-user-question", "typebox"]]) {
    const pkg = join(root, name);
    const input = { ...extension, name, dependencies: { [host]: "^1.0.0", library: "^2.0.0" }, peerDependencies: { unrelated: "^3" }, peerDependenciesMeta: { unrelated: { optional: true } }, devDependencies: { [host]: "^1.0.0" } };
    await put(pkg, input);
    const patch = patchExtensionHostPeers(pkg);
    assert.equal(patch.changed, true);
    assert.deepEqual(patch.repaired, [host]);
    const manifest = JSON.parse(await readFile(join(pkg, "package.json"), "utf8"));
    assert.deepEqual(manifest.dependencies, { library: "^2.0.0" });
    assert.deepEqual(manifest.peerDependencies, { unrelated: "^3", [host]: "*" });
    assert.deepEqual(manifest.peerDependenciesMeta, input.peerDependenciesMeta);
    assert.deepEqual(manifest.devDependencies, input.devDependencies);
    assert.deepEqual(manifest.pi, input.pi);
  }
});

test("all modern host modules and optional copies become wildcard peers", async (t) => {
  const root = await fixture(t);
  await put(root, { ...extension, dependencies: Object.fromEntries(HOST_PROVIDED_EXTENSION_PACKAGES.map((name) => [name, "^1"])), optionalDependencies: { typebox: "^1", sqlite: "^2" }, peerDependencies: { typebox: "^1" }, peerDependenciesMeta: { typebox: { optional: true } } });
  patchExtensionHostPeers(root);
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  assert.deepEqual(manifest.dependencies, {});
  assert.deepEqual(manifest.optionalDependencies, { sqlite: "^2" });
  assert.deepEqual(manifest.peerDependencies, Object.fromEntries(HOST_PROVIDED_EXTENSION_PACKAGES.map((name) => [name, "*"])));
  assert.deepEqual(manifest.peerDependenciesMeta, { typebox: { optional: true } });
});

test("host peer repair preserves tabs/CRLF/BOM and is byte-idempotent", async (t) => {
  const root = await fixture(t);
  await put(root, { ...extension, peerDependencies: { typebox: ">=1.0.0" } }, "\t", "\r\n", "\uFEFF");
  assert.equal(patchExtensionHostPeers(root).changed, true);
  const source = await readFile(join(root, "package.json"), "utf8");
  assert.ok(source.startsWith("\uFEFF"));
  assert.match(source, /\r\n\t"peerDependencies"/);
  assert.equal(source.replaceAll("\r\n", "").includes("\n"), false);
  assert.equal(patchExtensionHostPeers(root).changed, false);
  assert.equal(await readFile(join(root, "package.json"), "utf8"), source);
});

test("managed scan covers scoped/unscoped extensions but leaves ordinary and nested libraries untouched", async (t) => {
  const root = await fixture(t);
  for (const name of ["hermes", "@scope/todo"]) await put(join(root, "node_modules", name), { ...extension, dependencies: { typebox: "^1" } });
  for (const name of ["library", "@scope/library", "hermes/node_modules/library", ".cache/extension"]) {
    await put(join(root, "node_modules", name), { name, dependencies: { typebox: "^1" } });
  }
  const results = patchInstalledExtensionHostPeers(root);
  assert.equal(results.length, 2);
  assert.ok(results.every((result) => result.changed));
  assert.ok(patchInstalledExtensionHostPeers(root).every((result) => !result.changed));
  for (const name of ["library", "@scope/library", "hermes/node_modules/library", ".cache/extension"]) {
    assert.equal(JSON.parse(await readFile(join(root, "node_modules", name, "package.json"), "utf8")).dependencies.typebox, "^1");
  }
});

test("missing packages are harmless; malformed manifests fail visibly instead of hiding warnings", async (t) => {
  const root = await fixture(t);
  assert.equal(patchExtensionHostPeers(root).found, false);
  assert.deepEqual(patchInstalledExtensionHostPeers(root), []);
  await writeFile(join(root, "package.json"), "{broken");
  assert.throws(() => patchExtensionHostPeers(root), SyntaxError);
  assert.equal(await readFile(join(root, "package.json"), "utf8"), "{broken");
});

test("local models and updater no longer depend on or resurrect pi-llama-cpp", async () => {
  const read = (file) => readFile(new URL(file, import.meta.url), "utf8");
  const settings = JSON.parse(await read("../settings.json"));
  const manifest = JSON.parse(await read("../npm/package.json"));
  const lock = JSON.parse(await read("../npm/package-lock.json"));
  assert.ok(!settings.packages.some((pkg) => (typeof pkg === "string" ? pkg : pkg.source).includes("pi-llama-cpp")));
  assert.equal(settings.llamaServerUrl, undefined);
  assert.ok(!Object.keys(settings.modelThinkingLevels).some((name) => name.startsWith("llama-server=")));
  assert.equal(manifest.dependencies["pi-llama-cpp"], undefined);
  assert.equal(lock.packages["node_modules/pi-llama-cpp"], undefined);
  const tuner = await read("../extensions/autotuner.ts");
  assert.doesNotMatch(tuner, /pi-llama-cpp|llamaServerUrl/);
  assert.match(tuner, /pi\.registerProvider\(PROVIDER_ID/);
  const updater = await read("../extensions/pi-autoupdate.ts");
  assert.doesNotMatch(updater, /pi-llama-cpp|llamaServerUrl|ensureLlamaCpp|patchLlama/);
  assert.match(updater, /const peers = await ensureExtensionHostPeers\(cwd\)/);
  assert.match(updater, /ok: peers\.ok &&/);
  assert.match(updater, /patchInstalledExtensionHostPeers\(npmRoot\)/);
  assert.match(updater, /scope !== "self" \? await ensurePostUpdatePackagePatches/);
  const hook = await read("../npm/patches/postinstall.cjs");
  assert.match(hook, /if \(require\.main === module\) \{\s*for \(const peers of patchInstalledExtensionHostPeers\(\)\)/);
});

test("fresh updater runs host-peer repair in global/project roots, while self updates leave manifests alone", async (t) => {
  const root = await fixture(t);
  const agent = join(root, "agent");
  const cwd = join(root, "project");
  const bin = join(root, "bin");
  await mkdir(bin, { recursive: true });
  const shim = join(bin, process.platform === "win32" ? "pi.cmd" : "pi");
  await writeFile(shim, process.platform === "win32" ? "@echo off\r\necho fixture-update %*\r\n" : '#!/bin/sh\necho fixture-update "$@"\n');
  if (process.platform !== "win32") await chmod(shim, 0o755);
  const globalPkg = join(agent, "npm", "node_modules", "fixture");
  const projectPkg = join(cwd, ".pi", "npm", "node_modules", "@scope", "fixture");
  const input = { ...extension, dependencies: { typebox: "^1" } };
  for (const pkg of [globalPkg, projectPkg]) await put(pkg, input);
  // No real package names or registries; pi itself is a local stub executable.
  const settingsPath = join(agent, "settings.json");
  const settings = JSON.stringify({ packages: [], theme: "dark" });
  await writeFile(settingsPath, settings);
  const previousAgent = process.env.PI_CODING_AGENT_DIR;
  const previousPath = process.env.PATH;
  const previousFetch = globalThis.fetch;
  process.env.PI_CODING_AGENT_DIR = agent;
  process.env.PATH = bin + delimiter + previousPath;
  globalThis.fetch = async () => { throw new Error("Unexpected network call in updater regression"); };
  try {
    const handlers = new Map();
    const tools = new Map();
    const commands = new Map();
    const statuses = [];
    const { default: update } = await import("../extensions/pi-autoupdate.ts");
    await update({ on: (name, handler) => handlers.set(name, handler), registerTool: (tool) => tools.set(tool.name, tool), registerCommand: (name, command) => commands.set(name, command) });
    const ctx = { cwd, ui: { setStatus: (_, text) => statuses.push(text), notify() {} } };
    await handlers.get("input")({ source: "user", text: "Update extensions" });
    const result = await tools.get("pi_update").execute("fixture", { scope: "extensions" }, AbortSignal.timeout(15_000), undefined, ctx);
    assert.match(result.content[0].text, /fixture-update update --extensions/);
    assert.match(result.content[0].text, /Extension host peers/);
    assert.doesNotMatch(result.content[0].text, /pi-llama-cpp|llamaServerUrl|post-update patch failed/i);
    assert.equal(await readFile(settingsPath, "utf8"), settings, "updater must not recreate llamaServerUrl or rewrite settings");
    for (const pkg of [globalPkg, projectPkg]) {
      const manifest = JSON.parse(await readFile(join(pkg, "package.json"), "utf8"));
      assert.equal(manifest.dependencies.typebox, undefined);
      assert.equal(manifest.peerDependencies.typebox, "*");
      await put(pkg, input);
    }
    await handlers.get("input")({ source: "user", text: "Update Pi" });
    const self = await tools.get("pi_update").execute("self", { scope: "self" }, AbortSignal.timeout(15_000), undefined, ctx);
    assert.match(self.content[0].text, /fixture-update update --self/);
    assert.doesNotMatch(self.content[0].text, /Post-update package fixes/);
    assert.equal(JSON.parse(await readFile(join(globalPkg, "package.json"), "utf8")).dependencies.typebox, "^1");
    // The manual slash command shares the maintenance/repair path.
    await commands.get("update").handler("extensions", ctx);
    assert.equal(JSON.parse(await readFile(join(projectPkg, "package.json"), "utf8")).peerDependencies.typebox, "*");
    assert.ok(!statuses.some((text) => /failed/i.test(text)));
  } finally {
    if (previousAgent === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previousAgent;
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
    globalThis.fetch = previousFetch;
  }
});
