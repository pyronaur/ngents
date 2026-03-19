import { readFileSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";

import { runtimeError } from "../core/errors.ts";
import { docsCommandUsage } from "../core/usage.ts";
import { CACHE_ROOT, CONFIG_ROOT, INDEX_NAME, listQmdCollections, runQmd } from "./qmd.ts";

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

const DEFAULT_LIMIT = 5;
const DEFAULT_MIN_SCORE = "0.35";
const DEFAULT_TIP =
	"Tip: Write anchored queries, not conversational ones: <product/library> <mechanism> <exact term if known>";
const docFrontmatterCache = new Map<string, DocFrontmatter>();

function fail(message: string): never {
	throw runtimeError(message);
}

function parseVirtualPath(
	filePath: string,
): { collectionName: string; relativePath: string } | null {
	const match = /^qmd:\/\/([^/]+)\/(.+)$/.exec(filePath);
	const collectionName = match?.[1]?.trim();
	const relativePath = match?.[2]?.trim();
	if (!collectionName || !relativePath) {
		return null;
	}

	return { collectionName, relativePath };
}

function toAbsoluteDocPath(filePath: string, collectionRoots: Map<string, string>): string {
	const parsed = parseVirtualPath(filePath);
	if (!parsed) {
		return filePath;
	}

	const docsRoot = collectionRoots.get(parsed.collectionName);
	if (!docsRoot) {
		return filePath;
	}

	return path.join(docsRoot, parsed.relativePath);
}

function parseSnippetAnchor(line: string): SnippetAnchor | null {
	const match = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+@@/);
	if (!match) {
		return null;
	}

	const startText = match[1];
	if (!startText) {
		return null;
	}

	const startLine = Number.parseInt(startText, 10);
	if (!Number.isFinite(startLine) || startLine <= 0) {
		return null;
	}

	const count = Number.parseInt(match[2] ?? "1", 10);
	const safeCount = Number.isFinite(count) && count > 0 ? count : 1;
	return {
		startLine,
		endLine: startLine + safeCount - 1,
	};
}

function formatPathWithAnchor(
	filePath: string,
	anchor: SnippetAnchor | null,
	collectionRoots: Map<string, string>,
): string {
	const absolutePath = toAbsoluteDocPath(filePath, collectionRoots);
	if (!anchor) {
		return absolutePath;
	}

	return `${absolutePath}:${anchor.startLine}-${anchor.endLine}`;
}

function visibleSnippetLines(lines: string[]): string[] {
	return lines.filter(line => {
		const trimmed = line.trim();
		if (trimmed.length === 0 || trimmed === "---") {
			return false;
		}
		if (/^(summary|read_when|source):/i.test(trimmed)) {
			return false;
		}
		return true;
	});
}

