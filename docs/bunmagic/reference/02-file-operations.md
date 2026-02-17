---
summary: "bunmagic file-system APIs: Bun file ops, paths, glob, SAF, and editor integration"
read_when:
  - Working with files or directories in bunmagic scripts.
  - Need safe write/rename behavior via SAF.
---

## 🌍 All Utilities are Global!

**Remember:** All the file operation utilities documented here are available as global variables or functions. No imports needed - just use them directly in your scripts!

Bunmagic provides built-in utilities for working with files and directories.

## Basic File Operations

Bunmagic scripts have full access to Bun's file APIs for common file operations:

**Reading files:**
```ts
// Read file as text
const content = await Bun.file("config.json").text()

// Read file as bytes
const bytes = await Bun.file("image.png").bytes()

// Parse JSON file
const config = await Bun.file("config.json").json()
```

**Writing files:**
```ts
// Write text to file
await Bun.write("output.txt", "Hello World")

// Write JSON data
await Bun.write("data.json", JSON.stringify(data, null, 2))

// Write binary data
await Bun.write("image.png", bytes)
```

**Checking file existence:**
```ts
// Check if file exists
const exists = await Bun.file("config.json").exists()
if (exists) {
  console.log("Config file found")
}
```

## Path Module

**Type:** `NodeJS.Path`

Node.js path module, available as a global for path manipulation.

**Examples:**
```ts
// Join path segments
const configPath = path.join($HOME, ".config", "bunmagic")

// Get file extension
const ext = path.extname("script.ts") // ".ts"

// Get base filename
const base = path.basename("/path/to/file.txt") // "file.txt"
const nameOnly = path.basename("/path/to/file.txt", ".txt") // "file"

// Resolve relative paths
const absolute = path.resolve("./relative/path")
```

## Path Utilities

### $HOME
**Type:** `string`

Global variable containing the user's home directory path.

**Examples:**
```ts
// Access home directory path
console.log($HOME) // "/Users/username"

// Combine with other paths
const configPath = path.join($HOME, ".config")
```

### resolveTilde()
**Usage:** `resolveTilde(input: string): string`

Resolves paths containing the tilde character (`~`) to absolute paths.

**Parameters:**
- `input` - String path that may contain a tilde

**Returns:**
- Full resolved absolute path

**Examples:**
```ts
// Basic usage
const projectPath = resolveTilde("~/projects")
console.log(projectPath) // "/Users/username/projects"

// Use with file operations
const configFile = resolveTilde("~/.bunmagic/config.json")
const content = await Bun.file(configFile).text()
```

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

## Directory Operations

### isDirectory()
**Usage:** `isDirectory(path: string): Promise<boolean>`

Asynchronously checks if the specified path is a directory.

**Parameters:**
- `path` - Path to check

**Returns:**
- Promise resolving to `true` if path is a directory, `false` otherwise

**Examples:**
```ts
// Basic check
if (await isDirectory("./folder")) {
    console.log("It's a directory")
}

// Conditional processing
const target = "./output"
if (!(await isDirectory(target))) {
    await ensureDirectory(target)
}
```

### ensureDirectory()
**Usage:** `ensureDirectory(path: string): Promise<boolean>`

Creates a directory and any parent directories if they don't exist.

**Parameters:**
- `path` - Directory path to create

**Returns:**
- Promise resolving to `true` when directory is created or already exists

**Examples:**
```ts
// Create nested directories
await ensureDirectory("./nested/folders/structure")

// Create directory before writing a file
const logDir = "./logs"
await ensureDirectory(logDir)
await Bun.write(`${logDir}/app.log`, logContent)
```

### glob()
**Usage:** `glob(pattern?: string, options?: GlobScanOptions): Promise<string[]>`

Finds files matching a glob pattern.

**Parameters:**
- `pattern` - Glob pattern for file matching (defaults to `'*'`)
- `options` - Optional Bun glob scan options

**Returns:**
- Promise resolving to an array of matching file paths

**Examples:**
```ts
// Find JSON files in current directory
const jsonFiles = await glob("*.json")
console.log(`Found ${jsonFiles.length} JSON files`)

// Find all TypeScript files in any subdirectory
const tsFiles = await glob("**/*.ts")
for (const file of tsFiles) {
    console.log(`Processing ${file}`)
}

// Find configuration files
const configFiles = await glob("config/**/settings.{json,yaml,yml}")
```

