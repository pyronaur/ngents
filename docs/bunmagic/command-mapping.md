---
summary: "How script paths map to bunmagic command names in this repo"
read_when:
  - Adding or renaming bunmagic scripts in `~/.ngents`.
  - Need to confirm how bunmagic resolves script path -> command name.
---

# bunmagic Command Mapping

In this repo, bunmagic command names come from script paths.

- `scripts/<name>.ts` maps to `ngents <name>`
- Nested script paths map to nested command names

This is namespace-based mapping for this repo workflow.

If command behavior seems wrong, check:

1. The script path and file name.
2. The namespace binding you configured.
3. Existing global command collisions on your PATH.
