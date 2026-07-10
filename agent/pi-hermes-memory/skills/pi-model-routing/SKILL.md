---
name: pi-model-routing
description: Hybrid model routing policy for Pi Coding Agent - cloud API model for hard reasoning, local pi-llama-cpp models for everything else. ALWAYS consult before spawning subagents, choosing a model for a task, editing ~/.pi settings, or when API cost/token usage is a concern. Covers pi-subagents configuration, concurrency limits, and cost hygiene.
---

# Pi Model Routing: API vs. Local (pi-llama-cpp)

## Policy
Cheap-by-default: scout and reviewer run LOCAL; oracle/planner/worker use the cloud API model with local fallback; concurrency stays low (2) against a single llama.cpp instance. Models rotate often — the routing policy stays the same regardless of which model fills each slot.

- **Local** (pi-llama-cpp): repo scouting, code review passes, summarization, log triage, boilerplate, doc digests — anything high-volume/low-stakes.
- **API**: architecture decisions, planning, tricky implementation (worker), second opinions (oracle) — anything where a wrong answer costs more than the tokens.
- Always configure a local fallback so API outages/quota don't block work.

## Config
- `C:\Users\Sebas\.pi\agent\settings.json` (Ubuntu: `/home/dawasteh/.pi/agent/settings.json`): `subagents.defaultModel` = local model; `agentOverrides` for oracle/planner/worker → API model with `fallbackModels: [<local>]`.
- Precedence: per-run override > agentOverrides > agent frontmatter > subagents.defaultModel > session model.
- Write model IDs fully qualified (`provider/model`). If a provider rejects `:high` thinking suffixes: `"disableThinking": true` in the subagents block, re-enable per agent.
- Concurrency: `agent\extensions\subagent\config.json` → `parallel.concurrency: 2`, `globalConcurrencyLimit: 4`. Raise only with two llama-server instances (R9700 + 9070 XT) or `-np` multi-slot on one server (3 parallel subagents confirmed smooth — don't propose throttling then).
- Custom agents: `agent\agents\*.md`; prompt templates: `agent\prompts\` (frontmatter may set `subagent`, `model`, `thinking`, `cwd`).

## Operational commands
- `/subagents-doctor` — verify subagents + intercom + prompt-template-model wiring.
- `/subagents-models` — LIVE model mapping (reload Pi after editing settings.json, otherwise stale).
- `/subagent-cost` — parent vs child spend; local runs must show $0. Check after config changes.
- Recommended loop: clarify → planner (API) → worker (API) → fresh reviewers (local) → worker (API, fixes only).

## Cost hygiene
- Never let a config change silently route all subagents through the API (default inheritance from the session model does exactly that).
- Compress noisy tool output (build logs, git noise) before it reaches API context — pi-hypa filters or manual truncation.
- Pi bills against the separate Agent SDK credit, not the Anthropic Pro flatrate — cloud tokens are always metered.

## Installed extension baseline (don't re-recommend these)
pi-heimdall, pi-graphify, rpiv-ask-user-question, rpiv-i18n, rpiv-todo, pix-optimizer, pi-hermes-memory, pi-llama-cpp, pi-mcp-adapter, pi-web-access, pi-subagents (+ pi-intercom, prompt-template-model), pi-hypa.
