---
summary: "bunmagic terminal UX helpers: prompts, spinner, ansis styling, and CLI cursor control"
read_when:
  - Building interactive terminal flows in bunmagic scripts.
  - Need prompt/spinner or low-level CLI rendering controls.
---

## Overview

This page describes terminal UI and prompt helpers available as globals in bunmagic scripts.

## Common Behaviors

- Prompt APIs require an interactive terminal. Behavior differs between APIs (see `**Errors:**` per entry).
- `CLI` writes ANSI escape sequences to stdout. When stdout is not a TTY, the escape sequences are still written.
- `CLI.raw()` and `CLI.stream()` call `process.stdin.setRawMode(...)`. When stdin is not a TTY, `setRawMode` may throw.

## Non-Interactive / TTY Environments

Interactive prompt helpers (`ask`, `select`, `getPassword`, `autoselect`) assume a TTY and raw terminal input.

When stdin is not a TTY (for example CI, redirected input, or piped commands), guard prompt usage:

```ts
if (!process.stdin.isTTY) {
  throw new Exit("Interactive prompt requires a TTY")
}

const value = await ask("Enter value", "default")
console.log(value)
```

## Interactive Prompts

### ack()
**Usage:** `ack(question: string, defaultAnswer: 'y' | 'n' = 'y'): boolean`

Asks a Yes/No question and waits for user input synchronously.

The prompt shows `[Y/n]` when the default answer is `'y'`, and `[y/N]` when the default answer is `'n'`.

**Parameters:**
- `question` - The question text to display
- `defaultAnswer` - Default answer to use when the user provides no input

**Returns:**
- `true` if the user enters `y` (case-insensitive)
- `false` otherwise

**Examples:**
```ts
// Basic confirmation
const proceed = ack("Continue with installation?")
if (proceed) {
  console.log("Installing...")
} else {
  console.log("Cancelled")
}

// With default option
const overwrite = ack("Overwrite existing file?", "n") // Default to no
if (overwrite) {
  await $`rm -f ./file.txt`
}

// In a workflow
if (ack("Add remote origin?", "y")) {
  const remote = await ask("Enter remote URL:")
  await $`git remote add origin ${remote}`
}
```

### ask()
**Usage:** `ask(question: string, defaultAnswer?: string, handle?: 'required' | 'use_default' | ((answer: string | undefined) => Promise<string>)): Promise<string>`

Prompts the user for text input.

The prompt text supports a small CLI markdown subset:
- `**bold**`
- `__dim__`

**Parameters:**
- `question` - The prompt text to display
- `defaultAnswer` - Placeholder text shown in the input line (default: `''`)
- `handle` - Response handling mode:
  - `'required'` - Rejects empty or whitespace-only answers
  - `'use_default'` - Returns `answer ?? defaultAnswer`
  - Async function - Receives the current answer and returns the final value (or throws to reject)

**Returns:**
- Promise resolving to the final answer string

**Errors:**
- Throws `Exit` when interrupted (Ctrl+C)

**Examples:**
```ts
// Basic text input
const name = await ask("What is your name?")
console.log(`Hello, ${name}!`)

// Require non-empty input
const branch = await ask("Branch name", "", "required")
await $`git checkout -b ${branch}`

// Treat empty input as default via a custom handler
const commitMsg = await ask("Commit message", "wip", async (answer) => {
  const trimmed = answer?.trim()
  return trimmed ? trimmed : "wip"
})
await $`git commit -m ${commitMsg}`
```

### getPassword()
**Usage:** `getPassword(message: string): Promise<string>`

Prompts the user for a password with masked input.

**Parameters:**
- `message` - The prompt text to display

**Returns:**
- Promise resolving to the entered password

**Examples:**
```ts
// Basic password input
const password = await getPassword("Password:")

// Custom prompt
const apiKey = await getPassword("Enter API key:")

// Authentication flow
const username = await ask("Username:")
const password2 = await getPassword("Password:")
const success = await authenticate(username, password2)
```

### select()
**Usage:** `select<T extends string>(message: string, options: T[] | { value: T; label: string }[]): Promise<T>`

Displays an interactive selection menu and returns the selected value.

**Parameters:**
- `message` - The prompt text to display
- `options` - Options to choose from:
  - String options: the string is displayed and returned
  - `{ value, label }` options: `label` is displayed and `value` is returned

