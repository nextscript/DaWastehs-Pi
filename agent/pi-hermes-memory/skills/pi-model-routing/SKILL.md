---
name: pi-model-routing
description: Hybrid model routing policy for Pi Coding Agent - GLM 5.2 via API for hard reasoning, local pi-llama-cpp models for cheap tasks. ALWAYS consult before spawning subagents, choosing a model for a task, editing ~/.pi settings, or when API cost/token usage is a concern. Covers pi-subagents configuration, concurrency limits, and cost hygiene.
---

# Pi Model Routing: GLM 5.2 (API) vs. Local (pi-llama-cpp)

## Policy (the one-sentence version)
Scout and reviewer run LOCAL, oracle/planner/worker run on GLM 5.2 with local fallback, concurrency stays low (2) against a single llama.cpp instance. Cheap-by-default; escalate only when reasoning quality demands it.

## Task → model mapping
Route to **local** (pi-llama-cpp): repo scouting/context building, code review passes, summarization, log triage, boilerplate, doc lookup digests, anything high-volume/low-stakes.
Route to **GLM 5.2 (API)**: architecture decisions, planning, tricky implementation (worker), second opinions (oracle), anything where a wrong answer costs more than the tokens.
Always configure a local fallback so API outages/quota don't block work.

## Where the config lives
- `C:\Users\dawasteh\.pi\agent\settings.json` → `subagents.defaultModel` = local model; `agentOverrides` for oracle/planner/worker → GLM 5.2 with `fallbackModels: [<local>]`.
- Precedence: per-run override > agentOverrides > agent frontmatter > subagents.defaultModel > session model.
- Write model IDs fully qualified (`provider/model`) so nothing silently resolves to the wrong backend.
- If a provider rejects `:high` thinking suffixes, set `"disableThinking": true` in the subagents block and re-enable per agent as needed.
- Concurrency: `C:\Users\dawasteh\.pi\agent\extensions\subagent\config.json` → `parallel.concurrency: 2`, `globalConcurrencyLimit: 4`. Only raise when two llama-server instances (R9700 + 9070 XT) are running.
- Custom agents: markdown files in `C:\Users\dawasteh\.pi\agent\agents\`; reusable prompt templates in `...\prompts\` (frontmatter may set `subagent`, `model`, `thinking`, `cwd`).

## Operational commands
- `/subagents-doctor` — verify subagents + intercom + prompt-template-model wiring.
- `/subagents-models` — show the LIVE model mapping (reload Pi after editing settings.json, otherwise stale).
- `/subagent-cost` — parent vs child token spend; local runs must show $0. Check after config changes.
- Recommended loop: clarify → planner (GLM) → worker (GLM) → fresh reviewers (local) → worker (GLM, fixes only).

## Cost hygiene
- Never let a config change silently route all subagents through the API (default inheritance from the session model does exactly that).
- Compress noisy tool output before it reaches GLM context (build logs, git noise) — pi-hypa filters or manual truncation.
- Anthropic-subscription note: third-party harnesses like Pi bill against the separate Agent SDK credit / extra usage, not the Pro flatrate (policy since April 2026). Treat cloud tokens as metered, always.

## Installed extension baseline (don't re-recommend these)
pi-heimdall, pi-graphify, rpiv-ask-user-question, rpiv-i18n, rpiv-todo, pix-optimizer, pi-hermes-memory, pi-llama-cpp, pi-mcp-adapter, pi-web-access, pi-subagents (+ pi-intercom, prompt-template-model), pi-hypa (evaluated/adopted).
