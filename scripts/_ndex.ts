import { lstat, readdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fail, parseCommandArgs } from "./_argv";

const EXCLUDED_DIRS = new Set(["archive", "research", "node_modules"]);
const META_FILE = ".ndex.md";
const TOPICS_DIR = "topics";
const POSIX_SEP = "/";
const GLOBAL_DOCS_LABEL = "~/.ngents/docs";
const require = createRequire(import.meta.url);
const pc: typeof import("picocolors") = require("picocolors");

type FrontMatterObject = Map<string, FrontMatterValue>;

type FrontMatterValue = string | string[] | FrontMatterObject;

type FrontMatterParseResult = {
	found: boolean;
	values: Map<string, FrontMatterValue>;
	error?: string;
};

type GuideMetadata = {
	title: string | null;
	summary: string | null;
	guideBody: string | null;
	readWhen: string[];
	error?: string;
};

type MarkdownEntry = {
	absolutePath: string;
	relativePath: string;
	title: string | null;
	summary: string | null;
	readWhen: string[];
	error?: string;
};

type SkillEntry = {
	absolutePath: string;
	relativePath: string;
	name: string;
	title: string | null;
	description: string | null;
	error?: string;
	referencePaths: string[];
};

type SectionEntry = {
	key: string;
	absolutePath: string;
	title: string;
	summary: string | null;
	guideBody: string | null;
	readWhen: string[];
	error?: string;
	markdownEntries: MarkdownEntry[];
	skills: SkillEntry[];
};

type TopicContribution = {
	name: string;
	absolutePath: string;
	title: string;
	summary: string | null;
	guideBody: string | null;
	readWhen: string[];
	error?: string;
	markdownEntries: MarkdownEntry[];
	sectionEntries: SectionEntry[];
};

type MergedTopic = {
	name: string;
	title: string;
	contributions: TopicContribution[];
};

type TopicIndexRow = {
	name: string;
	title: string;
	summary: string | null;
};

type IndexData = {
	topics: TopicIndexRow[];
	docs: MarkdownEntry[];
};

function toDisplayPath(value: string): string {
	return value.replaceAll("\\", POSIX_SEP);
}

function normalizePath(value: string): string {
	return toDisplayPath(path.resolve(value));
}

function compactStrings(values: unknown[]): string[] {
	const result: string[] = [];
	for (const value of values) {
		if (value === null || value === undefined) {
			continue;
		}

		const normalized = String(value).trim();
		if (normalized.length === 0) {
			continue;
		}

		result.push(normalized);
	}

	return result;
}

function sameFileName(left: string, right: string): boolean {
	return left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;
}

