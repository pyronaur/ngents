---
title: Docs Rendering
short: Successful topic, collection, and docs-list rendering outcomes for the docs CLI.
summary: Canonical rendering outcomes, selector precedence, command permutations, and full-shape examples for docs/topic/list output.
read_when:
  - Need to understand which output shape a successful docs, docs topic, or docs ls command renders.
  - Need to compare topic overview, topic focus, docs list, collection, detail, and composed pages.
---

# Docs Rendering

- `docs`
- `docs <selector>`
- `docs topic [topic] [path]`
- `docs ls [selector...]`

Placeholders:

- `{{USAGE}}` stands for the stable usage line printed before the content shape.
- `{{ROOT_COMMAND_BLURB}}` stands for the root command-discovery prose between the overview and the topic/docs indexes.

## Selector precedence

### `docs <selector>`

Root selectors resolve in this order:

1. exact parked collection name -> **Collection Composite**
2. exact topic and registered docs root name -> **Topic and Docs Composite**
3. exact topic name, including nested topic names -> **Topic Mixed Overview**
4. registered docs root name -> **Docs Group**
5. docs file, docs directory, collection-qualified directory, workspace docs path, or topic markdown file -> **Document Detail** or **Docs Group**

After collection/topic/composite precedence, a root selector falls through to the same docs/file routing used by `docs ls`. Multiple root selector tokens are joined with `/`, so `docs foo bar` is equivalent to `docs foo/bar` when that selector exists.

### `docs topic [topic] [path]`

Topic selectors resolve in this order:

1. no topic -> **Global Topic Index**
2. one value matching an exact topic name -> **Topic Mixed Overview**
3. one value matching an exact parked collection name -> **Collection Topic Index**
4. two values where the first value is an exact topic and the second is a topic path -> **Topic Focus** or **Topic Skill Detail**

A topic wins over a collection for `docs topic <name>`. A collection wins over a topic for `docs <name>`.
The special topic name `.` is a valid merged global topic selector.

### `docs ls [selector...]`

List selectors always resolve through docs-list routing, not topic/composite routing:

1. no selector, `.`, or `global` -> **Docs Group**
2. docs root, docs subtree, collection-qualified directory, workspace docs path -> **Docs Group**
3. docs markdown file, topic markdown file, or directory containing only `SKILL.md` -> **Document Detail**

`docs ls <topic>` does not render a topic overview; it renders docs when `<topic>` is also a registered docs root, otherwise it is not a topic route.

Any slash-separated `docs ls` selector can be supplied as one argument or split across positionals. For example, `docs ls foo-bar/api` and `docs ls foo-bar api` are the same selector.

## Rendering outcomes

### 1. Root Command Index

Commands:

- `docs`
- `docs --init`
- `docs -i`

Actual command(s) demonstrating the richest real form on this machine:

- `docs`

Shape with docs index:

```md
{{USAGE}}

# docs
docs organizes project local and global documentation optimized for information quality.

## Overview & Organization
- All topics & docs are kept in and organized in `docs` directories

{{ROOT_COMMAND_BLURB}}

## Topics
TOPIC    TITLE        DESCRIPTION
foo-bar  Foo Bar      Foo-bar operating model.
api      API          Foo-bar API topic.

## Docs
### /repo/docs/foo-bar/
- guide.md - Foo-bar guide.
- reference.md - Foo-bar reference.
```

Shape with no docs index:

```md
{{USAGE}}

# docs
docs organizes project local and global documentation optimized for information quality.

## Overview & Organization
- All topics & docs are kept in and organized in `docs` directories

{{ROOT_COMMAND_BLURB}}

## Topics
TOPIC    TITLE        DESCRIPTION
foo-bar  Foo Bar      Foo-bar operating model.
api      API          Foo-bar API topic.
```

Shape with no topics:

```md
{{USAGE}}

# docs
docs organizes project local and global documentation optimized for information quality.

## Overview & Organization
- All topics & docs are kept in and organized in `docs` directories

{{ROOT_COMMAND_BLURB}}

## Topics
- [no topics found]

## Docs
### /repo/docs/foo-bar/
- guide.md - Foo-bar guide.
```

### 2. Global Topic Index

Commands:

- `docs topic`

