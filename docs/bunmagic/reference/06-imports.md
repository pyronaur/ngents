---
summary: "Import npm packages directly inside bunmagic scripts"
read_when:
  - Need third-party npm packages in a bunmagic script.
---

## NPM Package Imports

Bunmagic supports dynamic npm package imports without requiring prior installation.

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

Bun will automatically install the required packages the first time they're imported.