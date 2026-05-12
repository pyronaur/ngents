---
title: Docs Rendering
short: Render styles and command combinations for the docs CLI.
summary: Canonical render-style names and the docs command combinations that produce each style.
read_when:
  - Need to understand which output shape a docs command renders.
  - Need to compare topic, docs, detail, query, and composite docs views.
---

# Docs Rendering

## Render styles

### Command Index

- `docs`
- `docs --help`
- `docs help`

### Topic Index

- `docs topic`
- `docs topic <collection>`

### Directory Group

- `docs ls`
- `docs ls .`
- `docs ls global`
- `docs ls <docs-root>`
- `docs ls <docs-root>/<subtree>`
- `docs ls <docs-root>/<file.md>`
- `docs ls <collection>`
- `docs ls <collection>/<docs-root-or-subtree>`
- `docs ls docs/<subtree>`
- `docs ls ./docs/<subtree>`
- `docs ls <explicit-docs-path>`
- `docs ls <workspace-path-containing-docs>`

### Topic Mixed Overview

- `docs topic <topic>`
- `docs <topic>`
- topic part of `docs <name>` when `<name>` is both a topic and docs root
- topic part of `docs <collection>` when the collection has topics

### Topic Focus

- `docs topic <topic> <subtree>`
- `docs <topic>/<subtree>`

### Detail

Document detail:

- `docs <docs-root>/<file.md>`
- `docs docs/<file.md>`
- `docs ./docs/<file.md>`
- `docs <collection>/<docs-root>/<file.md>`
- `docs <explicit-markdown-path>`

Skill detail:

- `docs topic <topic> <skill-dir>`
- `docs topic <topic> <path-to-SKILL.md-root-dir>`

### Search Result List

- `docs query <terms...>`
- `docs query --limit <n> <terms...>`

### Status Detail

- `docs query status`

### Operations Help

- `docs --ops-help`

### Operation Result

- `docs park <name> [path]`
- successful `docs fetch ...`
- successful `docs update` output from the underlying qmd and fetch flow

## Composite cases

- `docs <collection>` renders collection topics plus docs when both are present.
- `docs <name>` where `<name>` is both a topic and docs root renders **Topic Mixed Overview** plus **Directory Group**.
