---
summary: "bunmagic terminal UX helpers: prompts, spinner, ansis styling, and CLI cursor control"
read_when:
  - Building interactive terminal flows in bunmagic scripts.
  - Need prompt/spinner or low-level CLI rendering controls.
---

Bunmagic provides utilities for creating interactive command-line interfaces, making your scripts more user-friendly and dynamic.

## Interactive Prompts

### ack()
**Usage:** `ack(question: string, defaultOption?: 'y' | 'n'): boolean`

Asks a Yes/No question and waits for user input synchronously.

**Parameters:**
- `question` - The question text to display
- `defaultOption` - Optional default selection ('y' or 'n')

**Returns:**
- `true` for Yes or `false` for No

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
  const remote = await input("Enter remote URL:")
  await $`git remote add origin ${remote}`
}
```

### ask()
**Usage:** `ask(question: string, defaultValue?: string): Promise<string>`

Prompts the user for text input.

**Parameters:**
- `question` - The prompt text to display
- `defaultValue` - Optional default value to use if user provides no input

**Returns:**
- Promise resolving to the user's input string

**Examples:**
```ts
// Basic text input
const name = await ask("What is your name?")
console.log(`Hello, ${name}!`)

// With default value
const branch = await ask("Branch name:", "main")
await $`git checkout -b ${branch}`

// Using the input in a command
const commitMsg = await ask("Commit message:")
await $`git commit -m ${commitMsg}`
```

### getPassword()
**Usage:** `getPassword(prompt?: string): Promise<string>`

Securely prompts the user for a password with masked input.

**Parameters:**
- `prompt` - The prompt text to display (default: "Password:")

**Returns:**
- Promise resolving to the entered password

**Examples:**
```ts
// Basic password input
const password = await getPassword()

// Custom prompt
const apiKey = await getPassword("Enter API key:")

// Authentication flow
const username = await ask("Username:")
const password = await getPassword("Password:")
const success = await authenticate(username, password)
```

### select()
**Usage:** `select(question: string, options: string[]): Promise<string>`

Displays an interactive selection menu and returns the selected option.

**Parameters:**
- `question` - The prompt text to display
- `options` - Array of string options to choose from

**Returns:**
- Promise resolving to the selected option string

**Examples:**
```ts
// Basic selection
const options = ["typescript", "javascript", "python"]
const language = await select("Choose a language:", options)
console.log(`Selected ${language}`)

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
**Usage:** `autoselect(message: string, options: T[], flag: string): Promise<T>`

Displays an interactive selection menu with auto-complete functionality. If the specified flag is set via command-line arguments, that value is returned instead of prompting the user.

**Parameters:**
- `message` - The prompt text to display
- `options` - Array of string options to choose from
- `flag` - Command-line flag name to check for override value

**Returns:**
- Promise resolving to the selected option string

**Examples:**
```ts
// Basic auto-complete selection
const commands = ["install", "update", "remove", "list", "help"]
const action = await autoselect("What would you like to do?", commands, "action")

// With dynamic options
const files = await glob("**/*.ts")
const fileToEdit = await autoselect("Select file to edit:", files, "file")
await openEditor(fileToEdit)

// Using auto-complete for long lists
const countries = ["Afghanistan", "Albania", "Algeria", /* ... */]
const country = await autoselect("Select your country:", countries, "country")

// Flag override example - if --action=install is passed, skips selection
const action = await autoselect("Choose action:", ["install", "remove"], "action")
// Returns "install" without prompting if --action=install was provided
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

// Building a simple menu navigation
async function drawMenu(selectedIndex: number) {
  const options = ["Option 1", "Option 2", "Option 3"]
  
  // Clear previous menu
  await CLI.clearLines(options.length)
  
  // Draw menu items
  for (let i = 0; i < options.length; i++) {
    const marker = i === selectedIndex ? ">" : " "
    console.log(`${marker} ${options[i]}`)
  }
  
  // Move cursor back to top of menu
  await CLI.moveUp(options.length)
}
```

### Screen Clearing

#### CLI.clearLine()
**Usage:** `CLI.clearLine(): Promise<void>`

Clears the current line completely.

#### CLI.clearLines()
**Usage:** `CLI.clearLines(count?: number): Promise<void>`

