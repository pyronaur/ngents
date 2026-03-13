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
