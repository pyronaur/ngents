---
title: docs
short: Docs-first CLI for discovering local and global documentation.
summary: Purpose, principles, commands, and docs model for the docs CLI.
read_when:
  - Need to understand what the docs CLI is for and why it exists.
  - Need the exact docs CLI behavior and docs layout rules.
---

The `docs` CLI is a docs-first tool for fast context acquisition.

Its job is to help people and agents find the right local or global documentation quickly, without guessing project structure or defaulting to web search first.

## Why this command exists

Every project has a local `docs/` directory with project-specific context such as workflows, architecture, notes, and operating conventions.

There is also a global machine-level `docs/` corpus with reusable guidance, tool docs, patterns, and shared workflows that apply across projects.

The `docs` command exists so both sources can be discovered through one consistent interface.

This matters because:

1. Agents need a deterministic path to context.
2. Shared local documentation is cheaper and more reliable than repeated web search.
3. Knowledge often needs to be reused across multiple projects of the same type.

## Core principles

### Docs-first context

The intended workflow is:

1. Browse local and global docs with `docs`.
2. Read the most promising files.
3. Fall back to semantic search only when browse-first discovery is not enough.
4. Read source code after the documentation domain is clear.

The `docs` command is the entrypoint for that flow.

### One `docs` convention

Project-local documentation lives in a project `docs/` directory.
Reusable machine-level documentation also lives in `docs/` directories.
That gives agents one stable convention instead of project-specific guessing.

### Merge local and global knowledge

The `docs` command intentionally merges project-local and global documentation where that is useful.
That lets a project inherit reusable knowledge without copying it into every repository.

### Browse before query

`ls` and `topic` are the primary discovery surfaces.
`query` exists for cases where quick browse-first inspection does not surface the right document quickly enough.

### Topics and skills

Topics group reusable knowledge under `docs/topics`.
A topic can contain regular markdown docs, `.docs.md` guides, `SKILL.md` files, and related skill assets.
This keeps reusable knowledge organized by domain instead of flattening everything into one large docs tree.

## CLI commands

```bash
docs
docs --help
docs help
docs ls [where]
docs topic [topic] [section]
docs query [--limit <n>] <query...> | status
docs update
```

## Help behavior

- `docs` prints compact Markdown help with the command walkthrough, merged topic index, and merged docs index.
- `docs --help` prints the same Markdown help style without the docs index.
- `docs help` prints the same Markdown help style without the docs index.
- `docs help <command>` prints Commander command usage.
- `docs <command> --help` prints usage for that command.

## Browse behavior

### `ls`

`ls` browses docs only.

- It merges local and global docs by default.
- It accepts `.`, `global`, `./docs/...`, and `docs/...` selectors.
- `.` means project docs only.
- `global` means `~/.ngents/docs` only.
- `./docs/...` means one project-local docs subtree.
- `docs/...` means matching local and global docs subtrees.
- It prints expanded doc descriptions.

### `topic`

`topic` browses topics only.

- It merges same-name local and global topic contributions.
- It accepts an optional section selector.
- It is the main browse surface for grouped reusable knowledge.
- It may expose regular topic docs and skill-backed sections together.
- It labels skill-bearing sections as `Skills` in topic output.
- It can derive skill summaries directly from `SKILL.md` when a section has no `.docs.md`.

### `query`

`query` is the fallback discovery surface when browse-first inspection is not enough.

- It searches the global `~/.ngents/docs` library, including topics.
- It does not search the current project's docs directory.
- It supports `--limit <n>` to cap results.
- `docs query status` shows the wrapper config and underlying QMD status.
- It prints formatted results for fast terminal follow-up.

Result output includes:

- the QMD title
- a short file summary when available
- the absolute file path, with a line range when QMD exposes one
- a lightly cleaned snippet for quick follow-up reading

### `update`

`update` refreshes the same global QMD index that `docs query` reads.

It runs `qmd update` first, then `qmd embed`.

Use it when the global docs library changed and `query` needs a refreshed index.

## Docs model

### How docs reads `docs/`

- Markdown files directly under a `docs/` root are free-floating docs.
- Topics live under `docs/topics/<topic>/`.
- Direct child directories inside a topic are sections.
- Directories outside `docs/topics/` are not topics.
- Topic and section membership comes from filesystem placement, not metadata files.
- Hidden directories and files are ignored.
- `archive`, `research`, and `node_modules` are ignored.

### `.docs.md`

`.docs.md` is an optional hidden directory guide and metadata file.

- `.docs.md` is excluded from normal scans and lists.
- Prefer one `.docs.md` at a meaningful topic boundary over many small child `.docs.md` files.
- `.docs.md` does not decide whether something is a topic or section.
- `.docs.md` does not decide whether a file belongs to a topic.
- Display titles resolve from frontmatter `title`, then frontmatter `name`, then the raw basename.
- `short` is the compact one-line description for indexes and compact help output.
- `summary` is the fuller expanded description for browsing.
- `read_when` adds browse hints.
- The first non-list paragraph is the fallback summary when `summary` is absent.
- The rest of the body is rendered when the topic or section is opened.

### Skills

- `SKILL.md` files are discovered recursively inside a section.
- `docs topic <topic>` renders topic-root markdown docs under `Docs`.
- `docs topic <topic>` renders skill-backed sections under `Skills`.
- If a focused section contains any recursive `SKILL.md`, the CLI treats it as a skill-backed section.
- A focused section that is exactly one root `SKILL.md` renders that skill directly.
- Skill-backed focused sections render the discovered skills plus the local files linked from those skills.
- Focused sections without any `SKILL.md` continue rendering markdown docs as usual.

## Examples

```bash
docs
docs ls
docs ls .
docs topic qmd
docs topic qmd references
docs query shell environment policy
docs query --limit 3 swiftui scroll view best practices
docs query status
docs update
```
