---
summary: "Import npm packages directly inside bunmagic scripts"
read_when:
  - Need third-party npm packages in a bunmagic script.
---

## NPM Package Imports

When a bunmagic script is executed via `bunmagic exec`, it is run with Bun’s `--install=fallback` mode. This allows npm package imports to work without pre-installing dependencies.

**Examples:**
```ts
// Import and use packages directly
import cowsay from 'cowsay'
console.log(cowsay.say({ text: 'Hello!' }))

// Multiple packages
import { marked } from 'marked'
import chalk from 'chalk'

const html = marked('# Hello')
console.log(chalk.blue(html))
```

Bun will automatically install the required packages the first time they're imported (when running with `--install=fallback`).
