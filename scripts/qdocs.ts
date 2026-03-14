/**
 * Search the global ngents docs library with QMD and print concise formatted results.
 * @autohelp
 * @usage qdocs [--limit <n>] <query...> | qdocs status
 * @flag --limit <n> Limit the number of results (default: 5)
 * @global qdocs
 */
import os from 'node:os';
import path from 'node:path';
import { fail, parseCommandArgs } from './_argv';

type SearchResult = {
	docid?: string;
	score?: number;
	file?: string;
	title?: string;
	context?: string;
	snippet?: string;
};

const INDEX_NAME = 'ngents-docs';
const COLLECTION_NAME = 'global-docs';
const DOCS_ROOT = path.join(os.homedir(), '.ngents', 'docs');
const CACHE_ROOT = path.join(os.homedir(), '.ngents', 'local', 'qmd-cache');
const CONFIG_ROOT = path.join(os.homedir(), '.ngents', 'local', 'qmd-config');
const DEFAULT_LIMIT = 5;
const DEFAULT_MIN_SCORE = '0.35';

const { positionals, values } = parseCommandArgs({
	limit: { type: 'string' },
});

function ensureQmd(): void {
	if (Bun.which('qmd')) {
		return;
	}

	fail('qmd is required');
}

function qmdEnv(): NodeJS.ProcessEnv {
	return {
		...process.env,
		XDG_CACHE_HOME: CACHE_ROOT,
		XDG_CONFIG_HOME: CONFIG_ROOT,
	};
}

async function runQmd(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const proc = Bun.spawn({
		cmd: ['qmd', '--index', INDEX_NAME, ...args],
		env: qmdEnv(),
		stdout: 'pipe',
		stderr: 'pipe',
	});

	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);

	return { exitCode, stdout, stderr };
}

function stripVirtualPrefix(filePath: string): string {
	const prefix = `qmd://${COLLECTION_NAME}/`;
	if (!filePath.startsWith(prefix)) {
		return filePath;
	}

	return filePath.slice(prefix.length);
}

function displaySection(relativePath: string): string {
	const directory = path.posix.dirname(relativePath);
	if (directory === '.') {
		return '/';
	}

	return directory;
}

function toAbsoluteDocPath(filePath: string): string {
	return path.join(DOCS_ROOT, stripVirtualPrefix(filePath));
}

function summarizeContext(context: string | undefined): string | null {
	if (!context) {
		return null;
	}

	const pieces = context
		.split('\n')
		.map(part => part.trim())
		.filter(Boolean);

	return pieces.at(-1) ?? pieces[0] ?? null;
}

function cleanSnippet(snippet: string | undefined): string | null {
	if (!snippet) {
		return null;
	}

	const lines = snippet
		.split('\n')
		.map(line => line.trim())
		.filter(line => {
			if (line.length === 0) {
				return false;
			}
			if (line.startsWith('@@ ')) {
				return false;
			}
			if (line === '---') {
				return false;
			}
			if (/^(title|summary|read_when|source):/i.test(line)) {
				return false;
			}
			return true;
		});

	if (lines.length === 0) {
		return null;
	}

	const normalized = lines
		.map(line =>
			line
				.replace(/^\#{1,6}\s+/, '')
				.replace(/^[-*]\s+/, '')
				.replace(/^\d+\.\s+/, '')
				.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
				.replace(/\[([^\]]+)\]\([^\s]*$/g, '$1')
				.replace(/\[([^\]]+)\]/g, '$1')
				.replace(/\*\*([^*]+)\*\*/g, '$1')
				.replace(/\*([^*]+)\*/g, '$1')
				.replace(/`([^`]+)`/g, '$1')
				.replace(/\s+/g, ' ')
				.trim(),
		)
		.filter(Boolean);

	if (normalized.length === 0) {
		return null;
	}

	const clipped: string[] = [];
	for (const line of normalized) {
		if (clipped.join('\n').length > 320) {
			break;
		}
		clipped.push(line);
		if (clipped.length >= 4) {
			break;
		}
	}

	if (clipped.length === 0) {
		return null;
	}

	const joined = clipped.join('\n');
	return joined.length > 340 ? `${joined.slice(0, 337).trimEnd()}...` : joined;
}

function scoreLabel(score: number | undefined): string {
	if (typeof score !== 'number' || Number.isNaN(score)) {
		return 'n/a';
	}

	return `${Math.round(score * 100)}%`;
}

function printResult(result: SearchResult, index: number): void {
	const filePath = typeof result.file === 'string' ? result.file : null;
	if (!filePath) {
		return;
	}

	const relativePath = stripVirtualPrefix(filePath);
	const absolutePath = toAbsoluteDocPath(filePath);
	const title = path.basename(relativePath);
	const snippet = cleanSnippet(result.snippet);

	console.log(`## ${title}`);
	console.log(absolutePath);
	console.log(scoreLabel(result.score));
	console.log('---');
	if (snippet) {
		console.log(snippet);
	}
	console.log('---');
	if (index >= 0) {
		console.log('');
	}
}

function printResults(query: string, results: SearchResult[]): void {
	if (results.length === 0) {
		console.log('No results.');
		return;
	}

	for (const [index, result] of results.entries()) {
		printResult(result, index);
	}
}

async function runStatus(): Promise<void> {
	const result = await runQmd(['status']);
	if (result.exitCode !== 0) {
		process.stderr.write(result.stderr || result.stdout);
		process.exit(result.exitCode);
	}

	console.log(`# qdocs status`);
	console.log('');
	console.log(`- Index: ${INDEX_NAME}`);
	console.log(`- Collection: ${COLLECTION_NAME}`);
	console.log(`- Docs root: ${DOCS_ROOT}`);
	console.log(`- Cache root: ${CACHE_ROOT}`);
	console.log(`- Config root: ${CONFIG_ROOT}`);
	console.log('');
	process.stdout.write(result.stdout);
}

async function runSearch(query: string): Promise<void> {
	const requestedLimit = Number.parseInt(values.limit ?? '', 10);
	const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : DEFAULT_LIMIT;
	const result = await runQmd([
		'search',
		query,
		'-c',
		COLLECTION_NAME,
		'-n',
		String(limit),
		'--min-score',
		DEFAULT_MIN_SCORE,
		'--json',
	]);

	if (result.exitCode !== 0) {
		process.stderr.write(result.stderr || result.stdout);
		process.exit(result.exitCode);
	}

	let parsed: SearchResult[];
	try {
		parsed = JSON.parse(result.stdout) as SearchResult[];
	} catch {
		process.stdout.write(result.stdout);
		process.stderr.write(result.stderr);
		fail('Failed to parse qmd JSON output');
	}

	const filtered = parsed.filter(result => {
		if (typeof result.file !== 'string') {
			return false;
		}

		return stripVirtualPrefix(result.file) !== 'ngents/qdocs.md';
	});

	printResults(query, filtered);
}

ensureQmd();

if (positionals.length === 0) {
	fail('Usage: qdocs [--limit <n>] <query...> | qdocs status');
}

if (positionals.length === 1 && positionals[0] === 'status') {
	await runStatus();
	process.exit(0);
}

await runSearch(positionals.join(' '));
