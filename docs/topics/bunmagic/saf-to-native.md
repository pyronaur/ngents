---
summary: "Migration guide for replacing SAF and files helpers with Bun.file, Bun.write, and node:fs/promises."
read_when:
  - Rewriting Bunmagic scripts that still use `SAF` or `files.*`.
  - Need the native Bun or Node replacement for Bunmagic filesystem helpers.
---

# SAF to Native

Use native Bun and Node filesystem APIs:

- `Bun.file(...)`
- `Bun.write(...)`
- `node:fs/promises`

## References

- `https://bun.sh/docs/runtime/file-io`
- `https://nodejs.org/api/fs.html`

## Quick Mapping

- `SAF.from(path)` -> `path.resolve(path)` + `Bun.file(...)`
- `await saf.exists()` -> `await Bun.file(path).exists()`
- `await saf.isFile()` -> `stat(path).isFile()`
- `await saf.isDirectory()` -> `stat(path).isDirectory()`
- `await saf.write(data)` -> `await Bun.write(path, data)`
- `await saf.bytes()` -> `await Bun.file(path).bytes()`
- `await saf.edit(fn)` -> `const next = fn(await Bun.file(path).text()); await Bun.write(path, next)`
- `await saf.ensureDirectory()` -> `await mkdir(dirname(path), { recursive: true })`
- `await saf.delete()` -> `await rm(path, { recursive: true, force: true })`
- `await SAF.prepare(path)` -> explicit unique-path suffix function
- `files.outputFile(path, data)` -> `mkdir(dirname(path), { recursive: true })` + `Bun.write(path, data)`

## Rewrite Example (JSON)

```ts
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const p = './state.json'
const file = Bun.file(p)

const state = (await file.exists())
  ? (await file.json() as { count?: number })
  : {}

state.count = (state.count ?? 0) + 1
await mkdir(path.dirname(p), { recursive: true })
await Bun.write(p, `${JSON.stringify(state, null, 2)}\n`)
```

## Collision-safe Write Example

```ts
import { stat } from 'node:fs/promises'

async function uniquePath(base: string): Promise<string> {
  let i = 0
  let candidate = base
  while (true) {
    try {
      await stat(candidate)
      i += 1
      const dot = base.lastIndexOf('.')
      candidate = dot >= 0
        ? `${base.slice(0, dot)}_${i}${base.slice(dot)}`
        : `${base}_${i}`
    } catch {
      return candidate
    }
  }
}

const target = await uniquePath('./report.txt')
await Bun.write(target, 'report')
```

## Keep Using `glob()`

`glob()` remains the Bunmagic helper exception because it aligns with Bun shell cwd behavior and is still convenient in scripts.
