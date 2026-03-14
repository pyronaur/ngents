/**
 * Query the global ngents docs library with QMD and print concise formatted results.
 * @autohelp
 * @usage ndexq [--limit <n>] <query...> | ndexq status
 * @flag --limit <n> Limit the number of results (default: 5)
 * @global ndexq
 */
import os from 'node:os';
import { readFileSync } from 'node:fs';
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

type SnippetAnchor = {
	startLine: number;
	endLine: number;
};

type DocFrontmatter = {
	overview: string | null;
	readWhen: string | null;
};

const INDEX_NAME = 'ngents-docs';
const COLLECTION_NAME = 'global-docs';
const DOCS_ROOT = path.join(os.homedir(), '.ngents', 'docs');
const CACHE_ROOT = path.join(os.homedir(), '.ngents', 'local', 'qmd-cache');
const CONFIG_ROOT = path.join(os.homedir(), '.ngents', 'local', 'qmd-config');
const DEFAULT_LIMIT = 5;
const DEFAULT_MIN_SCORE = '0.35';
const DEFAULT_TIP =
	'Tip: Use exact product names, API names, error text, file names, or short mechanism terms. If results are broad, retry with words from the top hit title or context.';
const docFrontmatterCache = new Map<string, DocFrontmatter>();

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

function toAbsoluteDocPath(filePath: string): string {
	return path.join(DOCS_ROOT, stripVirtualPrefix(filePath));
}

function parseSnippetAnchor(line: string): SnippetAnchor | null {
	const match = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+@@/);
	if (!match) {
		return null;
	}

	const startLine = Number.parseInt(match[1], 10);
	if (!Number.isFinite(startLine) || startLine <= 0) {
		return null;
	}

	const count = Number.parseInt(match[2] ?? '1', 10);
	const safeCount = Number.isFinite(count) && count > 0 ? count : 1;
	return {
		startLine,
		endLine: startLine + safeCount - 1,
	};
}

function formatPathWithAnchor(filePath: string, anchor: SnippetAnchor | null): string {
	const absolutePath = toAbsoluteDocPath(filePath);
	if (!anchor) {
		return absolutePath;
	}

	return `${absolutePath}:${anchor.startLine}-${anchor.endLine}`;
}

function cleanSnippet(snippet: string | undefined): { anchor: SnippetAnchor | null; body: string | null } {
	if (!snippet) {
		return { anchor: null, body: null };
	}

	const rawLines = snippet.split('\n');
	let anchor: SnippetAnchor | null = null;
	const [firstLine, ...restLines] = rawLines;
	const firstAnchor = parseSnippetAnchor(firstLine ?? '');
	const lines = firstAnchor ? restLines : rawLines;
	if (firstAnchor) {
		anchor = firstAnchor;
	}

	const visibleLines = lines.filter(line => {
		const trimmed = line.trim();
		if (trimmed.length === 0) {
			return false;
		}
		if (trimmed === '---') {
			return false;
		}
		if (/^(summary|read_when|source):/i.test(trimmed)) {
			return false;
		}
		return true;
	});

	if (visibleLines.length === 0) {
		return { anchor, body: null };
	}

	const clipped: string[] = [];
	let totalLength = 0;
	for (const line of visibleLines) {
		const nextLength = totalLength === 0 ? line.length : totalLength + 1 + line.length;
		if (nextLength > 700) {
			break;
		}
		clipped.push(line);
		totalLength = nextLength;
		if (clipped.length >= 8) {
			break;
		}
	}

	if (clipped.length === 0) {
		return { anchor, body: null };
	}

	let body = clipped.join('\n').trim();
	if (clipped.length < visibleLines.length) {
		body = `${body}\n...`;
	}

	return { anchor, body };
}

