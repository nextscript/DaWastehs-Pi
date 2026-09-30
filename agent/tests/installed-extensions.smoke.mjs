// Explicit integration check (not part of the portable unit suite):
// npm run test:installed -- [absolute/path/to/pi-coding-agent/dist/index.js]
// Uses the real configured extensions, no LLM calls or child-agent launches.
// session_start/shutdown may maintain normal package-local runtime state.
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.PI_OFFLINE = "1";
process.env.AUTOTUNER_CONTROL_API_ENABLED = "0";
const agentDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cwd = resolve(agentDir, "..");
const sdkPath = process.argv[2] ?? fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"));
const { DefaultResourceLoader, createAgentSession, SessionManager, SettingsManager, VERSION, initTheme } = await import(pathToFileURL(resolve(sdkPath)).href);
const settings = JSON.parse(await readFile(resolve(agentDir, "settings.json"), "utf8"));
// Match CLI initialization in print mode; the bare SDK does not initialize UI themes.
initTheme(settings.theme, false);
const settingsManager = SettingsManager.inMemory({ ...settings, cacheWarming: { mode: "off" } });
const loader = new DefaultResourceLoader({ cwd, agentDir, settingsManager });
const errors = [];
let session;
const watchdog = setTimeout(() => { console.error("Installed-extension smoke timed out"); process.exit(1); }, 60_000);
try {
 await loader.reload();
 const loaded = loader.getExtensions();
 assert.deepEqual(loaded.errors, [], "extension load failures");
 assert.deepEqual(loaded.warnings ?? [], [], "extension package warnings");
 const paths = loaded.extensions.map((ext) => resolve(ext.path));
 for (const name of ["alarm-sound.ts", "autotuner.ts", "pi-autoupdate.ts", "post-edit-validation.ts", "skill-governor/index.ts", "stargate-header.ts", "token-speed.ts"]) {
  assert.ok(paths.includes(resolve(agentDir, "extensions", name)), `local extension missing: ${name}`);
 }
 for (const pkg of settings.packages) {
  const spec = typeof pkg === "string" ? pkg : pkg.source;
  assert.ok(spec.startsWith("npm:"), `add explicit smoke coverage for non-npm package ${spec}`);
  const name = spec.slice(4).replace(/@[^/@]+$/, "");
  const root = resolve(agentDir, "npm/node_modules", name);
  const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  for (const entry of manifest.pi?.extensions ?? []) {
   const entryPath = resolve(root, entry);
   const directory = (await stat(entryPath)).isDirectory();
   assert.ok(paths.some((path) => directory ? path.startsWith(entryPath + sep) : path === entryPath), `package extension missing: ${name}/${entry}`);
  }
 }
 ({ session } = await createAgentSession({ cwd, agentDir, resourceLoader: loader, settingsManager, sessionManager: SessionManager.inMemory(cwd) }));
 await session.bindExtensions({ mode: "print", onError: (error) => errors.push(error) });
 assert.deepEqual(errors, [], "session_start/resources_discover errors");
 const tools = session.getAllTools();
 for (const name of ["read", "bash", "pi_update", "capability_route", "subagent", "intercom", "todo", "ask_user_question", "mcp", "web_search", "memory_search", "graphify_build", "create_goal"]) {
  assert.ok(tools.some((tool) => tool.name === name), `tool missing: ${name}`);
 }
 const runner = session.extensionRunner;
 for (const name of ["subagent", "todo", "get_goal", "intercom"]) {
  const params = name === "get_goal" ? {} : { action: name === "intercom" ? "status" : "list" };
  const result = await runner.getToolDefinition(name).execute(`smoke-${name}`, params, AbortSignal.timeout(15_000), undefined, runner.createContext());
  assert.ok(result.content?.length, `${name} did not return content`);
  assert.notEqual(result.isError, true, `${name} returned an error`);
  assert.notEqual(result.details?.isError, true, `${name} returned an error detail`);
 }
 // Exercise upstream's actual compiled child tool plan, without delegating work.
 const { resolvePiLaunchToolPlan } = await import(pathToFileURL(resolve(agentDir, "npm/node_modules/pi-subagents/src/runs/shared/child-tool-plan.js")).href);
 const declared = ["read", "bash", "web_search", "fetch_content", "source_check", "get_search_content"];
 const input = { cwd, tools: declared, agentName: "smoke" };
 const plan = resolvePiLaunchToolPlan(input);
 assert.deepEqual(plan.effectiveToolAllowlist, declared);
 assert.deepEqual(plan.requiredChildTools, declared);
 const restricted = resolvePiLaunchToolPlan({ ...input, excludeTools: ["bash"], capabilityCeiling: { version: 1, sources: ["smoke"], allowedTools: ["read", "bash", "web_search"] } });
 assert.deepEqual(restricted.effectiveToolAllowlist, ["read", "web_search"]);
 assert.deepEqual(restricted.requiredChildTools, ["read", "web_search"]);
 // Verify rebind/reload too; cached parents are a common source of false passes.
 await session.reload();
 assert.deepEqual(loader.getExtensions().errors, [], "reload load failures");
 assert.deepEqual(loader.getExtensions().warnings ?? [], [], "reload package warnings");
 assert.deepEqual(errors, [], "extension lifecycle errors");
 console.log(JSON.stringify({ pi: VERSION, extensions: paths.map((path) => relative(agentDir, path)), tools: tools.length, lifecycle: "startup/reload/shutdown", checks: ["package entries", "tool registry", "subagent/todo/goal/intercom read-only tools", "child tools/ceilings/exclusions"], errors }, null, 2));
} finally {
 if (session) {
  await session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
  session.dispose();
 }
 clearTimeout(watchdog);
}
assert.deepEqual(errors, [], "shutdown errors");
