---
name: llama-mcp-server
description: Working on the local filesystem MCP server for llama.cpp WebUI at C:\LAB\llama-mcp-server. Use for any MCP server change, FastMCP/transport question, CORS or connection failure between llama.cpp WebUI and an MCP endpoint, or new MCP tool development on this system.
---

# Local Filesystem MCP Server (FastMCP / HTTP)

## Project layout
- `C:\LAB\llama-mcp-server\server.py` + `run_server.bat` (+ venv)
- `requirements.txt`: `mcp[cli]>=1.27.0` (pulls uvicorn/starlette)
- Endpoint: `http://127.0.0.1:8765/mcp` — the `/mcp` path is REQUIRED; entering the bare root URL in the WebUI is the classic 404 cause.

## Architecture decisions (keep these)
- **FastMCP high-level API**, not the low-level Server class: tool schemas auto-generate from type hints + docstrings; no manual `inputSchema`, no `InitializationOptions` boilerplate (which required `server_name`, `server_version`, `capabilities` in SDK >= 1.0 and was the original crash cause).
- **Transport: streamable-http** — llama.cpp WebUI needs a URL, stdio does not work there.
- **CORS**: wrap `mcp.streamable_http_app()` with Starlette `CORSMiddleware`, exposing `mcp-session-id` and `mcp-protocol-version` headers; run uvicorn directly for middleware control. Health-check route at `/`.

## Windows correctness rules for this codebase
- `BLOCKED_PATHS` comparisons must be case-insensitive (normcase both sides).
- No emoji prints; `run_server.bat` starts with `chcp 65001` + `PYTHONUTF8=1`, checks errorlevels, `pause` on failure.
- Mypy: guard `sys.stderr.reconfigure()` with `isinstance(sys.stderr, io.TextIOWrapper)` instead of type-ignore comments.
- Implement declared tool parameters fully (e.g. `list_directory(recursive=...)`) — no dead parameters or unused variables.

## When extending
New tools: plain typed Python functions with docstrings registered on the FastMCP instance. Path-taking tools must resolve + validate against the allowlist/blocklist BEFORE any filesystem call. Test via the health route and a WebUI connection to `/mcp` after every transport-level change.
