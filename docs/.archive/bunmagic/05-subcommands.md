---
summary: "bunmagic subcommands API for multi-command CLIs with validation and help"
read_when:
  - Designing a multi-command bunmagic CLI.
  - Need subcommands(), typed factories, or command validation patterns.
---

## Basic Usage

Default recommendation: use `arg()`/`flag()` for typed reads inside handlers. Keep `args.shift()` for command-token routing.

```ts
import { subcommands } from 'bunmagic/extras'

const commands = subcommands({
  add: async () => {
    const file = arg(0).string().required('Missing file to add')
    console.log(`Adding ${file}...`)
  },
  remove: async () => {
    const file = arg(0).string().required('Missing file to remove')
    console.log(`Removing ${file}...`)
  },
  list: async () => {
    console.log('Listing all items...')
  },
})

commands.maybeHelp()

// args.shift() mutates global args (consumes command token globally)
const commandName = args.shift() || 'list'
const command = commands.get(commandName)
await command()
```

## API Reference

### `subcommands(config)`

Creates a subcommands handler around a command map.

### `commands.get(name?, fallback?)`

Retrieves a command callback.

Behavior:

- Valid `name` returns that command.
- `fallback` is used only when `name` is `undefined`.
- Invalid names still throw, even with `fallback`.
- Empty-string names are invalid.

### `commands.name(commandName)`

Validates and returns a typed command name.

### `commands.commands`

Array of available command names.

### `commands.maybeHelp()`

Prints command list and exits when `--help` is set.

Note: `maybeHelp()` checks `flags.help`; it does not trigger on `-h` (`flags.h`).

## Typed Subcommands

```ts
import { subcommandFactory } from 'bunmagic/extras'

const typed = subcommandFactory<string, void>()

const commands = typed({
  echo: async (...parts: string[]) => {
    console.log(parts.join(' '))
  },
})
```

## Complete Example: Todo CLI

```ts
#!/usr/bin/env bunmagic
import { subcommands } from 'bunmagic/extras'
import { mkdir } from 'node:fs/promises'

interface Todo {
  id: number
  text: string
  done: boolean
}

const todosPath = resolveTilde('~/.todos.json')
let todos: Todo[] = []

const todosFile = Bun.file(todosPath)
if (await todosFile.exists()) {
  todos = await todosFile.json() as Todo[]
}

async function saveTodos() {
  await mkdir(path.dirname(todosPath), { recursive: true })
  await Bun.write(todosPath, `${JSON.stringify(todos, null, 2)}\n`)
}

const commands = subcommands({
  add: async () => {
    const text = args.join(' ')
    if (!text) throw new Exit('Please provide todo text')

    todos.push({ id: Date.now(), text, done: false })
    await saveTodos()
    console.log(ansis.green('Added:'), text)
  },

  list: async () => {
    if (todos.length === 0) {
      console.log(ansis.dim('No todos yet'))
      return
    }

    for (const todo of todos) {
      const status = todo.done ? ansis.green('✓') : ansis.red('○')
      console.log(`${status} [${todo.id}] ${todo.text}`)
    }
  },

  done: async () => {
    const id = arg(0).int().required('Please provide todo id')
    const todo = todos.find(t => t.id === id)
    if (!todo) throw new Exit(`Todo ${id} not found`)

    todo.done = true
    await saveTodos()
    console.log(ansis.green('Completed:'), todo.text)
  },
})

commands.maybeHelp()

const commandName = args.shift() || 'list'
try {
  await commands.get(commandName)()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(ansis.red(message))
  throw new Exit(1)
}
```

## Best Practices

1. Call `maybeHelp()` early.
2. Consume command token once with `args.shift()`.
3. Prefer explicit fallback (`args.shift() || 'list'`).
4. Default to `arg()`/`flag()` for typed argument and flag reads.
5. Keep global `flags` for quick booleans (`flags.help`, `flags.verbose`, `flags.debug`).
6. Use `throw new Exit(...)` for user-facing failures.

## SAF Note

Avoid `SAF` in new subcommand examples. It is deprecated in `1.4.x` and planned for removal in `2.0.0`.
`files.*` is also deprecated for new code (except `glob`).
