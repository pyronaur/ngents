---
summary: "bunmagic CLI commands for creating, editing, linking, and managing scripts"
read_when:
  - Need command-level usage for bunmagic CLI.
  - Managing script lifecycle (create/edit/list/remove/reload/link).
---

**Usage:** `bunmagic <command> [arguments]`

## Quick Reference

| Command | Alias | Usage | Description |
| --- | --- | --- | --- |
| `doctor` | | `bunmagic doctor` | Validate setup and environment health |
| `help` | | `bunmagic help [command]` | Show global help or help for one command |
| `which` | | `bunmagic which <script-name>` | Show source location for script/namespace |
| `install` | | `bunmagic install` | Install and configure bunmagic |
| `unlink` | | `bunmagic unlink [directory]` | Remove source directory from config |
| `types` | `init`, `add-types` | `bunmagic types` | Copy `bunmagic.d.ts` to current directory |
| `edit` | | `bunmagic edit [script-name]` | Edit one script or all scripts |
| `remove` | `rm` | `bunmagic remove <script-name>` | Remove script and linked binary |
| `exec` | `x` | `bunmagic exec <file> [args...]` | Execute file with bunmagic globals |
| `reload` | | `bunmagic reload [--force]` | Rebuild script bins from configured sources |
| `symlink` | | `bunmagic symlink` | Symlink sources into bunmagic root |
| `create` | `new` | `bunmagic create <script-name>` | Create a new script |
| `cleantest` | | `bunmagic cleantest` | Internal/dev command in source checkouts |
| `version` | `-v` | `bunmagic version` | Print bunmagic version |
| `clean` | | `bunmagic clean` | Remove orphaned bin files |
| `list` | `ls` | `bunmagic list [filter]` | List scripts (optional fuzzy filter) |
| `update` | | `bunmagic update` | Update bunmagic to latest version |
| `link` | | `bunmagic link [directory]` | Add source directory to config |
| `exec-args-forwardingtest` | | internal | Internal/dev command in source checkouts |

## Detailed Command Reference

### `doctor`

- Usage: `bunmagic doctor`
- Runs setup checks (`$PATH`, sources, aliases) and attempts follow-up fixes when possible.

### `help`

- Usage: `bunmagic help [command]`
- Examples:
  - `bunmagic help`
  - `bunmagic help exec`
  - `bunmagic exec --help`

### `which`

- Usage: `bunmagic which <script-name>`
- Prints source location for script or namespace.

### `install`

- Usage: `bunmagic install`
- Installs/configures bunmagic, script source directory, and shell setup.
- Also supports uninstall flow:
  - `bunmagic install --remove`
  - `bunmagic install --uninstall`
  - `bunmagic install remove`
  - `bunmagic install uninstall`

### `unlink`

- Usage: `bunmagic unlink [directory]`
- Removes source directory from bunmagic config.

### `types` (`init`, `add-types`)

- Usage: `bunmagic types`
- Copies prebuilt `bunmagic.d.ts` to `./bunmagic.d.ts`.

### `edit`

- Usage: `bunmagic edit [script-name]`
- No argument: opens all scripts and `~/.bunmagic`.

### `remove` (`rm`)

- Usage: `bunmagic remove <script-name>`
- Removes script and corresponding linked binary.

### `exec` (`x`)

- Usage: `bunmagic exec <file> [args...]`
- Flags:
  - `--namespace <name>` set namespace for executed script (testing)

### `reload`

- Usage: `bunmagic reload [--force]`
- Rebuilds bins from current source definitions.
- `--force` forces bin recreation.

### `symlink`

- Usage: `bunmagic symlink`
- Flags:
  - `--target <directory>` set symlink target (default `~/.bunmagic`)
  - `--remove` remove existing symlinks

### `create` (`new`)

- Usage: `bunmagic create <script-name>`
- Creates script and opens editor.

### `cleantest`

- Internal/dev command used in source checkouts.

### `version` (`-v`)

- Usage: `bunmagic version`
- Also available via `bunmagic -v`.

### `clean`

- Usage: `bunmagic clean`
- Removes orphaned binaries from bunmagic bin directory.

### `list` (`ls`)

- Usage: `bunmagic list [filter]`
- Flags:
  - `--info`, `-i` show extended script metadata

### `update`

- Usage: `bunmagic update`
- Runs global update and reports version change.

### `link`

- Usage: `bunmagic link [directory]`
- Adds a new script source directory.

### Internal/Dev-only Commands

- `exec-args-forwardingtest`
- `cleantest`

These appear in source-checkout help output and are not part of typical end-user workflow.

## Notes

- `bunmagic --help` and `bunmagic help` are equivalent entry points.
- In strict mode (`BUNMAGIC_STRICT=1`), unknown commands fail instead of prompting script creation.
