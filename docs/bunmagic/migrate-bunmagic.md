---
summary: "Playbook for migrating Bunmagic scripts with the smallest consistent native or npm replacement per feature."
read_when:
  - Migrating a Bunmagic script to plain Bun or Bunmagic v2.
  - Need the default choice for flags, globbing, frontmatter, or shared helpers.
---

# Bunmagic Migration Playbook

## Goal

Pick the smallest consistent solution for each Bunmagic feature.

Decision order:

1. Native Bun or modern Node in a couple of lines.
2. Small focused npm package.
3. Tiny shared package only when the same wrapper keeps repeating across projects.

## Current Defaults

### Native First

- Shell: `import { $ } from "bun"`
- Current directory: `process.cwd()`
- Paths: `node:path`
- File reads and writes: `Bun.file(...)`, `Bun.write(...)`
- Directories, stats, rename, remove, copy: `node:fs/promises`
- Process exit: `process.exit(code)` or a tiny local `fail(message)` helper

### Small Packages

- Flags and argv:
  - Prefer `node:util.parseArgs` when strict option schemas help readability.
  - Consider `mri` when the script only needs a few lightweight flags.
- Globbing:
  - Prefer `tinyglobby` when a script needs real globbing.
  - Use `Bun.Glob` when the usage is trivial and local.
- Clipboard:
  - Use `pbcopy` for machine-local macOS scripts.
  - Use `clipboardy` when portability matters.

## Feature Mappings

### `flags`, `arg()`, `flag()`

- Default to `parseArgs(...)` for strict migrations.
- Use `mri` when the native config is more boilerplate than value.
- Do not recreate Bunmagic globals in each repo.
- Extract a tiny shared argv package only after a real repeated pattern appears.

### `cwd()`

- Replace with `process.cwd()`.

### `Exit`

- Replace with normal control flow.
- Use `process.exit(...)` for explicit exit codes.
- Use a tiny local helper for user-facing fatal errors if needed.

### `glob()`

- Prefer `tinyglobby` for most migrations.
- Keep `Bun.Glob` in mind for very small one-file cases.

### `SAF` and `files.*`

- Replace with `Bun.file(...)`, `Bun.write(...)`, and `node:fs/promises`.
- Keep collision-safe naming or temp-file helpers local until a repeated pattern proves worth extracting.

## Frontmatter Pattern

When a script only needs simple YAML frontmatter:

1. Check whether the first line is `---`.
2. Find the matching closing `---`.
3. Parse the middle section with `YAML.parse(...)`.
4. If parsing fails, return `null`.
5. Treat the rest of the file as the body.

This is usually simpler than adding a frontmatter package.

## Shared Package Threshold

Create a tiny shared package only when all of these are true:

- The same helper appears in multiple repos.
- The wrapper stays smaller than the cognitive load of repeated inline code.
- The package surface is obvious and stable.

Good candidates:

- `@pyronaur/argv` or `@pyronaur/cli-lite`
- small collision-safe path helpers
- small frontmatter helpers if the pattern repeats enough

Bad candidates:

- `cwd`
- `exit`
- wrappers around one-line Bun or Node APIs

## Wishlist

Track these before building anything:

- small typed argv ergonomics with low ceremony
- consistent help output for tiny scripts
- subcommand layout that stays readable without a framework
- prompt and spinner replacements only if a real migration needs them
- frontmatter helper only if the inline pattern starts repeating

## Keep or Trim Old Bunmagic Docs

Keep the minimum backward-reference set while migration is active:

- `docs/bunmagic/bunmagic-101.md`
- any narrowly useful migration notes that still answer real rewrite questions

Trim or archive granular Bunmagic docs after this playbook absorbs their remaining value.
