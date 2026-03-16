---
title: NDEX CLI - Agent Docs
read_when:
  - Need a command-focused handoff doc to point another agent at before using local helpers.
  - Need the shortest path from command discovery to the deeper command-specific docs.
---

# ndex
`ndex` is the docs CLI for repo-local and global documentation.

Install and link it from [scripts/ndex](/Users/n14/.ngents/scripts/ndex):

```sh
cd ~/.../.ngents/scripts/ndex
npm install
npm link
```

## Command shape

- `ndex` prints compact Markdown help with the command walkthrough, topic index, and merged docs index.
- `ndex --help` prints the same Markdown help style without the docs index.
- `ndex help` prints the same Markdown help style without the docs index.
- `ndex ls` browses merged local and global docs with expanded descriptions.
- `ndex ls .` browses project docs only.
- `ndex ls ./docs/subdir` browses one project docs subtree.
- `ndex ls global` browses `~/.ngents/docs` only.
- `ndex ls docs/subdir` browses matching local and global docs subtrees.
- `ndex topic` browses the merged topic index.
- `ndex topic <topic>` opens the merged topic view.
- `ndex topic <topic> <section>` focuses a merged section view.
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
- Prefer one `.ndex.md` at a meaningful topic boundary over many small child `.ndex.md` files.
- `.ndex.md` does not decide whether something is a topic or a section.
- `.ndex.md` does not decide whether a file belongs to a topic.
- Frontmatter `title` takes precedence over markdown heading parsing.
- Frontmatter `short` is the compact one-line description for indexes and compact help output.
- Frontmatter `summary` is the fuller description for expanded browsing.
- Frontmatter `read_when` is available when a directory guide needs it.
- The first `#` heading is the fallback title when frontmatter `title` is absent.
- The first non-list paragraph is the fallback summary when frontmatter `summary` is absent.
- The rest of the body is rendered when the topic or section is opened.

Use `short` for punchy one-line descriptions such as `web browser tools`.

Example:

```md
---
title: iOS Library
short: Apple-platform docs
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
- Focused section views show skill titles, descriptions, and reference names.

## ndex query

`ndex query` searches the global `~/.ngents/docs` tree with QMD and formats the results for fast reading and quick terminal follow-up.

It uses a dedicated named QMD index so it does not mix this docs library with unrelated QMD collections elsewhere on the machine.

## Query shape

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
ndex
ndex --help
ndex ls
ndex ls .
ndex ls ./docs/architecture
ndex ls global
ndex ls docs/architecture
ndex topic
ndex topic qmd
ndex topic qmd references
ndex query swiftui scroll view best practices
ndex query --limit 3 swiftui scroll view best practices
ndex query shell environment policy
ndex query status
```