**Returns:**
- Promise resolving to the selected option value

**Errors:**
- Throws `Exit` when interrupted (Ctrl+C)
- Throws `Error` when cancelled (Escape)

**Examples:**
```ts
// Basic selection
const options = ["typescript", "javascript", "python"] as const
const language = await select("Choose a language:", options)
console.log(`Selected ${language}`)

// Return stable values with custom labels
const target = await select("Deploy target:", [
  { value: "prod", label: "Production" },
  { value: "staging", label: "Staging" }
] as const)

// Dynamic options
const branches = (await $`git branch`.text()).split("\n")
  .map(b => b.trim().replace("* ", ""))
  .filter(Boolean)
const branch = await select("Choose a branch to checkout:", branches)
await $`git checkout ${branch}`

// With conditional logic
const action = await select("What would you like to do?", [
  "Create new project",
  "Open existing project",
  "Exit"
])

switch (action) {
  case "Create new project":
    // Handle creation
    break
  case "Open existing project":
    // Handle opening
    break
  default:
    // Exit
}
```

### autoselect()
**Usage:** `autoselect<T extends string>(message: string, options: T[], flag: string): Promise<T>`

Returns an option without prompting when possible:
- If the specified `flag` is set via command-line arguments, that value is returned.
- If there is exactly one option, that option is returned.
- Otherwise, prompts using `select()`.

**Parameters:**
- `message` - The prompt text to display
- `options` - Array of string options to choose from
- `flag` - Command-line flag name to check for override value

**Returns:**
- Promise resolving to the selected option string

**Examples:**
```ts
// Basic selection with flag override
const commands = ["install", "update", "remove", "list", "help"] as const
const action = await autoselect("What would you like to do?", commands, "action")

// With dynamic options
const files = await glob("**/*.ts")
const fileToEdit = await autoselect("Select file to edit:", files, "file")
await openEditor(fileToEdit)

// Using for long lists
const countries = ["Afghanistan", "Albania", "Algeria" /* ... */]
const country = await autoselect("Select your country:", countries, "country")

// Flag override example - if --action=install is passed, skips selection
const action2 = await autoselect("Choose action:", ["install", "remove"], "action")
// Returns "install" without prompting if --action=install was provided
```

## Command Output

### $get()
**Usage:** `$get(...args: Parameters<typeof $>): Promise<string>`

Runs a shell command and returns the result as text.

Like `$`, this throws on non-zero exit codes.

If stdout is non-empty, `$get()` returns stdout; otherwise it returns stderr.

**Parameters:**
- `args` - Arguments passed through to `$` (same call forms as `$`)

**Returns:**
- Promise resolving to command output as a string (stdout or stderr)

**Examples:**
```ts
// Read stdout as text
const head = await $get`git rev-parse HEAD`
console.log(head.trim())

// On command failure, it throws (same as $)
try {
  await $get`ls /path/that/does/not/exist`
} catch (error) {
  console.error("Command failed")
}

// Non-throwing capture (Bun shell API)
const result = await $`ls /path/that/does/not/exist`.quiet().nothrow()
const output = result.stdout.length > 0 ? result.stdout.toString() : result.stderr.toString()
console.log(output)
```

## Error Handling

### Exit
**Usage:** `new Exit(error?: unknown)`

Formats common error shapes (including Bun shell errors containing `stdout`/`stderr`) and terminates the process.

**Parameters:**
- `error` - Optional error value to format and print

**Examples:**
```ts
if (!(await Bun.file("./config.json").exists())) {
  throw new Exit("Missing config.json")
}

try {
  await $`git push`
} catch (err) {
  throw new Exit(err)
}

throw new Exit(0)
```

## Progress Indicators

### $spinner
**Usage:** 
- `$spinner(label: string, callback: ($: typeof $, setLabel: (text: string) => void) => Promise<T>): Promise<T>`
- `$spinner(callback: ($: typeof $, setLabel: (text: string) => void) => Promise<T>): Promise<T>`

Executes operations within a spinner context. The spinner automatically starts before the callback and stops after completion. Commands executed with the provided `$` are quieted unless debug mode is enabled.

**Parameters:**
- `label` - Optional text to display next to the spinner
- `callback` - Async function to execute. Receives a quieted `$` command and `setLabel` function