function stripQuotes(value: string): string {
	return value.replace(/^['"]|['"]$/g, "").trim();
}

function parseBooleanFlag(value: unknown): boolean {
	if (value === true) {
		return true;
	}
	if (value === false || value === undefined || value === null) {
		return false;
	}
	if (typeof value === "number") {
		return value !== 0;
	}
	if (typeof value !== "string") {
		return true;
	}

	const normalized = value.trim().toLowerCase();
	if (normalized === "" || normalized === "true") {
		return true;
	}
	if (normalized === "false" || normalized === "0") {
		return false;
	}

	return true;
}

function humanizeSlug(value: string): string {
	return value
		.split(/[-_/]+/g)
		.filter(Boolean)
		.map(part => {
			if (part === part.toUpperCase() && part.length <= 5) {
				return part;
			}

			return part.charAt(0).toUpperCase() + part.slice(1);
		})
		.join(" ");
}

function normalizeInlineText(value: string | null): string | null {
	if (!value) {
		return null;
	}

	const normalized = value.replace(/\s+/g, " ").trim();
	if (normalized.length === 0) {
		return null;
	}

	return normalized;
}

function parseInlineArray(value: string): string[] {
	const normalized = value.trim();
	if (!normalized.startsWith("[") || !normalized.endsWith("]")) {
		return [];
	}

	const values: string[] = [];
	let token = "";
	let quote: "'" | '"' | null = null;

	for (const char of normalized.slice(1, -1)) {
		if ((char === "'" || char === '"') && quote === null) {
			quote = char;
			continue;
		}
		if (char === quote) {
			quote = null;
			continue;
		}
		if (char === "," && quote === null) {
			values.push(token);
			token = "";
			continue;
		}
		token += char;
	}

	if (quote !== null) {
		return [];
	}

	values.push(token);
	return compactStrings(values).map(stripQuotes);
}

function frontMatterKeyPattern(): RegExp {
	return /^(\s*)([A-Za-z0-9_./-]+):(.*)$/;
}

function nextMeaningfulLine(
	lines: string[],
	startIndex: number,
): { index: number; line: string; indent: number } | null {
	for (let index = startIndex; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		if (line.trim().length === 0) {
			continue;
		}

		const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
		return { index, line, indent };
	}

	return null;
}

function parseFrontMatterList(lines: string[], startIndex: number, indent: number): { value: string[]; nextIndex: number } {
	const values: string[] = [];
	let index = startIndex;

	for (; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		if (line.trim().length === 0) {
			continue;
		}

		const currentIndent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
		if (currentIndent < indent) {
			break;
		}
		if (currentIndent !== indent) {
			break;
		}

		const listMatch = line.match(/^\s*-\s+(.*)$/);
		if (!listMatch) {
			break;
		}

		values.push(stripQuotes(listMatch[1] ?? ""));
	}

	return { value: compactStrings(values), nextIndex: index };
}

function parseFrontMatterMap(
	lines: string[],
	startIndex: number,
	indent: number,
): { values: Map<string, FrontMatterValue>; nextIndex: number } {
	const values = new Map<string, FrontMatterValue>();
	let index = startIndex;

	for (; index < lines.length; ) {
		const rawLine = lines[index] ?? "";
		if (rawLine.trim().length === 0) {
			index += 1;
			continue;
		}

		const keyMatch = rawLine.match(frontMatterKeyPattern());
		if (!keyMatch) {
			break;
		}

		const currentIndent = keyMatch[1]?.length ?? 0;
		if (currentIndent < indent) {
			break;
		}
		if (currentIndent > indent) {
			break;
		}

		const key = keyMatch[2] ?? "";
		const rawValue = keyMatch[3] ?? "";
		const value = rawValue.trim();
		index += 1;

		if (value === "" || value === "[]") {
			const nextLine = nextMeaningfulLine(lines, index);
			if (!nextLine || nextLine.indent <= currentIndent) {
				values.set(key, value === "[]" ? [] : "");
				continue;
			}

			if (/^\s*-\s+/.test(nextLine.line)) {
				const parsed = parseFrontMatterList(lines, index, nextLine.indent);
				values.set(key, parsed.value);
				index = parsed.nextIndex;
				continue;
			}

			if (frontMatterKeyPattern().test(nextLine.line)) {
				const parsed = parseFrontMatterMap(lines, index, nextLine.indent);
				values.set(key, parsed.values);
				index = parsed.nextIndex;
				continue;
			}

			values.set(key, "");
			continue;
		}

		if (value === ">" || value === ">-" || value === "|" || value === "|-") {
			const blockLines: string[] = [];
			const nextLine = nextMeaningfulLine(lines, index);
			const blockIndent = nextLine && nextLine.indent > currentIndent ? nextLine.indent : currentIndent + 2;

			for (; index < lines.length; index += 1) {
				const nextRawLine = lines[index] ?? "";
				if (nextRawLine.trim().length === 0) {
					blockLines.push("");
					continue;
				}

				const nextIndent = nextRawLine.match(/^(\s*)/)?.[1]?.length ?? 0;
				if (nextIndent < blockIndent) {
					break;
				}

				blockLines.push(nextRawLine.slice(Math.min(blockIndent, nextRawLine.length)));
			}

			const blockValue = value.startsWith(">") ? collectFoldedLines(blockLines) : blockLines.join("\n").trim();
			values.set(key, blockValue);
			continue;
		}

		if (value.startsWith("[") && value.endsWith("]")) {
			values.set(key, parseInlineArray(value));
			continue;
		}

		values.set(key, stripQuotes(value));
	}

	return { values, nextIndex: index };
}

function collectFoldedLines(lines: string[]): string {
	const paragraphs: string[] = [];
	let current: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.length === 0) {
			if (current.length > 0) {
				paragraphs.push(current.join(" "));
				current = [];
			}
			continue;
		}

		current.push(trimmed);
	}

	if (current.length > 0) {
		paragraphs.push(current.join(" "));
	}

	return paragraphs.join("\n\n").trim();
}

function parseFrontMatter(content: string): FrontMatterParseResult {
	const normalized = content.replaceAll("\r\n", "\n");
	if (!normalized.startsWith("---\n")) {
		return { found: false, values: new Map() };
	}

	const endIndex = normalized.indexOf("\n---", 4);
	if (endIndex === -1) {
		return { found: true, values: new Map(), error: "unterminated front matter" };
	}

	const lines = normalized.slice(4, endIndex).split("\n");
	return { found: true, values: parseFrontMatterMap(lines, 0, 0).values };
}

function stringField(values: Map<string, FrontMatterValue>, key: string): string | null {
	const value = values.get(key);
	if (typeof value !== "string") {
		return null;
	}

	const normalized = value.trim();
	if (normalized.length === 0) {
		return null;
	}

	return normalized;
}

function stringArrayField(values: Map<string, FrontMatterValue>, key: string): string[] {
	const value = values.get(key);
	if (!Array.isArray(value)) {
		return [];
	}

	return compactStrings(value);
}

function contentWithoutFrontMatter(content: string): string {
	const normalized = content.replaceAll("\r\n", "\n");
	if (!normalized.startsWith("---\n")) {
		return normalized;
	}

	const endIndex = normalized.indexOf("\n---", 4);
	if (endIndex === -1) {
		return normalized;
	}

	return normalized.slice(endIndex + "\n---".length).replace(/^\n+/, "");
}

