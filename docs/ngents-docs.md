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
docs --ops-help
docs help
docs <where>
docs ls [where...]
docs topic [topic] [path]
docs query [--limit <n>] <query...> | status
docs park <name> [path]
docs fetch <source> <path> --handler <command> [--root <subpath>] [--transform <command>] [--force]
docs update
```

## QMD collection metadata cache

Global docs collection metadata is cached for 1 hour.

- The cache stores the parked QMD collection metadata used to discover global docs roots.
- Fresh cache entries are reused immediately.
- Expired cache entries are reused immediately and refreshed in the background.
- `docs update` clears this metadata cache.
- `docs query` still runs a fresh QMD search; the cache only covers collection metadata lookup.

## Help behavior

- `docs` prints compact browse-first Markdown help with the command walkthrough, merged topic index, and merged docs index.
- `docs --help` prints the same browse-first Markdown help without the docs index.
- `docs help` prints the same browse-first Markdown help without the docs index.
- Regular root help ends with `To read docs operation manual use \`docs --ops-help\`.`
- In the root help `Browse` section, `docs <where>` is documented as the single-token fallback surface and `docs ls [where]` as the docs-only browse surface.
- `docs --ops-help` prints the operations manual for `park`, `fetch`, and `update`.
- In the compact docs index, each docs root is grouped under its own level-3 path heading.
- `docs help <command>` prints Commander command usage.
- `docs <command> --help` prints usage for that command.
- `docs <where>` opens a topic, a registered docs root, or a browse selector when `<where>` is a single non-command token.
- Unknown multi-token root input such as `docs maestro ios ui` stays a usage failure and does not auto-run `query`.
- That recovery path explains that `docs <where>` accepts one selector, prints the exact `docs query <terms...>` command to rerun, and then prints the same browse-first root help shape as `docs --help`.
- Successful docs browse views render with `Docs` titles.
- Successful topic views render with `Topic:` titles.

## Browse behavior

### `ls`

`ls` browses docs only.

- It merges local and global docs by default.
- It accepts `.`, `global`, `./docs/...`, `docs/...`, `<parked-collection>/<docs-root[/subpath]>`, explicit docs paths, workspace paths that contain `docs/`, and parked global root names.
- It also accepts an exact top-level registered docs name such as `architecture`.
- When `ls` receives multiple selector args, it joins them with `/` before resolution.
- `.` means project docs only.
- `global` means parked global docs roots.
- `./docs/...` means one project-local docs subtree.
- `docs/...` means matching local and global docs subtrees.
- `<parked-collection>/<docs-root[/subpath]>` means one parked collection docs subtree.
- Absolute paths and `~/...` paths can point at a docs directory, a docs subtree, or a workspace directory that contains `docs/`.
- Parked names match case-insensitively.
- It prints expanded doc descriptions.
- When a selector is not found, it prints a compact topic list and a registered-docs root list with absolute paths.
- When a selector matches a topic name, it suggests the corresponding `docs topic <name>` command instead of pretending the topic is a docs directory.

### Bare root selector fallback

`docs <where>` resolves a single non-command token in a more helpful order.

- It accepts parked names, exact topic names, exact registered docs names, `docs/...` selectors, `<parked-collection>/<docs-root[/subpath]>` selectors, explicit docs paths, and workspace paths that contain `docs/`.
- Root command names still win, so `docs topic` and `docs query` keep their command behavior.
- Parked collection names win before topics.
- Bare parked collection selectors show that collection's topics and docs together.
- When an exact topic name and an exact registered docs name overlap, it renders the topic first and the matching docs subtree after it.
- Registered docs names reuse the same merged subtree behavior as `docs ls docs/<name>`.
- Qualified parked-collection selectors are docs-only and do not render topic views.
- When the token is neither a command, topic, nor registered docs selector, it prints the command list plus the same browse inventory used by `docs ls`.

### `topic`

`topic` browses topics only.

- It merges same-name local and global topic contributions.
- It accepts an optional topic-relative path selector.
- When the selector matches a parked collection name and not a topic name, it lists only the topics from that parked collection.
- It is the main browse surface for grouped reusable knowledge.
- It treats a topic as a recursive docs tree rooted at `docs/topics/<topic>/`.
- Topic overviews render merged guide text before the topic heading.
- Topic overviews render grouped `Docs` and `Skills` blocks.
- Topic overviews merge same-topic contributions into one `Docs` block and one `Skills` block.
- Topic overviews keep docs as docs, keep skills as skills, and use directories only for grouping and navigation.
- Topic overviews group docs by absolute owning directory path and render compact file lists.
- Topic overviews expand nested doc directories up to depth 2.
- Exact paths such as `docs/guides` or `hig-doctor/skills/hig-components-content` can be focused directly.

### Selector scope examples

