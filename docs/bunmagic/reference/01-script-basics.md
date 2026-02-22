---
summary: "Core bunmagic script primitives: globals, args/flags, autohelp, shell, exits"
read_when:
  - Writing a new bunmagic script from scratch.
  - Need exact behavior of args, flags, argv, notMinimist, autohelp, and shell helpers.
---

## Overview

In bunmagic scripts, common utilities are available as globals. This page describes the core globals used in most scripts: argument parsing, help output, shell execution, and process control.

```ts
const matches = await glob("*.ts")
const choice = await select("Pick one:", matches)
await $`echo "You picked ${choice}"`
```

## Command Arguments

Argument parsing utilities are available as globals.

Bunmagic exposes two argument APIs:

- `arg()` and `flag()` typed accessors (recommended default)
- `args` and `flags` globals (still supported, still useful)

Use `arg()`/`flag()` for explicit parsing and validation.  
Use global `flags`/`args` when quick access is clearer (for example `flags.debug` or `flags.verbose`, or when you need to mutate/iterate the full args array).

### arg()
**Usage:** `arg(index: number): TypedAccessor`

Reads one positional argument by index with typed helpers and validation.

**Examples:**
```ts
const input = arg(0).string().required("Missing input")
const retries = arg(1).int().default(3)
```

### flag()
**Usage:** `flag(name: string): TypedAccessor`

Reads one flag by name with typed helpers and validation.

**Examples:**
```ts
const format = flag("format").enum("json", "csv").default("json")
const minScore = flag("min-score")
  .number()
  .validate(value => value >= 0 && value <= 1, "min-score must be between 0 and 1")
  .optional()
```

Typed helpers available on both `arg()` and `flag()`:

- `.string()`
- `.int()`
- `.number()`
- `.boolean()`
- `.enum("a", "b", ...)`
- `.validate((value) => boolean, message?)`
- terminal methods: `.required()`, `.default(value)`, `.optional()`

### args
**Type:** `string[]`

Array containing all non-flag arguments passed to the script.

This global is fully supported and not going away. It is still the best fit for bulk operations and mutable command routing patterns.

**Examples:**
```ts
// Running: my-script file1.txt file2.txt --verbose
console.log(args) // ["file1.txt", "file2.txt"]

// Accessing specific arguments
const [inputFile, outputFile] = args
```

### passthroughArgs
**Type:** `string[]`

Array containing all tokens after a `--` terminator. These tokens are left unparsed and excluded from `args` and `flags`.

**Examples:**
```ts
// Running: my-script query -- --min-score 0.2 -n 5
console.log(args) // ["query"]
console.log(passthroughArgs) // ["--min-score", "0.2", "-n", "5"]
```

### flags
**Type:** `Record<string, string | boolean | number | undefined>`

Object containing all flag arguments passed to the script.

This global is fully supported and not going away. It is especially convenient for simple boolean toggles.

**Examples:**
```ts
// Running: my-script --name=value --verbose -n 5
console.log(flags) // { name: "value", verbose: true, n: 5 }

// Conditional logic based on flags
if (flags.debug || flags.verbose) {
  console.log("Running in verbose mode")
}
```

### argv
**Type:** `Record<string, string | number | boolean | string[] | undefined>`

Combined object containing both arguments and flags in a minimist-like format. Positional arguments are available under the `_` key, and tokens after `--` are available under the `"--"` key.

**Examples:**
```ts
// Running: my-script file1.txt file2.txt --verbose
console.log(argv) // { _: ["file1.txt", "file2.txt"], verbose: true, "--": [] }
```

### notMinimist()
**Usage:** `notMinimist(input: string[]): { flags: Record<string, string | number | boolean | undefined>, args: string[], passthroughArgs: string[] }`

Parses command line arguments into structured format with flags and arguments. Used internally to generate `args`, `flags`, `passthroughArgs`, and `argv`, and to back typed `arg()`/`flag()` reads.

**Parameters:**
- `input` - Array of command line argument strings

**Returns:**
- Object with:
  - `flags` containing parsed flags before `--`
  - `args` containing non-flag positional arguments before `--`
  - `passthroughArgs` containing all tokens after `--`

