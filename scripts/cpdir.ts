/**
 * Copy the current directory to the clipboard
 * @global cpdir
 */
import { $ } from 'bun';
import { realpath } from 'node:fs/promises';

const dir = await realpath(process.cwd());
await $`printf %s ${dir} | pbcopy`;
console.log(`Copied: ${dir}`);