## Advanced File Operations

### SAF
**Usage:** `new SAF(handle: string)` or `SAF.from(path: string)`

Swiss Army File class for advanced file operations with safe mode to prevent accidental overwrites.

**Important Notes:**
- Path property changes are not applied until `update()` is called
- Safe mode automatically generates unique filenames (up to 10 iterations) to prevent overwrites
- SAF instances can be used directly as strings through automatic conversion

**Constructor:**
- `handle` - File path to manage

**Static Methods:**

#### SAF.from()
**Usage:** `SAF.from(target: string): SAF` or `SAF.from(dir: string, target: string): SAF`

Creates a SAF instance from a target path with optional directory context.

**Parameters:**
- `target` - Target file path
- `dir` - Optional base directory

**Returns:**
- New SAF instance

#### SAF.prepare()
**Usage:** `SAF.prepare(target: string): Promise<SAF>`

Prepares a target path for writing by ensuring it won't overwrite existing files.

**Parameters:**
- `target` - Target file path

**Returns:**
- Promise resolving to SAF instance with safe path

**Properties:**

#### safeMode
**Type:** `boolean` (default: `true`)

When enabled, prevents overwriting existing files by automatically generating unique filenames.

#### safeSeparator
**Type:** `string` (default: `'_'`)

Character used to separate the base filename from iteration numbers when generating safe filenames.

**Path Properties:**

#### base
**Type:** `string | undefined`

Gets or sets the base filename without extension.

#### name
**Type:** `string | undefined`

Gets or sets the complete filename including extension.

#### directory
**Type:** `string`

Gets or sets the directory path containing the file.

#### extension
**Type:** `string`

Gets or sets the file extension.

#### path
**Type:** `string`

Gets or sets the complete absolute file path.

#### file
**Type:** `BunFile`

Gets the underlying Bun file instance for low-level operations.

**Methods:**

#### safe()
**Usage:** `saf.safe(): SAF`

Enables safe mode to prevent overwriting existing files.

**Returns:**
- Self for method chaining

#### unsafe()
**Usage:** `saf.unsafe(): SAF`

Disables safe mode, allowing overwrites of existing files.

**Returns:**
- Self for method chaining

#### exists()
**Usage:** `saf.exists(): Promise<boolean>`

Checks if the file or directory exists.

**Returns:**
- Promise resolving to `true` if the path exists

#### isFile()
**Usage:** `saf.isFile(): Promise<boolean>`

Checks if the path is a file (not a directory).

**Returns:**
- Promise resolving to `true` if the path is a file

#### isDirectory()
**Usage:** `saf.isDirectory(): Promise<boolean>`

Checks if the path is a directory.

**Returns:**
- Promise resolving to `true` if the path is a directory

#### write()
**Usage:** `saf.write(input: Blob | NodeJS.TypedArray | ArrayBufferLike | string | Bun.BlobPart[] | BunFile): Promise<number>`

Writes data to the file.

**Parameters:**
- `input` - Data to write to the file

**Returns:**
- Promise resolving to number of bytes written

#### bytes()
**Usage:** `saf.bytes(): Promise<Uint8Array>`

Reads the file content as bytes.

**Returns:**
- Promise resolving to file content as Uint8Array

#### json()
**Usage:** `saf.json<T>(): Promise<T>` or `saf.json<T>(data: T): Promise<T>`

Reads or writes JSON data to the file.

**Parameters:**
- `data` - Optional data to write as JSON

**Returns:**
- Promise resolving to parsed JSON data (read) or written data (write)

#### edit()
**Usage:** `saf.edit(callback: (content: string) => string | Promise<string>): Promise<SAF>`

Edits file content using a callback function.

**Parameters:**
- `callback` - Function that receives current content and returns modified content

**Returns:**
- Promise resolving to self for method chaining

#### update()
**Usage:** `saf.update(): Promise<SAF>`

Applies any pending changes made to path properties. In safe mode, automatically generates unique filenames to prevent overwrites.

