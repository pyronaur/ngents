---
title: Docs Rendering
short: Successful topic, collection, and docs-list rendering outcomes for the docs CLI.
summary: Canonical rendering outcomes, selector precedence, command permutations, and full-shape examples for docs/topic/list output.
read_when:
  - Need to understand which output shape a successful docs, docs topic, or docs ls command renders.
  - Need to compare topic overview, topic focus, docs list, collection, detail, and composed pages.
---

# Docs Rendering

This document covers normal successful, human-facing output for:

- `docs`
- `docs <selector>`
- `docs topic [topic] [path]`
- `docs ls [selector...]`

## Selector precedence

### `docs <selector>`

Root selectors resolve in this order:

1. exact parked collection name -> **Collection Composite**
2. exact topic and registered docs root name -> **Topic and Docs Composite**
3. exact topic name, including nested topic names -> **Topic Mixed Overview**
4. registered docs root name -> **Docs Group**
5. docs file, docs directory, collection-qualified directory, workspace docs path, or topic markdown file -> **Document Detail** or **Docs Group**

### `docs topic [topic] [path]`

Topic selectors resolve in this order:

1. no topic -> **Global Topic Index**
2. one value matching an exact topic name -> **Topic Mixed Overview**
3. one value matching an exact parked collection name -> **Collection Topic Index**
4. two values where the first value is an exact topic and the second is a topic path -> **Topic Focus** or **Topic Skill Detail**

A topic wins over a collection for `docs topic <name>`. A collection wins over a topic for `docs <name>`.

### `docs ls [selector...]`

List selectors always resolve through docs-list routing, not topic/composite routing:

1. no selector, `.`, or `global` -> **Docs Group**
2. docs root, docs subtree, collection-qualified directory, workspace docs path -> **Docs Group**
3. docs markdown file, topic markdown file, or directory containing only `SKILL.md` -> **Document Detail**

`docs ls <topic>` does not render a topic overview; it renders docs when `<topic>` is also a registered docs root, otherwise it is not a topic route.

Any slash-separated `docs ls` selector can be supplied as one argument or split across positionals. For example, `docs ls foo-bar/api` and `docs ls foo-bar api` are the same selector.

## Rendering outcomes

### Root Command Index

Commands:

- `docs`
- `docs --init`
- `docs -i`

Shape with docs index:

```text
{{USAGE}}

# docs
docs organizes project local and global documentation optimized for information quality.

## Overview & Organization
- All topics & docs are kept in and organized in `docs` directories

## Topics
TOPIC    TITLE        DESCRIPTION
foo-bar  Foo Bar      Foo-bar operating model.
api      API          Foo-bar API topic.

## Docs
### /repo/docs/foo-bar/
- guide.md - Foo-bar guide.
- reference.md - Foo-bar reference.
```

### Global Topic Index

Commands:

- `docs topic`

Shape:

```text
{{USAGE}}

## Topics

TOPIC    TITLE        DESCRIPTION
foo-bar  Foo Bar      Foo-bar operating model.
api      API          Foo-bar API topic.
```

Shape with no topics:

```text
{{USAGE}}

## Topics

- [no topics found]
```

### Topic Mixed Overview

Commands:

- `docs topic <topic>`
- `docs topic <nested-topic>`
- `docs <topic>` when `<topic>` resolves to a topic and not a collection or topic/docs composite
- `docs <nested-topic>` when `<nested-topic>` resolves to a topic and not a collection or topic/docs composite

Examples:

- `docs topic foo-bar`
- `docs topic foo-bar/api`
- `docs foo-bar`
- `docs foo-bar/api`

Shape:

```text
# Foo Bar Local Guide

Foo-bar local topic guide body from `.docs.md`.
Read when: Need local foo-bar guidance.

# Foo Bar Global Guide

Foo-bar global topic guide body from a second docs root.
Read when: Need shared foo-bar guidance.

# Topic: Foo Bar

## Docs

### /repo/docs/topics/foo-bar/
  guide.md - Foo-bar guide.

### /repo/docs/topics/foo-bar/api/
  endpoints.md - Foo-bar API endpoints.

## Skills

### API Skills
Path: /repo/docs/topics/foo-bar/api/{$directory}/SKILL.md
Open: docs topic foo-bar api/{$directory}

Foo-bar API skill section summary.
Read when: Need reusable foo-bar API checks.

- api-review: $foo-bar-api-review - Review foo-bar API behavior.
```

