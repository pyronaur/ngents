---
summary: "bunmagic system helpers: cwd/cd, os utilities, stdin, sleep, slugify, clipboard"
read_when:
  - Script needs OS/platform or stdin/clipboard integration.
  - Need timing, slug formatting, or platform checks.
---

## Working Directory

### cd()
**Usage:** `cd(path: string | SAF): void`

Changes the current working directory with support for tilde expansion.

**Parameters:**
- `path` - Target directory path (string) or SAF instance

**Examples:**
```ts
// Change to home directory
cd("~")

// Change to project directory
cd("~/projects/bunmagic")

// Change to relative directory
cd("./dist")
```

### cwd()
**Usage:** `cwd(): Promise<string>`

Gets the current working directory path.

**Returns:**
- Promise resolving to the current working directory path

**Examples:**
```ts
// Get current directory
const currentDir = await cwd()
console.log(`Working in: ${currentDir}`)

// Use in conditional logic
if ((await cwd()).includes("projects")) {
    console.log("Currently in projects folder")
}
```

## System Information

### os
**Type:** `NodeJS.OS`

Node.js operating system module, available as a global for OS-related utilities.

**Examples:**
```ts
// Get operating system platform
const platform = os.platform() // "darwin", "linux", "win32", etc.

// Get home directory
const home = os.homedir() // "/Users/username" or "C:\Users\username"

// Get temporary directory
const temp = os.tmpdir() // "/tmp" or "C:\Users\username\AppData\Local\Temp"

// Get system architecture
const arch = os.arch() // "x64", "arm64", etc.

// Get hostname
const hostname = os.hostname() // "my-computer.local"

// Get OS release/version
const release = os.release() // "22.1.0" on macOS

// Get CPU information
const cpus = os.cpus() // Array of CPU core information

// Get memory information
const totalMem = os.totalmem() // Total system memory in bytes
const freeMem = os.freemem() // Available memory in bytes

// Get network interfaces
const interfaces = os.networkInterfaces()

// Platform-specific logic
if (os.platform() === "darwin") {
  console.log("Running on macOS")
} else if (os.platform() === "win32") {  
  console.log("Running on Windows")
} else {
  console.log("Running on Linux/Unix")
}
```

### isMacOS()
**Usage:** `isMacOS(): Promise<boolean>`

Checks if the current platform is macOS.

**Parameters:**
- None

**Returns:**
- Promise resolving to `true` if running on macOS, `false` otherwise

**Behavior:**
The function checks if `process.platform` equals `'darwin'`, which is Node.js's identifier for macOS.

**Examples:**
```ts
// Basic platform check
if (await isMacOS()) {
  console.log("Running on macOS")
} else {
  console.log("Not running on macOS")
}

// Conditional logic for platform-specific operations  
async function openFile(path: string) {
  if (await isMacOS()) {
    await $`open "${path}"`
  } else {
    console.log("File opening not implemented for this platform")
  }
}

// Platform-specific configuration
const config = {
  editor: await isMacOS() ? "code" : "nano",
  browser: await isMacOS() ? "open" : "xdg-open"
}

// Using with other platform utilities
async function setupEnvironment() {
  if (await isMacOS()) {
    console.log("Setting up macOS environment...")
    await $`brew install git`
  } else {
    console.log("Setting up non-macOS environment...")
  }
}
```

## Utilities

### $stdin()
**Usage:** `$stdin(): Promise<string>`

Reads all data from stdin as a string. Useful for piping data into Bunmagic scripts from the command line.

**Parameters:**
- None

**Returns:**
- Promise that resolves to the complete stdin content as a string

**Behavior:**
The function asynchronously reads all data from stdin using Bun's streaming API and concatenates it into a single string. It handles:
- Multiple chunks of data
- Large inputs through streaming
- Proper UTF-8 encoding
- Empty input (returns empty string)