**Returns:**
- Promise resolving to the callback's return value

**Examples:**
```ts
// Basic usage with label
const result = await $spinner("Loading data...", async ($, setLabel) => {
  const data = await $`curl -s https://api.example.com/data`.json()
  return data
})

// Without label
const files = await $spinner(async ($, setLabel) => {
  return await $`find . -name "*.ts"`.lines()
})

// Updating the label during execution
await $spinner("Processing...", async ($, setLabel) => {
  setLabel("Downloading dependencies...")
  await $`npm install`
  
  setLabel("Running tests...")
  await $`npm test`
  
  setLabel("Building project...")
  await $`npm run build`
})

// Error handling (spinner automatically shows error state)
try {
  await $spinner("Deploying...", async ($, setLabel) => {
    await $`deploy.sh`
  })
  console.log(ansis.green("Deployment successful!"))
} catch (error) {
  console.error(ansis.red(`Deployment failed: ${error.message}`))
}
```

## Timing

### sleep()
**Usage:** `sleep(ms: number): Promise<void>`

Sleeps for the given number of milliseconds.

**Parameters:**
- `ms` - Milliseconds to sleep

**Returns:**
- Promise resolving after the delay

## Terminal Styling

Bunmagic includes [ansis](https://www.npmjs.com/package/ansis) as a global utility for terminal text styling. The `chalk` alias is also available for backwards compatibility.

**Usage:** `ansis.<style>(text)` or `chalk.<style>(text)`

**Available styles:**
- Colors: `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`
- Modifiers: `bold`, `dim`, `italic`, `underline`, `inverse`, `hidden`, `strikethrough`
- Background colors: `bgBlack`, `bgRed`, `bgGreen`, etc.

**Examples:**
```ts
// Basic color styling
console.log(ansis.red("Error: File not found"))
console.log(ansis.green("Success!"))

// Using chalk alias (identical functionality)
console.log(chalk.red("Error: File not found"))
console.log(chalk.green("Success!"))

// Combined styles
console.log(ansis.bold.blue("Important information"))
console.log(ansis.italic.yellow("Warning: This operation cannot be undone"))

// Background colors
console.log(ansis.black.bgYellow(" CAUTION "))

// Dynamic styling based on conditions
function logStatus(status) {
  const styles = {
    success: ansis.bold.green,
    warning: ansis.yellow,
    error: ansis.bold.red,
    info: ansis.blue
  }
  const styleFunc = styles[status] || styles.info
  console.log(styleFunc(`[${status.toUpperCase()}]`), "Operation completed")
}
```


## Terminal Control

The `CLI` object provides low-level terminal control utilities for building interactive command-line interfaces, progress indicators, and custom user experiences.

### Terminal Output

#### CLI.stdout()
**Usage:** `CLI.stdout(content: string): Promise<number>`

Writes raw content to stdout (no automatic newline).

**Parameters:**
- `content` - Text to write to stdout

**Returns:**
- Promise resolving to the result of `Bun.write()`

**Examples:**
```ts
// Write without a newline
await CLI.stdout("Working...")

// Rewrite the current line using carriage return
await CLI.stdout("\rDone!\n")
```

### Cursor Movement

#### CLI.moveUp()
**Usage:** `CLI.moveUp(count?: number): Promise<void>`

Moves the cursor up by the specified number of lines.

**Parameters:**
- `count` - Number of lines to move up (default: 1)

#### CLI.moveDown()
**Usage:** `CLI.moveDown(count?: number): Promise<void>`

Moves the cursor down by the specified number of lines.

**Parameters:**
- `count` - Number of lines to move down (default: 1)

#### CLI.moveLeft()
**Usage:** `CLI.moveLeft(count?: number): Promise<void>`

Moves the cursor left by the specified number of characters.

**Parameters:**
- `count` - Number of characters to move left (default: 1)

#### CLI.moveRight()
**Usage:** `CLI.moveRight(count?: number): Promise<void>`

Moves the cursor right by the specified number of characters.

**Parameters:**
- `count` - Number of characters to move right (default: 1)

**Examples:**
```ts
// Basic cursor movement
await CLI.moveUp(2)    // Move cursor up 2 lines
await CLI.moveDown()   // Move cursor down 1 line (default)
await CLI.moveLeft(5)  // Move cursor left 5 characters
await CLI.moveRight(3) // Move cursor right 3 characters

