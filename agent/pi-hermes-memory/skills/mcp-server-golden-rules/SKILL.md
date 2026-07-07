---
name: mcp-server-golden-rules
description: "Build MCP servers against the 2025-06-18 spec using Streamable HTTP instead of deprecated HTTP+SSE. Use for MCP server architecture, transports, tool schemas, CORS/session debugging, and LLM-tool hardening."
---

# MCP Server Golden Rules (Spec 2025-06-18)

## Capability model
- Keep the three MCP concepts separate: Resources are readable data/URIs, Prompts are reusable templates, Tools perform actions.
- Tool inputs need precise JSON Schema with descriptions, enums, nullable fields, and safe defaults.
- One tool = one responsibility. Large kitchen-sink tools confuse the model and make validation weak.

## Transport contract
- Local desktop/IDE integration: `stdio` is fine, but stdout must contain only JSON-RPC. Logs go to stderr.
- Remote/web integration: new code uses **Streamable HTTP**. Legacy HTTP+SSE is deprecated and only a compatibility fallback.

```text
POST /mcp
Mcp-Session-Id: <server-issued id for stateful sessions>
(optional) SSE upgrade for streaming responses
```

## Backend boundaries
- The MCP server is transport/tool orchestration. It should stay CPU/backend-agnostic.
- LLM inference backend choices on Pandaking belong in `amd-dual-gpu-inference`; do not bake R9700/9070 assumptions into generic MCP server code.

## Async and errors
- Use async/await (`asyncio` in Python, Promises in TypeScript) for filesystem/network/tool work.
- Validate arguments before side effects and return structured JSON-RPC errors (`-32xxx`) instead of crashing.
- For LLM/prompt-injection boundaries, also consult `security-and-pentesting-golden-rules`.

## Verification
```bash
npx @modelcontextprotocol/inspector <start-command>
```

- Inspector can list resources/prompts/tools and call each tool.
- Remote server accepts `POST /mcp`, sets/respects `Mcp-Session-Id`, and handles invalid args cleanly.
- stdout/stderr are separated correctly for stdio transports.
- CORS exposes MCP session/protocol headers when browsers or llama.cpp WebUI need them.