**Examples:**
```ts
// Basic stdin reading
const input = await $stdin()
console.log(`Received: ${input}`)

// Process piped JSON data
const jsonData = await $stdin()
const data = JSON.parse(jsonData)
console.log(`Processing ${data.items.length} items`)

// Filter lines from stdin
const text = await $stdin()
const filtered = text
  .split('\n')
  .filter(line => line.includes('ERROR'))
  .join('\n')
console.log(filtered)

// Command line usage examples:
// echo "Hello, World!" | bunmagic run my-script
// cat data.txt | bunmagic run process-data
// curl -s https://api.example.com/data | bunmagic run parse-api

// Process CSV data from stdin
const csvData = await $stdin()
const lines = csvData.trim().split('\n')
const headers = lines[0].split(',')
const rows = lines.slice(1).map(line => {
  const values = line.split(',')
  return Object.fromEntries(
    headers.map((header, i) => [header, values[i]])
  )
})
console.log(`Processed ${rows.length} rows`)

// Chain with other shell commands
const result = await $stdin()
const processed = result.toUpperCase()
await $`echo ${processed} | sort | uniq`
```

### sleep()
**Usage:** `sleep(ms: number): Promise<void>`

Pauses execution for a specified number of milliseconds.

**Parameters:**
- `ms` - The number of milliseconds to sleep

**Returns:**
- Promise that resolves after the specified delay

**Examples:**
```ts
// Basic delay
await sleep(1000) // Wait 1 second
console.log("This runs after 1 second")

// Short delay for rate limiting
for (const item of items) {
  await processItem(item)
  await sleep(100) // 100ms delay between items
}

// Timeout simulation
console.log("Starting process...")
await sleep(2500) // Wait 2.5 seconds
console.log("Process complete!")

// Using in error handling/retry logic
async function retryOperation() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await riskyOperation()
    } catch (error) {
      if (attempt < 3) {
        console.log(`Attempt ${attempt} failed, retrying in 1 second...`)
        await sleep(1000)
      } else {
        throw error
      }
    }
  }
}
```

### slugify()
**Usage:** `slugify(text: string): string`

Converts text to a URL-friendly slug format.

**Parameters:**
- `text` - The input text to convert to a slug

**Returns:**
- String formatted as a URL-friendly slug

**Behavior:**
The function performs the following transformations:
1. Converts text to lowercase
2. Replaces whitespace sequences with single hyphens
3. Removes all non-word characters (except hyphens)
4. Replaces multiple consecutive hyphens with single hyphens
5. Trims whitespace from the result
6. Removes leading and trailing hyphens

**Examples:**
```ts
// Basic text conversion
const slug1 = slugify("Hello World")
console.log(slug1) // "hello-world"

// Text with special characters
const slug2 = slugify("My Awesome Blog Post!")
console.log(slug2) // "my-awesome-blog-post"

// Text with multiple spaces and symbols
const slug3 = slugify("  Multiple   Spaces & Special #Characters  ")
console.log(slug3) // "multiple-spaces-special-characters"

// Text with numbers and mixed case
const slug4 = slugify("React 18: New Features")
console.log(slug4) // "react-18-new-features"

// Edge cases
const slug5 = slugify("---Leading and Trailing Hyphens---")
console.log(slug5) // "leading-and-trailing-hyphens"

const slug6 = slugify("CamelCase and snake_case")
console.log(slug6) // "camelcase-and-snakecase"
```

## Clipboard Operations

### copyToClipboard()
**Usage:** `copyToClipboard(text: string): Promise<void>`

Copies text to the system clipboard.

**Parameters:**
- `text` - String to copy to clipboard

**Examples:**
```ts
// Basic usage
await copyToClipboard("Text to copy")
console.log("Copied to clipboard!")

// Copy command output
const output = await $`git remote -v`.text()
await copyToClipboard(output)
console.log("Remote info copied to clipboard")

// Copy generated content
const token = generateToken()
await copyToClipboard(token)
console.log(ansis.green("API token generated and copied to clipboard"))
```