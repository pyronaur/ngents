---
summary: Search the global `~/.ngents/docs` library through a small QMD-backed wrapper.
read_when:
  - Setting up or using `qdocs`.
  - Need fast docs search over the global docs library instead of browsing with `ndex`.
---

# qdocs

`qdocs` searches the global `~/.ngents/docs` tree with QMD and formats the results for fast reading.

It uses a dedicated named QMD index so it does not mix this docs library with unrelated QMD collections elsewhere on the machine.

## Command shape

- `qdocs <query...>` runs a QMD search against the dedicated docs index and prints compact markdown-like results with score, path, docid, context, and the best matching excerpt.
- `qdocs status` shows the wrapper config and the underlying QMD status.

## Machine setup

- Index name: `ngents-docs`
- Collection name: `global-docs`
- Docs root: `~/.ngents/docs`
- Cache root: `~/.ngents/local/qmd-cache`
- Config root: `~/.ngents/local/qmd-config`
- Search backend used by `qdocs`: `qmd search --json`
- Default result count: `5`
- Default min score: `0.35`

The QMD collection and embeddings for this index are already set up on this machine.

If the setup ever needs inspection or repair, start with `qdocs status`, then use the upstream QMD docs in `docs/topics/qmd/` for the actual QMD commands.

Known local note:

- The npm registry tarball for `@tobilu/qmd@2.0.1` shipped an older launcher that could incorrectly choose Bun when `BUN_INSTALL` was set. The machine-local install was rebuilt from the local source repo tarball so `qmd` uses the correct runtime selection logic.

## Examples

```sh
qdocs swiftui scroll view best practices
qdocs shell environment policy
qdocs zod codecs
qdocs status
```
