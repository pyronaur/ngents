/**
 * Copy the current directory or a matched zoxide directory to the clipboard
 * @autohelp
 * @usage ngents cpdir [query...]
 * @global cpdir
 */
import { $ } from 'bun';
import { realpath } from 'node:fs/promises';
import { parseCommandArgs } from './_argv';

const { positionals: query } = parseCommandArgs({});

async function copyPath(dir: string): Promise<void> {
	const resolvedDir = await realpath(dir);
	await $`printf %s ${resolvedDir} | pbcopy`;
	console.log(`Copied: ${resolvedDir}`);
}

function requireZoxide(): void {
	if (Bun.which('zoxide')) {
		return;
	}
	console.error('zoxide is required for query mode');
	process.exit(1);
}

async function queryMatches(query: string[]): Promise<string[]> {
	const result = await $`zoxide query -l -- ${query}`.nothrow().quiet();
	if (result.exitCode !== 0) {
		return [];
	}
	return result.stdout
		.toString()
		.split('\n')
		.map(value => value.trim())
		.filter(value => value.length > 0);
}

async function selectMatch(query: string[]): Promise<string | null> {
	const result = await $`zoxide query -i -- ${query}`.nothrow().quiet();
	if (result.exitCode !== 0) {
		return null;
	}
	const selected = result.stdout.toString().trim();
	return selected.length > 0 ? selected : null;
}

if (query.length === 0) {
	await copyPath(process.cwd());
	process.exit(0);
}

requireZoxide();

const matches = await queryMatches(query);
if (matches.length === 0) {
	console.error(`No zoxide matches for "${query.join(' ')}"`);
	process.exit(1);
}

if (matches.length === 1) {
	await copyPath(matches[0]);
	process.exit(0);
}

const selected = await selectMatch(query);
if (!selected) {
	console.error('Selection cancelled');
	process.exit(1);
}

await copyPath(selected);