function parseMarkdownTitle(content: string): string | null {
	for (const rawLine of contentWithoutFrontMatter(content).split("\n")) {
		const line = rawLine.trim();
		if (!line.startsWith("#")) {
			continue;
		}

		const title = line.replace(/^#+\s*/, "").trim();
		if (title.length > 0) {
			return title;
		}
	}

	return null;
}

function parseGuideBody(content: string): string | null {
	const lines = contentWithoutFrontMatter(content).split("\n");
	const rendered: string[] = [];
	let skippedTitle = false;
	let inCodeBlock = false;

	for (const rawLine of lines) {
		const trimmed = rawLine.trim();

		if (trimmed.startsWith("```")) {
			inCodeBlock = !inCodeBlock;
			continue;
		}
		if (inCodeBlock) {
			continue;
		}
		if (!skippedTitle && trimmed.startsWith("#")) {
			skippedTitle = true;
			continue;
		}
		if (trimmed.length === 0) {
			if (rendered[rendered.length - 1] !== "") {
				rendered.push("");
			}
			continue;
		}

		rendered.push(trimmed);
	}

	const normalized = rendered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
	if (normalized.length === 0) {
		return null;
	}

	return normalized;
}

function parseGuideSummary(content: string): string | null {
	const guideBody = parseGuideBody(content);
	if (!guideBody) {
		return null;
	}

	for (const paragraph of guideBody.split("\n\n")) {
		const normalized = paragraph.replace(/\s+/g, " ").trim();
		if (normalized.length === 0 || normalized.startsWith("- ")) {
			continue;
		}
		return normalized;
	}

	return null;
}

function parseMarkdownEntry(content: string): Pick<MarkdownEntry, "title" | "summary" | "readWhen" | "error"> {
	const frontMatter = parseFrontMatter(content);
	if (frontMatter.error) {
		return {
			title: parseMarkdownTitle(content),
			summary: null,
			readWhen: [],
			error: frontMatter.error,
		};
	}

	return {
		title: stringField(frontMatter.values, "title") ?? parseMarkdownTitle(content),
		summary: stringField(frontMatter.values, "summary"),
		readWhen: stringArrayField(frontMatter.values, "read_when"),
	};
}

function parseSkillEntry(content: string, relativePath: string): SkillEntry {
	const frontMatter = parseFrontMatter(content);
	const fallbackName = path.basename(path.dirname(relativePath));
	if (frontMatter.error) {
		return {
			absolutePath: "",
			relativePath,
			name: fallbackName,
			title: parseMarkdownTitle(content),
			description: null,
			error: frontMatter.error,
			referencePaths: [],
		};
	}

	return {
		absolutePath: "",
		relativePath,
		name: stringField(frontMatter.values, "name") ?? fallbackName,
		title: stringField(frontMatter.values, "title") ?? parseMarkdownTitle(content),
		description: stringField(frontMatter.values, "description"),
		referencePaths: [],
	};
}

function heading(level: 1 | 2 | 3, text: string): string {
	const content = `${"#".repeat(level)} ${text}`;
	if (level === 1) {
		return pc.cyan(pc.bold(content));
	}
	return pc.white(pc.bold(content));
}

function errorText(error: string): string {
	return pc.red(`[${error}]`);
}

function indentLine(text: string, indent = 0): string {
	return `${" ".repeat(indent)}${text}`;
}

function printLine(text = "", indent = 0): void {
	console.log(indentLine(text, indent));
}

function hasHiddenOrExcludedSegment(relativePath: string): boolean {
	const segments = toDisplayPath(relativePath).split(POSIX_SEP).filter(Boolean);
	for (const segment of segments) {
		if (segment.startsWith(".")) {
			return true;
		}
		if (EXCLUDED_DIRS.has(segment)) {
			return true;
		}
	}

	return false;
}

async function lstatSafe(filePath: string): Promise<Awaited<ReturnType<typeof lstat>> | null> {
	try {
		return await lstat(filePath);
	} catch {
		return null;
	}
}

async function isDirectory(filePath: string): Promise<boolean> {
	const entry = await lstatSafe(filePath);
	if (!entry) {
		return false;
	}
	if (entry.isDirectory()) {
		return true;
	}
	if (!entry.isSymbolicLink()) {
		return false;
	}
	try {
		return (await stat(filePath)).isDirectory();
	} catch {
		return false;
	}
}

async function hasGitMarker(candidateDir: string): Promise<boolean> {
	const gitPath = path.join(candidateDir, ".git");
	if (await isDirectory(gitPath)) {
		return true;
	}
	return Bun.file(gitPath).exists();
}

async function discoverRepoRoot(startDir: string): Promise<string | null> {
	let current = normalizePath(startDir);
	for (;;) {
		if (await hasGitMarker(current)) {
			return current;
		}

		const parent = normalizePath(path.dirname(current));
		if (parent === current) {
			return null;
		}

		current = parent;
	}
}

async function discoverDocsRoots(rootDir: string): Promise<string[]> {
	const roots = new Set<string>();
	const maybeAdd = async (candidate: string) => {
		if (!(await isDirectory(candidate))) {
			return;
		}
		roots.add(normalizePath(candidate));
	};

	await maybeAdd(path.join(rootDir, "docs"));

	try {
		const entries = await readdir(rootDir, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue;
			}
			if (!entry.name || entry.name.startsWith(".") || EXCLUDED_DIRS.has(entry.name)) {
				continue;
			}

			await maybeAdd(path.join(rootDir, entry.name, "docs"));
		}
	} catch {
		return Array.from(roots).sort((a, b) => a.localeCompare(b));
	}

	return Array.from(roots).sort((a, b) => a.localeCompare(b));
}

