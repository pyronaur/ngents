---
summary: "web retrieval guide: which tool to use (`kpw`, `exa`, Firecrawl fallback) and core commands"
read_when:
  - Need to fetch web content for research.
  - Need to pick the right web tool for the job.
  - Normal fetch/search is blocked by JavaScript-heavy pages.
---

# Web Fetching

Goal: pick the right web tool fast, then fetch reliably.

## Tool Selection

- `kpw`: primary for known URLs and JS-based pages.
- `mcporter exa`: search/discovery when you need sources first.
- Firecrawl via `mcporter`: last fallback when `kpw` fails (if Firecrawl server is configured).

## Decision Flow

1. Need to discover sources/topics: use `exa`.
2. Need content from a specific URL (or JS-heavy page): use `kpw`.
3. If `kpw` fails: quote exact error in-thread, then use Firecrawl fallback.

## Golden Paths

```bash
# Fast one-off fetch (ephemeral session, auto cleanup)
kpw read <url> --markdown

# Sticky session flow (tab reuse across steps)
kpw session status
kpw session start
kpw session open <url>
kpw -- tab-list
kpw session end

# Help
kpw --help

# Search/discovery
mcporter call exa.web_search_exa query="your query" numResults=5

# Inspect MCP availability/tools
mcporter list
mcporter list <server> --schema
```

## Firecrawl Fallback

Use only after `kpw` failure.

```bash
mcporter list
mcporter list firecrawl --schema
mcporter call <firecrawl.tool> key=value
```

## Scope Guardrails

- Keep this repo public-safe.
- Do not document internal host names or endpoint internals.
- `kpw session status` is read-only and does not create a session.
- `kpw session open` requires an active sticky session.
- `kpw read` uses temporary sessions and cleans them up automatically.
- For advanced options, run `kpw --help` and inspect MCP schemas with `mcporter list <server> --schema`.