Clears multiple lines starting from the current cursor position, moving up.

**Parameters:**
- `count` - Number of lines to clear (default: 1)

#### CLI.clearUp()
**Usage:** `CLI.clearUp(count?: number): Promise<void>`

Clears lines above the current cursor position.

**Parameters:**
- `count` - Number of lines to clear above (default: 1)

#### CLI.clearFrame()
**Usage:** `CLI.clearFrame(frame: string, wipe?: boolean): Promise<void>`

Clears a multi-line frame or block of text.

**Parameters:**
- `frame` - The multi-line text content to clear
- `wipe` - If true, overwrites with spaces before clearing (default: false)

#### CLI.replaceLine()
**Usage:** `CLI.replaceLine(...messages: string[]): Promise<void>`

Replaces the current line with new content.

**Parameters:**
- `messages` - Text content to replace the line with

**Examples:**
```ts
// Progress indicator with line replacement
async function showProgress(items: string[]) {
  for (let i = 0; i < items.length; i++) {
    await CLI.replaceLine(`Processing ${items[i]}... (${i + 1}/${items.length})`)
    await processItem(items[i])
    await sleep(100)
  }
  await CLI.replaceLine("✅ All items processed!")
}

// Dynamic status updates
async function deployApplication() {
  console.log("Starting deployment...")
  
  await CLI.replaceLine("📦 Building application...")
  await $`npm run build`
  
  await CLI.replaceLine("🚀 Uploading files...")
  await $`rsync -av dist/ server:/var/www/`
  
  await CLI.replaceLine("✅ Deployment complete!")
}

// Clearing complex UI frames
const loadingFrame = `
┌─────────────────┐
│   Loading...    │
│ ████████████    │
└─────────────────┘`

console.log(loadingFrame)
await sleep(2000)
await CLI.clearFrame(loadingFrame)
console.log("✅ Loading complete!")
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
  
  const interval = setInterval(async () => {
    await CLI.replaceLine(`${frames[frameIndex]} Loading...`)
    frameIndex = (frameIndex + 1) % frames.length
  }, 100)
  
  setTimeout(async () => {
    clearInterval(interval)
    await CLI.showCursor()
    await CLI.replaceLine("✅ Complete!")
  }, duration)
}

// Interactive key handler
async function handleKeyInput() {
  console.log("Press 'q' to quit, arrow keys to move")
  await CLI.raw(true)
  
  for await (const chunk of CLI.stream().start()) {
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
  
  await CLI.raw(false)
  console.log("Exiting...")
}
```

### Input Streaming

#### CLI.stream()
**Usage:** `CLI.stream(): { start(): AsyncGenerator<Uint8Array>, stop(): void }`

Creates a raw input stream for reading keyboard input character by character.

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
  
  const stream = CLI.stream()
  await CLI.hideCursor()
  await CLI.raw(true)
  
  function drawMap() {
    CLI.clearLines(mapSize + 2)
    console.log("Use WASD to move, Q to quit")
    for (let y = 0; y < mapSize; y++) {
      let line = ""
      for (let x = 0; x < mapSize; x++) {
        line += (x === playerX && y === playerY) ? "P" : "."
      }
      console.log(line)
    }
  }
  
  drawMap()
  
  try {
    for await (const chunk of stream.start()) {
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
      
      drawMap()
    }
  } catch (error) {
    // Game ended
  } finally {
    stream.stop()
    await CLI.raw(false)
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
  
  const stream = CLI.stream()
  await CLI.hideCursor()
  await CLI.raw(true)
  
  function drawBrowser() {
    CLI.clearLines(files.length + 3)
    console.log("📁 File Browser (↑↓ to navigate, Enter to select, Q to quit)")
    console.log("─".repeat(50))
    
    for (let i = 0; i < files.length; i++) {
      const marker = i === selectedIndex ? ">" : " "
      const icon = files[i].endsWith("/") ? "📁" : "📄"
      console.log(`${marker} ${icon} ${files[i]}`)
    }
  }
  
  drawBrowser()
  
  try {
    for await (const chunk of stream.start()) {
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
      
      drawBrowser()
    }
  } finally {
    stream.stop()
    await CLI.raw(false)
    await CLI.showCursor()
  }
}
```