- `docs local` shows the parked `local` collection topics and docs together.
- `docs ls local` shows only the parked `local` collection docs.
- `docs local/setup` shows only the `setup` subtree from the parked `local` collection.
- `docs ls local setup` is equivalent to `docs ls local/setup`.
- `docs topic local` shows only the parked `local` collection topics.
- `docs browser` shows the `browser` topic and matching `docs/browser` docs together.
- `docs ls browser` shows only matching `docs/browser` docs.
- `docs topic browser` shows only the `browser` topic.

### Root help browse examples

- `docs <topic>`
- `docs <docs-root>`
- `docs local/setup`
- `docs ls .`
- `docs ls local setup`
- `docs ls docs/subdir`

### `query`

`query` is the fallback discovery surface when browse-first inspection is not enough.

- It searches all collections in the dedicated `ngents-docs` QMD index.
- Collections are added with `docs park`.
- It does not search the current project's docs directory.
- It supports `--limit <n>` to cap results.
- `docs query status` shows the wrapper config and underlying QMD status.
- It prints formatted results for fast terminal follow-up.

Result output includes:

- the QMD title
- a short file summary when available
- the absolute file path, with a line range when QMD exposes one
- a lightly cleaned snippet for quick follow-up reading

## Operations behavior

### `park`

`park` attaches one docs root into the global docs index.

- It accepts `docs park <name> [path]`.
- `path` defaults to `.`.
- If `<path>/docs` exists, that nested `docs/` directory is parked.
- Otherwise the supplied path itself is treated as the docs root.
- It fails when the name is already taken.
- It fails when the docs root is already parked under another name.
- It runs `qmd collection add`, then refreshes the dedicated docs index with `update` and `embed`.

### `fetch`

`fetch` registers one fetched docs file or subtree and refreshes it immediately.

- It accepts `docs fetch <source> <path> --handler <command> [--root <subpath>] [--transform <command>] [--force]`.
- The target path must resolve inside a discovered docs root.
- A target ending in `.md` is treated as one docs file.
- Any other target path is treated as a docs subtree directory.
- `--handler` is required.
- Use `git` for the built-in git fetch handler.
- Use `url` for the built-in URL/file fetch handler.
- `--force` bypasses the stored fetch hash for that one run.
- Successful fetches update the local fetch manifest for future `docs update` runs.

### `update`

`update` refreshes the same global QMD index that `docs query` reads.

It runs registered fetches first, then `qmd update`, then `qmd embed`.

Use it when the global docs library changed and `query` needs a refreshed index.

## Docs model

### How docs reads `docs/`

- Markdown files directly under a `docs/` root are free-floating docs.
- Topics live under `docs/topics/<topic>/`.
- Directories outside `docs/topics/` are not topics.
- Topic membership comes from filesystem placement, not metadata files.
- Visible directories inside a topic are grouping and navigation paths inside the topic.
- Hidden directories and files are ignored.
- `archive`, `research`, and `node_modules` are ignored.

### `.docs.md`

`.docs.md` is an optional hidden directory guide and metadata file.

- `.docs.md` is excluded from normal scans and lists.
- Prefer one `.docs.md` at a meaningful topic boundary over many small child `.docs.md` files.
- `.docs.md` does not decide whether something is a topic or path.
- `.docs.md` does not decide whether a file belongs to a topic.
- Display titles resolve from frontmatter `title`, then frontmatter `name`, then the raw basename.
- `short` is the compact one-line description for indexes and compact help output.
- `summary` is the fuller expanded description for browsing.
- `read_when` adds browse hints.
- `hints` adds compact skill labels in topic overviews.
- Each `hints` key is a skill directory path relative to the `.docs.md` directory.
- The first non-list paragraph is the fallback summary when `summary` is absent.
- The rest of the body is rendered when the topic or path is opened.

### Skills

- `SKILL.md` is the only skill marker.
- A directory that contains `SKILL.md` is treated as skill content.
- Docs are discovered recursively inside a topic except below directories rooted at `SKILL.md`.
- Skill directories do not suppress ordinary docs in ancestor or sibling paths.
- A focused path that is exactly one root `SKILL.md` renders that skill directly.
- Focused ordinary paths can render direct docs and nested skill directories together.

## Examples

```bash
docs
docs --ops-help
docs <topic>
docs architecture
docs local/setup
docs <docs-root>
docs ~/work/foo
docs ls
docs ls .
docs ls local setup
docs ls architecture
docs ls ~/work/foo
docs ls ~/work/foo/docs
docs ls local
docs park nconf
docs park ngents ~/.ngents
docs park nconf ~/.nconf
docs fetch https://example.com/spec docs/external/spec
docs topic qmd
docs topic qmd references
docs topic platform docs/guides
docs query shell environment policy
docs query --limit 3 swiftui scroll view best practices
docs query status
docs update
```