Shape with guide only:

```text
# Foo Bar Guide

Foo-bar topic guide body from `.docs.md`.
Read when: Need foo-bar guidance.

# Topic: Foo Bar
```

Shape with skills only:

```text
# Topic: Foo Bar

## Skills

### API Skills
Path: /repo/docs/topics/foo-bar/api/{$directory}/SKILL.md
Open: docs topic foo-bar api/{$directory}

- api-review: $foo-bar-api-review - Review foo-bar API behavior.
```

Shape with non-templateable skills:

```text
# Topic: Foo Bar

## Skills

### API Skills
Foo-bar API skill section summary.
Read when: Need reusable foo-bar API checks.
- alpha-review: $foo-bar-alpha-review - Review foo-bar alpha behavior.
  Path: /repo/docs/topics/foo-bar/api/alpha-review/SKILL.md
  Open: docs topic foo-bar api/alpha-review
- nested/beta-review: $foo-bar-beta-review - Review foo-bar beta behavior.
  Path: /repo/docs/topics/foo-bar/api/nested/beta-review/SKILL.md
  Open: docs topic foo-bar api/nested/beta-review
```

Shape with no guide, docs, or skills:

```text
# Topic: Foo Bar
```

### Topic Focus

Commands:

- `docs topic <topic> <subtree>`
- `docs topic <topic> <nested-subtree>`

Examples:

- `docs topic foo-bar api`
- `docs topic foo-bar api/guides`

Shape:

```text
## Foo Bar API

Focused guide first paragraph from `api/.docs.md`.
Need focused foo-bar API guidance.

Second matching focused section summary from another docs root.
Need shared focused foo-bar API guidance.

### /repo/docs/topics/foo-bar/api/
  endpoints.md - Foo-bar API endpoints.

### /repo/docs/topics/foo-bar/api/guides/
  retry.md - Foo-bar retry guide.

### Skills
Path: /repo/docs/topics/foo-bar/api/api-review/SKILL.md
Open: docs topic foo-bar api/api-review

- api-review: $foo-bar-api-review - Review foo-bar API behavior.
```

Shape with non-templateable nested skills:

```text
## Foo Bar API

Focused guide first paragraph from `api/.docs.md`.

### Skills
- alpha-review: $foo-bar-alpha-review - Review foo-bar alpha behavior.
  Path: /repo/docs/topics/foo-bar/api/alpha-review/SKILL.md
  Open: docs topic foo-bar api/alpha-review
- nested/beta-review: $foo-bar-beta-review - Review foo-bar beta behavior.
  Path: /repo/docs/topics/foo-bar/api/nested/beta-review/SKILL.md
  Open: docs topic foo-bar api/nested/beta-review
```

Shape with no focused entries:

```text
## Foo Bar API

[no section entries found]
```

### Topic Skill Detail

Commands:

- `docs topic <topic> <skill-dir>` when `<skill-dir>` is a topic path containing one direct `SKILL.md`
- `docs topic <topic> <nested-skill-dir>` when `<nested-skill-dir>` is a nested topic path containing one direct `SKILL.md`

Examples:

- `docs topic foo-bar api-review`
- `docs topic foo-bar api/skills/api-review`

Shape:

```text
## foo-bar-api-review

Path: /repo/docs/topics/foo-bar/api/api-review/SKILL.md
Open: docs topic foo-bar api/api-review

Review foo-bar API behavior.

### References

- checklist.md
- examples.md
```

Shape with metadata only:

```text
## foo-bar-api-review

Path: /repo/docs/topics/foo-bar/api/api-review/SKILL.md
Open: docs topic foo-bar api/api-review
```

### Topic Document Detail

Commands:

