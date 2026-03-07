---
summary: "Playbook for migrating Bunmagic scripts with the smallest consistent native or npm replacement per feature."
read_when:
  - Migrating a Bunmagic script to plain Bun or Bunmagic v2.
  - Need the default choice for flags, globbing, frontmatter, or shared helpers.
---

# Bunmagic Migration Playbook

## Goal

Pick the smallest consistent solution for each Bunmagic feature.

Bunmagic v1 migrations happen one namespace at a time.
Treat the current Bunmagic namespace root as the migration unit.
If that root does not have a `package.json`, initialize it as a Bun package before migrating scripts inside it.

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
  - Standardize on `mri` for migrated script argument parsing.
  - Install it with Bun commands in the namespace root instead of hand-writing `package.json`.
- Globbing:
  - Prefer `tinyglobby` when a script needs real globbing.
  - Use `Bun.Glob` when the usage is trivial and local.
- Clipboard:
  - Use `pbcopy` for machine-local macOS scripts.
  - Use `clipboardy` when portability matters.

## Feature Mappings

### `flags`, `arg()`, `flag()`

- Default to `mri`.
- Use the same parser across migrated namespaces for consistency, even when native parsing would also work.
- From the namespace root, run:

```sh
bun init --minimal --yes
bun add mri
```

- Do not hand-write `package.json` or dependency entries for this setup.
- Do not recreate Bunmagic globals in each repo.
- Extract a tiny shared argv package only after a real repeated pattern appears.
- Do not add runner-detection glue, dual-mode argv shims, or per-script help parsing.

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

## Namespace Root Setup

When migrating a Bunmagic v1 namespace:

1. Identify the current namespace root directory.
2. If it does not contain `package.json`, run `bun init --minimal --yes` in that directory.
3. Install `mri` with `bun add mri` in that same directory.
4. Migrate scripts in that namespace against the package root you just initialized.
5. If the repo does not already ignore the nested package install, add an ignore rule for that namespace root's `node_modules/`.

`bun init --yes` creates extra starter files that are not useful for this migration flow.
Prefer `bun init --minimal --yes` because it creates the smallest Bun package shape:

- `package.json`
- `tsconfig.json`
- `bun.lock`

## Current v1 Namespace Argv Shape

Current Bunmagic v1 namespace shims do not pass plain script args through unchanged.

Observed with:

```sh
nconf argv alpha --flag bravo -- tail
```

Current namespace execution produced:

```json
[
  "~/.bun/bin/bun",
  "/path/to/bunmagic-exec-namespace.ts",
  "/path/to/namespace-root",
  "nconf",
  "argv",
  "alpha",
  "--flag",
  "bravo",
  "--",
  "tail"
]
```

Direct Bun execution of the same script produced:

```json
[
  "~/.bun/bin/bun",
  "/path/to/argv.ts",
  "alpha",
  "--flag",
  "bravo",
  "--",
  "tail"
]
```

Practical consequence:

- current v1 namespace scripts need a small bridge if they must run both through the existing v1 namespace shim and directly with `bun run`
- do not treat the v1 namespace-runner argv shape as the target contract for Bunmagic v2 migrations

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
