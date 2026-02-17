/**
 * List docs index with summary/read_when metadata from docs roots.
 * @autohelp
 * @usage ngents docs
 */
const EXCLUDED_DIRS = new Set(['archive', 'research']);
const POSIX_SEP = '/';

type Metadata = {
	summary: string | null;
	readWhen: string[];
	error?: string;
};

type FrontMatterParseResult = {
	lines: string[];
	error?: string;
};

type MetadataLines = {
	summaryLine: string | null;
	readWhen: string[];
};

type FormattedOutput = {
	primary: string;
	readWhenLine: string | null;
};

function compactStrings(values: unknown[]): string[] {
	const result: string[] = [];
	for (const value of values) {
		if (value === null || value === undefined) {
			continue;
		}
		const normalized = String(value).trim();
		if (normalized.length > 0) {
			result.push(normalized);
		}
	}
	return result;
}

function toDisplayPath(value: string): string {
	return value.replaceAll('\\', POSIX_SEP);
}

function hasHiddenOrExcludedSegment(fullPath: string): boolean {
	const segments = toDisplayPath(fullPath).split(POSIX_SEP).filter(Boolean);
	for (const segment of segments) {
		if (segment.startsWith('.')) {
			return true;
		}
		if (EXCLUDED_DIRS.has(segment)) {
			return true;
		}
	}
	return false;
}