**Behavior:**
- Supports short flags (`-v`) and long flags (`--verbose`)
- Handles flag values with equals syntax (`--name=value`) 
- Handles flag values with space syntax (`--port 3000`)
- Automatically type casts values (strings "true"/"false" become booleans, numeric strings become integers)
- Flags without values default to `true`
- Flag values consume exactly one following non-flag token (`--key value`) or an inline token (`--key=value`)
- Repeated flags keep the last parsed value
- Short-flag grouping (`-abc`) is not split; it is parsed as a single key `abc`
- `--` is treated as a terminator; all following tokens are excluded from flag parsing
- `--no-*` is treated as a literal key (for example `no-color`), not automatic boolean inversion

**Examples:**
```ts
// Basic flag parsing
const result = notMinimist(["--verbose", "-n", "5", "file.txt"])
console.log(result)
// { flags: { verbose: true, n: 5 }, args: ["file.txt"], passthroughArgs: [] }

// Equals syntax for values
const result = notMinimist(["--name=john", "--debug", "input.txt"])
console.log(result)
// { flags: { name: "john", debug: true }, args: ["input.txt"], passthroughArgs: [] }

// Type casting
const result = notMinimist(["--count=10", "--enabled=true", "--disabled=false"])
console.log(result)
// { flags: { count: 10, enabled: true, disabled: false }, args: [], passthroughArgs: [] }

// Mixed arguments and flags
const result = notMinimist(["file1.txt", "--output", "result.txt", "file2.txt", "--verbose"])
console.log(result)
// { flags: { output: "result.txt", verbose: true }, args: ["file1.txt", "file2.txt"], passthroughArgs: [] }

// Double-dash terminator
const withPassthrough = notMinimist(["query", "--", "--min-score", "0.2", "-n", "5"])
console.log(withPassthrough)
// { flags: {}, args: ["query"], passthroughArgs: ["--min-score", "0.2", "-n", "5"] }
```

## Execution Model

Bunmagic prepares command routing and argument parsing before your script runs.

- The command is routed first.
- The remaining input is parsed into `args`, `flags`, `passthroughArgs`, and `argv`.
- `arg()`/`flag()` read from the same parsed runtime values.

Inside the script, `arg(0)` / `args[0]` is the first CLI argument passed to the command, not the command name.

**Example:**
```ts
// CLI invocation:
// my-ns my-command input.txt --dry
//
// Inside the script:
console.log(args)  // ["input.txt"]
console.log(flags) // { dry: true }
```

If `--help` is passed and the script has `@autohelp`, help output is shown and execution exits before the script's default function runs.

Top-level module code still runs on import. Keep side effects inside your exported function for predictable behavior.

## Script Documentation & Help

Scripts can provide automatic help output via JSDoc tags.

### @autohelp Tag
Add `@autohelp` to enable automatic `--help` handling.

**Example:**
```ts
/**
 * Process and transform data files
 * @autohelp
 * @usage my-script <input-file> [output-file] [options]
 * @flag --format <type> Output format (json, csv, xml)
 * @flag --verbose Show detailed processing information
 * @flag --dry-run Preview changes without writing files
 * @alias transform
 */
export default async function() {
  const input = arg(0).string().required("Input file is required")
  const output = arg(1).string().default("output.json")

  if (flags.verbose) {
    console.log(`Processing ${input}...`)
  }

  // ... rest of script
}
```

### Available JSDoc Tags

- **`@autohelp`** - Enable automatic --help handling for the script
- **`@usage <example>`** - Show usage examples in help output
- **`@flag <name> <description>`** - Document command-line flags
- **`@alias <name>`** - Create command aliases (can be used multiple times)
- **`@global <name>`** - Create a global alias bin for a namespaced script

### Docblock Placement

Place your script docblock as the first JSDoc comment near the top of the file.

Bunmagic reads metadata from the first script docblock. If the metadata block is missing or placed too late, tags like `@autohelp`, `@usage`, and aliases may not be detected.

### showHelp()
**Type:** `Function`

Display help information for the current script programmatically. Useful when you want custom help behavior or need to show help in response to specific conditions.

