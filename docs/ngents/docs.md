---
title: Documentation Commands
read_when:
  - Need one place that explains which `ngents` script commands exist and how to run them.
  - Need a command-focused handoff doc to point another agent at before using local helpers.
  - Need the shortest path from command discovery to the deeper command-specific docs.
---


# ndex
`ndex` is the docs browser for repo-local and global documentation, with a global vector-search subcommand.

## Command shape

- `ndex` browses repo-local docs.
- `ndex --global` browses `~/.ngents/docs`.
- `ndex <topic>` opens a topic.
- `ndex <topic> <section>` focuses a nested section inside that topic.
- `ndex <topic> --expand` expands the topic into a file-level table of contents.
- `ndex <topic> <section> --expand` expands a focused section into nested references and file paths.
- `ndex query <query...>` runs a QMD query against the global `~/.ngents/docs` library.
- `ndex query --limit <n> <query...>` limits the number of search results.
- `ndex query status` shows the query wrapper config and the underlying QMD status.

## How `ndex` reads `docs/`

- Markdown files directly under a `docs/` root are free-floating docs.
- Topics live under `docs/topics/<topic>/`.
- Direct child directories inside a topic are sections.
- Directories outside `docs/topics/` are not topics.
- Topic and section membership comes from filesystem placement, not metadata files.
- Hidden directories and files are ignored.
- `archive`, `research`, and `node_modules` are ignored.

## `.ndex.md`

`.ndex.md` is an optional directory guide and metadata file.

- `.ndex.md` is hidden and excluded from normal scans and lists.
- `.ndex.md` is intentionally sparse. Do not add it just to improve index cosmetics.
- Prefer one `.ndex.md` at a meaningful topic boundary over many small child `.ndex.md` files.
- `.ndex.md` does not decide whether something is a topic or a section.
- `.ndex.md` does not decide whether a file belongs to a topic.
- Frontmatter `title` takes precedence over markdown heading parsing.
- Frontmatter `summary` takes precedence over summary parsing.
- Frontmatter `read_when` is available when a directory guide needs it.
- The first `#` heading is the fallback title when frontmatter `title` is absent.
- The first non-list paragraph is the fallback summary when frontmatter `summary` is absent.
- The rest of the body is rendered when the topic or section is opened.

Use `.ndex.md` to explain:

- what the topic or section contains
- how to use it
- what to prioritize first

Add a child `.ndex.md` only when that child directory genuinely needs its own guide text.

For external or imported directories:

- do not modify the external directory
- do not add `.ndex.md` inside the external directory
- let `ndex` discover the section from directory placement and fall back to the directory name when no guide exists

Example:

```md
---
title: iOS Library
summary: This topic collects iOS-focused references and Apple HIG skills.
read_when:
  - Working on Apple-platform UI, UX, or HIG questions.
---

# iOS Library

Start with `hig-doctor` when you need structured Apple HIG guidance.
```

## Skills and references

- `SKILL.md` files are discovered recursively inside a section.
- Local links inside `SKILL.md` become the skill reference index.
- Compact focused views show skill titles, descriptions, and reference names.
- Expanded views show nested reference file paths.

## Authoring checklist

1. Create or choose the target `docs/` root.
2. Put free-floating docs directly under that `docs/` root when they are not part of a topic.
3. Put topic docs under `docs/topics/<topic>/`.
4. Add `.ndex.md` only when a topic or owned local section needs a real guide body.
5. Add `SKILL.md` files inside a section when that section exposes skills.
6. Link local reference files from each `SKILL.md` when they should show up in `ndex`.
7. Let local files and child directories join a topic by placement instead of adding wiring.
8. Keep external child sections unmodified and let `ndex` discover them by placement.


## ndex query

`ndex query` searches the global `~/.ngents/docs` tree with QMD and formats the results for fast reading and quick terminal follow-up.

It uses a dedicated named QMD index so it does not mix this docs library with unrelated QMD collections elsewhere on the machine.

## Command shape

- `ndex query <query...>` runs a QMD query against the dedicated docs index and prints compact formatted results.
- `ndex query --limit <n> <query...>` limits the number of results.
- `ndex query status` shows the wrapper config and the underlying QMD status.

Result output includes:

- the QMD title
- a short file-specific summary line when available, preferring file frontmatter `overview`, then `read_when`, then QMD context
- the absolute file path, with a line range when QMD exposes one in the snippet
- a lightly cleaned snippet rendered as a quoted excerpt for follow-up reading
- a short `Tip:` line at the top of every search output with anchored-query guidance

## Machine setup

- Index name: `ngents-docs`
- Collection name: `global-docs`
- Docs root: `~/.ngents/docs`
- Cache root: `~/.ngents/local/qmd-cache`
- Config root: `~/.ngents/local/qmd-config`
- Search backend used by `ndex query`: `qmd query --json`
- Default result count: `5`
- Default min score: `0.35`

The QMD collection and embeddings for this index are already set up on this machine.

If the setup ever needs inspection or repair, start with `ndex query status`, then use the upstream QMD docs in `docs/topics/qmd/` for the actual QMD commands.

Known local note:

- The npm registry tarball for `@tobilu/qmd@2.0.1` shipped an older launcher that could incorrectly choose Bun when `BUN_INSTALL` was set. The machine-local install was rebuilt from the local source repo tarball so `qmd` uses the correct runtime selection logic.

## Examples

```sh
ndex query swiftui scroll view best practices
ndex query --limit 3 swiftui scroll view best practices
ndex query shell environment policy
ndex query status
```
