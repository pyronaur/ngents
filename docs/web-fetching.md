---
summary: "web retrieval guide: which tool to use (`k browser`, `exa`, Firecrawl fallback) and core commands"
read_when:
  - Need to fetch web content for research.
  - Need to pick the right web tool for the job.
  - Normal fetch/search is blocked by JavaScript-heavy pages.
---

# Web Fetching

Goal: pick the right web tool fast, then fetch reliably.

## Tool Selection

- `k browser`: primary for known URLs and JS-based pages.
- `mcporter exa`: search/discovery when you need sources first.
- Firecrawl via `mcporter`: last fallback when `k browser` fails (if Firecrawl server is configured).

## Decision Flow

1. Need to discover sources/topics: use `exa`.
2. Need content from a specific URL (or JS-heavy page): use `k browser`.
3. If `k browser` fails: quote exact error in-thread, then use Firecrawl fallback.

## Golden Paths

```bash
# Primary fetch (browser-backed)
k browser <url>
k browser <url> --markdown
k browser --help

# Search/discovery
mcporter call exa.web_search_exa query="your query" numResults=5

# Inspect MCP availability/tools
mcporter list
mcporter list <server> --schema
```

## Firecrawl Fallback

Use only after `k browser` failure.

```bash
mcporter list
mcporter list firecrawl --schema
mcporter call <firecrawl.tool> key=value
```

## Scope Guardrails

- Keep this repo public-safe.
- Do not document internal host names or endpoint internals.
- For advanced options, run `k browser --help` and inspect MCP schemas with `mcporter list <server> --schema`.