// Building a simple menu navigation (redraw in place)
const options = ["Option 1", "Option 2", "Option 3"]
let hasDrawn = false

async function drawMenu(selectedIndex: number) {
  if (hasDrawn) {
    // Cursor is below the previously drawn menu
    await CLI.clearUp(options.length + 1)
  }
  hasDrawn = true

  for (let i = 0; i < options.length; i++) {
    const marker = i === selectedIndex ? ">" : " "
    console.log(`${marker} ${options[i]}`)
  }
}
```

### Screen Clearing

#### CLI.clearLine()
**Usage:** `CLI.clearLine(): Promise<void>`

Clears the current line completely.

#### CLI.clearLines()
**Usage:** `CLI.clearLines(count?: number): Promise<void>`

Moves the cursor up by `count` lines, then clears the current line.

**Parameters:**
- `count` - Number of lines to move up before clearing (default: 1)

#### CLI.clearUp()
**Usage:** `CLI.clearUp(count?: number): Promise<void>`

Clears the current line and the `count - 1` lines above it, then restores the cursor to its starting row.

**Parameters:**
- `count` - Number of lines to clear, including the current line (default: 1)

#### CLI.clearFrame()
**Usage:** `CLI.clearFrame(frame: string, wipe?: boolean): Promise<void>`

Clears a multi-line frame or block of text.

**Parameters:**
- `frame` - The multi-line text content to clear
- `wipe` - If true, overwrites with spaces before clearing (default: false)

#### CLI.replaceLine()
**Usage:** `CLI.replaceLine(...messages: string[]): Promise<void>`

Clears the current line, writes the joined `messages`, and appends a newline (`\n`).

**Parameters:**
- `messages` - Text content to write (joined with spaces)

**Examples:**
```ts
// Progress indicator that redraws a single line
async function showProgress(items: string[]) {
  for (let i = 0; i < items.length; i++) {
    await CLI.replaceLine(`Processing ${items[i]}... (${i + 1}/${items.length})`)
    await CLI.moveUp(1)

    await processItem(items[i])
    await sleep(100)
  }

  await CLI.replaceLine("All items processed.")
}

// Dynamic status updates (single status line)
async function deployApplication() {
  console.log("Starting deployment...")

  await CLI.replaceLine("Building application...")
  await $`npm run build`

  await CLI.moveUp(1)
  await CLI.replaceLine("Uploading files...")
  await $`rsync -av dist/ server:/var/www/`

  await CLI.moveUp(1)
  await CLI.replaceLine("Deployment complete.")
}

// Clearing complex UI frames
const loadingFrame = `
┌─────────────────┐
│   Loading...    │
│ ████████████    │
└─────────────────┘`

console.log(loadingFrame)
await sleep(2000)
await CLI.clearFrame(loadingFrame, true)
console.log("Loading complete.")
```

### Terminal State Control

#### CLI.showCursor()
**Usage:** `CLI.showCursor(): Promise<void>`

Makes the terminal cursor visible.

#### CLI.hideCursor()
**Usage:** `CLI.hideCursor(): Promise<void>`

Hides the terminal cursor from view.

#### CLI.raw()
**Usage:** `CLI.raw(on: boolean): Promise<void>`

Enables or disables raw mode for stdin, allowing character-by-character input.

**Parameters:**
- `on` - True to enable raw mode, false to disable

**Examples:**
```ts
// Creating a loading spinner with hidden cursor
async function spinner(duration: number) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let frameIndex = 0

  await CLI.hideCursor()

  const interval = setInterval(() => {
    void (async () => {
      await CLI.replaceLine(`${frames[frameIndex]} Loading...`)
      await CLI.moveUp(1)
      frameIndex = (frameIndex + 1) % frames.length
    })()
  }, 100)

  setTimeout(async () => {
    clearInterval(interval)
    await CLI.showCursor()
    await CLI.replaceLine("Complete.")
  }, duration)
}

