---
summary: "bunmagic CLI commands for creating, editing, linking, and managing scripts"
read_when:
  - Need command-level usage for bunmagic CLI.
  - Managing script lifecycle (create/edit/list/remove/reload/link).
---

## Overview

**Usage:** `bunmagic <command> [arguments]`

Use `bunmagic help [command]` or run a command with `--help` to view the command's autohelp output.

## Quick Reference

| Command | Alias | Usage | Description |
| --- | --- | --- | --- |
| `doctor` | | `bunmagic doctor` | Check whether bunmagic is set up |
| `help` | | `bunmagic help [command]` | Show help for bunmagic commands |
| `which` | | `bunmagic which <script-name>` | Show the source location for a script or namespace |
| `install` | | `bunmagic install` | Install bunmagic and set up the environment |
| `unlink` | | `bunmagic unlink [directory]` | Remove a directory from the script source list |
| `types` | `init`, `add-types` | `bunmagic types` | Copy `bunmagic.d.ts` to the current directory |
| `edit` | | `bunmagic edit [script-name]` | Edit scripts or open a namespace directory |
| `remove` | `rm` | `bunmagic remove <script-name>` | Remove and unlink a script or namespace |
| `exec` | `x` | `bunmagic exec <file> [args...]` | Execute a file with the bunmagic context |
| `reload` | | `bunmagic reload [--force]` | Rebuild linked executables for sources |
| `symlink` | | `bunmagic symlink` | Symlink sources and bunmagic install into a target |
| `create` | `new` | `bunmagic create <script-name>` | Create a new script |
| `version` | `-v` | `bunmagic version` | Print bunmagic version |
| `clean` | | `bunmagic clean` | Remove orphaned bin files |
| `list` | `ls` | `bunmagic list [filter]` | List known scripts (optional filter) |
| `update` | | `bunmagic update` | Update bunmagic to the latest version |
| `link` | | `bunmagic link [directory]` | Add a directory as a script source |
| `exec-args-forwardingtest` | | internal | Internal/dev command in source checkouts |
| `cleantest` | | internal | Internal/dev command in source checkouts |

## Commands

### `doctor`
**Usage:** `bunmagic doctor`

Checks common setup issues (PATH, script sources, aliases). May run interactive follow-up steps.

**Examples:**
```bash
bunmagic doctor
```

### `help`
**Usage:** `bunmagic help [command]`

Shows help output. When `command` is provided, shows help for that command.

**Examples:**
```bash
bunmagic help
bunmagic help exec
bunmagic exec --help
```

### `which`
**Usage:** `bunmagic which <script-name>`

Prints the source path for a script or the directory for a namespace.

**Parameters:**
- `script-name` - Script slug or namespace name

**Errors:**
- Throws when `script-name` is not provided.
- Throws when no script or namespace matches the input.

**Examples:**
```bash
bunmagic which my-script
bunmagic which my-namespace
```

### `install`
**Usage:** `bunmagic install`

Installs and configures bunmagic.

**Options:**
- `--remove`, `--uninstall` - Uninstall bunmagic
- `remove`, `uninstall` - Positional uninstall mode

**Behavior:**
- Creates `~/.bunmagic` and `~/.bunmagic/config.json` if missing.
- Ensures `~/.bunmagic/bin` is on `PATH`.
- Sets up the `bm` alias.
- Ensures at least one script source directory exists and reloads bins.

**Examples:**
```bash
bunmagic install
bunmagic install --uninstall
bunmagic install uninstall
```

### `unlink`
**Usage:** `bunmagic unlink [directory]`

Removes a script source directory from config, then cleans and reloads linked bins.

**Parameters:**
- `directory` - Source directory path; when omitted, may prompt to select from configured sources

**Examples:**
```bash
bunmagic unlink
bunmagic unlink ~/Projects/my-scripts
```

### `types` (`init`, `add-types`)
**Usage:** `bunmagic types`

Writes `bunmagic.d.ts` to the current directory.

**Behavior:**
- Overwrites `./bunmagic.d.ts` if it already exists.
- May prompt to add `bunmagic.d.ts` to `./.gitignore`.

**Examples:**
```bash
bunmagic types
bunmagic init
bunmagic add-types
```

### `edit`
**Usage:** `bunmagic edit [script-name]`

Opens a script file or a namespace directory in the configured editor.

