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

Reader = an agent loading the doc into context. "You" must refer to one perspective.

## DRY

Multiple definitions create stale forks. For shared concepts:

1. Pick the canonical home.
2. Define it there.
3. Reference elsewhere with a docs link (`!docs skills/docs/SKILL.md`).

If a section grows past one concept, extract it.

## Apply the principles

Docs are written for agents. `!docs concepts/agent-experience.md`

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
