---
summary: "bunmagic subcommands API for multi-command CLIs with validation and help"
read_when:
  - Designing a multi-command bunmagic CLI.
  - Need subcommands(), typed factories, or command validation patterns.
---

Bunmagic provides a powerful subcommands system that allows you to create CLI tools with multiple commands, similar to how git has `git add`, `git commit`, etc. The system includes automatic help generation, command validation, and TypeScript support.

## Basic Usage

```typescript
import { subcommands } from 'bunmagic/extras';

// Define your subcommands
const commands = subcommands({
  add: async () => {
    const file = args[0];
    console.log(`Adding ${file}...`);
  },
  
  remove: async () => {
    const file = args[0];
    console.log(`Removing ${file}...`);
  },
  
  list: async () => {
    console.log('Listing all items...');
  }
});

// Automatically handle --help flag
commands.maybeHelp(); // Shows available commands if --help is passed

// Get the command from arguments
const commandName = args.shift();
const command = commands.get(commandName, 'list'); // 'list' is the fallback

// Execute the command
await command();
```

## API Reference

### `subcommands(config)`

Creates a new subcommands handler with the provided command configuration.

```typescript
const commands = subcommands({
  commandName: async () => { /* implementation */ },
  // ... more commands
});
```

### `.get(name?, fallback?)`

Retrieves a command by name with optional fallback.

```typescript
// Get specific command (throws if not found)
const addCommand = commands.get('add');

// Get with fallback
const command = commands.get(args[0], 'help');

// Get fallback when no name provided
const defaultCommand = commands.get(undefined, 'help');
```

### `.name(commandName)`

Validates and returns a command name. Throws an error with available commands if invalid.

```typescript
try {
  const validName = commands.name(userInput);
  console.log(`Running ${validName} command`);
} catch (error) {
  console.error(error.message); // Shows valid commands
}
```

### `.commands`

Returns an array of all available command names.

```typescript
console.log('Available commands:', commands.commands.join(', '));
```

### `.maybeHelp()`

Automatically handles the `--help` flag by displaying available commands and exiting.

```typescript
// Call this early in your script
commands.maybeHelp();

// If --help was passed, it will print:
// Available commands:
//   • add
//   • remove
//   • list
// And exit with code 0
```

## Advanced: Typed Subcommands

For commands that accept specific arguments and return values, use the typed factory:

```typescript
import { subcommandFactory } from 'bunmagic/extras';

// Create a typed subcommands factory
// First type parameter: arguments array
// Second type parameter: return value
const typedCommands = subcommandFactory<[string, number], void>();

const commands = typedCommands({
  process: async (name: string, count: number) => {
    console.log(`Processing ${name} ${count} times`);
  },
  
  analyze: async (data: string, threshold: number) => {
    console.log(`Analyzing ${data} with threshold ${threshold}`);
  }
});

// TypeScript ensures correct argument types
const processCmd = commands.get('process');
await processCmd('data.csv', 5); // ✓ Correct types
```

## Complete Example: Todo CLI

Here's a complete example of a todo list manager with subcommands:

```typescript
#!/usr/bin/env bunmagic
import { subcommands } from 'bunmagic/extras';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const todosFile = SAF.from('~/.todos.json');
let todos: Todo[] = [];

// Load todos
if (await todosFile.exists()) {
  todos = await todosFile.readJSON();
}

// Save todos
async function saveTodos() {
  await todosFile.writeJSON(todos);
}

// Define commands
const commands = subcommands({
  add: async () => {
    const text = args.join(' ');
    if (!text) die('Please provide todo text');
    
    const todo: Todo = {
      id: Date.now(),
      text,
      done: false
    };
    
    todos.push(todo);
    await saveTodos();
    console.log(ansis.green('✓ Added:'), text);
  },
  
  list: async () => {
    if (todos.length === 0) {
      console.log(ansis.dim('No todos yet!'));
      return;
    }
    
    todos.forEach(todo => {
      const status = todo.done ? ansis.green('✓') : ansis.red('○');
      console.log(`${status} [${todo.id}] ${todo.text}`);
    });
  },
  
  done: async () => {
    const id = parseInt(args[0]);
    const todo = todos.find(t => t.id === id);
    
    if (!todo) die(`Todo ${id} not found`);
    
    todo.done = true;
    await saveTodos();
    console.log(ansis.green('✓ Completed:'), todo.text);
  },
  
  remove: async () => {
    const id = parseInt(args[0]);
    const index = todos.findIndex(t => t.id === id);
    
    if (index === -1) die(`Todo ${id} not found`);
    
    const [removed] = todos.splice(index, 1);
    await saveTodos();
    console.log(ansis.red('✗ Removed:'), removed.text);
  }
});

// Handle help
commands.maybeHelp();

// Get and execute command
const commandName = args.shift() || 'list';
try {
  const command = commands.get(commandName);
  await command();
} catch (error) {
  console.error(ansis.red(error.message));
  console.log('\nUse --help to see available commands');
  exit(1);
}
```

## JSDoc Integration

You can document subcommands in your script's JSDoc header using the `@subcommand` tag:

```typescript
/**
 * Todo list manager
 * @autohelp
 * @usage todo <command> [args]
 * @subcommand add <text> - Add a new todo
 * @subcommand list - List all todos
 * @subcommand done <id> - Mark todo as complete
 * @subcommand remove <id> - Remove a todo
 */
```

This integrates with Bunmagic's automatic help generation system.

## Best Practices

1. **Always call `.maybeHelp()`** early in your script to handle the help flag
2. **Provide a fallback command** when using `.get()` to handle missing arguments
3. **Use the typed factory** when your commands have specific parameter requirements
4. **Validate arguments** within each command handler
5. **Show helpful error messages** that include available commands

## Error Handling

The subcommands system provides helpful error messages automatically:

```typescript
try {
  const command = commands.get('invalid');
} catch (error) {
  console.error(error.message);
  // Output: "Invalid command. Valid commands are: add, remove, list"
}
```

## Comparison with Simple Scripts

| Feature | Simple Script | With Subcommands |
|---------|--------------|------------------|
| Multiple actions | Use flags (`--add`, `--remove`) | Use commands (`add`, `remove`) |
| Help generation | Manual | Automatic with `.maybeHelp()` |
| Command validation | Manual | Automatic |
| TypeScript support | Basic | Full typing with factory |
| User experience | `script --add item` | `script add item` |

The subcommands pattern is ideal when your script has distinct operations that would feel more natural as separate commands rather than flags.