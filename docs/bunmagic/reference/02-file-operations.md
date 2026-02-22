---
summary: "Filesystem guidance for bunmagic scripts: Bun.file/Bun.write + node:fs/promises, with glob kept"
read_when:
  - Working with files/directories in bunmagic scripts.
  - Need the current recommendation after SAF/files.* deprecation.
---

## Current Recommendation

For new Bunmagic scripts:

- Use `Bun.file(...)` for read/existence/lazy file handles.
- Use `Bun.write(...)` for writes and file-to-file copying.
- Use `node:fs/promises` for directory + metadata operations (`mkdir`, `cp`, `rename`, `rm`, `stat`, ...).
- Keep using Bunmagic `glob()` when you want Bun shell cwd-aware glob behavior.

Compact API reference: `docs/bun/file-system-compact.md`

## Legacy Compatibility Status

- `SAF`: deprecated, scheduled for removal in `2.0.0`.
- `files.*`: deprecated, scheduled for removal in `2.0.0`.
- `glob()` helper remains supported.

Migration details: `docs/bunmagic/migrations/saf-to-files.md`

## Bunmagic Globals You Still Use

- Path/helpers: `path`, `$HOME`, `resolveTilde()`
- Working directory: `cd()`, `cwd()`
- Convenience compatibility globals (legacy): `isDirectory()`, `ensureDirectory()`
- Glob helper: `glob(pattern, options?)`
- Editor: `openEditor(path)`

## Typical Patterns

### Read text/json

```ts
const configFile = Bun.file('~/.config/tool/config.json'.replace('~', $HOME))
const config = (await configFile.exists())
  ? (await configFile.json() as Record<string, unknown>)
  : {}
```

### Ensure directory + write

```ts
import { mkdir } from 'node:fs/promises'

await mkdir('./tmp', { recursive: true })
await Bun.write('./tmp/state.json', `${JSON.stringify({ ok: true }, null, 2)}\n`)
```

### Rename/move with Node APIs

```ts
import { rename } from 'node:fs/promises'

await rename('./tmp/state.json', './tmp/state.next.json')
```

### Remove file/dir safely

```ts
import { rm } from 'node:fs/promises'

await rm('./tmp', { recursive: true, force: true })
```

### Glob (kept helper)

```ts
const matches = await glob('**/*.ts', { cwd: './src', absolute: true })
```

## Official Docs

- Bun file I/O: `https://bun.sh/docs/runtime/file-io`
- Bun reference: `https://bun.sh/reference/bun/file`, `https://bun.sh/reference/bun/write`
- Node fs docs: `https://nodejs.org/api/fs.html`
