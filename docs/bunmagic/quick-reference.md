---
summary: "Quick bunmagic API and script-authoring reference"
read_when:
  - Writing or updating bunmagic scripts.
  - Need bunmagic globals, flags, prompts, or SAF usage quickly.
---

# Quick bunmagic Reference

## Args and Flags
- `args: string[]` (positional args)
- `flags: Record<string, any>` (parsed flags; e.g., `flags.verbose`)
- `argv: { _: string[], [key: string]: any }` (raw minimist-style)
- `notMinimist(input: string[]): { flags: Record<string, any>, args: string[] }` (parse custom argv)

## Help and Docs
- `showHelp(): void` (print autohelp and exit)
- Doc tags: `@autohelp`, `@usage`, `@flag`, `@alias`

## Shell Execution
Bun can execute shell commands and capture output:

```ts
const randomNumber = await $`echo $RANDOM`.text();
await $`echo "Hello $USER, your random number is ${randomNumber}"`;
```

## Process Control
- `die(message: string): void` (print + exit 1)

## Paths and Files
- `Bun.file(path).text()/bytes()/json()/exists()`
- `Bun.write(path, data)`
- `path.join(...)`, `path.resolve(...)`
- `$HOME` global JS variable (like shell `$HOME`)
- `resolveTilde(input: string): string`
- `cd(path: string | SAF): void`
- `cwd(): Promise<string>`
- `isDirectory(path: string): Promise<boolean>`
- `ensureDirectory(path: string): Promise<boolean>`
- `glob("**/*.ts", options?): Promise<string[]>`
- `openEditor(path: string): Promise<boolean>`

## Swiss Army File (SAF)
Utility for safer file operations.

```ts
const file = SAF.from("path/to/file.txt"); // or SAF.from(dir, target)
const out = await SAF.prepare("path/to/output.txt"); // safe, write-ready path

await file.exists();
await file.isFile();
await file.isDirectory();

const name = file.name; // "file.txt"
const dir = file.directory; // "/path/to"
const ext = file.extension; // ".txt"
const base = file.base; // "file"
const path = file.path; // "/path/to/file.txt"

const bytes = await file.bytes();
const data = await file.json<{ hello: string }>();
await file.json({ hello: "world" }); // write JSON
await file.write("Hello, world!");
await file.edit((content) => content.toUpperCase());
await out.write("Output");

// Safe mode: never overwrite on rename/move.
// If target exists, picks next free name (e.g. "report__1.txt").
file.safe();
file.safeSeparator = "__";
file.name = "report.txt";
file.directory = "/tmp";
file.extension = ".md";
file.path = "/tmp/new.md";
await file.update(); // apply path changes

// Allow overwrites instead:
file.unsafe();

await file.ensureDirectory();
await file.delete("clear_handle"); // clears SAF path handle after delete
await file.delete("keep_handle"); // keeps path handle for reuse
```

## Prompts and UI
- `ack(question: string, defaultOption?: "y" | "n"): boolean`
- `ask(question: string, defaultValue?: string): Promise<string>`
- `getPassword(prompt?: string): Promise<string>`
- `select(question: string, options: string[]): Promise<string>`
- `autoselect<T extends string>(message: string, options: T[], flag: string): Promise<T>`
- `$spinner(label: string, callback: ($: typeof $, setLabel: (text: string) => void) => Promise<any>): Promise<any>`
- `$spinner(callback: ($: typeof $, setLabel: (text: string) => void) => Promise<any>): Promise<any>`

## Bundled Node/Bun Built-ins
- `ansis` (terminal styling, chalk-like interface)
- `path` (`node:path`)
- `os` (`node:os`)
- `Bun` (runtime APIs like `Bun.file`, `Bun.write`, `Bun.Glob`)

## Runtime and Globals
- bunmagic globals are preloaded in scripts (no imports needed).
- For editor types, run `bunmagic add-types` (creates `bunmagic.d.ts` in repo).
- `$stdin(): Promise<string>` (read full stdin)
- `copyToClipboard(text: string)` (macOS only)
- `slugify(text: string): string`
- `openEditor(path: string): Promise<boolean>`
- `CLI.replaceLine(...text)`, `CLI.clearLine()`, `CLI.hideCursor()`, `CLI.raw(true)`

## Documentation and Autohelp
Use `@autohelp` in script docblock. `--help` prints docs and exits without running script logic.

## Quick Examples

### cpdir.ts
Export not required for simple script:

```ts
/**
 * Copy the current directory to the clipboard
 */
const dir = await cwd();
await $`echo "${dir}" | tr -d '\n' | pbcopy`;
console.log(`Copied: ${ansis.bold(dir)}`);
```

### Display README

```ts
/**
 * Copy scripts/README.md to clipboard
 * @autohelp
 * @usage nconf scripts [--copy]
 * @flag --copy Copy to clipboard instead of stdout
 */
export default async function () {
  const readme = SAF.from(import.meta.dir, "../README.md");
  if (!(await readme.exists())) {
    throw new Exit(`README not found: ${readme.path}`);
  }
  const contents = await readme.file.text();
  if (flags.copy) {
    await copyToClipboard(contents);
    console.log(ansis.green(`Copied ${readme.path} to clipboard`));
    return;
  }
  console.log(contents);
}
```

### bm-replace.ts
For larger scripts, exporting a function is recommended:

```ts
/**
 * Replace a token across files
 * @autohelp
 * @usage bm-replace <dir> <from> <to> [--dry] [--force]
 * @flag --dry Preview only (no writes)
 * @flag --force Skip per-file confirmation
 */
type Inputs = {
  dir: string;
  from: string;
  to: string;
  dry: boolean;
  force: boolean;
};

function shouldWrite(rel: string, text: string, next: string, inputs: Inputs): boolean {
  if (next === text || inputs.dry) {
    return false;
  }
  return inputs.force || ack(`Write ${rel}?`, "y");
}

async function replaceOne(rel: string, inputs: Inputs): Promise<boolean> {
  const file = SAF.from(inputs.dir, rel);
  const text = await file.file.text();
  const next = text.replaceAll(inputs.from, inputs.to);
  if (!shouldWrite(rel, text, next, inputs)) {
    return false;
  }
  await file.write(next);
  return true;
}

function parseInputs(): Inputs {
  const [dir, from, to] = args;
  if (!dir || !from || !to) {
    throw new Exit("Usage: bm-replace <dir> <from> <to>");
  }
  return { dir, from, to, dry: !!flags.dry, force: !!flags.force };
}

export default async function () {
  const inputs = parseInputs();
  const files = await glob("**/*.{md,txt}", { cwd: inputs.dir });
  if (!files.length) {
    throw new Exit("No matching files");
  }
  let updated = 0;
  for (const rel of files) {
    if (await replaceOne(rel, inputs)) {
      updated += 1;
    }
  }
  console.log(ansis.green(`Updated ${updated} files`));
}
```