Actual command(s) demonstrating the richest real form on this machine:

- `docs topic`

Shape:

```md
{{USAGE}}

## Topics

TOPIC    TITLE        DESCRIPTION
foo-bar  Foo Bar      Foo-bar operating model.
api      API          Foo-bar API topic.

docs topic foo - view foo about/index first
docs topic foo bar/baz - focus one path inside the topic
```

Shape with no topics:

```md
{{USAGE}}

## Topics

- [no topics found]

docs topic foo - view foo about/index first
docs topic foo bar/baz - focus one path inside the topic
```

### 3. Topic Mixed Overview

Commands:

- `docs topic <topic>`
- `docs topic <nested-topic>`
- `docs topic .`
- `docs <topic>` when `<topic>` resolves to a topic and not a collection or topic/docs composite
- `docs <nested-topic>` when `<nested-topic>` resolves to a topic and not a collection or topic/docs composite

Examples:

- `docs topic foo-bar`
- `docs topic foo-bar/api`
- `docs topic .`
- `docs foo-bar`
- `docs foo-bar/api`

Actual command(s) demonstrating the richest real form on this machine:

- `docs topic asc`

Shape:

```md
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
Path: /repo/docs/topics/foo-bar/api/{$name}/SKILL.md
Open: docs topic foo-bar api/{$name}
{$name} = entry name without leading $

Foo-bar API skill section summary.
Read when: Need reusable foo-bar API checks.

- $foo-bar-api-review
  Review foo-bar API behavior.
```

Shape with guide only:

```md
# Foo Bar Guide

Foo-bar topic guide body from `.docs.md`.
Read when: Need foo-bar guidance.

# Topic: Foo Bar
```

Shape with skills only:

```md
# Topic: Foo Bar

## Skills

### API Skills
Path: /repo/docs/topics/foo-bar/api/{$name}/SKILL.md
Open: docs topic foo-bar api/{$name}
{$name} = entry name without leading $

- $foo-bar-api-review
  Review foo-bar API behavior.
```

Shape with docs only:

```md
# Topic: Foo Bar

## Docs

### /repo/docs/topics/foo-bar/
  guide.md - Foo-bar guide.

### /repo/docs/topics/foo-bar/api/
  endpoints.md - Foo-bar API endpoints.
```

Shape with non-templateable skills:

```md
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

```md
# Topic: Foo Bar
```

### 4. Topic Focus

Commands:

- `docs topic <topic> <subtree>`
- `docs topic <topic> <nested-subtree>`
- `docs topic <nested-topic> <subtree>`
- `docs topic . <subtree>`

Examples:

- `docs topic foo-bar api`
- `docs topic foo-bar api/guides`
- `docs topic foo-bar/api guides`
- `docs topic . foo-bar/api`

Actual command(s) demonstrating the richest real form on this machine:

- `docs topic asc aso`
- `docs topic app hig-doctor`

Shape:

```md
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

- $foo-bar-api-review
  Review foo-bar API behavior.
```

Shape with metadata only:

```md
## Foo Bar API

Focused guide first paragraph from `api/.docs.md`.
Need focused foo-bar API guidance.
```

Shape with docs only:

```md
## Foo Bar API

### /repo/docs/topics/foo-bar/api/
  endpoints.md - Foo-bar API endpoints.

### /repo/docs/topics/foo-bar/api/guides/
  retry.md - Foo-bar retry guide.
```

Shape with non-templateable nested skills:

```md
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

```md
## Foo Bar API

[no section entries found]
```

### 5. Topic Skill Detail

Commands:

- `docs topic <topic> <skill-dir>` when `<skill-dir>` is a topic path containing one direct `SKILL.md`
- `docs topic <topic> <nested-skill-dir>` when `<nested-skill-dir>` is a nested topic path containing one direct `SKILL.md`
- `docs topic <nested-topic> <skill-dir>` when `<skill-dir>` is inside the nested topic
- `docs topic . <nested-skill-dir>` when the special `.` topic contains the nested skill path

Examples:

- `docs topic foo-bar api-review`
- `docs topic foo-bar api/skills/api-review`
- `docs topic foo-bar/api api-review`
- `docs topic . foo-bar/api/api-review`

Actual command(s) demonstrating the richest real form on this machine:

