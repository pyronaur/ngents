---
summary: "Complete ndex API reference: CLI commands, help behavior, metadata fields, and module entrypoints."
read_when:
  - Need exact command and flag contracts for ndex.
  - Integrating wrapper tooling around the ndex program.
  - Extending ndex with additional command modules.
---

# ndex API Reference

This document defines the public ndex API surface.

## Package and install surface

Package root: `scripts/ndex`

Install and expose the CLI with npm:

```bash
npm install
npm link
```

## CLI API

Entry point: `ndex` (`bin/ndex.ts`).

### Commands

- `ndex`
- `ndex --help`
- `ndex help`
- `ndex ls [where]`
- `ndex topic [topic] [section]`
- `ndex query [--limit <n>] <query...>`
- `ndex query status`

### Help behavior

- `ndex` prints compact Markdown help with command walkthrough, merged topic index, and merged docs index.
- `ndex --help` prints the same Markdown help style without the docs index.
- `ndex help` prints the same Markdown help style without the docs index.
- `ndex help <command>` prints Commander command usage.
- `ndex <command> --help` prints usage for that command.

### Browse behavior

`ls`:

- browses docs only
- merges local and global docs by default
- accepts `.`, `global`, `./docs/...`, and `docs/...` selectors
- treats `./docs/...` as a project-only subtree selector
- treats bare `docs/...` as a merged local/global subtree selector
- prints expanded doc descriptions

`topic`:

- browses topics only
- merges same-name local and global topic contributions
- accepts an optional section selector

`query`:

- prints formatted global QMD search results
- supports `status` as the inspection mode

## Metadata fields

For markdown docs and `.ndex.md`:

- `title` sets the display title
- `short` sets the compact one-line description
- `summary` sets the fuller expanded description
- `read_when` adds expanded browse hints

Compact ndex output prefers `short`, then falls back to `summary`.

## Commander + Zod command contract

Dispatcher builds a Commander program in `src/core/command-dispatch.ts` and registers command definitions from `src/commands/index.ts`.

Each command definition uses:

- `path` as `readonly [string, ...string[]]`
- `description`
- `configure(command)` for Commander options
- `optionsSchema` (Zod)
- `run({ projectDir, args, options })`

`run` receives positional `args` plus `options` typed from `optionsSchema`.

Command definitions are declared with `defineCommand(...)` and registered via `registerCommand(...)` in `src/core/command-definition.ts`.

Validation behavior:

- Commander parses CLI args/options.
- Parsed options are validated through command `optionsSchema`.
- Validation failures are treated as usage errors.
- Runtime command errors are treated as runtime errors.

## Exit codes

- `0` success (`EXIT_SUCCESS`)
- `1` runtime error (`EXIT_RUNTIME_ERROR`)
- `2` usage error (`EXIT_USAGE_ERROR`)

## TypeScript module surfaces

### CLI entry

- `src/core/command-dispatch.ts`
  - `runNdexCli(argv, projectDir)`
  - `runNdexCliFromProcess()`

### Command contract layer

- `src/core/command-definition.ts`
  - `defineCommand`
  - `registerCommand`

### Commands

- `src/commands/ls.ts` => `lsCommand`
- `src/commands/topic.ts` => `topicCommand`
- `src/commands/query.ts` => `queryCommand`
- `src/commands/index.ts` => `commandDefinitions`

### Shared runtime

- `src/runtime/help.ts` => root help rendering
- `src/runtime/browse.ts` => docs browsing
- `src/runtime/topic.ts` => topic browsing
- `src/runtime/query.ts` => query execution and formatting
- `src/runtime/browse-discovery.ts` => docs and topic discovery
- `src/runtime/browse-render.ts` => help, docs, and topic rendering

Root help Liquid markdown template: `templates/root-help.md`