async function readGuideMetadata(directoryPath: string): Promise<GuideMetadata> {
	const guidePath = path.join(directoryPath, META_FILE);
	if (!(await Bun.file(guidePath).exists())) {
		return { title: null, summary: null, guideBody: null, readWhen: [] };
	}

	const content = await Bun.file(guidePath).text();
	const frontMatter = parseFrontMatter(content);
	return {
		title: stringField(frontMatter.values, "title") ?? parseMarkdownTitle(content),
		summary: stringField(frontMatter.values, "summary") ?? parseGuideSummary(content),
		guideBody: parseGuideBody(content),
		readWhen: stringArrayField(frontMatter.values, "read_when"),
		error: frontMatter.error,
	};
}

async function listMarkdownEntries(directoryPath: string): Promise<MarkdownEntry[]> {
	let entries;
	try {
		entries = await readdir(directoryPath, { withFileTypes: true });
	} catch {
		return [];
	}

	const result: MarkdownEntry[] = [];
	for (const entry of entries) {
		if (!entry.isFile()) {
			continue;
		}
		if (!entry.name.endsWith(".md")) {
			continue;
		}
		if (sameFileName(entry.name, META_FILE) || sameFileName(entry.name, "SKILL.md")) {
			continue;
		}
		if (entry.name.startsWith(".") || hasHiddenOrExcludedSegment(entry.name)) {
			continue;
		}

		const absolutePath = normalizePath(path.join(directoryPath, entry.name));
		const parsed = parseMarkdownEntry(await Bun.file(absolutePath).text());
		result.push({
			absolutePath,
			relativePath: entry.name,
			...parsed,
		});
	}

	return result.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function listDocsEntries(directoryPath: string, rootPath = directoryPath): Promise<MarkdownEntry[]> {
	let entries;
	try {
		entries = await readdir(directoryPath, { withFileTypes: true });
	} catch {
		return [];
	}

	const result: MarkdownEntry[] = [];
	for (const entry of entries) {
		if (!entry.name || entry.name.startsWith(".") || EXCLUDED_DIRS.has(entry.name)) {
			continue;
		}

		const absolutePath = normalizePath(path.join(directoryPath, entry.name));
		const relativePath = toDisplayPath(path.relative(rootPath, absolutePath));
		if (hasHiddenOrExcludedSegment(relativePath)) {
			continue;
		}

		if (entry.isDirectory()) {
			if (normalizePath(directoryPath) === normalizePath(rootPath) && entry.name === TOPICS_DIR) {
				continue;
			}
			result.push(...(await listDocsEntries(absolutePath, rootPath)));
			continue;
		}

		if (!entry.isFile() || !entry.name.endsWith(".md")) {
			continue;
		}
		if (sameFileName(entry.name, META_FILE) || sameFileName(entry.name, "SKILL.md")) {
			continue;
		}

		const parsed = parseMarkdownEntry(await Bun.file(absolutePath).text());
		result.push({
			absolutePath,
			relativePath,
			...parsed,
		});
	}

	return result.sort((a, b) => a.absolutePath.localeCompare(b.absolutePath));
}

async function listTopLevelTopics(docsRoot: string): Promise<string[]> {
	const topicsRoot = path.join(docsRoot, TOPICS_DIR);
	let entries;
	try {
		entries = await readdir(topicsRoot, { withFileTypes: true });
	} catch {
		return [];
	}

	return entries
		.filter(entry => entry.isDirectory() && entry.name.length > 0 && !entry.name.startsWith(".") && !EXCLUDED_DIRS.has(entry.name))
		.map(entry => entry.name)
		.sort((a, b) => a.localeCompare(b));
}

async function listSectionKeys(topicDir: string): Promise<string[]> {
	let entries;
	try {
		entries = await readdir(topicDir, { withFileTypes: true });
	} catch {
		return [];
	}

	return entries
		.filter(entry => entry.isDirectory() && entry.name.length > 0 && !entry.name.startsWith(".") && !EXCLUDED_DIRS.has(entry.name))
		.map(entry => entry.name)
		.sort((a, b) => a.localeCompare(b));
}

async function listSkillFiles(sectionDir: string): Promise<string[]> {
	const result: string[] = [];

	async function walk(currentDir: string): Promise<void> {
		let entries;
		try {
			entries = await readdir(currentDir, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			const absolutePath = path.join(currentDir, entry.name);
			const relativePath = toDisplayPath(path.relative(sectionDir, absolutePath));
			if (hasHiddenOrExcludedSegment(relativePath)) {
				continue;
			}

			if (entry.isDirectory()) {
				await walk(absolutePath);
				continue;
			}

			if (entry.isFile() && entry.name === "SKILL.md") {
				result.push(absolutePath);
			}
		}
	}

	await walk(sectionDir);
	return result.sort((a, b) => a.localeCompare(b));
}

async function extractReferencePaths(skillDir: string, content: string): Promise<string[]> {
	const discovered = new Set<string>();
	const linkPattern = /\[[^\]]+]\(([^)]+)\)/g;

	for (const match of content.matchAll(linkPattern)) {
		const rawReference = match[1]?.trim();
		if (!rawReference || rawReference.startsWith("http://") || rawReference.startsWith("https://")) {
			continue;
		}

		const withoutAnchor = rawReference.split("#")[0] ?? "";
		const normalizedRelative = toDisplayPath(withoutAnchor).replace(/^\.\//, "");
		if (normalizedRelative.length === 0 || hasHiddenOrExcludedSegment(normalizedRelative)) {
			continue;
		}

		const absolutePath = normalizePath(path.resolve(skillDir, withoutAnchor));
		if (!(await Bun.file(absolutePath).exists()) || (await isDirectory(absolutePath))) {
			continue;
		}

		discovered.add(toDisplayPath(path.relative(skillDir, absolutePath)));
	}

	return Array.from(discovered).sort((a, b) => a.localeCompare(b));
}

async function readSectionEntry(
	topicDir: string,
	sectionKey: string,
): Promise<SectionEntry> {
	const absolutePath = normalizePath(path.join(topicDir, sectionKey));
	const guide = await readGuideMetadata(absolutePath);
	const markdownEntries = await listMarkdownEntries(absolutePath);
	const skillFiles = await listSkillFiles(absolutePath);
	const skills: SkillEntry[] = [];

	for (const skillFile of skillFiles) {
		const content = await Bun.file(skillFile).text();
		const skill = parseSkillEntry(content, toDisplayPath(path.relative(topicDir, skillFile)));
		skill.absolutePath = normalizePath(skillFile);
		skill.referencePaths = await extractReferencePaths(path.dirname(skillFile), content);
		skills.push(skill);
	}

	return {
		key: sectionKey,
		absolutePath,
		title: guide.title ?? path.basename(sectionKey),
		summary: guide.summary,
		guideBody: guide.guideBody,
		readWhen: guide.readWhen,
		error: guide.error,
		markdownEntries,
		skills: skills.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
	};
}

async function readTopicContribution(docsRoot: string, topicName: string): Promise<TopicContribution | null> {
	const topicDir = normalizePath(path.join(docsRoot, TOPICS_DIR, topicName));
	if (!(await isDirectory(topicDir))) {
		return null;
	}

	const guide = await readGuideMetadata(topicDir);
	const markdownEntries = await listMarkdownEntries(topicDir);
	const sectionKeys = await listSectionKeys(topicDir);
	const sectionEntries: SectionEntry[] = [];

	for (const sectionKey of sectionKeys) {
		sectionEntries.push(await readSectionEntry(topicDir, sectionKey));
	}

	return {
		name: topicName,
		absolutePath: topicDir,
		title: guide.title ?? humanizeSlug(topicName),
		summary: guide.summary,
		guideBody: guide.guideBody,
		readWhen: guide.readWhen,
		error: guide.error,
		markdownEntries,
		sectionEntries,
	};
}

async function buildIndexData(docsRoots: string[]): Promise<IndexData> {
	const topicMap = new Map<string, TopicIndexRow>();
	const docs: MarkdownEntry[] = [];

	for (const docsRoot of docsRoots) {
		const topicNames = await listTopLevelTopics(docsRoot);
		for (const topicName of topicNames) {
			const guide = await readGuideMetadata(path.join(docsRoot, TOPICS_DIR, topicName));
			const existing = topicMap.get(topicName);
			if (!existing) {
				topicMap.set(topicName, {
					name: topicName,
					title: guide.title ?? humanizeSlug(topicName),
					summary: guide.summary,
				});
				continue;
			}

			if (!existing.summary && guide.summary) {
				existing.summary = guide.summary;
			}
			if (guide.title) {
				existing.title = guide.title;
			}
		}

		const rootDocs = await listDocsEntries(docsRoot);
		docs.push(...rootDocs);
	}

	return {
		topics: Array.from(topicMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
		docs: docs.sort((a, b) => a.absolutePath.localeCompare(b.absolutePath)),
	};
}

async function readMergedTopic(docsRoots: string[], topicName: string): Promise<MergedTopic | null> {
	const contributions: TopicContribution[] = [];
	for (const docsRoot of docsRoots) {
		const contribution = await readTopicContribution(docsRoot, topicName);
		if (!contribution) {
			continue;
		}
		contributions.push(contribution);
	}

	if (contributions.length === 0) {
		return null;
	}

	const sharedTitle =
		contributions.find(contribution => contribution.title.trim().length > 0)?.title ?? humanizeSlug(topicName);

	return {
		name: topicName,
		title: sharedTitle,
		contributions,
	};
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
	return `${count} ${count === 1 ? singular : plural}`;
}

function referenceCount(skills: SkillEntry[]): number {
	let total = 0;
	for (const skill of skills) {
		total += skill.referencePaths.length;
	}
	return total;
}

function referenceNames(skill: SkillEntry): string[] {
	return Array.from(new Set(skill.referencePaths.map(referencePath => path.basename(referencePath)))).sort((a, b) =>
		a.localeCompare(b),
	);
}

function formatContains(section: SectionEntry): string | null {
	const parts: string[] = [];
	if (section.markdownEntries.length > 0) {
		parts.push(countLabel(section.markdownEntries.length, "doc"));
	}
	if (section.skills.length > 0) {
		parts.push(countLabel(section.skills.length, "skill"));
	}
	const references = referenceCount(section.skills);
	if (references > 0) {
		parts.push(countLabel(references, "reference file"));
	}
	if (parts.length === 0) {
		return null;
	}

	return parts.join(", ");
}

function printGuideBody(guideBody: string): void {
	for (const line of guideBody.split("\n")) {
		printLine(line);
	}
}

function printMarkdownDetails(entry: MarkdownEntry, level: 3 | 2): void {
	printLine(heading(level, entry.title ?? entry.relativePath));
	printLine(`${pc.dim("path:")} ${pc.dim(entry.absolutePath)}`);

	const summary = normalizeInlineText(entry.summary);
	if (summary) {
		printLine(summary);
	}
	if (entry.readWhen.length > 0) {
		printLine(`${pc.dim("Read when:")} ${entry.readWhen.join("; ")}`);
	}
	if (entry.error) {
		printLine(errorText(entry.error));
	}
}

function printSectionSummary(topicName: string, section: SectionEntry): void {
	printLine(heading(3, section.title));
	printLine(`${pc.dim("path:")} ${pc.dim(section.absolutePath)}`);

	const summary = normalizeInlineText(section.summary);
	if (summary) {
		printLine(summary);
	}
	if (section.error) {
		printLine(errorText(section.error));
	}
	if (section.readWhen.length > 0) {
		printLine(`${pc.dim("Read when:")} ${section.readWhen.join("; ")}`);
	}

	const contains = formatContains(section);
	if (contains) {
		printLine(`${pc.dim("contains:")} ${contains}`);
	}
	printLine(`${pc.dim("view:")} ${pc.dim(`ndex ${topicName} ${section.key}`)}`);
}

function printExpandedSection(section: SectionEntry): void {
	printLine(heading(3, section.title));
	printLine(`${pc.dim("path:")} ${pc.dim(section.absolutePath)}`);

	const summary = normalizeInlineText(section.summary);
	if (summary) {
		printLine(summary);
	}
	if (section.error) {
		printLine(errorText(section.error));
	}
	if (section.readWhen.length > 0) {
		printLine(`${pc.dim("Read when:")} ${section.readWhen.join("; ")}`);
	}

	for (const skill of section.skills) {
		printLine(heading(3, skill.title ?? skill.name));

		const description = normalizeInlineText(skill.description);
		if (description) {
			printLine(description);
		}
		if (skill.error) {
			printLine(errorText(skill.error));
		}
		for (const name of referenceNames(skill)) {
			printLine(`- ${pc.gray(name)}`, 2);
		}
	}

	if (section.skills.length > 0 && section.markdownEntries.length > 0) {
		printLine();
	}

	if (section.markdownEntries.length > 0) {
		printLine(pc.dim("docs:"));
		for (const entry of section.markdownEntries) {
			printLine(`- ${entry.title ?? entry.relativePath}`, 2);
		}
	}
}

function printSkillSummary(skill: SkillEntry, showReferenceIndex: boolean): void {
	printLine(heading(3, skill.title ?? skill.name));
	printLine(`${pc.dim("path:")} ${pc.dim(skill.absolutePath)}`);

	const description = normalizeInlineText(skill.description);
	if (description) {
		printLine(description);
	}
	if (skill.error) {
		printLine(errorText(skill.error));
	}
	if (!showReferenceIndex) {
		return;
	}

	const names = referenceNames(skill);
	if (names.length === 0) {
		return;
	}

	printLine(pc.dim("references:"));
	for (const name of names) {
		printLine(`- ${pc.gray(name)}`, 2);
	}
}

function printExpandedSkill(skill: SkillEntry): void {
	printLine(heading(3, skill.title ?? skill.name));
	printLine(`${pc.dim("path:")} ${pc.dim(skill.absolutePath)}`);

	const description = normalizeInlineText(skill.description);
	if (description) {
		printLine(description);
	}
	if (skill.error) {
		printLine(errorText(skill.error));
	}

	if (skill.referencePaths.length === 0) {
		return;
	}

	const grouped = new Map<string, string[]>();
	for (const referencePath of skill.referencePaths) {
		const absoluteReferencePath = normalizePath(path.resolve(path.dirname(skill.absolutePath), referencePath));
		const directoryPath = toDisplayPath(path.dirname(absoluteReferencePath));
		const fileName = path.basename(absoluteReferencePath);
		const current = grouped.get(directoryPath) ?? [];
		current.push(fileName);
		grouped.set(directoryPath, current);
	}

	for (const [directoryPath, fileNames] of grouped.entries()) {
		printLine(pc.gray(`${directoryPath}/:`));
		for (const fileName of fileNames.sort((a, b) => a.localeCompare(b))) {
			printLine(`- ${pc.gray(fileName)}`, 2);
		}
	}
}

function printRootDocs(docs: MarkdownEntry[]): void {
	if (docs.length === 0) {
		return;
	}

	const grouped = new Map<string, MarkdownEntry[]>();
	for (const entry of docs) {
		const directoryPath = normalizePath(path.dirname(entry.absolutePath));
		const existing = grouped.get(directoryPath);
		if (existing) {
			existing.push(entry);
			continue;
		}

		grouped.set(directoryPath, [entry]);
	}

	printLine(heading(2, "Docs"));
	const groups = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	for (const [index, [directoryPath, entries]] of groups.entries()) {
		printLine(pc.white(pc.bold(directoryPath)));
		const sortedEntries = entries.sort((left, right) => left.absolutePath.localeCompare(right.absolutePath));
		for (const [entryIndex, entry] of sortedEntries.entries()) {
			const fileName = path.basename(entry.absolutePath);
			const summary = normalizeInlineText(entry.summary);
			printLine(`- ${fileName}`, 1);
			if (entry.readWhen.length > 0) {
				for (const readWhen of entry.readWhen) {
					printLine(pc.gray(readWhen), 3);
				}
			} else if (summary) {
				printLine(pc.gray(summary), 3);
			}
			if (entry.error) {
				printLine(errorText(entry.error), 3);
			}
			if (entryIndex < sortedEntries.length - 1) {
				printLine();
			}
		}
		if (index < groups.length - 1) {
			printLine();
		}
	}
}

function printTopicIndex(topics: TopicIndexRow[], docs: MarkdownEntry[], showGlobalTip: boolean): void {
	printLine("Usage: ndex [topic] [section] [--expand] [--repo] [--global]");
	printLine();
	if (showGlobalTip) {
		printLine("> Tip: use `--global` to view global documentation.");
		printLine();
	}

	printLine(heading(2, "Topics"));
	if (topics.length === 0) {
		printLine("- [no topics found]");
	} else {
		const topicLabel = "TOPIC";
		const titleLabel = "TITLE";
		const descriptionLabel = "DESCRIPTION";
		const topicWidth = Math.max(topicLabel.length, ...topics.map(topic => topic.name.length));
		const titleWidth = Math.max(titleLabel.length, ...topics.map(topic => topic.title.length));
		printLine(pc.bold(`${topicLabel.padEnd(topicWidth)}  ${titleLabel.padEnd(titleWidth)}  ${descriptionLabel}`));
		for (const topic of topics) {
			const description = topic.summary ?? pc.gray("-");
			printLine(`${topic.name.padEnd(topicWidth)}  ${topic.title.padEnd(titleWidth)}  ${description}`);
		}
	}

	if (docs.length > 0) {
		printLine();
		printRootDocs(docs);
	}
}

function topicExampleSection(topic: MergedTopic): string | null {
	for (const contribution of topic.contributions) {
		const section = contribution.sectionEntries[0];
		if (section) {
			return section.key;
		}
	}
	return null;
}

function printTopicTips(topic: MergedTopic, expand: boolean): void {
	const exampleSection = topicExampleSection(topic);
	if (!expand) {
		if (exampleSection) {
			printLine(
				`Tip: use \`--expand\` for a full file-level table of contents, or pass a section like \`${exampleSection}\`.`,
			);
			return;
		}

		printLine("Tip: use `--expand` for a full file-level table of contents.");
		return;
	}

	if (exampleSection) {
		printLine(`Tip: pass a section like \`${exampleSection}\` to focus one section.`);
	}
}

function printFocusedTips(topicName: string, sectionKey: string): void {
	printLine(`Tip: use \`ndex ${topicName} ${sectionKey} --expand\` for nested reference files.`);
}

function printTopicView(topic: MergedTopic, expand: boolean): void {
	printLine(heading(1, topic.title));
	printLine();
	printTopicTips(topic, expand);
	printLine();

	for (const [index, contribution] of topic.contributions.entries()) {
		printLine(`${pc.dim("source:")} ${pc.dim(contribution.absolutePath)}`);
		if (contribution.guideBody) {
			printGuideBody(contribution.guideBody);
		}
		if (contribution.error) {
			printLine(errorText(contribution.error));
		}
		if (contribution.readWhen.length > 0) {
			printLine(`${pc.dim("Read when:")} ${contribution.readWhen.join("; ")}`);
		}

		if (
			contribution.markdownEntries.length > 0 ||
			contribution.sectionEntries.length > 0 ||
			contribution.guideBody ||
			contribution.error ||
			contribution.readWhen.length > 0
		) {
			printLine();
		}

		for (const entry of contribution.markdownEntries) {
			printMarkdownDetails(entry, 3);
			printLine();
		}

		for (const [sectionIndex, section] of contribution.sectionEntries.entries()) {
			if (expand) {
				printExpandedSection(section);
			} else {
				printSectionSummary(topic.name, section);
			}
			if (sectionIndex < contribution.sectionEntries.length - 1) {
				printLine();
			}
		}

		if (index < topic.contributions.length - 1) {
			printLine();
		}
	}
}

function sharedSectionTitle(sectionKey: string, sections: SectionEntry[]): string {
	return sections.find(section => section.title.trim().length > 0)?.title ?? humanizeSlug(path.basename(sectionKey));
}

function printFocusedSection(topic: MergedTopic, sectionKey: string, sections: SectionEntry[], expand: boolean): void {
	printLine(heading(1, topic.title));
	printLine(heading(2, sharedSectionTitle(sectionKey, sections)));
	printLine();
	printFocusedTips(topic.name, sectionKey);
	printLine();

	for (const [index, section] of sections.entries()) {
		printLine(`${pc.dim("source:")} ${pc.dim(section.absolutePath)}`);
		if (section.guideBody) {
			printGuideBody(section.guideBody);
		}
		if (section.error) {
			printLine(errorText(section.error));
		}
		if (section.readWhen.length > 0) {
			printLine(`${pc.dim("Read when:")} ${section.readWhen.join("; ")}`);
		}
		if (section.guideBody || section.error || section.readWhen.length > 0) {
			printLine();
		}

		for (const [skillIndex, skill] of section.skills.entries()) {
			if (expand) {
				printExpandedSkill(skill);
			} else {
				printSkillSummary(skill, true);
			}
			if (skillIndex < section.skills.length - 1) {
				printLine();
			}
		}

		if (section.skills.length > 0 && section.markdownEntries.length > 0) {
			printLine();
		}

		for (const [entryIndex, entry] of section.markdownEntries.entries()) {
			printMarkdownDetails(entry, 3);
			if (entryIndex < section.markdownEntries.length - 1) {
				printLine();
			}
		}

		if (section.markdownEntries.length === 0 && section.skills.length === 0) {
			printLine(pc.dim("[no section entries found]"));
		}

		if (index < sections.length - 1) {
			printLine();
		}
	}
}

function availableSectionKeys(topic: MergedTopic): string[] {
	const keys = new Set<string>();
	for (const contribution of topic.contributions) {
		for (const section of contribution.sectionEntries) {
			keys.add(section.key);
		}
	}

	return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

export async function runNdex(): Promise<void> {
	const { positionals, values } = parseCommandArgs({
		expand: { type: "boolean" },
		repo: { type: "boolean", short: "r" },
		global: { type: "boolean", short: "g" },
	});

	if (positionals.length > 2) {
		fail("Usage: ndex [topic] [section] [--expand] [--repo] [--global]");
	}

	const repoFlag = parseBooleanFlag(values.repo);
	const globalFlag = parseBooleanFlag(values.global);
	if (repoFlag && globalFlag) {
		fail("Use either --repo or --global, not both.");
	}

	const currentDir = normalizePath(process.cwd());
	const requestedTopic = positionals[0]?.trim() ?? null;
	const requestedSection = positionals[1]?.trim() ?? null;
	const expand = values.expand === true;

	let docsRoots: string[] = [];
	if (globalFlag) {
		const homeDir = Bun.env.HOME ? normalizePath(Bun.env.HOME) : null;
		const globalDocsRoot = homeDir ? normalizePath(path.join(homeDir, ".ngents", "docs")) : null;
		if (globalDocsRoot && (await isDirectory(globalDocsRoot))) {
			docsRoots = [globalDocsRoot];
		}
	} else {
		const repoRoot = await discoverRepoRoot(currentDir);
		const localBase = repoRoot ?? currentDir;
		docsRoots = await discoverDocsRoots(localBase);
	}

	if (docsRoots.length === 0) {
		const label = globalFlag ? GLOBAL_DOCS_LABEL : currentDir;
		fail(`Docs root not found: ${label}`);
	}

	if (!requestedTopic) {
		const index = await buildIndexData(docsRoots);
		printTopicIndex(index.topics, index.docs, !globalFlag);
		return;
	}

	const topic = await readMergedTopic(docsRoots, requestedTopic);
	if (!topic) {
		const index = await buildIndexData(docsRoots);
		const availableTopics = index.topics.map(row => row.name).join(", ");
		fail(`Unknown topic "${requestedTopic}". Available topics: ${availableTopics}`);
	}

	if (!requestedSection) {
		printTopicView(topic, expand);
		return;
	}

	const sections: SectionEntry[] = [];
	for (const contribution of topic.contributions) {
		const match = contribution.sectionEntries.find(section => section.key === requestedSection);
		if (!match) {
			continue;
		}
		sections.push(match);
	}

	if (sections.length === 0) {
		fail(
			`Unknown section "${requestedSection}" for topic "${requestedTopic}". Available: ${availableSectionKeys(topic).join(", ")}`,
		);
	}

	printFocusedSection(topic, requestedSection, sections, expand);
}
