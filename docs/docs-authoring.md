---
title: Docs Authoring
short: Must read before writing docs.
summary: Must read this doc before writing any documentation.
read_when:
  - Placing or structuring docs.
---

Use repo docs for reusable, public-safe material.
Use local docs for private, machine-specific, or personal material that should not live in a repo.

## File and directory rules

- One doc should be one `.md` file.
- Create a directory only when it is a real grouping path, a multi-doc bundle, a skill tree, or an imported upstream docs bundle.
- Use `.docs.md` for directory summaries and metadata.
- Do not create authored singleton `README.md` directories.
- Preserving upstream `README.md` files is fine when mirroring an upstream docs bundle as-is.

## Placement rules

- Put shared docs in repo-owned `docs/` trees such as `~/.ngents/docs`.
- Put local-only docs in `~/.n/local/docs`.
- Keep public third-party references in repo docs when they are useful across machines or repos.
- Keep local notes, secrets workflows, and machine-specific setup in local docs.

## Frontmatter rules

- `read_when` is a short loading trigger, not a list of related tasks.
- Use one precise trigger unless distinct situations demand separate bullets.
- Three or more genuine triggers means the doc probably needs to be split.