// Interactive key handler
async function handleKeyInput() {
  console.log("Press 'q' to quit, arrow keys to move")

  const input = CLI.stream()

  try {
    for await (const chunk of input.start()) {
      const key = chunk.toString()

      if (key === 'q') {
        break
      } else if (key === '\u001b[A') { // Up arrow
        await CLI.moveUp()
        console.log("Moved up")
      } else if (key === '\u001b[B') { // Down arrow
        await CLI.moveDown()
        console.log("Moved down")
      }
    }
  } finally {
    input.stop()
    console.log("Exiting...")
  }
}
```

### Input Streaming

#### CLI.stream()
**Usage:** `CLI.stream(): { start(): AsyncGenerator<Uint8Array>; stop(): void }`

Creates a stdin input stream that yields `Uint8Array` chunks.

`start()` enables raw mode while the generator is running and disables raw mode when it finishes.

**Returns:**
- Object with `start()` method returning an async generator and `stop()` method to abort

**Examples:**
```ts
// Real-time keyboard input processing
async function interactiveMode() {
  console.log("Interactive mode - press keys (ESC to exit)")

  const inputStream = CLI.stream()

  try {
    for await (const chunk of inputStream.start()) {
      const char = chunk.toString()

      // ESC key to exit
      if (char === '\u001b') {
        break
      }

      // Handle specific keys
      switch (char) {
        case ' ':
          console.log("Space pressed!")
          break
        case '\r':
          console.log("Enter pressed!")
          break
        default:
          console.log(`Key: ${char} (${char.charCodeAt(0)})`)
      }
    }
  } finally {
    inputStream.stop()
    console.log("Interactive mode ended")
  }
}

// Building a simple game loop
async function simpleGame() {
  let playerX = 5
  let playerY = 5
  const mapSize = 10

  const input = CLI.stream()
  await CLI.hideCursor()

  let hasDrawn = false

  async function drawMap() {
    // Cursor is below the previously drawn map
    if (hasDrawn) {
      await CLI.clearUp(mapSize + 3)
    }
    hasDrawn = true

    console.log("Use WASD to move, Q to quit")
    for (let y = 0; y < mapSize; y++) {
      let line = ""
      for (let x = 0; x < mapSize; x++) {
        line += (x === playerX && y === playerY) ? "P" : "."
      }
      console.log(line)
    }
  }

  await drawMap()

  try {
    for await (const chunk of input.start()) {
      const key = chunk.toString().toLowerCase()

      switch (key) {
        case 'w':
          if (playerY > 0) playerY--
          break
        case 's':
          if (playerY < mapSize - 1) playerY++
          break
        case 'a':
          if (playerX > 0) playerX--
          break
        case 'd':
          if (playerX < mapSize - 1) playerX++
          break
        case 'q':
          throw new Error("Quit")
      }

      await drawMap()
    }
  } catch (error) {
    // Game ended
  } finally {
    input.stop()
    await CLI.showCursor()
    console.log("Game over!")
  }
}
```

### Complete Interactive CLI Example

```ts
// Advanced example: Interactive file browser
async function fileBrowser() {
  const files = await glob("*")
  let selectedIndex = 0

  const input = CLI.stream()
  await CLI.hideCursor()

  let hasDrawn = false

  async function drawBrowser() {
    if (hasDrawn) {
      // Cursor is below the previously drawn browser
      await CLI.clearUp(files.length + 4)
    }
    hasDrawn = true

    console.log("📁 File Browser (↑↓ to navigate, Enter to select, Q to quit)")
    console.log("─".repeat(50))

    for (let i = 0; i < files.length; i++) {
      const marker = i === selectedIndex ? ">" : " "
      const icon = files[i].endsWith("/") ? "📁" : "📄"
      console.log(`${marker} ${icon} ${files[i]}`)
    }
  }

  await drawBrowser()

  try {
    for await (const chunk of input.start()) {
      const key = chunk.toString()

      switch (key) {
        case '\u001b[A': // Up arrow
          selectedIndex = Math.max(0, selectedIndex - 1)
          break
        case '\u001b[B': // Down arrow
          selectedIndex = Math.min(files.length - 1, selectedIndex + 1)
          break
        case '\r': // Enter
          console.log(`\nSelected: ${files[selectedIndex]}`)
          return files[selectedIndex]
        case 'q':
        case 'Q':
          throw new Error("Quit")
      }

      await drawBrowser()
    }
  } finally {
    input.stop()
    await CLI.showCursor()
  }
}
```
