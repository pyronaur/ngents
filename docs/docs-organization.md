---
title: Docs Organization
short: Shared rules for where docs live and when to use files versus directories.
summary: Public-versus-local placement rules plus the authoring convention for single files, grouping directories, and `.docs.md`.
read_when:
  - Deciding whether a doc belongs in repo docs or local docs.
  - Creating a new docs path and choosing between a single `.md` file or a directory.
  - Organizing a topic path that needs a summary without a singleton `README.md`.
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