function clipLine(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function cleanOverview(text: string | undefined): string | null {
	if (!text) {
		return null;
	}

	const normalized = text.replace(/\s+/g, ' ').trim();
	if (normalized.length === 0) {
		return null;
	}

	return clipLine(normalized, 220);
}

function parseInlineFrontmatterValue(line: string, key: string): string | null {
	const match = line.match(new RegExp(`^${key}:\\s*(.*)$`, 'i'));
	if (!match) {
		return null;
	}

	const value = match[1].trim().replace(/^['"]|['"]$/g, '');
	return value.length > 0 ? value : null;
}

function isFrontmatterKey(line: string, key: string): boolean {
	return new RegExp(`^${key}:\\s*$`, 'i').test(line);
}

function readDocFrontmatter(absolutePath: string): DocFrontmatter {
	const cached = docFrontmatterCache.get(absolutePath);
	if (cached) {
		return cached;
	}

	let parsed: DocFrontmatter = { overview: null, readWhen: null };

	try {
		const text = readFileSync(absolutePath, 'utf8');
		const lines = text.split('\n');
		if (lines[0]?.trim() !== '---') {
			docFrontmatterCache.set(absolutePath, parsed);
			return parsed;
		}

		const frontmatterLines: string[] = [];
		for (let index = 1; index < lines.length; index += 1) {
			const line = lines[index];
			if (line.trim() === '---') {
				break;
			}
			if (index > 40) {
				break;
			}
			frontmatterLines.push(line);
		}

		let readWhenActive = false;
		const readWhenItems: string[] = [];
		for (const line of frontmatterLines) {
			const overview = parseInlineFrontmatterValue(line.trim(), 'overview');
			if (overview) {
				parsed = { ...parsed, overview };
			}

			const trimmedLine = line.trim();
			const readWhen = parseInlineFrontmatterValue(trimmedLine, 'read_when');
			if (readWhen !== null) {
				readWhenActive = true;
				if (readWhen.length > 0) {
					readWhenItems.push(readWhen);
				}
				continue;
			}

			if (isFrontmatterKey(trimmedLine, 'read_when')) {
				readWhenActive = true;
				continue;
			}

			if (!readWhenActive) {
				continue;
			}

			const trimmed = trimmedLine;
			if (trimmed.startsWith('- ')) {
				readWhenItems.push(trimmed.slice(2).trim());
				continue;
			}

			if (trimmed.length === 0) {
				continue;
			}

			readWhenActive = false;
		}

		if (readWhenItems.length > 0) {
			parsed = { ...parsed, readWhen: readWhenItems.join(' ') };
		}
	} catch {
		docFrontmatterCache.set(absolutePath, parsed);
		return parsed;
	}

	docFrontmatterCache.set(absolutePath, parsed);
	return parsed;
}

function pickOverview(filePath: string, context: string | undefined): string | null {
	const absolutePath = toAbsoluteDocPath(filePath);
	const frontmatter = readDocFrontmatter(absolutePath);
	const overview = cleanOverview(frontmatter.overview);
	if (overview) {
		return overview;
	}

	const readWhen = cleanOverview(frontmatter.readWhen);
	if (readWhen) {
		return readWhen;
	}

	return cleanOverview(context);
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
	const title = typeof result.title === 'string' && result.title.trim().length > 0 ? result.title.trim() : path.basename(relativePath);
	const snippet = cleanSnippet(result.snippet);
	const overview = pickOverview(filePath, result.context);

	console.log(`## ${title}: ${scoreLabel(result.score)}`);
	if (overview) {
		console.log(overview);
	}
	console.log(formatPathWithAnchor(filePath, snippet.anchor));
	console.log('---');
	if (snippet.body) {
		console.log(snippet.body);
	}
	console.log('---');
	if (index >= 0) {
		console.log('');
	}
}

function printResults(results: SearchResult[]): void {
	console.log(DEFAULT_TIP);
	console.log('');

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

	console.log(`# ndexq status`);
	console.log('');
	console.log(`- Index: ${INDEX_NAME}`);
	console.log(`- Collection: ${COLLECTION_NAME}`);
	console.log(`- Docs root: ${DOCS_ROOT}`);
	console.log(`- Cache root: ${CACHE_ROOT}`);
	console.log(`- Config root: ${CONFIG_ROOT}`);
	console.log('');
	process.stdout.write(result.stdout);
}

async function runQuery(query: string): Promise<void> {
	const requestedLimit = Number.parseInt(values.limit ?? '', 10);
	const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : DEFAULT_LIMIT;
	const result = await runQmd([
		'query',
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

		return stripVirtualPrefix(result.file) !== 'ngents/ndexq.md';
	});

	printResults(filtered);
}

ensureQmd();

if (positionals.length === 0) {
	fail('Usage: ndexq [--limit <n>] <query...> | ndexq status');
}

if (positionals.length === 1 && positionals[0] === 'status') {
	await runStatus();
	process.exit(0);
}

await runQuery(positionals.join(' '));
