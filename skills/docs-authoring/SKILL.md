---
name: docs-authoring
description: Create and maintain Markdown documentation metadata so `ngents docs` renders a clean index. Use when adding or editing docs under `docs/`, fixing docs status errors like `[missing front matter]`, `[summary key missing]`, `[summary is empty]`, or `[unterminated front matter]`, and when improving `read_when` hints.
---

# Docs Authoring

## Goal

Keep docs discoverable and readable in `ngents docs` output.

## Write Valid Front Matter

Put YAML front matter at the top of each doc:

```yaml
---
summary: "One-line doc purpose"
read_when:
  - Need this doc for a specific task.
  - Another concrete trigger.
---
```

Follow parser rules exactly:

- Start file with `---` at byte 1 (no leading text/blank lines).
- Close front matter with its own `---` line.
- Include non-empty `summary`.
- Use `read_when` as either:
  - YAML list (`- item`)
  - Inline array (`["item 1", "item 2"]`)
- Keep keys lowercase: `summary`, `read_when`.

## Maintain Summary Quality

- Keep `summary` specific and short.
- Describe what the doc is for, not the filename.
- Keep summary aligned with the first heading and actual content.
- Update summary whenever doc scope changes.

## Maintain `read_when` Hints

- Add `read_when` only when it improves routing.
- Write hints as concrete triggers (`Need X`, `Working on Y`).
- Prefer 1-4 hints; prune stale hints.
- Omit `read_when` if no clear trigger exists.

## Validate Before Handoff

Run:

```bash
ngents docs --repo
```

Fix all bracketed metadata errors in output before shipping.

## Error Map

- `[missing front matter]`: Add YAML block at top of file.
- `[unterminated front matter]`: Add closing `---`.
- `[summary key missing]`: Add `summary:` key in front matter.
- `[summary is empty]`: Fill `summary` with non-whitespace text.

## Scope Notes

- `ngents docs` scans Markdown in docs roots.
- Hidden paths and folders named `archive` or `research` are excluded.
- Keep docs intended for indexing outside excluded paths.
