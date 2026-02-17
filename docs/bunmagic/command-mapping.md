---
summary: "How script paths map to bunmagic command names in this repo"
read_when:
  - Adding or renaming bunmagic scripts in `~/.ngents`.
  - Confused about `ngents docs` versus global `docs`.
---

# bunmagic Command Mapping

In this repo, command names come from script paths.

- `scripts/docs.ts` maps to `ngents docs`
- It does not create or replace global `docs`

This is namespace-based mapping for this repo workflow.

If command behavior seems wrong, check:

1. The script path and file name.
2. The namespace binding you configured.
3. Existing global command collisions on your PATH.