- `docs <topic>/<file>`
- `docs <topic>/<file.md>`
- `docs <nested-topic>/<file>`
- `docs <nested-topic>/<file.md>`
- `docs ls <topic>/<file>`
- `docs ls <topic>/<file.md>`
- `docs ls <nested-topic>/<file>`
- `docs ls <nested-topic>/<file.md>`

Examples:

- `docs foo-bar/guide`
- `docs foo-bar/guide.md`
- `docs foo-bar/api/endpoints`
- `docs foo-bar/api/endpoints.md`
- `docs ls foo-bar/api/endpoints`

Shape:

```text
# Doc: Foo Bar Guide
Path: /repo/docs/topics/foo-bar/guide.md

Foo-bar guide summary.
Read when: Need to understand foo-bar behavior.

# Foo Bar Guide

Full markdown body.

## Deep section

Detailed foo-bar content.
```

Shape with metadata only:

```text
# Doc: Foo Bar Guide
Path: /repo/docs/topics/foo-bar/guide.md

Foo-bar guide summary.
Read when: Need to understand foo-bar behavior.
```

### Collection Topic Index

Commands:

- `docs topic <collection>` when `<collection>` resolves to a parked collection and not a topic

Examples:

- `docs topic foo-bar`

Shape:

```text
# Topics: foo-bar

TOPIC    TITLE        DESCRIPTION
api      API          Foo-bar API topic.
mobile   Mobile       Foo-bar mobile topic.
```

Shape with no topics:

```text
# Topics: foo-bar

- [no topics found]
```

### Collection Composite

Commands:

- `docs <collection>` when `<collection>` resolves to a parked collection

Examples:

- `docs foo-bar`

Shape with topics and docs:

```text
# Docs: foo-bar

## Topics: foo-bar

TOPIC    TITLE        DESCRIPTION
api      API          Foo-bar API topic.
mobile   Mobile       Foo-bar mobile topic.

## Docs: foo-bar

### /repo/collections/foo-bar/docs/
 - guide.md
   Foo-bar collection guide.

### /repo/collections/foo-bar/docs/api/
 - endpoints.md
   Read when wiring foo-bar API calls.
```

Shape with docs only:

```text
# Docs: foo-bar

## Docs: foo-bar

### /repo/collections/foo-bar/docs/
 - guide.md
   Foo-bar collection guide.
```

Shape with topics only:

```text
# Docs: foo-bar

## Topics: foo-bar

TOPIC    TITLE        DESCRIPTION
api      API          Foo-bar API topic.

## Docs: foo-bar
```

Shape with no topics and no docs:

```text
# Docs: foo-bar

## Docs: foo-bar
```

### Topic and Docs Composite

Commands:

- `docs <name>` when `<name>` resolves to both a topic and a registered docs root, and not a collection

Examples:

- `docs foo-bar`

Shape:

```text
# Docs: foo-bar

Use `docs topic foo-bar <path>` to focus one path inside the topic.

Foo-bar local topic guide body from `.docs.md`.
Read when: Need reusable foo-bar docs.

Foo-bar global topic guide body from a second docs root.
Read when: Need shared foo-bar docs.

## Topic: Foo Bar

### Docs

#### /repo/docs/topics/foo-bar/
- guide.md - Foo-bar topic guide.

#### /repo/docs/topics/foo-bar/api/
- endpoints.md - Foo-bar API endpoints.

### Skills

#### API Skills
Path: /repo/docs/topics/foo-bar/api-review/SKILL.md
Open: docs topic foo-bar api-review

Foo-bar API skill workflows.
Read when: Need reusable foo-bar API checks.

- api-review: $foo-bar-api-review - Review foo-bar behavior.


## Docs: foo-bar

### /repo/docs/foo-bar/
 - guide.md
   Foo-bar docs-root guide.
```

### Docs Group

Commands:

Scope selectors:

- `docs ls`
- `docs ls .`
- `docs ls global`

Root docs selectors:

