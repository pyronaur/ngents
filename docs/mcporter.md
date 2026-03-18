---
title: mcporter
short: Ad hoc MCP access without persistent config.
summary: What `mcporter` is, when to reach for it, and how to use any referenced MCP server on demand.
read_when:
  - A skill or command references an MCP server that is not available in the current session.
  - Need to use OpenAI docs MCP or another HTTP/stdio MCP without adding it to always-loaded config.
  - Need the default workflow for inspecting or calling MCP tools through `mcporter`.
---

# mcporter

`mcporter` is the universal MCP access path.

If a skill, process doc, or command points at an MCP server that does not appear to be available, do not treat that as a blocker. Use `mcporter` first.

## What it does

- Connects to configured MCP servers.
- Connects to ad hoc MCP servers directly by URL or stdio command.
- Lets you inspect tools/schema before you call anything.
- Keeps one-off MCP usage out of your always-loaded config.

## Default rule

When an MCP is mentioned but not exposed in the current tool list, try `mcporter` before falling back to web search, manual guessing, or “server unavailable” assumptions.

## Core workflow

1. See what is already configured: `mcporter list`
2. Inspect a configured server: `mcporter list <server> --schema`
3. Inspect an ad hoc HTTP MCP server: `mcporter list https://host/mcp --schema`
4. Call a tool on a configured server: `mcporter call <server.tool> key=value`
5. Call a tool on an ad hoc MCP server: `mcporter call 'https://host/mcp.tool_name(arg: "value")'`

## OpenAI docs example

Use the OpenAI developer docs MCP on demand even if it is not in local config:

```bash
mcporter list https://developers.openai.com/mcp --schema
mcporter call 'https://developers.openai.com/mcp.search_openai_docs(query: "codex experimental features", limit: 5)'
```

If you need the server regularly, persist it explicitly instead of treating discovery as configuration:

```bash
mcporter list https://developers.openai.com/mcp --schema --persist /Users/n14/.mcporter/mcporter.json --yes
```

## Notes

- Prefer ad hoc use when you only need a server for the current task.
- Prefer `--schema` before first use so the tool names and arguments are concrete.
- Prefer `mcporter` over parallel bespoke MCP entrypoints when the goal is simply “reach this MCP now.”