- `docs topic app hig-doctor/skills/hig-components-controls`

Shape:

```md
## foo-bar-api-review

Path: /repo/docs/topics/foo-bar/api/api-review/SKILL.md
Open: docs topic foo-bar api/api-review

Review foo-bar API behavior.

### References

- checklist.md
- examples.md
```

Shape with metadata only:

```md
## foo-bar-api-review

Path: /repo/docs/topics/foo-bar/api/api-review/SKILL.md
Open: docs topic foo-bar api/api-review
```

Shape with merged direct skill blocks:

```md
## foo-bar-api-review

Path: /repo/docs/topics/foo-bar/api/api-review/SKILL.md
Open: docs topic foo-bar api/api-review

Review local foo-bar API behavior.

### References

- checklist.md

Path: /repo-global/docs/topics/foo-bar/api/api-review/SKILL.md
Open: docs topic foo-bar api/api-review

Review shared foo-bar API behavior.

### References

- examples.md
```

Shape with parse error metadata:

```md
## foo-bar-api-review

Path: /repo/docs/topics/foo-bar/api/api-review/SKILL.md
Open: docs topic foo-bar api/api-review

[Invalid frontmatter: expected mapping]
```

### 6. Topic Document Detail

Uses the **Document Detail** renderer; all **Document Detail** shapes apply.

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

Actual command(s) demonstrating the richest real form on this machine:

- `docs asc/publishing-guide`

Shape:

```md
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

```md
# Doc: Foo Bar Guide
Path: /repo/docs/topics/foo-bar/guide.md

Foo-bar guide summary.
Read when: Need to understand foo-bar behavior.
```

### 7. Collection Topic Index

Commands:

- `docs topic <collection>` when `<collection>` resolves to a parked collection and not a topic

Examples:

- `docs topic foo-bar`

Actual command(s) demonstrating the richest real form on this machine:

- `docs topic local`

Shape:

```md
# Topics: foo-bar

TOPIC    TITLE        DESCRIPTION
api      API          Foo-bar API topic.
mobile   Mobile       Foo-bar mobile topic.
```

Shape with no topics:

```md
# Topics: foo-bar

- [no topics found]
```

### 8. Collection Composite

Commands:

- `docs <collection>` when `<collection>` resolves to a parked collection

Examples:

- `docs foo-bar`

Actual command(s) demonstrating the richest real form on this machine:

- `docs local`

Shape with topics and docs:

```md
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

```md
# Docs: foo-bar

## Docs: foo-bar

### /repo/collections/foo-bar/docs/
 - guide.md
   Foo-bar collection guide.
```

Shape with topics only:

```md
# Docs: foo-bar

## Topics: foo-bar

TOPIC    TITLE        DESCRIPTION
api      API          Foo-bar API topic.

## Docs: foo-bar
```

Shape with no topics and no docs:

```md
# Docs: foo-bar

## Docs: foo-bar
```

### 9. Topic and Docs Composite

Commands:

- `docs .`
- `docs <name>` when `<name>` resolves to both a topic and a registered docs root, and not a collection

Examples:

- `docs .`
- `docs foo-bar`

Actual command(s) demonstrating the richest real form on this machine:

- `docs .`

Shape:

```md
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

- $foo-bar-api-review
  Review foo-bar behavior.


## Docs: foo-bar

### /repo/docs/foo-bar/
 - guide.md
   Foo-bar docs-root guide.
```

### 10. Docs Group

Commands:

Scope selectors:

- `docs ls`
- `docs ls .`
- `docs ls global`

Root docs selectors:

- `docs global`
- `docs <docs-root>` when it is not a topic, collection, or topic/docs composite
- `docs <docs-root>/<subtree>` when it resolves to a registered docs subtree, not an exact nested topic, and not a directory containing only `SKILL.md`
- `docs docs`
- `docs docs/<subtree>`
- `docs ./docs`
- `docs ./docs/<subtree>`
- `docs <explicit-docs-directory-path>`
- `docs <explicit-docs-path>`
- `docs <workspace-path-containing-docs>`

List docs selectors:

