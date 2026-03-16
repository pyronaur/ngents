---
summary: "Canonical ndex documentation: purpose, principles, usage, and behavior."
read_when:
  - Need to understand what ndex is for and why it exists.
  - Need exact ndex CLI behavior and command contracts.
---

# ndex

ndex is a docs-first CLI for fast context acquisition.

Its job is to help people and agents find the right local or global documentation quickly, with a consistent path that does not depend on guessing project structure or immediately reaching for web search.

## Why ndex exists

Every project has a `docs` directory. That local `docs` directory holds project-specific documentation: structure, workflows, architecture, notes, and operating conventions.

There is also a global machine-level `docs` corpus. That global corpus holds reusable guidance, tool documentation, workflows, patterns, and shared knowledge that agents can apply across projects.

ndex exists so local project docs and global reusable docs can be discovered through one consistent interface.

This matters for three reasons:

1. Agents need a deterministic path to context.
2. Shared local documentation is cheaper and more reliable than repeated web search.
3. Knowledge often needs to be reused across multiple projects of the same type.

## Core principles

### Docs-first context

The intended workflow is:

1. Browse local and global docs with `ndex`.
2. Read the most promising files.
3. Fall back to semantic search only when browse-first discovery is not enough.
4. Read source code after the documentation domain is clear.

ndex is the entrypoint for that flow.

### One `docs` convention

Project-local documentation lives in a project `docs` directory.

Reusable machine-level documentation also lives in `docs` directories.

This gives agents one stable convention to follow instead of project-specific guessing.

### Merge local and global knowledge

ndex intentionally merges project-local and global documentation where that is useful.

That lets a project inherit reusable knowledge without copying it into every repository.

### Reuse without web search

Shared documentation for tools, frameworks, and workflows can live locally on the machine and stay easy to discover.

That makes context gathering faster, more token-efficient, and less dependent on external search.

### Topics group reusable knowledge

Topics are named documentation groupings under `docs/topics`.

They exist so reusable knowledge can be grouped by domain instead of being flattened into one large docs tree.

A topic can contain:

- regular markdown documentation
- `.ndex.md` documents
- `SKILL.md` files and related skill assets

### Skills

Within ndex, a topic may expose skill files as **Skills**.

A Dynamic Skill is still a normal `SKILL.md` skill. The distinction is about discovery and loading strategy:

- built-in session skills are already present in the active skill context
- Skills are discovered through ndex topics and loaded only when the task needs them

This keeps unrelated skills out of the initial context while still making them easy to find and use on demand.

Skills are especially useful when the machine has many language- or framework-specific skills, but only a small subset is relevant to the current project.

Not everything inside a topic is a Dynamic Skill. Topics can freely mix skills and ordinary documentation when that grouping makes the domain easier to understand.

## CLI commands

```bash
ndex
ndex --help
ndex help
ndex ls [where]
ndex topic [topic] [section]
ndex query [--limit <n>] <query...>
ndex query status
```

Examples:

```bash
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
ndex query shell environment policy
ndex query --limit 3 swiftui scroll view best practices
ndex query status
```

## Help behavior

- `ndex` prints compact Markdown help with command walkthrough, merged topic index, and merged docs index.
- `ndex --help` prints the same Markdown help style without the docs index.
- `ndex help` prints the same Markdown help style without the docs index.
- `ndex help <command>` prints Commander command usage.
- `ndex <command> --help` prints usage for that command.

## Browse behavior

### `ls`

`ls` browses docs only.

Behavior:

- merges local and global docs by default
- accepts `.`, `global`, `./docs/...`, and `docs/...` selectors
- treats `./docs/...` as a project-only subtree selector
- treats bare `docs/...` as a merged local/global subtree selector
- prints expanded doc descriptions

### `topic`

`topic` browses topics only.

Behavior:

- merges same-name local and global topic contributions
- accepts an optional section selector
- is the main browse surface for grouped reusable knowledge
- may expose regular topic docs and Skills together
- labels skill-bearing sections as Skills in topic output
- can derive Dynamic Skill summaries directly from `SKILL.md` when a section has no `.ndex.md`

### `query`

`query` is the fallback discovery surface when browse-first inspection is not enough.

Behavior:

- prints formatted global QMD search results
- supports `status` as the inspection mode
- searches global docs and topics

The intended use is quick retrieval of promising matches followed by direct file reads with normal shell tools.

## Docs model

### Supported content

ndex works with markdown docs and `.ndex.md` files.

### Metadata fields

- `title` sets the display title
- `short` sets the compact one-line description
- `summary` sets the fuller expanded description
- `read_when` adds expanded browse hints

Compact ndex output prefers `short`, then falls back to `summary`.
