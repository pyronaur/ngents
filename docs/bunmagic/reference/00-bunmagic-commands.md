---
summary: "bunmagic CLI commands for creating, editing, linking, and managing scripts"
read_when:
  - Need command-level usage for bunmagic CLI.
  - Managing script lifecycle (create/edit/list/remove/reload/link).
---

Bunmagic is a script management tool that makes it easy to create, manage, and run Bun-based shell scripts. These commands help you manage your scripts - creating new ones, editing existing ones, and keeping everything organized.

**Usage:** `bunmagic <command> [arguments]`

:::tip[Script Management Workflow]
1. **Create** a script: `bunmagic create my-script`
2. **Edit** it: `bunmagic edit my-script` (or auto-opens after creation)
3. **Run** it directly: `my-script`

The commands below help you manage this workflow.
:::

## Quick Reference

| Command | Alias | Description |
|---------|-------|-------------|
| `doctor` | | Check if Bunmagic is set up correctly |
| `help` | | Display the full list of available commands |
| `install` | | Install Bunmagic and set up your environment |
| `unlink` | | Remove a directory from the script source list |
| [`edit`](#edit) | | Edit scripts |
| [`remove`](#remove) | `rm` | Remove and unlink a script |
| [`reload`](#reload) | | Reload script files |
| [`symlink`](#symlink) | | Create symlinks to Bunmagic root |
| [`create`](#create) | `new` | Create a new script |
| [`version`](#version) | `-v` | Display version information |
| `clean` | | Remove orphaned bin files |
| [`list`](#list) | `ls` | List all scripts |
| `update` | | Update Bunmagic |
| `link` | | Add script source directory |

## Detailed Command Reference

### edit
**Usage:** `bunmagic edit [script-name]`

Edit scripts in your default editor. If no script name is provided, opens all scripts and the `~/.bunmagic` directory.

**Examples:**
```bash
# Edit a specific script
bunmagic edit hello-world

# Open all scripts for editing
bunmagic edit
```

### remove
**Usage:** `bunmagic remove <script-name>` (alias: `rm`)

Remove a script and its corresponding symlink.

**Examples:**
```bash
# Remove a script
bunmagic remove hello-world

# Using the alias
bunmagic rm old-script
```

### reload
**Usage:** `bunmagic reload [--force]`

Reload all script files and ensure they have executable bin files.

**Parameters:**
- `--force` - Force creation of bin files even if they already exist

**Examples:**
```bash
# Reload all scripts
bunmagic reload

# Force recreation of all bin files
bunmagic reload --force
```

### symlink
**Usage:** `bunmagic symlink [options]`

Create symlinks from your script sources to the Bunmagic root directory for easy access.

**Parameters:**
- `--target` - Specify the target directory (Default: `~/.bunmagic`)
- `--remove` - Remove existing symlinks

**Examples:**
```bash
# Create symlinks using default target
bunmagic symlink

# Create symlinks in a custom directory
bunmagic symlink --target ~/scripts

# Remove existing symlinks
bunmagic symlink --remove
```

### create
**Usage:** `bunmagic create <script-name>` (alias: `new`)

Create a new script with the specified name. Opens the script in your default editor after creation.

**Examples:**
```bash
# Create a new script
bunmagic create project-setup

# Using the alias
bunmagic new git-cleanup
```

### version
**Usage:** `bunmagic version` (alias: `-v`)

Display the current version of Bunmagic.

**Examples:**
```bash
# Check version
bunmagic version

# Using the alias
bunmagic -v
```

### list
**Usage:** `bunmagic list [filter] [options]` (alias: `ls`)

List all scripts with their status and description.

**Parameters:**
- `[filter]` - Optional fuzzy match filter for script paths
- `--info` or `-i` - Display more detailed information about each script

**Examples:**
```bash
# List all scripts
bunmagic list

# Filter scripts containing "git"
bunmagic list git

# Show detailed information
bunmagic list --info

# Using the alias with filter
bunmagic ls project
```
