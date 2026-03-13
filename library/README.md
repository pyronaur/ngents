# Library

The `library/` directory is the local index that powers `ngents library`.

## How `ngents library` reads this directory

- `ngents library` lists one row per topic directory directly under `library/`.
- `ngents library <topic>` renders that topic's guide plus a compact topic view.
- `ngents library <topic> <skill>` focuses one imported skill library inside that topic.
- `ngents library <topic> --expand` expands a topic into a table of contents with nested skills and references.
- `ngents library <topic> <skill> --expand` expands one imported skill library down to nested reference files.
- Hidden directories and files are ignored.
- `archive`, `research`, and `node_modules` are ignored.

## Topic layout

Create one directory per topic:

```text
library/
  <topic>/
    LIB.md
    <reference>.md
    <imported-library>/
```

Example:

```text
library/
  ios/
    LIB.md
    SOSUMI.md
    hig-doctor/
```

## Required vs optional

- Required for a topic to exist: a directory at `library/<topic>/`.
- Required for a good index entry: `library/<topic>/LIB.md`.
- Optional: root markdown reference files such as `SOSUMI.md` or `ASO.md`.
- Optional: imported library directories such as `hig-doctor/` or `aso-store-aso-skill/`.

## `LIB.md`

`LIB.md` is the topic guide.

- The first `#` heading becomes the library title shown by `ngents library`.
- The first non-list paragraph becomes the short topic description shown by `ngents library`.
- The rest of the markdown body is rendered at the top of `ngents library <topic>` and `ngents library <topic> <skill>`.
- `LIB.md` is plain markdown. It does not use frontmatter.

Keep `LIB.md` focused on:

- what is in the library
- how to use the library
- what to prioritize first

## Root markdown files

Any `.md` file directly inside `library/<topic>/` is treated as a reference entry, except `LIB.md`.

Examples:

- `library/ios/SOSUMI.md`
- `library/aso/ASO.md`
- `library/aso/README.md`

For these files:

- the first `#` heading becomes the entry title
- optional YAML frontmatter `summary` becomes the short description in `ngents library <topic>`
- `read_when` frontmatter is allowed as metadata for the file, but the current renderer only displays `summary`

Example:

```md
---
summary: Sosumi CLI and MCP reference for Apple Developer docs.
read_when:
  - Need Apple docs as markdown.
---

# Sosumi CLI
```

## Imported libraries

Imported libraries live inside a topic directory and are indexed through `library/library.json`.

Example:

```json
{
  "ios/hig-doctor": {
    "title": "HIG Doctor",
    "source": "https://github.com/raintree-technology/hig-doctor"
  }
}
```

Rules:

- The key is the path relative to `library/`.
- The path must point to a directory.
- `title` is optional and becomes the imported library heading in `ngents library <topic>`.
- `source` is metadata for the import record. The current renderer does not display it.

If an imported directory is not in `library/library.json`, it is not shown as an imported library entry.

## Skills

Skills belong inside an imported library directory and are discovered recursively by filename:

```text
library/<topic>/<imported-library>/**/SKILL.md
```

For each `SKILL.md`:

- the first `#` heading becomes the displayed skill title
- frontmatter `name`, `version`, and `description` are parsed
- the current renderer shows the title and `description` in focused skill-library views

Minimal example:

```md
---
name: hig-foundations
description: Apple HIG foundations guidance for layout, color, and typography.
---

# Apple HIG: Design Foundations
```

## Skill references

Local markdown or file links inside `SKILL.md` are discovered and rendered under that skill.

Examples:

- `[Color](references/color.md)`
- `[ASO Learnings](references/aso_learnings.md)`
- `[Validator](scripts/validate_metadata.py)`

Rules:

- only local links are included
- external `http` and `https` links are ignored
- links must resolve to an existing file
- directories are ignored

Keep skill support files next to the skill in paths such as:

- `references/*.md`
- `scripts/*`

In command output:

- compact topic view shows only top-level library entries and imported library summaries
- focused skill-library view shows each contained skill and its reference index
- expanded views show nested references and file-level contents

## Authoring checklist

To add a new library topic:

1. Create `library/<topic>/`.
2. Add `library/<topic>/LIB.md` with a `#` title and a short opening paragraph.
3. Add any root reference markdown files directly under `library/<topic>/`.
4. Add imported library directories under `library/<topic>/` when needed.
5. Register each imported library directory in `library/library.json`.
6. Put skills inside the imported directory as `SKILL.md` files.
7. Link local reference files from each `SKILL.md` when you want them surfaced in the topic view.
