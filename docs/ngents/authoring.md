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
- Hidden directories and files are ignored.
- `archive`, `research`, and `node_modules` are ignored.

## `NDEX.md`

`NDEX.md` is a directory guide and metadata file.

- `NDEX.md` is excluded from normal scans and lists.
- The first `#` heading becomes the title for that topic or section.
- The first non-list paragraph becomes the summary.
- The rest of the body is rendered when the topic or section is opened.

Use `NDEX.md` to explain:

- what the topic or section contains
- how to use it
- what to prioritize first

## Skills and references

- `SKILL.md` files are discovered recursively inside a section.
- Local links inside `SKILL.md` become the skill reference index.
- Compact focused views show skill titles, descriptions, and reference names.
- Expanded views show nested reference file paths.

## Authoring checklist

1. Create or choose the target `docs/` root.
2. Put free-floating docs directly under that `docs/` root when they are not part of a topic.
3. Put related docs inside a directory when they should appear as one topic.
4. Add `NDEX.md` when a topic or section needs a title, summary, or guide body.
5. Add `SKILL.md` files inside a section when that section exposes skills.
6. Link local reference files from each `SKILL.md` when they should show up in `ndex`.