function parseInlineReadWhen(inline: string): string[] {
	const normalized = inline.trim();
	if (!normalized.startsWith('[') || !normalized.endsWith(']')) {
		return [];
	}

	const body = normalized.slice(1, -1);
	const values: string[] = [];
	let token = '';
	let quote: "'" | '"' | null = null;

	for (const char of body) {
		if ((char === "'" || char === '"') && quote === null) {
			quote = char;
			continue;
		}
		if (char === quote) {
			quote = null;
			continue;
		}
		if (char === ',' && quote === null) {
			values.push(token);
			token = '';
			continue;
		}
		token += char;
	}

	if (quote !== null) {
		// Ignore malformed inline arrays.
		return [];
	}

	values.push(token);
	return compactStrings(values).map(value => value.replace(/^['"]|['"]$/g, ''));
}

function parseFrontMatter(content: string): FrontMatterParseResult {
	if (!content.startsWith('---')) {
		return { lines: [], error: 'missing front matter' };
	}

	const endIndex = content.indexOf('\n---', 3);
	if (endIndex === -1) {
		return { lines: [], error: 'unterminated front matter' };
	}

	const frontMatter = content.slice(3, endIndex).trim();
	return { lines: frontMatter.split('\n') };
}

function collectMetadataLines(lines: string[]): MetadataLines {
	let summaryLine: string | null = null;
	const readWhen: string[] = [];
	let collectingField: 'read_when' | null = null;

	for (const rawLine of lines) {
		const line = rawLine.trim();

		if (line.startsWith('summary:')) {
			summaryLine = line;
			collectingField = null;
			continue;
		}

		if (line.startsWith('read_when:')) {
			collectingField = 'read_when';
			const inline = line.slice('read_when:'.length).trim();
			const inlineReadWhen = parseInlineReadWhen(inline);
			if (inlineReadWhen.length > 0) {
				readWhen.push(...inlineReadWhen);
			}
			continue;
		}

		if (collectingField !== 'read_when') {
			continue;
		}

		if (line.startsWith('- ')) {
			const hint = line.slice(2).trim();
			if (hint.length > 0) {
				readWhen.push(hint);
			}
			continue;
		}

		if (line === '') {
			// Keep collecting until another key or non-list content appears.
			continue;
		}

		collectingField = null;
	}

	return { summaryLine, readWhen };
}

function parseSummary(summaryLine: string | null): { summary: string | null; error?: string } {
	if (!summaryLine) {
		return { summary: null, error: 'summary key missing' };
	}

	const summaryValue = summaryLine.slice('summary:'.length).trim();
	const normalized = summaryValue.replace(/^['"]|['"]$/g, '').replace(/\s+/g, ' ').trim();
	if (!normalized) {
		return { summary: null, error: 'summary is empty' };
	}

	return { summary: normalized };
}

function parseMetadata(content: string): Metadata {
	const frontMatter = parseFrontMatter(content);
	if (frontMatter.error) {
		return { summary: null, readWhen: [], error: frontMatter.error };
	}

	const { summaryLine, readWhen } = collectMetadataLines(frontMatter.lines);
	const summary = parseSummary(summaryLine);
	if (!summary.summary) {
		return { summary: null, readWhen, error: summary.error };
	}

	return { summary: summary.summary, readWhen };
}

function formatOutput(cwdRelativePath: string, metadata: Metadata): FormattedOutput {
	if (!metadata.summary) {
		const reason = metadata.error ? ` - [${metadata.error}]` : '';
		return { primary: `${cwdRelativePath}${reason}`, readWhenLine: null };
	}

	const primary = `${cwdRelativePath} - ${metadata.summary}`;
	if (metadata.readWhen.length === 0) {
		return { primary, readWhenLine: null };
	}

	return {
		primary,
		readWhenLine: `  Read when: ${metadata.readWhen.join('; ')}`,
	};
}

async function listMarkdownFiles(docsRoot: string): Promise<string[]> {
	const markdownFiles = await glob('**/*.md', {
		cwd: docsRoot,
		onlyFiles: true,
		absolute: true,
	});
	return markdownFiles.map(file => toDisplayPath(file)).sort((a, b) => a.localeCompare(b));
}

async function discoverDocsRoots(rootDir: string): Promise<string[]> {
	const roots = new Set<string>();
	const maybeAddDocsRoot = async (candidate: string) => {
		if (!(await isDirectory(candidate))) {
			return;
		}
		roots.add(toDisplayPath(path.resolve(candidate)));
	};

	await maybeAddDocsRoot(path.join(rootDir, 'docs'));

	const nestedDocs = await glob('*/docs', {
		cwd: rootDir,
		onlyFiles: false,
		absolute: false,
	});
	for (const candidateRelative of nestedDocs) {
		const normalizedCandidate = toDisplayPath(candidateRelative);
		if (hasHiddenOrExcludedSegment(normalizedCandidate)) {
			continue;
		}
		const candidate = path.join(rootDir, normalizedCandidate);
		await maybeAddDocsRoot(candidate);
	}

	return Array.from(roots).sort((a, b) => a.localeCompare(b));
}

async function printDocsForRoot(rootDir: string, docsRoot: string): Promise<void> {
	const markdownFiles = await listMarkdownFiles(docsRoot);
	for (const fullPath of markdownFiles) {
		const docsRootRelativePath = toDisplayPath(path.relative(docsRoot, fullPath));
		if (hasHiddenOrExcludedSegment(docsRootRelativePath)) {
			continue;
		}

		const cwdRelativePath = toDisplayPath(path.relative(rootDir, fullPath));
		const content = await Bun.file(fullPath).text();
		const output = formatOutput(cwdRelativePath, parseMetadata(content));
		console.log(output.primary);
		if (!output.readWhenLine) {
			continue;
		}
		console.log(output.readWhenLine);
	}
}

export default async function () {
	const rootDir = toDisplayPath(path.resolve(await cwd()));
	const docsRoots = await discoverDocsRoots(rootDir);
	if (docsRoots.length === 0) {
		throw new Exit('No docs directories found (searched ./docs and ./*/docs)');
	}

	console.log(`Listing all markdown files in docs folder${docsRoots.length > 1 ? 's' : ''}:`);
	for (const docsRoot of docsRoots) {
		await printDocsForRoot(rootDir, docsRoot);
	}

	console.log(
		'\nReminder: keep docs up to date as behavior changes. When your task matches any "Read when" hint above (React hooks, cache directives, database work, tests, etc.), read that doc before coding, and suggest new coverage when it is missing.',
	);
}