**Returns:**
- Promise resolving to self for method chaining

**Throws:**
- Error if trying to update a deleted file

#### delete()
**Usage:** `saf.delete(postDelete?: 'clear_handle' | 'keep_handle'): Promise<SAF>`

Deletes the file.

**Parameters:**
- `postDelete` - Whether to clear the internal handle after deletion (default: `'clear_handle'`)

**Returns:**
- Promise resolving to self for method chaining

#### ensureDirectory()
**Usage:** `saf.ensureDirectory(): Promise<void>`

Creates the parent directory if it doesn't exist.

**Returns:**
- Promise that resolves when directory is created

**Throws:**
- Error if directory creation fails

#### toString()
**Usage:** `saf.toString(): string`

Converts the SAF instance to its file path string.

**Returns:**
- The absolute file path as a string

#### valueOf()
**Usage:** `saf.valueOf(): string`

Called automatically when the SAF instance is used in a string context.

**Returns:**
- The absolute file path as a string

**Examples:**
```ts
// Basic file operations
const file = SAF.from("~/documents/data.json")
await file.write('{"message": "Hello World"}')
const data = await file.json()
console.log(data.message) // "Hello World"

// Safe mode prevents overwrites
const safeFile = SAF.from("existing-file.txt")
safeFile.name = "new-name.txt"
await safeFile.update() // Creates "new-name.txt" or "new-name_1.txt" if it exists

// Path manipulation
const document = SAF.from("/path/to/document.pdf")
document.directory = "/new/location"
document.extension = ".txt"
await document.update() // Moves and renames to "/new/location/document.txt"

// Working with directories
const logFile = SAF.from("./logs/app.log")
await logFile.ensureDirectory() // Creates ./logs/ if needed
await logFile.write("Application started")

// Editing existing files
const configFile = SAF.from("./config.json")
await configFile.edit(content => {
    const config = JSON.parse(content)
    config.version = "2.0.0"
    return JSON.stringify(config, null, 2)
})

// Chaining operations
const result = await SAF.from("temp.txt")
    .unsafe()  // Allow overwrites
    .write("temporary data")
    .then(saf => saf.delete('keep_handle'))

// Preparing safe paths
const destination = await SAF.prepare("output.txt")
await destination.write("Safe content") // Won't overwrite existing output.txt

// String conversion
const file = SAF.from("~/data/report.pdf")
console.log(file.toString()) // "/Users/username/data/report.pdf"
console.log(`Processing ${file}`) // Automatic valueOf() conversion
console.log(file + ".backup") // String concatenation works automatically
```

## Editor Integration

### openEditor()
**Usage:** `openEditor(path: string): Promise<boolean>`

Opens a file in the user's preferred editor.

**Parameters:**
- `path` - File path to open in the editor

**Returns:**
- Promise resolving to `true` on success

**Throws:**
- Error if the editor command fails with stdout/stderr details

**Behavior:**
- Uses the `EDITOR` environment variable to determine which editor to use
- Defaults to `'code'` (VS Code) if `EDITOR` is not set
- For VS Code and Cursor, opens the file in a new window (`-n` flag)
- For other editors, redirects to `/dev/tty` for proper terminal handling
- Provides helpful error messages with documentation links on failure

**Examples:**
```ts
// Open a file in the default editor
await openEditor("./config.json")

// Open a file with full path
await openEditor("/Users/username/projects/script.ts")

// Use with tilde expansion
const configPath = resolveTilde("~/.bunmagic/config.json")
await openEditor(configPath)

// Handle potential errors
try {
    await openEditor("./important-file.txt")
    console.log("File opened successfully")
} catch (error) {
    console.error("Failed to open file:", error.message)
}

// Open multiple files sequentially
const files = await glob("*.md")
for (const file of files) {
    await openEditor(file)
}
```

**Environment Variables:**
- `EDITOR` - Specifies the preferred editor command (e.g., `'vim'`, `'nano'`, `'code'`, `'cursor'`)

**Supported Editors:**
- VS Code (`code`) - Opens in new window
- Cursor (`cursor`) - Opens in new window  
- Any terminal-based editor (vim, nano, emacs, etc.) - Proper terminal integration