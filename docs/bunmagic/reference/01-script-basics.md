---
summary: "Core bunmagic script primitives: globals, args/flags, autohelp, shell, exits"
read_when:
  - Writing a new bunmagic script from scratch.
  - Need exact behavior of args, flags, argv, notMinimist, autohelp, and shell helpers.
---

## 🌍 Everything is Global!

**This is the core concept of Bunmagic:** All the utilities documented below are available as global variables in your scripts. You don't need to import anything - just use them directly!

```ts
// No imports needed! Just use the globals:
const files = await glob("*.ts")
const choice = await select("Pick one:", files)
await $`echo "You picked ${choice}"`
```

## Command Arguments

All argument parsing utilities are available as global variables:

### args
**Type:** `string[]`

Array containing all non-flag arguments passed to the script.

**Examples:**
```ts
// Running: my-script file1.txt file2.txt --verbose
console.log(args) // ["file1.txt", "file2.txt"]

// Accessing specific arguments
const [inputFile, outputFile] = args
```

### flags
**Type:** `Record<string, string | boolean | number | undefined>`

Object containing all flag arguments passed to the script.

**Examples:**
```ts
// Running: my-script --name=value --verbose -n 5
console.log(flags) // { name: "value", verbose: true, n: 5 }

// Conditional logic based on flags
if (flags.verbose) {
  console.log("Running in verbose mode")
}
```

### argv
**Type:** `Record<string, string | number | boolean | string[] | undefined>`

Combined object containing both arguments and flags in a minimist-like format. Positional arguments are available under the `_` key.

**Examples:**
```ts
// Running: my-script file1.txt file2.txt --verbose
console.log(argv) // { _: ["file1.txt", "file2.txt"], verbose: true }
```

### notMinimist()
**Usage:** `notMinimist(input: string[]): { flags: Record<string, string | number | boolean | undefined>, args: string[] }`

Parses command line arguments into structured format with flags and arguments. Used internally to generate the global `args`, `flags`, and `argv` variables.

**Parameters:**
- `input` - Array of command line argument strings

**Returns:**
- Object with `flags` property containing parsed flags and `args` property containing non-flag arguments

**Behavior:**
- Supports short flags (`-v`) and long flags (`--verbose`)
- Handles flag values with equals syntax (`--name=value`) 
- Handles flag values with space syntax (`--port 3000`)
- Automatically type casts values (strings "true"/"false" become booleans, numeric strings become integers)
- Flags without values default to `true`
- Flag values are greedy: after `--key value` or `--key=value`, additional non-flag tokens are merged until the next flag
- Repeated flags keep the last parsed value
- Short-flag grouping (`-abc`) is not split; it is parsed as a single key `abc`
- `--` is not treated as a minimist terminator; it is parsed as an empty key in flags
- `--no-*` is treated as a literal key (for example `no-color`), not automatic boolean inversion

**Examples:**
```ts
// Basic flag parsing
const result = notMinimist(["--verbose", "-n", "5", "file.txt"])
console.log(result)
// { flags: { verbose: true, n: 5 }, args: ["file.txt"] }

// Equals syntax for values
const result = notMinimist(["--name=john", "--debug", "input.txt"])
console.log(result)
// { flags: { name: "john", debug: true }, args: ["input.txt"] }

// Type casting
const result = notMinimist(["--count=10", "--enabled=true", "--disabled=false"])
console.log(result)
// { flags: { count: 10, enabled: true, disabled: false }, args: [] }

// Mixed arguments and flags
const result = notMinimist(["file1.txt", "--output", "result.txt", "file2.txt", "--verbose"])
console.log(result)
// { flags: { output: "result.txt", verbose: true }, args: ["file1.txt", "file2.txt"] }
```

## Script Documentation & Help

Bunmagic scripts can provide automatic help documentation using JSDoc comments. This makes your scripts self-documenting and provides built-in `--help` support.

### @autohelp Tag
Add `@autohelp` to your script's JSDoc comment to enable automatic `--help` handling. When users run your script with the `--help` flag, they'll see formatted documentation instead of the script executing.

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
  // When @autohelp is present, running "my-script --help" 
  // will display the documentation instead of executing this code
  
  const [input, output = "output.json"] = args
  
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
  // Custom help logic
  if (args.length === 0 || flags.help) {
    await showHelp()
    throw new Exit(0)
  }
  
  // Show help for unknown commands
  const command = args[0]
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

**Returns:**
- Promise resolving to the command output

**Examples:**
```ts
// Basic command execution
await $`ls -la`

// Capturing command output
const gitStatus = await $`git status`.text()
console.log(gitStatus)

// Handling command errors
try {
  await $`command-that-might-fail`
} catch (error) {
  console.error(`Command failed: ${error.message}`)
}

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

### die()
**Type:** `Function`

Shorthand utility to exit with an error message.

**Examples:**
```ts
// Simple error exit
die("Fatal error occurred")

// Conditional exit
if (!configFile) {
  die("Missing configuration file")
}

// With dynamic message
const missing = checkMissingDependencies()
if (missing.length > 0) {
  die(`Missing dependencies: ${missing.join(", ")}`)
}
```