- `docs <docs-root>` when it is not a topic, collection, or topic/docs composite
- `docs <docs-root>/<subtree>` when it resolves to a registered docs subtree, not an exact nested topic, and not a directory containing only `SKILL.md`
- `docs docs/<subtree>`
- `docs ./docs/<subtree>`
- `docs <explicit-docs-path>`
- `docs <workspace-path-containing-docs>`

List docs selectors:

- `docs ls <docs-root>`
- `docs ls <docs-root>/<subtree>`
- `docs ls <docs-root> <subtree>`
- `docs ls docs/<subtree>`
- `docs ls docs <subtree>`
- `docs ls ./docs/<subtree>`
- `docs ls <explicit-docs-path>`
- `docs ls <workspace-path-containing-docs>`

Collection-qualified directory selectors:

- `docs ls <collection>`
- `docs <collection>/<subtree>` when it does not resolve as an exact nested topic
- `docs ls <collection>/<subtree>`
- `docs ls <collection> <subtree>`

Examples:

- `docs ls`
- `docs ls .`
- `docs ls global`
- `docs ls foo-bar`
- `docs ls foo-bar/api`
- `docs ls docs/foo-bar`
- `docs ngents/bun`
- `docs ls ngents bun`

Shape:

```text
# Docs: foo-bar
Topic available: docs topic foo-bar

## /repo/docs/foo-bar/
 - guide.md
   Read when browsing foo-bar concepts.

 - reference.md
   Foo-bar reference summary.

## /repo/docs/foo-bar/api/
 - endpoints.md
   Read when browsing foo-bar API docs.
```

Shape with no docs:

```text
# Docs: foo-bar

- [no docs found]
```

Shape without topic hint:

```text
# Docs: foo-bar

## /repo/docs/foo-bar/
 - guide.md
   Foo-bar docs-root guide.
```

### Document Detail

Commands:

Root docs file selectors:

- `docs <file>`
- `docs <file.md>`
- `docs <directory-containing-only-SKILL.md>`
- `docs docs/<file>`
- `docs docs/<file.md>`
- `docs ./docs/<file>`
- `docs ./docs/<file.md>`
- `docs <docs-root>/<file>`
- `docs <docs-root>/<file.md>`
- `docs <docs-root>/<directory-containing-only-SKILL.md>`
- `docs <docs-root>/<subtree>/<file>`
- `docs <docs-root>/<subtree>/<file.md>`
- `docs <explicit-markdown-path>`

List docs file selectors:

- `docs ls <file>`
- `docs ls <file.md>`
- `docs ls <directory-containing-only-SKILL.md>`
- `docs ls docs/<file>`
- `docs ls docs/<file.md>`
- `docs ls docs <file>`
- `docs ls ./docs/<file>`
- `docs ls ./docs/<file.md>`
- `docs ls <docs-root>/<file>`
- `docs ls <docs-root>/<file.md>`
- `docs ls <docs-root>/<directory-containing-only-SKILL.md>`
- `docs ls <docs-root>/<subtree>/<file>`
- `docs ls <docs-root>/<subtree>/<file.md>`
- `docs ls <docs-root> <subtree> <file>`
- `docs ls <explicit-markdown-path>`

Examples:

- `docs guide`
- `docs guide.md`
- `docs docs/guide`
- `docs foo-bar/guide`
- `docs foo-bar/api/endpoints.md`
- `docs ls guide`
- `docs ls foo-bar/api/endpoints.md`

Shape:

```text
# Doc: Foo Bar Guide
Path: /repo/docs/foo-bar/guide.md

Foo-bar guide summary.
Read when: Need to understand foo-bar behavior.

# Foo Bar Guide

Full markdown body.

## Deep section

Detailed foo-bar content.
```

## Explicit non-permutations

These are not successful topic/collection rendering permutations:

- `docs <topic>/<subtree>` is not topic focus; it is an exact nested topic, topic markdown file, or docs selector.
- `docs ls <topic>` is not topic overview; use `docs topic <topic>` for topic output.
- `docs <collection>/<file.md>` and `docs ls <collection>/<file.md>` are not collection document detail routes; collection-qualified selectors browse directories.
- `docs topic <collection> <path>` is not collection focus; topic focus requires the first value to resolve to a topic.
