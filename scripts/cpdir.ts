/**
 * Copy the current directory to the clipboard
 * @global cpdir
 */
import { $ } from 'bun';
import { realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseCommandArgs } from './_argv';

const { positionals } = parseCommandArgs({});
const scriptPath = fileURLToPath(import.meta.url);

function queryArgs(): string[] {
	const trimmed = positionals.map(value => value.trim()).filter(value => value.length > 0);
	if (trimmed[0] !== scriptPath) {
		return trimmed;
	}
	if (trimmed[1] !== 'cpdir') {
		return trimmed;
	}
	return trimmed.slice(2);
}

async function copyPath(dir: string): Promise<void> {
	const resolvedDir = await realpath(dir);
	await $`printf %s ${resolvedDir} | pbcopy`;
	console.log(`Copied: ${resolvedDir}`);
}

async function runCommand(
	cmd: string[],
	options: {
		stdin?: 'pipe' | 'inherit';
		stderr?: 'pipe' | 'inherit';
	},
): Promise<{ exitCode: number; stdout: string; stderr: string; }> {
	const child = Bun.spawn({
		cmd,
		stdin: options.stdin ?? 'pipe',
		stdout: 'pipe',
		stderr: options.stderr ?? 'pipe',
	});
	const stdout = await new Response(child.stdout).text();
	const stderr = await new Response(child.stderr).text();
	const exitCode = await child.exited;
	return { exitCode, stdout, stderr };
}

function requireZoxide(): void {
	if (Bun.which('zoxide')) {
		return;
	}
	console.error('zoxide is required for query mode');
	process.exit(1);
}

async function queryMatches(query: string[]): Promise<string[]> {
	const result = await runCommand(['zoxide', 'query', '-l', '--', ...query], {});
	if (result.exitCode !== 0) {
		return [];
	}
	return result.stdout
		.split('\n')
		.map(value => value.trim())
		.filter(value => value.length > 0);
}

async function selectMatch(query: string[]): Promise<string | null> {
	const result = await runCommand(['zoxide', 'query', '-i', '--', ...query], {
		stdin: 'inherit',
		stderr: 'inherit',
	});
	if (result.exitCode !== 0) {
		return null;
	}
	const selected = result.stdout.trim();
	return selected.length > 0 ? selected : null;
}

const query = queryArgs();
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
