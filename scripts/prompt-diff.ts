/**
 * Compare local Codex system prompt with upstream merged baseline.
 * @autohelp
 * @usage ngents prompt-diff
 */
const LOCAL_SYSTEM_PROMPT = '/Users/n14/.ngents/SYSTEM_PROMPT.md';
const UPSTREAM_SYSTEM_PROMPT_URL =
	'https://raw.githubusercontent.com/openai/codex/main/codex-rs/core/prompt.md';
const UPSTREAM_PERSONALITY_URL =
	'https://raw.githubusercontent.com/openai/codex/main/codex-rs/core/templates/personalities/gpt-5.2-codex_pragmatic.md';

const MATCH_THRESHOLD = 0.55;

type LineDiff = {
	added: string[];
	removed: string[];
};

type Pairing = {
	addedIndex: number;
	removedIndex: number;
	score: number;
};

type Token = {
	norm: string;
	raw: string;
};

function splitLines(content: string): string[] {
	const normalized = content
		.replace(/\r\n?/g, '\n')
		.replace(/\uFEFF/g, '')
		.replace(/\n+$/u, '');

	if (normalized.length === 0) {
		return [];
	}

	return normalized.split('\n');
}

function normalizeLineForDiff(line: string): string {
	return line.normalize('NFKC').replace(/\p{White_Space}+/gu, ' ').trim();
}

function normalizeToken(word: string): string {
	const stripped = word
		.normalize('NFKC')
		.toLowerCase()
		.replace(/^[^\p{Letter}\p{Number}]+/gu, '')
		.replace(/[^\p{Letter}\p{Number}]+$/gu, '');

	if (stripped.length > 0) {
		return stripped;
	}

	return word.normalize('NFKC').toLowerCase();
}

function tokenize(line: string): Token[] {
	return line
		.split(/\s+/u)
		.map(word => word.trim())
		.filter(word => word.length > 0)
		.map(word => ({ raw: word, norm: normalizeToken(word) }));
}

function countByNormalizedLine(lines: string[]): Map<string, number> {
	const counts = new Map<string, number>();

	for (const line of lines) {
		const normalized = normalizeLineForDiff(line);
		if (normalized.length === 0) {
			continue;
		}

		counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
	}

	return counts;
}

function multisetDifference(baselineLines: string[], localLines: string[]): LineDiff {
	const baselineCounts = countByNormalizedLine(baselineLines);
	const localCounts = countByNormalizedLine(localLines);
	const removed: string[] = [];
	const added: string[] = [];
	const allLines = new Set<string>([...baselineCounts.keys(), ...localCounts.keys()]);

	for (const line of allLines) {
		const baselineCount = baselineCounts.get(line) ?? 0;
		const localCount = localCounts.get(line) ?? 0;
		const delta = baselineCount - localCount;
		if (delta > 0) {
			for (let index = 0; index < delta; index += 1) {
				removed.push(line);
			}
			continue;
		}

		if (delta < 0) {
			for (let index = 0; index < -delta; index += 1) {
				added.push(line);
			}
		}
	}

	return { removed, added };
}

function buildLcsMatrix(left: string[], right: string[]): number[][] {
	const matrix: number[][] = Array.from(
		{ length: left.length + 1 },
		() => new Array(right.length + 1).fill(0),
	);

	for (let row = 1; row <= left.length; row += 1) {
		for (let col = 1; col <= right.length; col += 1) {
			if (left[row - 1] === right[col - 1]) {
				matrix[row][col] = matrix[row - 1][col - 1] + 1;
				continue;
			}

			matrix[row][col] = Math.max(matrix[row - 1][col], matrix[row][col - 1]);
		}
	}

	return matrix;
}

function similarityScore(removedLine: string, addedLine: string): number {
	const removedTokens = tokenize(removedLine).map(token => token.norm);
	const addedTokens = tokenize(addedLine).map(token => token.norm);
	if (removedTokens.length === 0 || addedTokens.length === 0) {
		return 0;
	}

	const matrix = buildLcsMatrix(removedTokens, addedTokens);
	const lcs = matrix[removedTokens.length][addedTokens.length];
	return (2 * lcs) / (removedTokens.length + addedTokens.length);
}

