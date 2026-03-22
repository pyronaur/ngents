# docs CLI Rendering Spec

## Scope

This document records the current rendering contract for the browse-oriented
parts of the `docs` CLI in `scripts/ngent-docs`.

It is based on the implementation and the CLI-facing tests. It focuses on
current behavior and on decisions that are explicit in code, not on intended
future behavior.

## Core Structures

### `GuideMetadata`

Parsed from `.docs.md` in a topic or section directory.

Fields:

- `title`
- `short`
- `summary`
- `guideBody`
- `readWhen`
- `hints`
- `error`

Current decisions:

- `.docs.md` is the guide/overview file for a directory.
- `title` falls back to `name` from frontmatter when present.
- `guideBody` is the body content after frontmatter and after skipping the
  first Markdown heading.
- `summary` falls back to the first non-list paragraph from the guide body when
  frontmatter does not provide it.
- `hints` is an optional frontmatter list of `relative/path: description`
  strings used only for compact skill labels in topic overviews.
- Each `hints` key targets a skill directory path relative to the guide
  directory that owns the `.docs.md`.
- Malformed `hints` entries are ignored.

### `MarkdownEntry`

Represents a normal Markdown doc discovered in a docs directory.

Current decisions:

- `.docs.md` and `SKILL.md` are not treated as normal docs.
- Hidden paths and excluded directories are not included.

### `SkillEntry`

Represents one discovered `SKILL.md`.

Fields:

- `name`
- `title`
- `description`
- `hint`
- `referencePaths`
- `error`

Current decisions:

- `name` falls back to the skill directory basename.
- `title` falls back to `title`, then `name`, then the same basename fallback.
- `description` is read from frontmatter only.
- `hint` is resolved from ancestor `.docs.md` `hints` entries on the path from
  the topic contribution root down to the skill directory.
- `hint` lookup targets the normalized skill directory path, not `skill.name`.
- Deeper `.docs.md` `hints` override shallower ones when they resolve to the
  same skill directory path.
- `referencePaths` are discovered from local Markdown links inside the skill
  body.

### `SectionEntry`

Represents one topic subdirectory.

Current decisions:

- A section can be doc-backed, skill-backed, or mixed in metadata only.
- If any `SKILL.md` exists anywhere under the section, normal Markdown docs in
  that section are suppressed from `markdownEntries` and the section is treated
  as skill-backed for rendering.

### `TopicContribution`

Represents one topic directory from one docs root.

Current decisions:

- A merged topic preserves separate contributions rather than flattening them
  into one synthetic directory.
- Contribution guide body, docs, skills, and sections are rendered contribution
  by contribution.

### `MergedTopic`

Represents all contributions for one topic name across merged docs roots.

Current decisions:

- Topics are merged by topic directory name.
- The overview title uses the first non-empty contribution title, else the
  topic name.

## Discovery Rules

### Visibility and Exclusions

Current decisions:

- Hidden paths are ignored.
- `archive`, `research`, and `node_modules` are ignored.
- Topic directories are discovered under `docs/topics`.

### Skill Discovery

Current decisions:

- Skill files are discovered recursively under a section directory.
- Only files named `SKILL.md` are treated as skills.
- A section with discovered skills does not also list sibling Markdown docs in
  the section output path.

### Skill Reference Discovery

Current decisions:

- References are extracted only from Markdown links inside skill content.
- HTTP and HTTPS links are ignored.
- Missing files are ignored.
- Directory targets are ignored.
- Hidden or excluded targets are ignored.
- Stored reference paths are relative to the skill directory.

## Root Command Routing

### Root Help

Current decisions:

- Bare `docs` renders root help and includes the docs index.
- `docs --help`, `docs -h`, and `docs help` render the same help shape without
  the docs index.

### Single-Token Root Selector Fallback

This path runs before Commander command parsing.

Current decisions:

- Fallback applies only when the argv shape is exactly one token.
- Fallback does not run when the token is a real root command name.
- Resolution order is:
  1. parked collection by name
  2. overlapping topic plus registered docs selector
  3. topic only
  4. registered docs selector only
  5. general docs selector resolution
  6. not-found rendering

### Overlap Handling

Current decisions:

- If a single token matches both a topic and a registered docs selector, the
  root fallback renders a combined view instead of forcing the user to choose.
- The combined view renders topic content first, then docs content.

## `docs ls` Rendering

### Purpose

Current decisions:

- `docs ls` is a docs browser, not a topic browser.
- It can still hint about a topic when a selector name collides with a topic
  name.

### Default Shape

Current decisions:

- `docs ls` with no selector renders an expanded docs index.
- The expanded docs index groups docs by absolute parent directory.
- Each entry renders the file basename, not the full path.

### Expanded Doc Description Priority

Current decisions:

- Expanded docs output prefers `readWhen`.
- If `readWhen` is absent, it uses normalized `summary`.
- Expanded docs output does not use `short` for the body line.

### Selector Misses

Current decisions:

- `docs ls <selector>` miss output renders a browse inventory, not generic
  command help.
- If the selector matches a topic name, the miss output explicitly tells the
  user to use `docs topic <name>`.

## `docs topic` Routing

### Arity

