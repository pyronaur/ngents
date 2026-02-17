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

function parseMetadata(content: string): Metadata {
	if (!content.startsWith('---')) {
		return { summary: null, readWhen: [], error: 'missing front matter' };
	}

	const endIndex = content.indexOf('\n---', 3);
	if (endIndex === -1) {
		return { summary: null, readWhen: [], error: 'unterminated front matter' };
	}

	const frontMatter = content.slice(3, endIndex).trim();
	const lines = frontMatter.split('\n');

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

		if (collectingField === 'read_when') {
			if (line.startsWith('- ')) {
				const hint = line.slice(2).trim();
				if (hint.length > 0) {
					readWhen.push(hint);
				}
			} else if (line === '') {
				// Keep collecting until another key or non-list content appears.
			} else {
				collectingField = null;
			}
		}
	}

	if (!summaryLine) {
		return { summary: null, readWhen, error: 'summary key missing' };
	}

	const summaryValue = summaryLine.slice('summary:'.length).trim();
	const normalized = summaryValue.replace(/^['"]|['"]$/g, '').replace(/\s+/g, ' ').trim();
	if (!normalized) {
		return { summary: null, readWhen, error: 'summary is empty' };
	}

	return { summary: normalized, readWhen };
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
	for (const candidateRelative of nestedDocs.map(value => toDisplayPath(value))) {
		if (hasHiddenOrExcludedSegment(candidateRelative)) {
			continue;
		}
		const candidate = path.join(rootDir, candidateRelative);
		await maybeAddDocsRoot(candidate);
	}

	return Array.from(roots).sort((a, b) => a.localeCompare(b));
}

export default async function () {
	const rootDir = toDisplayPath(path.resolve(await cwd()));
	const docsRoots = await discoverDocsRoots(rootDir);
	if (docsRoots.length === 0) {
		throw new Exit('No docs directories found (searched ./docs and ./*/docs)');
	}

	console.log(`Listing all markdown files in docs folder${docsRoots.length > 1 ? 's' : ''}:`);

	for (const docsRoot of docsRoots) {
		const markdownFiles = await glob('**/*.md', {
			cwd: docsRoot,
			onlyFiles: true,
			absolute: true,
		});
		const sortedFiles = markdownFiles
			.map(file => toDisplayPath(file))
			.sort((a, b) => a.localeCompare(b));

		for (const fullPath of sortedFiles) {
			const docsRootRelativePath = toDisplayPath(path.relative(docsRoot, fullPath));
			if (hasHiddenOrExcludedSegment(docsRootRelativePath)) {
				continue;
			}

			const cwdRelativePath = toDisplayPath(path.relative(rootDir, fullPath));
			const content = await Bun.file(fullPath).text();
			const { summary, readWhen, error } = parseMetadata(content);

			if (summary) {
				console.log(`${cwdRelativePath} - ${summary}`);
				if (readWhen.length > 0) {
					console.log(`  Read when: ${readWhen.join('; ')}`);
				}
			} else {
				const reason = error ? ` - [${error}]` : '';
				console.log(`${cwdRelativePath}${reason}`);
			}
		}
	}

	console.log(
		'\nReminder: keep docs up to date as behavior changes. When your task matches any "Read when" hint above (React hooks, cache directives, database work, tests, etc.), read that doc before coding, and suggest new coverage when it is missing.',
	);
}