**Parameters:**
- `script-name` - Script slug or namespace name; when omitted, may prompt to open `~/.bunmagic`

**Behavior:**
- When the script does not exist, runs `bunmagic create` for the same slug.

**Examples:**
```bash
bunmagic edit
bunmagic edit my-script
bunmagic edit my-namespace
```

### `remove` (`rm`)
**Usage:** `bunmagic remove <script-name>`

Removes a script or namespace and optionally deletes linked binaries and source files.

**Parameters:**
- `script-name` - Script slug or namespace name

**Examples:**
```bash
bunmagic remove my-script
bunmagic rm my-script
bunmagic remove my-namespace
```

### `exec` (`x`)
**Usage:** `bunmagic exec <file> [args...]`

Executes a file with bunmagic globals available.

**Options:**
- `--namespace <name>` - Sets `BUNMAGIC_NAMESPACE` for the executed script (testing)

**Behavior:**
- Resolves `file` with `path.resolve(...)`.
- Shows help and exits successfully when no `file` is provided.
- Throws when the resolved file does not exist.

**Examples:**
```bash
bunmagic exec ./scripts/my-script.ts
bunmagic exec ./script.ts --namespace myapp --help
bunmagic x ./script.ts
```

### `reload`
**Usage:** `bunmagic reload [--force]`

Rebuilds linked script and namespace binaries from configured source directories.

**Options:**
- `--force` - Forces bin recreation

**Examples:**
```bash
bunmagic reload
bunmagic reload --force
```

### `symlink`
**Usage:** `bunmagic symlink`

Symlinks configured sources and the bunmagic install into a target directory.

**Options:**
- `--target <directory>` - Target directory (default: `~/.bunmagic/`)
- `--remove` - Removes the created symlinks

**Examples:**
```bash
bunmagic symlink
bunmagic symlink --target ~/.bunmagic
bunmagic symlink --remove
```

### `create` (`new`)
**Usage:** `bunmagic create <script-name>`

Creates a new script, ensures a linked executable exists, and opens the script in the configured editor.

**Parameters:**
- `script-name` - Script slug; may include a namespace prefix in the input format supported by bunmagic

**Behavior:**
- Prompts for a target source directory when more than one is configured.
- Prompts for an extension when none is configured.
- Throws when a system command already exists with the same name.

**Examples:**
```bash
bunmagic create my-script
bunmagic new my-script
```

### `version` (`-v`)
**Usage:** `bunmagic version`

Prints the installed bunmagic version.

**Examples:**
```bash
bunmagic version
bunmagic -v
```

### `clean`
**Usage:** `bunmagic clean`

Removes bin files in `~/.bunmagic/bin` that do not map to a known script or namespace.

**Behavior:**
- Prompts before deleting each unexpected binary.

**Examples:**
```bash
bunmagic clean
```

### `list` (`ls`)
**Usage:** `bunmagic list [filter]`

Lists scripts and namespaces known to bunmagic.

**Parameters:**
- `filter` - Optional fuzzy filter

**Options:**
- `--info`, `-i` - Shows extended script metadata

**Examples:**
```bash
bunmagic list
bunmagic ls
bunmagic list prisma
bunmagic list --info
```

### `update`
**Usage:** `bunmagic update`

Updates bunmagic via `bun update -g bunmagic`.

**Examples:**
```bash
bunmagic update
```

### `link`
**Usage:** `bunmagic link [directory]`

Adds a source directory to the configured script source list, then reloads linked bins.

**Parameters:**
- `directory` - Source directory path; when omitted, prompts for a path

**Behavior:**
- Prompts for an optional namespace. Namespaced sources require invoking scripts with the namespace prefix.

**Examples:**
```bash
bunmagic link
bunmagic link ~/Projects/my-scripts
```

### Internal Commands

These entries appear in `bunmagic --help` when running from a source checkout. They are not part of typical end-user workflow.

#### `exec-args-forwardingtest`
**Usage:** internal

Internal test harness entry point.

#### `cleantest`
**Usage:** internal

Internal test harness entry point.

## Related

- Command discovery and bin linking: [Command Discovery](/reference/08-command-discovery/)

## Notes

- `bunmagic --help` and `bunmagic help` are equivalent entry points.
- In strict mode (`BUNMAGIC_STRICT=1`), unknown commands fail instead of prompting script creation.