Current decisions:

- `docs topic` accepts zero, one, or two positionals.
- More than two positionals is a usage error.

### No Topic Argument

Current decisions:

- `docs topic` with no arguments renders the merged topic index.
- The topic index is a compact table with topic name, title, and compact
  description.

### Topic Only

Current decisions:

- `docs topic <topic>` renders the merged topic overview when the topic exists.
- If the topic does not exist but a parked collection with the same selector
  exists, it renders a scoped topic browser for that parked collection.

### Topic Plus Section

Current decisions:

- `docs topic <topic> <section>` requires an exact section key match in the
  current implementation.
- Matching sections from multiple topic contributions are collected and rendered
  together.
- Unknown sections fail with a list of available section keys.

## Topic Browser Rendering

This is the compact table used by `docs topic` with no arguments and by scoped
topic browsers.

Current decisions:

- The browser is compact by design.
- Topic descriptions use `short` first, then `summary`.
- Compact descriptions are truncated to 64 characters.
- Missing descriptions render as `-`.

## Topic Overview Rendering

This is the `docs topic <topic>` view.

### Contribution Framing

Current decisions:

- The overview renders one block per contribution.
- Each contribution starts with its absolute topic path.
- Contribution guide body is rendered directly under that path.
- Contribution `readWhen` and parse errors are shown in the header area.

### Block Ordering

Current decisions:

- Within one contribution, block order is:
  1. topic docs
  2. skill sections
  3. regular sections
- Blocks are separated by `---`.
- Omitted blocks do not leave placeholder text.

### Topic Docs

Current decisions:

- When a contribution has exactly one top-level doc, the overview prints the
  doc path directly without an extra entry heading.
- When there are multiple docs, each doc gets its own heading.
- Topic doc metadata prefers full `summary`, then falls back to `short`.

### Skill Sections in Overview

Current decisions:

- Skill sections are intentionally compact in the topic overview.
- The overview does not print skill descriptions.
- All skill-backed sections render as `<section key>`, including sections whose
  only skill is `<section>/SKILL.md`.
- The overview prints a `Path:` line for skill entry lookup.
- Multi-skill sections use a `{$name}` path template when all discovered skills
  share one stable path shape.
- Single root-skill sections print the exact `SKILL.md` path instead of a
  `{$name}` template.
- The section body prints one bullet per discovered skill after the `Path:`
  line.
- Child skill entries use `skill.name`, not `skill.title`.
- A child skill bullet prints:
  - `$<skill.name>` when no matching hint exists
  - `$<skill.name> - <hint>` when a matching hint exists
- Topic overview skill entries do not print per-skill absolute `SKILL.md`
  paths.
- Topic overview skill entries do not print per-skill reference counts.

### Regular Sections in Overview

Current decisions:

- Non-skill sections render under `Sections`.
- Section metadata can include:
  - summary or short fallback
  - `readWhen`
  - parse error
- The overview prints a `Path:` line for regular-section doc entry lookup.
- Regular sections print the section directory path with a trailing slash.
- When a regular section has discovered Markdown docs, the overview prints one
  bullet per doc after the `Path:` line.
- Regular-section doc bullets use the Markdown filename and append the doc
  title when it differs.
- Topic overview regular sections do not print aggregate `contains` text.

## Focused Section Rendering

This is the `docs topic <topic> <section>` path.

### Compact Single-Root-Skill View

Current decisions:

- If there is exactly one matching section contribution and it is a root-skill
  section, the CLI renders a compact direct skill view.
- This compact view prints:
  - heading from `skill.title`, then `skill.name`, then basename fallback
  - skill path
  - skill description
  - grouped reference filenames

### General Focused Section View

Current decisions:

- Otherwise the CLI renders a merged section view with a shared section title.
- Each contribution renders separately.
- Each contribution begins with `source: <section path>`.
- Contribution guide body, parse error, and `readWhen` render before entries.
- Skills render before Markdown docs.
- Empty sections render `[no section entries found]`.

### Focused Skills Block

Current decisions:

- Focused skill blocks are expanded, unlike topic overview skill blocks.
- Each focused skill prints:
  - `skill.title` if present, else `skill.name`
  - labeled `path:`
  - description when present
  - grouped reference filenames

## Root Help Rendering

Current decisions:

- Root help uses the Liquid template in `templates/root-help.md`.
- Topic rows in root help use the same compact topic table row logic as the
  topic browser.
- Docs in root help use compact entry lines grouped by directory.
- Root help compact doc descriptions use `short` first, then `summary`
  truncated to 64 characters.

## Explicit Compact vs Expanded Policy

Current decisions:

- Compact views prefer scanability over metadata completeness.
- Expanded views print fuller descriptive text.
- Today, that means:
  - topic browser: compact
  - root help topic/docs index: compact
  - topic overview skill entries: compact
  - docs browser: expanded
  - focused section skill rendering: expanded

## Open Questions and Known Mismatches

These are observable from the current code and tests, but they should not be
treated as settled design decisions yet.

- Topic overview skill entries use `skill.name`, while focused skill entries
  prefer `skill.title`. That split is current behavior, but the repo does not
  yet document whether this distinction is part of the intended public
  contract.
