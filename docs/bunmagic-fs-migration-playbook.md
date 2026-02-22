---
summary: "Simple playbook for migrating Bunmagic filesystem usage to native Bun/Node APIs (and vice versa)"
read_when:
  - Migrating over to Bunmagic from native Bun/Node filesystem code.
  - Migrating from Bunmagic filesystem helpers to native Bun/Node filesystem APIs.
---

# Bunmagic FS Migration Playbook

## Read This When

- You are migrating **into** Bunmagic and want low-friction filesystem guidance.
- You are migrating **from** Bunmagic to native Bun/Node filesystem APIs.

## Direction A: Native -> Bunmagic

1. Keep your existing `Bun.file(...)`, `Bun.write(...)`, and `node:fs/promises` calls.
2. Do not introduce `files.*` or `SAF` for new code.
3. Use Bunmagic globals where they add value:
   - `glob(...)` (kept helper)
   - `path`, `resolveTilde()`, `cd()`, `cwd()`
4. Keep argument parsing in Bunmagic style (`arg()`, `flag()`, plus globals when convenient).

## Direction B: Bunmagic -> Native Bun/Node FS

1. Replace deprecated `files.*` calls:
   - reads -> `Bun.file(path).text()/json()/bytes()`
   - writes -> `Bun.write(path, data)`
   - dirs/metadata -> `node:fs/promises` (`mkdir`, `stat`, `rename`, `rm`, `cp`)
2. Replace `SAF` flows with explicit path + read/write + rename logic.
3. Keep `glob()` only if you need Bunmagic’s cwd-aware helper behavior.
4. Prefer explicit collision handling in script code for former `*Safe` helpers.

## Quick Mapping

- `files.readFile` -> `Bun.file(path).text()`
- `files.readBytes` -> `Bun.file(path).bytes()`
- `files.writeFile` / `files.outputFile` -> `Bun.write(path, data)` (+ `mkdir` when needed)
- `files.pathExists` -> `await Bun.file(path).exists()`
- `files.isFile` / `files.isDir` -> `stat(path).isFile()/isDirectory()`
- `files.ensureDir` -> `mkdir(path, { recursive: true })`
- `files.copy` -> `cp(...)` / `copyFile(...)`
- `files.move` -> `rename(...)` (with `EXDEV` fallback if required)
- `files.remove` -> `rm(path, { recursive: true, force: true })`

## Source-of-Truth References

- `docs/bun/file-system-compact.md`
- `docs/bunmagic/migrations/saf-to-files.md`
- Bun docs: `https://bun.sh/docs/runtime/file-io`
- Node docs: `https://nodejs.org/api/fs.html`
