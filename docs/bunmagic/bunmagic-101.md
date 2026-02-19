---
summary: "Bunmagic 101: Dense overview of Bunmagic APIs"
read_when:
  - Working with bunmagic scripts.
  - Need an overview of Bunmagic APIs like fs, interaction, glob, shell, etc
---

# Quick bunmagic Reference

See also:
- Command discovery model: `docs/bunmagic/reference/08-command-discovery.md`
- SAF deprecation/migration: `docs/bunmagic/migrations/saf-to-files.md`

## First-Hop CLI Commands
- `bunmagic list` - show scripts already available on this machine.
- `bunmagic which <command-or-namespace>` - resolve command or namespace to its source path quickly.
- `bunmagic exec <file> [args...]` - run any script file with bunmagic globals, without registering it.
- `bunmagic help` - optional command index.

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
- `throw new Exit(0 | message | error)` (controlled exit)

## Paths and Files
- `Bun.file(path).text()/bytes()/json()/exists()`
- `Bun.write(path, data)`
- `path.join(...)`, `path.resolve(...)`
- `$HOME` global JS variable (like shell `$HOME`)
- `resolveTilde(input: string): string`
- `cd(path: string): void`
- `cwd(): Promise<string>`
- `isDirectory(path: string): Promise<boolean>`
- `ensureDirectory(path: string): Promise<boolean>`
- `glob("**/*.ts", options?): Promise<string[]>`
- `openEditor(path: string): Promise<boolean>`

## Files API
Use `files.*` as the primary filesystem API.

```ts
const filePath = files.resolve("path/to/file.txt");
await files.outputFile(filePath, "Hello, world!");

const exists = await files.pathExists(filePath);
const isFile = await files.isFile(filePath);
const bytes = await files.readBytes(filePath);

await files.editFile(filePath, (content) => content.toUpperCase());
const safePath = await files.writeFileSafe("path/to/output.txt", bytes);
console.log(safePath);
```

Shortform API signatures:
- `resolve(input: PathLike, ...rest: PathLike[]): string`
- `stem(input: PathLike): string`
- `pathExists(path: PathLike): Promise<boolean>`
- `isFile(path: PathLike): Promise<boolean>`
- `isDir(path: PathLike): Promise<boolean>`
- `ensureDir(path: PathLike): Promise<string>`
- `ensureFile(path: PathLike): Promise<string>`
- `emptyDir(path: PathLike): Promise<string>`
- `readFile(path: PathLike): Promise<string>`
- `readBytes(path: PathLike): Promise<Uint8Array>`
- `writeFile(path: PathLike, input: BlobInput, options?: WriteTextOptions): Promise<number>`
- `outputFile(path: PathLike, input: BlobInput, options?: WriteTextOptions): Promise<number>`
- `editFile(path: PathLike, updater: (content: string) => string | Promise<string>, options?: WriteTextOptions): Promise<string>`
- `copy(source: PathLike, destination: PathLike, options?: MoveCopyOptions): Promise<string>`
- `move(source: PathLike, destination: PathLike, options?: MoveCopyOptions): Promise<string>`
- `remove(path: PathLike): Promise<string>`
- `glob(pattern?: string, options?: GlobScanOptions): Promise<string[]>`
- `ensureUniquePath(path: PathLike, options?: SuffixOptions): Promise<string>`
- `writeFileSafe(path: PathLike, input: BlobInput, options?: WriteTextOptions & { suffix?: SuffixOptions }): Promise<string>`
- `copySafe(source: PathLike, destination: PathLike, options?: MoveCopyOptions & { suffix?: SuffixOptions }): Promise<string>`
- `moveSafe(source: PathLike, destination: PathLike, options?: MoveCopyOptions & { suffix?: SuffixOptions }): Promise<string>`

Deprecated filesystem migration: [/migrations/saf-to-files/](/migrations/saf-to-files/)

## Prompts and UI
- `ack(question: string, defaultOption?: "y" | "n"): boolean`
- `ask(question: string, defaultAnswer?: string, handle?: "required" | "use_default" | ((answer: string | undefined) => Promise<string>)): Promise<string>`
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
  const readmePath = files.resolve(import.meta.dir, "../README.md");
  if (!(await files.pathExists(readmePath))) {
    throw new Exit(`README not found: ${readmePath}`);
  }
  const contents = await files.readFile(readmePath);
  if (flags.copy) {
    await copyToClipboard(contents);
    console.log(ansis.green(`Copied ${readmePath} to clipboard`));
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
  const filePath = files.resolve(inputs.dir, rel);
  const text = await files.readFile(filePath);
  const next = text.replaceAll(inputs.from, inputs.to);
  if (!shouldWrite(rel, text, next, inputs)) {
    return false;
  }
  await files.writeFile(filePath, next);
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
