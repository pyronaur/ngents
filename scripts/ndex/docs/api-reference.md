---
summary: "Complete ndex API reference: CLI commands, command contract shape, exit behavior, and module entrypoints."
read_when:
  - Need exact command and flag contracts for ndex.
  - Integrating wrapper tooling around the ndex program.
  - Extending ndex with additional command modules.
---

# ndex API Reference

This document defines every API surface in this repository:

- CLI commands and flags
- Commander parsing and help behavior
- Zod option-contract behavior
- Exit codes
- TypeScript module exports and extension points

## 0) Package And Install Surface

Package root: `scripts/ndex`

Install and expose the CLI with npm:

```bash
npm install
npm link
```

## 1) CLI API

Entry point: `ndex` (`bin/ndex.ts`).

### 1.1 Commands

- `ndex`
- `ndex ls [topic] [section] [--expand] [--global]`
- `ndex query [--limit <n>] <query...>`
- `ndex query status`

### 1.2 Global/help behavior

- `ndex` prints top-level help.
- `ndex --help` prints top-level help.
- `ndex help` prints top-level help.
- `ndex help <command>` prints command usage.
- `ndex <command> --help` prints usage for that command.

### 1.3 Command outputs

`ls`:

- browses local or global docs roots, topics, and sections

`query`:

- prints formatted global QMD search results
- supports `status` as the single-word inspection mode

## 2) Commander + Zod Command Contract API

Dispatcher builds a Commander program in `src/core/command-dispatch.ts` and registers command definitions from `src/commands/index.ts`.

Each command definition uses:

- `path` as `readonly [string, ...string[]]`
- `description`
- `configure(command)` for Commander options
- `optionsSchema` (Zod)
- `run({ projectDir, args, options })`

`run` receives positional `args` plus `options` typed from `optionsSchema`.

Hierarchy examples:

- One-level: `path: ["ls"]` => `ndex ls`
- One-level: `path: ["query"]` => `ndex query`
- Three-level paths are still supported by the shared command contract.

Command definitions are declared with `defineCommand(...)` and registered via `registerCommand(...)` in `src/core/command-definition.ts`.

Validation behavior:

- Commander parses CLI args/options.
- Parsed options are validated through command `optionsSchema`.
- Validation failures are treated as usage errors.
- Runtime command errors are treated as runtime errors.

## 3) Exit Codes

- `0` success (`EXIT_SUCCESS`)
- `1` runtime error (`EXIT_RUNTIME_ERROR`)
- `2` usage error (`EXIT_USAGE_ERROR`)

## 4) TypeScript Module Surfaces

### 4.1 CLI entry

- `src/core/command-dispatch.ts`
  - `runNdexCli(argv, projectDir)`
  - `runNdexCliFromProcess()`

### 4.2 Command contract layer

- `src/core/command-definition.ts`
  - `defineCommand`
  - `registerCommand`

### 4.3 Commands

- `src/commands/ls.ts` => `lsCommand`
- `src/commands/query.ts` => `queryCommand`
- `src/commands/index.ts` => `commandDefinitions`

### 4.4 Shared runtime

- `src/core/errors.ts` => `NdexError`, usage/runtime error helpers
- `src/core/contracts.ts` => shared command definition/run context types