function findBestPairs(removed: string[], added: string[]): Pairing[] {
	const candidates: Pairing[] = [];

	for (let removedIndex = 0; removedIndex < removed.length; removedIndex += 1) {
		for (let addedIndex = 0; addedIndex < added.length; addedIndex += 1) {
			const score = similarityScore(removed[removedIndex], added[addedIndex]);
			if (score < MATCH_THRESHOLD) {
				continue;
			}

			candidates.push({ removedIndex, addedIndex, score });
		}
	}

	candidates.sort((first, second) => {
		if (second.score !== first.score) {
			return second.score - first.score;
		}
		if (first.removedIndex !== second.removedIndex) {
			return first.removedIndex - second.removedIndex;
		}
		return first.addedIndex - second.addedIndex;
	});

	const usedRemoved = new Set<number>();
	const usedAdded = new Set<number>();
	const pairs: Pairing[] = [];

	for (const candidate of candidates) {
		if (usedRemoved.has(candidate.removedIndex)) {
			continue;
		}
		if (usedAdded.has(candidate.addedIndex)) {
			continue;
		}

		usedRemoved.add(candidate.removedIndex);
		usedAdded.add(candidate.addedIndex);
		pairs.push(candidate);
	}

	pairs.sort((first, second) => {
		if (first.removedIndex !== second.removedIndex) {
			return first.removedIndex - second.removedIndex;
		}
		return first.addedIndex - second.addedIndex;
	});

	return pairs;
}

function markSharedTokens(removedTokens: Token[], addedTokens: Token[]): [boolean[], boolean[]] {
	const removedNorm = removedTokens.map(token => token.norm);
	const addedNorm = addedTokens.map(token => token.norm);
	const matrix = buildLcsMatrix(removedNorm, addedNorm);
	const sharedRemoved = new Array(removedTokens.length).fill(false);
	const sharedAdded = new Array(addedTokens.length).fill(false);

	let row = removedTokens.length;
	let col = addedTokens.length;
	while (row > 0 && col > 0) {
		if (removedNorm[row - 1] === addedNorm[col - 1]) {
			sharedRemoved[row - 1] = true;
			sharedAdded[col - 1] = true;
			row -= 1;
			col -= 1;
			continue;
		}

		if (matrix[row - 1][col] >= matrix[row][col - 1]) {
			row -= 1;
			continue;
		}

		col -= 1;
	}

	return [sharedRemoved, sharedAdded];
}

function hasChangedTokens(sharedMask: boolean[]): boolean {
	for (const shared of sharedMask) {
		if (!shared) {
			return true;
		}
	}

	return false;
}

function renderComparedLine(prefix: '-' | '+', tokens: Token[], sharedMask: boolean[]): string {
	const color = prefix === '-' ? ansis.red : ansis.green;
	const renderedTokens: string[] = [];

	for (let index = 0; index < tokens.length; index += 1) {
		const raw = tokens[index].raw;
		if (sharedMask[index]) {
			renderedTokens.push(ansis.dim(raw));
			continue;
		}

		renderedTokens.push(color(raw));
	}

	return `${color(prefix)} ${renderedTokens.join(' ')}`;
}

function renderDiff(diff: LineDiff): string[] {
	const output: string[] = [];
	const pairs = findBestPairs(diff.removed, diff.added);
	const usedRemoved = new Set<number>();
	const usedAdded = new Set<number>();

	for (const pair of pairs) {
		usedRemoved.add(pair.removedIndex);
		usedAdded.add(pair.addedIndex);
		const removedLine = diff.removed[pair.removedIndex];
		const addedLine = diff.added[pair.addedIndex];
		const removedTokens = tokenize(removedLine);
		const addedTokens = tokenize(addedLine);
		const [sharedRemoved, sharedAdded] = markSharedTokens(removedTokens, addedTokens);
		if (hasChangedTokens(sharedRemoved)) {
			output.push(renderComparedLine('-', removedTokens, sharedRemoved));
		}
		if (hasChangedTokens(sharedAdded)) {
			output.push(renderComparedLine('+', addedTokens, sharedAdded));
		}
	}

	for (let index = 0; index < diff.removed.length; index += 1) {
		if (usedRemoved.has(index)) {
			continue;
		}
		output.push(ansis.red(`- ${diff.removed[index]}`));
	}

	for (let index = 0; index < diff.added.length; index += 1) {
		if (usedAdded.has(index)) {
			continue;
		}
		output.push(ansis.green(`+ ${diff.added[index]}`));
	}

	return output;
}

function printDiffLines(lines: string[]): void {
	for (const line of lines) {
		console.log(line);
	}
}

async function fetchText(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
	}
	return response.text();
}

export default async function (): Promise<void> {
	const [upstreamSystemPrompt, upstreamPersonality, localSystemPromptText] = await Promise.all([
		fetchText(UPSTREAM_SYSTEM_PROMPT_URL),
		fetchText(UPSTREAM_PERSONALITY_URL),
		Bun.file(LOCAL_SYSTEM_PROMPT).text(),
	]);

	const baselineLines = [
		...splitLines(upstreamSystemPrompt),
		...splitLines(upstreamPersonality),
	];
	const localLines = splitLines(localSystemPromptText);
	const diff = multisetDifference(baselineLines, localLines);
	const renderedLines = renderDiff(diff);

	console.log(ansis.dim('Merged prompt diff (upstream union vs local)'));
	if (renderedLines.length === 0) {
		console.log(ansis.green('No changed lines detected'));
		return;
	}

	printDiffLines(renderedLines);
}
