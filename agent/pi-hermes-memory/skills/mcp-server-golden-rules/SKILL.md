---
name: "mcp-server-golden-rules"
description: "Best Practices für die Architektur und Entwicklung von MCP-Servern nach Spec-Stand 2025-06-18 (Streamable HTTP statt SSE)."
version: 2
created: "2026-05-29"
updated: "2026-06-29"
---
## When to Use
Wenn MCP-Server (Model Context Protocol) nach aktuellem Spec-Stand (2025-06-18) entworfen, gebaut oder für lokale/Remote-LLMs debuggt werden.

## Procedure
1. Strukturierung der Fähigkeiten: Trenne strikt zwischen Resources (lesbare Daten/URIs), Prompts (Templates/Anleitungen) und Tools (ausführbare Aktionen).
2. Tool-Definition: Definiere Tool-Inputs präzise über JSON-Schema, um dem LLM exakte Typen und Beschreibungen zu liefern.
3. Transport-Wahl: **stdio** für lokale Integrationen (IDE/Desktop-Apps); **Streamable HTTP** für Remote-Deployments. Das alte HTTP+SSE-Transport ist seit Spec 2025-03-26 *deprecated* — nur noch als optionale Rückwärts-Kompatibilität, neuer Code ausschließlich als Streamable HTTP (einziges `POST /mcp`-Endpoint, optionales SSE-Upgrade für Streaming-Responses, `Mcp-Session-Id`-Header für stateful Sessions).
4. Lokale LLMs auf diesem System: LLM-Inferenz läuft GPU-beschleunigt auf der AMD Radeon AI PRO R9700 (32 GB) oder RX 9070 XT (16 GB) via HIP/ROCm bzw. Vulkan (z. B. llama.cpp). Der MCP-Server bleibt selbst CPU/Transport-Ebene und backend-agnostisch.
5. Asynchrone Implementierung: konsequent async/await (TypeScript) bzw. asyncio (Python) für Responsivität.
6. Sauberes Error-Handling: Try-Catch in Tool-Handlern und strukturierte JSON-RPC-Fehler (`-32xxx`-Codes) zurückgeben statt den Server abstürzen zu lassen.

## Pitfalls
- Schreiben von Debug-Logs/Prints in stdout: bei stdio-Transport zerstört jede nicht-JSON-RPC-Zeile in stdout den Stream → zwingend stderr für Logs.
- **SSE als "modern" ansehen**: HTTP+SSE ist deprecated. Neuer Code = Streamable HTTP; Legacy-SSE nur noch explizit als Fallback.
- Blockierende I/O-Operationen: synchrones Warten blockiert den JSON-RPC-Loop und führt zu Timeouts.
- Fehlende Input-Validierung: blindes Vertrauen der Tool-Argumente → Abstürze/Lücken; strikt nach JSON-Schema validieren.
- Überladene Tools: zu viele Verantwortlichkeiten pro Tool verwirren das LLM → Single Responsibility.

## Verification
1. Lokaler Test mit MCP-Inspector: `npx @modelcontextprotocol/inspector <start-command>` und alle Tools/Resources durchspielen.
2. Transport-Check: Remote-Server antwortet auf `POST /mcp` (Streamable HTTP), `Mcp-Session-Id` wird gesetzt und respektiert.
3. Log-Check: sämtliche Debug-Ausgaben in stderr, stdout enthält ausschließlich gültiges JSON-RPC.
4. Schema-Validierung: Tool-Calls mit ungültigen Argumenten testen, damit die Validierung greift.