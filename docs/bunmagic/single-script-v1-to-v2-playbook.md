---
summary: "Self-contained happy-path guide for migrating any single Bunmagic v1 script to Bunmagic v2."
read_when:
  - Migrating one Bunmagic script from v1 to v2.
  - Moving a script from one source path to another.
  - Migrating a script in place inside the same repo or directory tree.
  - Preserving an existing top-level command name with `@global`.
---

# Single-Script Bunmagic v1 -> v2 Playbook

Use this guide as the working contract for migrating one script from Bunmagic v1 to Bunmagic v2.

This guide covers:

- moving a script from one repo to another
- moving a script between source directories in the same repo
- migrating a script in place inside its current repo

## Runtime Split

Treat the runtimes like this during migration work:

- `bm`: legacy Bunmagic v1 command surface already installed on the machine
- `bmt`: Bunmagic v2 CLI used for linking, reloads, and verification

Do not switch the machine-wide `bunmagic` install just to migrate one script.

## Terms

- source file: the current v1 script file
- source root: the Bunmagic v1 directory that currently exposes that script
- target package root: the Bun package that will own the migrated script
- target source path: the directory Bunmagic v2 scans for command files
- target namespace: the namespace linked to the target source, or `null` for a global source

The migration can land in any of these shapes:

- same file path rewritten for v2 use
- same repo, different directory
- different repo, different directory

## Happy Path Outcome

The migration is complete when all of these are true:

- the v1 source of truth is gone
- the v2 source of truth exists in the target source path
- `bmt which <namespace> <command>` resolves to the migrated file when the target is namespaced
- `bmt which <command>` resolves to the migrated file when the command is top-level
- the shell command still behaves the same from the outside

If the migrated file lives in a namespaced v2 source and must still be callable without the namespace:

- put `@global <name>` in the first docblock
- verify `bmt which <name>`

## Pick The Target Shape First

Before editing, decide which of these you are doing:

### Move to a different v2 package

Use this when the script is changing ownership.

Example shape:

- v1 source file: `/old/source/foo.ts`
- v2 target package root: `/new/package`
- v2 target source path: `/new/package/scripts`

### Move within the same repo

Use this when the repo stays the same but the Bunmagic ownership changes.

Example shape:

- v1 source file: `/repo/legacy/foo.ts`
- v2 target source path: `/repo/scripts/foo.ts`

### Migrate in place

Use this when the file can stay where it is, and the surrounding directory is becoming or already is a Bunmagic v2 source.

Example shape:

- v1 source file: `/repo/scripts/foo.ts`
- v2 target source path: `/repo/scripts`

For in-place migrations, the script file path may stay the same while the runtime contract changes from v1 to v2.

## Command Syntax Contract

Use these Bunmagic v2 forms:

```sh
bmt link <directory> --ns <namespace>
bmt link <directory>
bmt reload --force
bmt list --info
bmt which <namespace> <command>
bmt which <command>
bmt run <namespace> <command> <args...>
bmt run <command> <args...>
```

Rules:

- split namespace and command into separate tokens
- do not quote `<namespace> <command>` as one string
- use `bmt which <command>` for a top-level command or `@global` alias
- use `bmt which <namespace> <command>` for a namespaced command

Examples:

```sh
bmt which tools cleanup
bmt which cleanup
bmt run tools cleanup --dry-run
bmt run cleanup --dry-run
```

## Package And Runtime Defaults

Pick the smallest consistent solution.

Decision order:

1. native Bun or modern Node in a couple of lines
2. a small focused package
3. a tiny shared helper only when the same pattern repeats enough to justify it

### Native-first mode

Use this for small commands and straightforward rewrites.

Defaults:

- shell: `import { $ } from 'bun'`
- current directory: `process.cwd()`
- paths: `node:path`
- file IO and filesystem ops: `node:fs/promises`
- failure handling: `process.exit(...)` or a small local `fail(...)`

Small package defaults:

- args and flags: `mri`
- real globbing: `tinyglobby`
- machine-local clipboard on macOS: `pbcopy`
- portable clipboard: `clipboardy`

### Globals-compatibility mode

Use this when rewriting to native APIs is not worth the migration risk yet.

Opt in explicitly:

```ts
import 'bunmagic/globals';
```

Rules:

- add the import only in files that actually need Bunmagic globals
- remove root-package imports from `bunmagic` for globals-like values
- keep this as a compatibility bridge, not the default style

### Interactive prompts and spinners

There is no default replacement package documented here for interactive prompts or spinners.
Only add one when the script really needs it.

## Step 1: Prove Current Behavior

Capture the current command behavior before changing anything.

