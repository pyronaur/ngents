---
title: Docs Writing Process
summary: How to write a doc — process, principles, iteration.
short: Process for writing docs.
read_when:
  - Writing or refining a doc.
---

# Docs Writing Process

Adjacent concerns:

- Placement, repo vs local, file/dir layout: `!docs docs-authoring.md`
- The `docs` CLI: `!docs ngents-docs.md`

## Audience

Reader = an agent loading the doc into context.

## DRY

Multiple definitions create stale forks.

### Reference

- Across docs: pick the canonical home, define it there, link from elsewhere with a docs link (`!docs skills/docs/SKILL.md`).
- Within a doc: define a concept once. Subsequent mentions reference, not redefine.

### Token usage

Reader is an agent (`!docs concepts/agent-experience.md`); apply its principles.

Be terse. Cut filler and weak qualifiers; prefer concrete verbs.

E.g. "You should make use of the `rg` tool in order to perform searches across files" → "Use `rg` to search files."

## Iterative authoring

Build conceptual docs conversationally:

1. Start from a stub with frontmatter only.
2. One concept at a time. Agree, then write.
3. Add forward. Ask before removing or rephrasing.

## Frontmatter

- `title` — display title
- `short` — one-line for compact indexes
- `summary` — fuller description for browsing
- `read_when` — triggers for loading this doc
