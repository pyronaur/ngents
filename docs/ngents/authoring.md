---
summary: How `ndex` discovers docs topics, sections, skills, and root markdown files.
read_when:
  - Changing the `ndex` command contract or docs directory structure.
  - Adding a new docs topic, section, or skill-library section.
  - Debugging why a doc or section does not appear in `ndex`.
---

# ndex

`ndex` is the docs browser for repo-local and global documentation.

## Command shape

- `ndex` browses repo-local docs.
- `ndex --global` browses `~/.ngents/docs`.
- `ndex <topic>` opens a topic.
- `ndex <topic> <section>` focuses a nested section inside that topic.
- `ndex <topic> --expand` expands the topic into a file-level table of contents.
- `ndex <topic> <section> --expand` expands a focused section into nested references and file paths.

## How `ndex` reads `docs/`

- Markdown files directly under a `docs/` root are free-floating docs.
- Directories directly under a `docs/` root are top-level topics.
- Directories directly under a topic are surfaced sections.
- Deeper directories can also become surfaced sections when they contain `NDEX.md`.
- A topic `NDEX.md` can also declare child sections in frontmatter with a `sections` map.
- Hidden directories and files are ignored.
- `archive`, `research`, and `node_modules` are ignored.

## `NDEX.md`

`NDEX.md` is a directory guide and metadata file.

- `NDEX.md` is excluded from normal scans and lists.
- Frontmatter `title` takes precedence over markdown heading parsing.
- Frontmatter `summary` takes precedence over summary parsing.
- The first `#` heading is the fallback title when frontmatter `title` is absent.
- The first non-list paragraph is the fallback summary when frontmatter `summary` is absent.
- The rest of the body is rendered when the topic or section is opened.

Use `NDEX.md` to explain:

- what the topic or section contains
- how to use it
- what to prioritize first

For external or imported directories:

- do not modify the external directory
- do not add `NDEX.md` inside the external directory
- declare the child section in the parent topic `NDEX.md` frontmatter instead

Example:

```md
---
title: iOS Library
summary: This topic collects iOS-focused references and Apple HIG skills.
sections:
  hig-doctor:
    kind: skill-library
    title: HIG Doctor
    summary: Curated Apple HIG skills and reference files.
    guide: |
      Start here when you need structured Apple HIG guidance.
---
```

## Skills and references

- `SKILL.md` files are discovered recursively inside a section.
- Local links inside `SKILL.md` become the skill reference index.
- Compact focused views show skill titles, descriptions, and reference names.
- Expanded views show nested reference file paths.

## Authoring checklist

1. Create or choose the target `docs/` root.
2. Put free-floating docs directly under that `docs/` root when they are not part of a topic.
3. Put related docs inside a directory when they should appear as one topic.
4. Add `NDEX.md` when a topic or owned local section needs a title, summary, or guide body.
5. Add `SKILL.md` files inside a section when that section exposes skills.
6. Link local reference files from each `SKILL.md` when they should show up in `ndex`.
7. Declare external child sections in the parent topic `NDEX.md` frontmatter instead of modifying the external directory.
