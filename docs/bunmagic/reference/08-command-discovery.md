---
summary: "Mirror: Command Discovery"
read_when:
  - "Need the public documentation content locally."
---

## Overview

Bunmagic discovers runnable scripts by scanning configured source directories. Each source directory can be global (scripts are available as top-level commands) or namespaced (scripts are available under a namespace prefix).

Command discovery is driven by `~/.bunmagic/config.json`, not by a hardcoded `scripts/` directory convention.

## Source Configuration

Script sources are configured in `~/.bunmagic/config.json` under `sources[]`.

Each source entry has:
- `dir` - Absolute directory to scan for scripts
- `namespace` (optional) - Command prefix for that directory

Use `bunmagic link` and `bunmagic unlink` to manage sources.

## Discovery Rules

For each configured source directory, bunmagic scans the top level (non-recursive) for supported script files:
- `*.ts`
- `*.js`
- `*.mjs`

Ignored entries:
- Files starting with `_`
- `*.d.ts`

Script slugs are derived from the filename stem and slugified.

## Command Shape

Without a namespace:
- A script with slug `my-script` is invoked as `my-script`.

With a namespace:
- A script with slug `my-script` is invoked as `my-ns my-script`.

## Binaries and `bunmagic reload`

Bunmagic links commands by creating executable wrapper scripts in `~/.bunmagic/bin`.

### Namespaced sources

For a namespaced source, `bunmagic reload` creates a single namespace bin:
- `~/.bunmagic/bin/<namespace>`

That namespace bin dispatches to scripts in the source directory at runtime. Adding or removing script files inside the source directory usually does not require running `bunmagic reload` again.

`bunmagic reload` is still required when bin wiring changes, for example:
- A source is added or removed
- A namespace changes
- The namespace bin is missing or stale
- Global alias bins need to be created or refreshed

### Non-namespaced sources

For a non-namespaced source, `bunmagic reload` creates one bin per script slug:
- `~/.bunmagic/bin/<slug>`

## Aliases

Script aliases are defined in the script docblock.

### `@alias <name>`

Adds an alternate command key.

- For non-namespaced sources, `bunmagic reload` creates a separate bin for the alias.
- For namespaced sources, the alias works within the namespace routing (no separate top-level bin).

### `@global <name>`

Creates a top-level alias that can be used without the namespace, even when the script lives inside a namespaced source.

Global aliases are linked as standalone bins in `~/.bunmagic/bin`.

## Collisions and Ordering

Source order in `~/.bunmagic/config.json` matters.

During `bunmagic reload`, bunmagic claims alias names across sources. If two scripts (or sources) would create the same bin name, later entries are skipped and a warning is printed.

## Fast Verification

Use these commands to confirm what bunmagic is resolving:

```bash
bunmagic list --info
bunmagic list my-ns --info
bunmagic which my-script
bunmagic which my-ns
bunmagic which "my-ns my-script"
cat ~/.bunmagic/config.json
```