**Examples:**
```ts
/**
 * Advanced file processor
 * @usage processor <command> [options]
 * @flag --config <path> Configuration file path
 */
export default async function() {
  const command = arg(0).string().optional()
  if (!command || flags.help) {
    await showHelp()
    throw new Exit(0)
  }

  if (!['process', 'validate', 'convert'].includes(command)) {
    await showHelp()
    throw new Exit(`Unknown command: ${command}`)
  }

  // ... rest of script
}
```

### Help Output Format

When help is displayed (either via `@autohelp` or `showHelp()`), it shows:

1. **Script name** - The command name in bold
2. **Description** - Main script description from JSDoc
3. **Usage** - Usage examples from `@usage` tags
4. **Flags** - All documented flags from `@flag` tags
5. **Aliases** - Alternative command names from `@alias` tags

**Example output:**
```
  my-script
  Process and transform data files

  Usage:
    my-script <input-file> [output-file] [options]

  Flags:
    --format <type> - Output format (json, csv, xml)
    --verbose - Show detailed processing information
    --dry-run - Preview changes without writing files

  Aliases: transform
```

## Shell Execution

### $ (Shell Commands)
**Type:** `Function`

Bun's shell API is available globally as `$`, allowing you to execute shell commands directly from your scripts.

**Behavior:**
- Awaiting `$` throws on non-zero exit codes.
- `.quiet()` suppresses live output.
- `.nothrow()` disables throwing and returns an output object with `stdout`, `stderr`, and `exitCode`.
- `.text()` captures stdout and returns it as a string (instead of streaming output).
- `.json()` captures stdout and parses it as JSON. It can throw if stdout is not valid JSON.

**Returns:**
- A Bun shell object. Await it to enforce exit status handling.

**Examples:**
```ts
// Basic command execution
await $`ls -la`

// Capturing command output
const gitStatus = await $`git status`.text()
console.log(gitStatus)

// Parsing JSON output
const pkg = await $`cat package.json`.json()
console.log(pkg.name)

// Handling command errors
try {
  await $`command-that-might-fail`
} catch (error) {
  console.error(`Command failed: ${error.message}`)
}

// Non-throwing capture
const result = await $`ls /path/that/does/not/exist`.quiet().nothrow()
const output = result.stdout.length > 0 ? result.stdout.toString() : result.stderr.toString()
console.log(result.exitCode, output)

// Piping commands
await $`find . -type f -name "*.ts" | grep -v "node_modules"` 
```

### $get()
**Usage:** `$get(...properties: Parameters<typeof $>): Promise<string>`

Runs a shell command and returns the result as text. If stdout is non-empty, it returns stdout text; otherwise it returns stderr text.

`$get` throws if the command exits with a non-zero status (same behavior as `$`).

**Parameters:**
- `...properties` - Same parameters as the `$` command (template literal or command string)

**Returns:**
- Promise resolving to stdout text if stdout is non-empty, otherwise stderr text

**Examples:**
```ts
// Get command output as text (when the command succeeds)
const gitBranch = await $get`git branch --show-current`
console.log(`Current branch: ${gitBranch.trim()}`)

// $get throws on command failure
try {
  await $get`ls nonexistent-directory`
} catch (error) {
  console.error("Command failed")
}

// Non-throwing output capture (Bun shell API)
const result = await $`ls nonexistent-directory`.quiet().nothrow()
const output = result.stdout.length > 0 ? result.stdout.toString() : result.stderr.toString()
console.log(output)
```

## Process Control

### Exit
**Type:** `class`

Utility for exiting a script.

- `throw new Exit(0)` exits with status code `0`.
- `throw new Exit(<value>)` exits with status code `1` and prints `<value>`.

**Guidance:**
- Return normally to continue execution.
- Throw `Exit` to stop execution and set an exit code (and optionally print a message).
- Prefer `throw new Exit("...")` for user-facing failures.

**Examples:**
```ts
// Exit successfully
throw new Exit(0)

// Exit with an error message (status code 1)
throw new Exit("Configuration error")

// Exit with an underlying error object (status code 1)
try {
  await $`command-that-might-fail`
} catch (error) {
  throw new Exit(error)
}
```