function clipSnippetLines(lines: string[]): string[] {
	const clipped: string[] = [];
	let totalLength = 0;

	for (const line of lines) {
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

	return clipped;
}

function cleanSnippet(
	snippet: string | undefined,
): { anchor: SnippetAnchor | null; body: string | null } {
	if (!snippet) {
		return { anchor: null, body: null };
	}

	const rawLines = snippet.split("\n");
	let anchor: SnippetAnchor | null = null;
	const [firstLine, ...restLines] = rawLines;
	const firstAnchor = parseSnippetAnchor(firstLine ?? "");
	const lines = firstAnchor ? restLines : rawLines;
	anchor = firstAnchor ?? null;

	const visibleLines = visibleSnippetLines(lines);
	if (visibleLines.length === 0) {
		return { anchor, body: null };
	}

	const clipped = clipSnippetLines(visibleLines);
	if (clipped.length === 0) {
		return { anchor, body: null };
	}

	let body = clipped.join("\n").trim();
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

	const normalized = text.replace(/\s+/g, " ").trim();
	if (normalized.length === 0) {
		return null;
	}

	return clipLine(normalized, 220);
}

function parseInlineFrontmatterValue(line: string, key: string): string | null {
	const match = line.match(new RegExp(`^${key}:\\s*(.*)$`, "i"));
	if (!match) {
		return null;
	}

	const value = (match[1] ?? "").trim().replace(/^['"]|['"]$/g, "");
	return value.length > 0 ? value : null;
}

function isFrontmatterKey(line: string, key: string): boolean {
	return new RegExp(`^${key}:\\s*$`, "i").test(line);
}

function frontmatterLines(text: string): string[] {
	const lines = text.split("\n");
	if (lines[0]?.trim() !== "---") {
		return [];
	}

	const result: string[] = [];
	for (let index = 1; index < lines.length; index += 1) {
		const line = lines[index];
		if (line === undefined || line.trim() === "---" || index > 40) {
			break;
		}
		result.push(line);
	}

	return result;
}

function collectReadWhenItems(lines: string[]): string[] {
	const items: string[] = [];
	let readWhenActive = false;

	for (const line of lines) {
		const trimmedLine = line.trim();
		const readWhen = parseInlineFrontmatterValue(trimmedLine, "read_when");
		if (readWhen !== null) {
			readWhenActive = true;
			if (readWhen.length > 0) {
				items.push(readWhen);
			}
			continue;
		}

		if (isFrontmatterKey(trimmedLine, "read_when")) {
			readWhenActive = true;
			continue;
		}
		if (!readWhenActive) {
			continue;
		}
		if (trimmedLine.startsWith("- ")) {
			items.push(trimmedLine.slice(2).trim());
			continue;
		}
		if (trimmedLine.length === 0) {
			continue;
		}

		readWhenActive = false;
	}

	return items;
}

function parseDocFrontmatterFromText(text: string): DocFrontmatter {
	const parsed: DocFrontmatter = { overview: null, readWhen: null };
	const lines = frontmatterLines(text);
	if (lines.length === 0) {
		return parsed;
	}

	for (const line of lines) {
		const overview = parseInlineFrontmatterValue(line.trim(), "overview");
		if (overview) {
			parsed.overview = overview;
		}
	}

	const readWhenItems = collectReadWhenItems(lines);
	if (readWhenItems.length > 0) {
		parsed.readWhen = readWhenItems.join(" ");
	}

	return parsed;
}

function readDocFrontmatter(absolutePath: string): DocFrontmatter {
	const cached = docFrontmatterCache.get(absolutePath);
	if (cached) {
		return cached;
	}

	let parsed: DocFrontmatter = { overview: null, readWhen: null };

	try {
		parsed = parseDocFrontmatterFromText(readFileSync(absolutePath, "utf8"));
	} catch {
		docFrontmatterCache.set(absolutePath, parsed);
		return parsed;
	}

	docFrontmatterCache.set(absolutePath, parsed);
	return parsed;
}

function pickOverview(
	filePath: string,
	context: string | undefined,
	collectionRoots: Map<string, string>,
): string | null {
	const absolutePath = toAbsoluteDocPath(filePath, collectionRoots);
	const frontmatter = readDocFrontmatter(absolutePath);
	const overview = cleanOverview(frontmatter.overview ?? undefined);
	if (overview) {
		return overview;
	}

	const readWhen = cleanOverview(frontmatter.readWhen ?? undefined);
	if (readWhen) {
		return readWhen;
	}

	return cleanOverview(context);
}

function scoreLabel(score: number | undefined): string {
	if (typeof score !== "number" || Number.isNaN(score)) {
		return "n/a";
	}

	return `${Math.round(score * 100)}%`;
}

function formatHeading(title: string, score: string): string {
	return pc.bold(`## ${title}: ${score}`);
}

function formatQuotedSnippet(body: string | null): string | null {
	if (!body) {
		return null;
	}

	return body
		.split("\n")
		.map(line => pc.yellow(`> ${line}`))
		.join("\n");
}

function isSearchResultArray(value: unknown): value is SearchResult[] {
	if (!Array.isArray(value)) {
		return false;
	}

	return value.every(item => item !== null && typeof item === "object");
}

function printResult(
	result: SearchResult,
	index: number,
	collectionRoots: Map<string, string>,
): void {
	const filePath = typeof result.file === "string" ? result.file : null;
	if (!filePath) {
		return;
	}

	const parsedPath = parseVirtualPath(filePath);
	const relativePath = parsedPath?.relativePath ?? filePath;
	const title = typeof result.title === "string" && result.title.trim().length > 0
		? result.title.trim()
		: path.basename(relativePath);
	const snippet = cleanSnippet(result.snippet);
	const overview = pickOverview(filePath, result.context, collectionRoots);
	const quotedSnippet = formatQuotedSnippet(snippet.body);

	if (index > 0) {
		console.log("");
		console.log("");
	}
	console.log(formatHeading(title, scoreLabel(result.score)));
	if (overview) {
		console.log(overview);
		console.log("");
	}
	console.log(formatPathWithAnchor(filePath, snippet.anchor, collectionRoots));
	if (quotedSnippet) {
		console.log(quotedSnippet);
	}
}

function printResults(results: SearchResult[], collectionRoots: Map<string, string>): void {
	console.log(pc.gray(DEFAULT_TIP));
	console.log("");

	if (results.length === 0) {
		console.log("No results.");
		return;
	}

	for (const [index, result] of results.entries()) {
		printResult(result, index, collectionRoots);
	}
}

async function runStatus(commandLabel: string): Promise<void> {
	const result = await runQmd(["status"]);
	if (result.exitCode !== 0) {
		fail(result.stderr.trim() || result.stdout.trim() || "qmd status failed");
	}
	const collections = await listQmdCollections();
	const collectionNames = collections.map(collection => collection.name).join(", ") || "-";

	console.log(`# ${commandLabel} status`);
	console.log("");
	console.log(`- Index: ${INDEX_NAME}`);
	console.log(`- Collections: ${collectionNames}`);
	console.log(`- Cache root: ${CACHE_ROOT}`);
	console.log(`- Config root: ${CONFIG_ROOT}`);
	console.log("");
	process.stdout.write(result.stdout);
}

async function loadCollectionRoots(): Promise<Map<string, string>> {
	const collections = await listQmdCollections();
	const collectionRoots = new Map<string, string>();
	for (const collection of collections) {
		collectionRoots.set(collection.name, collection.path);
	}

	return collectionRoots;
}

async function runQuery(query: string, limitArg: string | undefined): Promise<void> {
	const requestedLimit = Number.parseInt(limitArg ?? "", 10);
	const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
		? requestedLimit
		: DEFAULT_LIMIT;
	const collectionRoots = await loadCollectionRoots();
	const result = await runQmd([
		"query",
		query,
		"-n",
		String(limit),
		"--min-score",
		DEFAULT_MIN_SCORE,
		"--json",
	]);

	if (result.exitCode !== 0) {
		fail(result.stderr.trim() || result.stdout.trim() || "qmd query failed");
	}

	let parsed: SearchResult[];
	try {
		const candidate: unknown = JSON.parse(result.stdout);
		if (!isSearchResultArray(candidate)) {
			fail("Failed to parse qmd JSON output");
		}
		parsed = candidate;
	} catch {
		process.stdout.write(result.stdout);
		process.stderr.write(result.stderr);
		fail("Failed to parse qmd JSON output");
	}

	const filtered = parsed.filter(result => typeof result.file === "string");

	printResults(filtered, collectionRoots);
}

type QueryOptions = {
	limit?: string;
};

export async function runDocsQuery(
	args: string[],
	options: QueryOptions = {},
	commandLabel = "docs query",
): Promise<void> {
	const usage = `${commandLabel} ${docsCommandUsage.query}`;
	const positionals = [...args];

	if (positionals.length === 0) {
		fail(`Usage: ${usage}`);
	}

	if (positionals.length === 1 && positionals[0] === "status") {
		await runStatus(commandLabel);
		return;
	}

	await runQuery(positionals.join(" "), options.limit);
}