Record:

- stdout
- stderr
- exit code
- observable side effects

Use the outermost surface.
Do not start with implementation-detail tests.

Useful probes:

```sh
bm which <command>
which <command>
<command> --help
<command> <safe-args...>
```

If the command mutates files, network state, or external tools, create a safe fixture path and prove behavior there first.

## Step 2: Inspect Current And Target Wiring

Confirm:

- where the v1 script currently lives
- whether the target package already exists
- whether the target source path is already linked in v2
- whether the target source is namespaced or top-level

Useful checks:

```sh
bm which <command>
bmt sources
bmt list --info
```

Interpretation:

- `bm which <command>` shows the current v1 source
- `bmt sources` shows linked v2 source directories and namespaces
- `bmt list --info` shows the commands Bunmagic v2 already sees

## Step 3: Prepare The Target v2 Source

The target source must be a Bun package.

If the target package root does not exist yet as a Bun package:

```sh
cd /path/to/target-package-root
bun init --minimal --yes
```

Install only what the migrated script actually needs.

Common package setup:

```sh
cd /path/to/target-package-root
bun add mri
```

If the target source path is not linked in Bunmagic v2 yet:

```sh
bmt link /path/to/target-source --ns <namespace>
```

For a top-level v2 source:

```sh
bmt link /path/to/target-source
```

## Step 4: Remove Or Replace The v1 Source Of Truth

Use recoverable delete when the file is moving or being removed.

```sh
trash /path/to/old-script.ts
```

If the migration is in place, replace the file contents instead of deleting the path.

The key rule is:

- after the migration, there must be only one source of truth for the script

## Step 5: Add The v2 Script

Create or rewrite the script in the target source path.

Rules:

- keep the first docblock at the top of the file
- use `@global <name>` when preserving a top-level command name from a namespaced source
- keep the script small and direct
- prefer native Bun and Node APIs unless globals compatibility is clearly cheaper

Generic namespaced example that preserves a top-level command:

```ts
/**
 * Describe what the command does.
 * @global my-command
 */
import { $ } from 'bun';

console.log('replace with real script logic');
```

Generic globals-compatibility example:

```ts
import 'bunmagic/globals';

/**
 * Describe what the command does.
 * @global my-command
 */

console.log('replace with real script logic');
```

Use `@global` only when the command must still work without the namespace.

## Step 6: Reload Bunmagic v2

Reload after the new file exists.

```sh
bmt reload --force
```

Use `--force` when an existing shim or alias needs to be replaced by the v2-managed result.

## Step 7: Validate Resolution

Run the checks that match the target shape.

For a namespaced target:

```sh
bmt which <namespace> <command>
```

For a top-level target:

```sh
bmt which <command>
```

For a namespaced target that preserves a top-level alias:

```sh
bmt which <namespace> <command>
bmt which <command>
```

Also check:

```sh
which <command>
bmt list --info
```

Expected result:

- Bunmagic v2 resolves the migrated file from the intended route
- the top-level alias resolves when `@global` is present
- `which <command>` points at `~/.bunmagic/bin/<command>` for a shell-exposed command

## Step 8: Re-run The Black-Box Check

Run the same command-level check you captured before the migration.

Compare:

- stdout
- stderr
- exit code
- side effects

If the command accepts args, validate the supported user path, not just the empty-args case.

## Step 9: Run Target-Package Validation

Run package-local checks in the target package root.

Typical minimum:

```sh
cd /path/to/target-package-root
bun x tsc --noEmit
git status --short
```

If the package has stricter checks, use those instead.

If unrelated pre-existing failures appear, separate them from the migration unless they block the script from working.

## Step 10: Commit Per Repository

If the migration touched more than one Git repo, commit them separately.

Typical split:

- target v2 package repo: add or rewrite the migrated script
- legacy repo: delete the old v1 script

Do not bundle cross-repo changes into one commit plan.

For in-place migrations inside one repo, a single commit is fine if the diff is focused.

## Agent Checklist

- prove current behavior first with a black-box check
- identify source file, source root, target package root, target source path, and target namespace
- decide whether the migration is cross-repo, same-repo, or in-place
- ensure the target package root is a Bun package
- link the target source in Bunmagic v2 if needed
- pick native-first or globals-compatibility mode intentionally
- remove or replace the v1 source of truth
- add or rewrite the v2 script in the target source path
- put `@global <name>` in the first docblock when preserving a top-level command name from a namespaced source
- run `bmt reload --force`
- verify `bmt which` for the intended route
- re-run the black-box check
- run target-package validation
- commit each affected Git repo separately when the migration spans repos