- `docs ls <docs-root>`
- `docs ls <docs-root>/<subtree>`
- `docs ls <docs-root> <subtree>`
- `docs ls docs`
- `docs ls docs/<subtree>`
- `docs ls docs <subtree>`
- `docs ls ./docs`
- `docs ls ./docs/<subtree>`
- `docs ls <explicit-docs-directory-path>`
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
- `docs global`
- `docs ls foo-bar`
- `docs ls foo-bar/api`
- `docs docs`
- `docs ./docs`
- `docs ls docs/foo-bar`
- `docs ngents/bun`
- `docs ls ngents bun`

Actual command(s) demonstrating the richest real form on this machine:

- `docs ls pi`
- `docs ls global`

Shape:

```md
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

```md
# Docs: foo-bar

- [no docs found]
```

Shape without topic hint:

```md
# Docs: foo-bar

## /repo/docs/foo-bar/
 - guide.md
   Foo-bar docs-root guide.
```

### 11. Document Detail

Commands:

Root docs file selectors:

- `docs <file>`
- `docs <file.md>`
- `docs <skill-only-dir>`
- `docs docs/<file>`
- `docs docs/<file.md>`
- `docs ./docs/<file.md>`
- `docs <docs-root>/<file>`
- `docs <docs-root>/<file.md>`
- `docs <docs-root>/<skill-only-dir>`
- `docs <docs-root>/<subtree>/<file>`
- `docs <docs-root>/<subtree>/<file.md>`
- `docs <explicit-markdown-path>`
- `docs <collection>/<skill-only-dir>`
- `docs <collection>/<subtree>/<skill-only-dir>`

List docs file selectors:

- `docs ls <file>`
- `docs ls <file.md>`
- `docs ls <skill-only-dir>`
- `docs ls docs/<file>`
- `docs ls docs/<file.md>`
- `docs ls docs <file>`
- `docs ls ./docs/<file.md>`
- `docs ls <docs-root>/<file>`
- `docs ls <docs-root>/<file.md>`
- `docs ls <docs-root> <file>`
- `docs ls <docs-root> <file.md>`
- `docs ls <docs-root>/<skill-only-dir>`
- `docs ls <docs-root>/<subtree>/<file>`
- `docs ls <docs-root>/<subtree>/<file.md>`
- `docs ls <docs-root> <subtree> <file>`
- `docs ls <explicit-markdown-path>`
- `docs ls <collection>/<skill-only-dir>`
- `docs ls <collection>/<subtree>/<skill-only-dir>`

Examples:

- `docs guide`
- `docs guide.md`
- `docs docs/guide`
- `docs foo-bar/guide`
- `docs foo-bar/api/endpoints.md`
- `docs ls guide`
- `docs ls foo-bar/api/endpoints.md`

Actual command(s) demonstrating the richest real form on this machine:

- `docs zod/schemas`

Shape:

```md
# Doc: Foo Bar Guide
Path: /repo/docs/foo-bar/guide.md

Foo-bar guide summary.
Read when: Need to understand foo-bar behavior.

# Foo Bar Guide

Full markdown body.

## Deep section

Detailed foo-bar content.
```

Shape with metadata only:

```md
# Doc: Foo Bar Guide
Path: /repo/docs/foo-bar/guide.md

Foo-bar guide summary.
Read when: Need to understand foo-bar behavior.
```

Shape with body only:

```md
# Doc: Foo Bar Guide
Path: /repo/docs/foo-bar/guide.md

Full markdown body.

## Deep section

Detailed foo-bar content.
```

Shape with parse error metadata:

```md
# Doc: guide.md
Path: /repo/docs/foo-bar/guide.md

[Invalid frontmatter: expected mapping]

Full markdown body.
```

## Explicit non-permutations

These are not successful topic/collection rendering permutations:

- `docs <topic>/<subtree>` is not topic focus; it is an exact nested topic, topic markdown file, or docs selector.
- `docs ls <topic>` is not topic overview; use `docs topic <topic>` for topic output.
- `docs <collection>/<file>`, `docs <collection>/<file.md>`, `docs ls <collection>/<file>`, and `docs ls <collection>/<file.md>` are not collection document detail routes; collection-qualified file selectors are not successful, but collection-qualified directories are.
- `docs topic <collection> <path>` is not collection focus; topic focus requires the first value to resolve to a topic.
- `docs foo bar` is a root selector for `foo/bar`; it is not a topic focus route.
