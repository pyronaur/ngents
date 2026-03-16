---
title: BMT
summary: "Canonical guide for using `bmt` to manage and run plain script commands."
read_when:
  - Setting up or validating `bmt` on a machine.
  - Linking script directories into `bmt`.
  - Writing new scripts that should run through `bmt`.
---

## BMT

`bmt` is a command runner that turns linked directories of plain scripts into discoverable shell commands.

It links a directory, indexes its top-level files, and lets you run them as commands named after the file.

`bmt` stands for `Bunmagic Version Two`. It is still in development, and it is how we manage scripts on this machine.

If you are moving older Bunmagic scripts to `bmt`, use `docs/bunmagic/migrate-bunmagic.md`.

## Demo

Put two plain files in `./scripts`:

```ts
// ./scripts/simple.ts
console.log("hello");
```

```ts
// ./scripts/args.ts
/**
 * Print a name.
 * @autohelp
 * @usage args <name> [--upper]
 * @flag --upper Print the name in uppercase
 */
import mri from "mri";

const parsed = mri(process.argv.slice(2), { boolean: ["upper"] });
const [name = "world"] = parsed._.map(String);
console.log(parsed.upper ? name.toUpperCase() : name);
```

```bash
# Link the directory globally
$ bmt link ./scripts
Linked source: /absolute/path/to/scripts.

$ bmt which simple
/absolute/path/to/scripts/simple.ts

$ simple
hello

$ args world
world

$ args world --upper
WORLD

# Inspect what is linked
$ bmt sources
# Look for an entry like:
# (global)  /absolute/path/to/scripts

$ bmt list --info
# Look for a section like:
# ◈ Scripts: /absolute/path/to/scripts
# · args                 Print a name.
#   <name> [--upper]
#   --upper              Print the name in uppercase
# · simple

# Unlink the directory
$ bmt unlink ./scripts
Unlinked source: ./scripts.

$ bmt sources
# The ./scripts entry is gone.

# Link the same directory under a namespace
$ bmt link ./scripts --ns demo
Linked source: /absolute/path/to/scripts.

$ bmt which demo simple
/absolute/path/to/scripts/simple.ts

$ demo simple
hello

$ demo args world --upper
WORLD
```

That flow shows the main contract:

- top-level files become commands named after the filename
- `bmt sources`, `bmt list --info`, and `bmt which ...` are the quickest checks when wiring looks wrong
- namespacing changes the invocation shape to `demo simple` instead of `simple`
- argument parsing stays normal script code because `bmt` does not replace `process.argv`

Use `bmt reload` to rebuild the index. Use `bmt reload --force` only when you intentionally want `bmt` to overwrite unmanaged colliding shims.

Common invalid assumptions:

- Putting scripts in nested folders and expecting discovery
- Expecting files without a supported mapped extension to appear as commands
- Expecting `bmt` to infer command names from anything other than the filename
- Expecting local `node_modules/.bin` directories to be prepended to `PATH`

## Writing Scripts For bmt

Write scripts as plain runtime files first.

Default shape:

- use `.ts`, `.js`, `.mjs`, or another supported mapped extension
- rely on extension-based runtime mapping for normal scripts
- do not add a shebang unless there is no other way
- prefer native Bun and Node APIs
- keep script dependencies local to the package that owns the scripts

The demo above already shows the default script shape: a minimal file and a file that parses `process.argv` with `mri`.

Shell command example:

```ts
import { $ } from "bun";

await $`git status --short`;
```

For shell usage, prefer Bun Shell over custom process wrappers.
Reference: `docs/bun/bun-shell.md`

For file reads, writes, and filesystem operations, prefer Bun and Node-native APIs.
Reference: `docs/bun/file-system-compact.md`

## Command Metadata

Metadata is optional and comes from the first docblock in the file.

Supported tags:

- `@autohelp`
- `@usage`
- `@flag`
- `@alias`
- `@global`

Example:

```ts
/**
 * Show current docs index.
 * @autohelp
 * @usage docs ls [where]
 */
```

Notes:

- `@autohelp` enables `--help` interception for that script
- `@alias` adds alternate command names
- `@global` changes command naming only

## Dependencies

`bmt` does not require a special script framework.

Treat script directories as normal package-owned code:

- add dependencies in the package that owns the scripts
- keep runtime choices small and explicit
- prefer native Bun or Node APIs before adding packages

For recommended package and API choices, start here:

- `docs/bun/bun-shell.md`
- `docs/bun/file-system-compact.md`

## Debugging

Start with `bmt doctor`, `bmt sources`, `bmt list --info`, and `bmt which <command>` to inspect setup, linked sources, indexed commands, and source resolution.

Enable debug logging with `BUNMAGIC_DEBUG=1 <command>` when you need runtime detail from a specific command.
