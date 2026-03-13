/**
 * List installed library topics, references, and imported skills.
 * @autohelp
 * @usage ngents library [topic]
 */
import { lstat, readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fail, parseCommandArgs } from './_argv';

const EXCLUDED_DIRS = new Set(['archive', 'research', 'node_modules']);
const POSIX_SEP = '/';
const require = createRequire(import.meta.url);
const pc: typeof import('picocolors') = require('picocolors');

type FrontMatterValue = string | string[];

type FrontMatterParseResult = {
	found: boolean;
	values: Map<string, FrontMatterValue>;
	error?: string;
};

type Metadata = {
	title: string | null;
	summary: string | null;
	error?: string;
};

type TopicRecord = {
	name: string;
	title: string | null;
	guideBody: string | null;
	markdownEntries: MarkdownEntry[];
	importEntries: ImportEntry[];
};

type MarkdownEntry = {
	absolutePath: string;
	relativePath: string;
	metadata: Metadata;
};

type ImportEntry = {
	absolutePath: string;
	relativePath: string;
	title: string | null;
	skills: SkillEntry[];
};

type SkillEntry = {
	absolutePath: string;
	relativePath: string;
	name: string;
	title: string | null;
	version: string | null;
	description: string | null;
	error?: string;
	referencePaths: string[];
};

type StyledLine = {
	text: string;
	indent?: number;
};

function toDisplayPath(value: string): string {
	return value.replaceAll('\\', POSIX_SEP);
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
		if (normalized.length > 0) {
			result.push(normalized);
		}
	}

	return result;
}

function stripQuotes(value: string): string {
	return value.replace(/^['"]|['"]$/g, '').trim();
}

function parseInlineArray(value: string): string[] {
	const normalized = value.trim();
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
		return [];
	}

	values.push(token);
	return compactStrings(values).map(stripQuotes);
}

function collectFoldedLines(lines: string[]): string {
	const paragraphs: string[] = [];
	let currentParagraph: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.length === 0) {
			if (currentParagraph.length > 0) {
				paragraphs.push(currentParagraph.join(' '));
				currentParagraph = [];
			}
			continue;
		}

		currentParagraph.push(trimmed);
	}

	if (currentParagraph.length > 0) {
		paragraphs.push(currentParagraph.join(' '));
	}

	return paragraphs.join('\n\n').trim();
}

function contentWithoutFrontMatter(content: string): string {
	const normalized = content.replaceAll('\r\n', '\n');
	if (!normalized.startsWith('---\n')) {
		return normalized;
	}

	const endIndex = normalized.indexOf('\n---', 4);
	if (endIndex === -1) {
		return normalized;
	}

	const afterFrontMatterIndex = endIndex + '\n---'.length;
	return normalized.slice(afterFrontMatterIndex).replace(/^\n+/, '');
}

function parseMarkdownTitle(content: string): string | null {
	const body = contentWithoutFrontMatter(content);
	for (const rawLine of body.split('\n')) {
		const line = rawLine.trim();
		if (!line.startsWith('#')) {
			continue;
		}

		const title = line.replace(/^#+\s*/, '').trim();
		if (title.length > 0) {
			return title;
		}
	}

	return null;
}

function parseGuideBody(content: string): string | null {
	const body = contentWithoutFrontMatter(content);
	const lines = body.split('\n');
	const renderedLines: string[] = [];

	let skippedTitle = false;
	let inCodeBlock = false;
	for (const rawLine of lines) {
		const trimmed = rawLine.trim();

		if (trimmed.startsWith('```')) {
			inCodeBlock = !inCodeBlock;
			continue;
		}

		if (inCodeBlock) {
			continue;
		}

		if (!skippedTitle && trimmed.startsWith('#')) {
			skippedTitle = true;
			continue;
		}

		if (trimmed.length === 0) {
			if (renderedLines[renderedLines.length - 1] !== '') {
				renderedLines.push('');
			}
			continue;
		}

		if (trimmed.startsWith('- ')) {
			renderedLines.push(trimmed);
			continue;
		}

		renderedLines.push(trimmed);
	}

	const normalized = renderedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
	return normalized.length > 0 ? normalized : null;
}

function normalizeInlineText(value: string | null): string | null {
	if (!value) {
		return null;
	}

	const normalized = value.replace(/\s+/g, ' ').trim();
	return normalized.length > 0 ? normalized : null;
}

function parseFrontMatter(content: string): FrontMatterParseResult {
	const normalized = content.replaceAll('\r\n', '\n');
	if (!normalized.startsWith('---\n')) {
		return { found: false, values: new Map() };
	}

	const endIndex = normalized.indexOf('\n---', 4);
	if (endIndex === -1) {
		return { found: true, values: new Map(), error: 'unterminated front matter' };
	}

	const lines = normalized.slice(4, endIndex).split('\n');
	const values = new Map<string, FrontMatterValue>();

	for (let index = 0; index < lines.length; index += 1) {
		const rawLine = lines[index] ?? '';
		if (rawLine.trim().length === 0) {
			continue;
		}

		const keyMatch = rawLine.match(/^([A-Za-z0-9_-]+):(.*)$/);
		if (!keyMatch) {
			continue;
		}

		const key = keyMatch[1] ?? '';
		const rawValue = keyMatch[2] ?? '';
		const value = rawValue.trim();

		if (value === '' || value === '[]') {
			const list: string[] = [];
			let nextIndex = index + 1;
			for (; nextIndex < lines.length; nextIndex += 1) {
				const nextLine = lines[nextIndex] ?? '';
				const trimmed = nextLine.trim();

				if (trimmed.length === 0) {
					continue;
				}

				if (/^[A-Za-z0-9_-]+:\s*/.test(nextLine)) {
					break;
				}

				const listMatch = nextLine.match(/^\s*-\s+(.*)$/);
				if (!listMatch) {
					break;
				}

				const listValue = listMatch[1] ?? '';
				list.push(stripQuotes(listValue));
			}

			values.set(key, list);
			index = nextIndex - 1;
			continue;
		}

		if (value === '>' || value === '>-' || value === '|' || value === '|-') {
			const blockLines: string[] = [];
			let nextIndex = index + 1;
			for (; nextIndex < lines.length; nextIndex += 1) {
				const nextLine = lines[nextIndex] ?? '';
				if (nextLine.trim().length === 0) {
					blockLines.push('');
					continue;
				}

				if (/^[A-Za-z0-9_-]+:\s*/.test(nextLine)) {
					break;
				}

				if (!/^\s/.test(nextLine)) {
					break;
				}

				blockLines.push(nextLine.replace(/^\s+/, ''));
			}

			values.set(
				key,
				value.startsWith('>') ? collectFoldedLines(blockLines) : blockLines.join('\n').trim(),
			);
			index = nextIndex - 1;
			continue;
		}

		if (value.startsWith('[') && value.endsWith(']')) {
			values.set(key, parseInlineArray(value));
			continue;
		}

		values.set(key, stripQuotes(value));
	}

	return { found: true, values };
}

function stringField(values: Map<string, FrontMatterValue>, key: string): string | null {
	const value = values.get(key);
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}

function stringListField(values: Map<string, FrontMatterValue>, key: string): string[] {
	const value = values.get(key);
	if (!Array.isArray(value)) {
		return [];
	}

	return compactStrings(value);
}

function parseMetadata(content: string): Metadata {
	const frontMatter = parseFrontMatter(content);
	if (frontMatter.error) {
		return { title: parseMarkdownTitle(content), summary: null, error: frontMatter.error };
	}

	return {
		title: parseMarkdownTitle(content),
		summary: stringField(frontMatter.values, 'summary'),
	};
}

function parseSkillEntry(content: string, relativePath: string): SkillEntry {
	const frontMatter = parseFrontMatter(content);
	const fallbackName = path.basename(path.dirname(relativePath));

	if (frontMatter.error) {
		return {
			absolutePath: '',
			relativePath,
			name: fallbackName,
			title: parseMarkdownTitle(content),
			version: null,
			description: null,
			error: frontMatter.error,
			referencePaths: [],
		};
	}

	return {
		absolutePath: '',
		relativePath,
		name: stringField(frontMatter.values, 'name') ?? fallbackName,
		title: parseMarkdownTitle(content),
		version: stringField(frontMatter.values, 'version'),
		description: stringField(frontMatter.values, 'description'),
		referencePaths: [],
	};
}

function indentLine(text: string, indent = 0): string {
	return `${' '.repeat(indent)}${text}`;
}

function printLine(line: StyledLine): void {
	console.log(indentLine(line.text, line.indent ?? 0));
}

function formatTopicHeading(topic: TopicRecord): string {
	return pc.cyan(pc.bold(`# ${topic.title ?? topic.name}`));
}

function formatMarkdownHeading(title: string | null, fallbackPath: string): string {
	return pc.white(pc.bold(`## ${title ?? fallbackPath}`));
}

function formatImportHeading(entry: ImportEntry): string {
	const title = entry.title ?? path.basename(entry.relativePath);
	return pc.white(pc.bold(`## Skill: ${title}`));
}

function formatSkillHeading(skill: SkillEntry): string {
	const title = skill.title ?? skill.name;
	return pc.white(pc.bold(`### ${title}`));
}

function formatError(error: string): string {
	return pc.red(`[${error}]`);
}

function printMetadataEntry(entry: MarkdownEntry): void {
	printLine({ text: formatMarkdownHeading(entry.metadata.title, entry.relativePath) });
	printLine({ text: `${pc.dim('path:')} ${pc.dim(entry.absolutePath)}` });

	if (entry.metadata.summary) {
		printLine({ text: normalizeInlineText(entry.metadata.summary) ?? '' });
	}

	if (entry.metadata.error) {
		printLine({ text: formatError(entry.metadata.error) });
	}
}

function printSkillEntry(skill: SkillEntry): void {
	printLine({ text: formatSkillHeading(skill) });
	printLine({ text: `${pc.dim('path:')} ${pc.dim(skill.absolutePath)}` });

	const description = normalizeInlineText(skill.description);
	if (description) {
		printLine({ text: description });
	}

	if (skill.error) {
		printLine({ text: formatError(skill.error) });
	}

	if (skill.referencePaths.length === 0) {
		return;
	}

	const groupedReferences = new Map<string, string[]>();
	for (const referencePath of skill.referencePaths) {
		const absoluteReferencePath = normalizePath(path.resolve(path.dirname(skill.absolutePath), referencePath));
		const directoryPath = toDisplayPath(path.dirname(absoluteReferencePath));
		const fileName = path.basename(absoluteReferencePath);
		const existing = groupedReferences.get(directoryPath) ?? [];
		existing.push(fileName);
		groupedReferences.set(directoryPath, existing);
	}

	for (const [directoryPath, fileNames] of groupedReferences.entries()) {
		printLine({ text: pc.gray(`- ${directoryPath}/:`) });
		for (const fileName of fileNames.sort((first, second) => first.localeCompare(second))) {
			printLine({ text: pc.gray(`  - ${fileName}`) });
		}
	}
}

function hasHiddenOrExcludedSegment(relativePath: string): boolean {
	const segments = toDisplayPath(relativePath).split(POSIX_SEP).filter(Boolean);
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
		const resolved = await stat(filePath);
		return resolved.isDirectory();
	} catch {
		return false;
	}
}

async function hasGitMarker(candidateDir: string): Promise<boolean> {
	const gitPath = path.join(candidateDir, '.git');
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

type LibraryManifestEntry = {
	title: string | null;
};

async function readLibraryManifest(libraryRoot: string): Promise<Map<string, LibraryManifestEntry>> {
	const manifestPath = path.join(libraryRoot, 'library.json');
	if (!(await Bun.file(manifestPath).exists())) {
		return new Map();
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(await Bun.file(manifestPath).text());
	} catch {
		fail(`Invalid library manifest: ${toDisplayPath(manifestPath)}`);
	}

	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		fail(`Invalid library manifest: ${toDisplayPath(manifestPath)}`);
	}

	const manifest = new Map<string, LibraryManifestEntry>();
	for (const [rawPath, rawValue] of Object.entries(parsed)) {
		const entryPath = toDisplayPath(String(rawPath).trim());
		if (!entryPath || hasHiddenOrExcludedSegment(entryPath)) {
			continue;
		}

		if (typeof rawValue === 'string') {
			manifest.set(entryPath, { title: null });
			continue;
		}

		if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
			manifest.set(entryPath, { title: null });
			continue;
		}

		const objectValue = rawValue as Record<string, unknown>;
		const title = typeof objectValue.title === 'string' ? objectValue.title.trim() || null : null;
		manifest.set(entryPath, { title });
	}

	return manifest;
}

async function listTopicNames(libraryRoot: string): Promise<string[]> {
	let entries;
	try {
		entries = await readdir(libraryRoot, { withFileTypes: true });
	} catch {
		return [];
	}

	const topics: string[] = [];
	for (const entry of entries) {
		if (!entry.name || entry.name.startsWith('.') || !entry.isDirectory()) {
			continue;
		}
		if (EXCLUDED_DIRS.has(entry.name)) {
			continue;
		}
		topics.push(entry.name);
	}

	return topics.sort((first, second) => first.localeCompare(second));
}

async function listRootMarkdownEntries(topicDir: string): Promise<MarkdownEntry[]> {
	let entries;
	try {
		entries = await readdir(topicDir, { withFileTypes: true });
	} catch {
		return [];
	}

	const markdownEntries: MarkdownEntry[] = [];
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'LIB.md') {
			continue;
		}
		if (entry.name.startsWith('.') || hasHiddenOrExcludedSegment(entry.name)) {
			continue;
		}

		const fullPath = path.join(topicDir, entry.name);
		markdownEntries.push({
			absolutePath: normalizePath(fullPath),
			relativePath: entry.name,
			metadata: parseMetadata(await Bun.file(fullPath).text()),
		});
	}

	return markdownEntries.sort((first, second) => first.relativePath.localeCompare(second.relativePath));
}

async function listSkillFiles(importDir: string): Promise<string[]> {
	const skillFiles: string[] = [];

	async function walk(currentDir: string): Promise<void> {
		let entries;
		try {
			entries = await readdir(currentDir, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			if (!entry.name) {
				continue;
			}

			const entryPath = path.join(currentDir, entry.name);
			const relativePath = toDisplayPath(path.relative(importDir, entryPath));
			if (hasHiddenOrExcludedSegment(relativePath)) {
				continue;
			}

			if (entry.isDirectory()) {
				await walk(entryPath);
				continue;
			}

			if (!entry.isFile() || entry.name !== 'SKILL.md') {
				continue;
			}

			skillFiles.push(entryPath);
		}
	}

	await walk(importDir);
	return skillFiles.sort((first, second) => first.localeCompare(second));
}

async function extractReferencePaths(skillDir: string, content: string): Promise<string[]> {
	const discovered = new Set<string>();
	const linkPattern = /\[[^\]]+]\(([^)]+)\)/g;

	for (const match of content.matchAll(linkPattern)) {
		const rawReference = match[1]?.trim();
		if (!rawReference || rawReference.startsWith('http://') || rawReference.startsWith('https://')) {
			continue;
		}

		const withoutAnchor = rawReference.split('#')[0] ?? '';
		const normalizedRelative = toDisplayPath(withoutAnchor).replace(/^\.\//, '');
		if (normalizedRelative.length === 0 || hasHiddenOrExcludedSegment(normalizedRelative)) {
			continue;
		}

		const absolutePath = normalizePath(path.resolve(skillDir, withoutAnchor));
		if (!(await Bun.file(absolutePath).exists())) {
			continue;
		}

		if (await isDirectory(absolutePath)) {
			continue;
		}

		discovered.add(toDisplayPath(path.relative(skillDir, absolutePath)));
	}

	return Array.from(discovered).sort((first, second) => first.localeCompare(second));
}

async function listImportEntries(
	libraryRoot: string,
	topicName: string,
	manifest: Map<string, LibraryManifestEntry>,
): Promise<ImportEntry[]> {
	const importEntries: ImportEntry[] = [];

	for (const [entryPath, metadata] of manifest.entries()) {
		const topicPrefix = `${topicName}/`;
		if (!entryPath.startsWith(topicPrefix)) {
			continue;
		}

		const topicRelativePath = entryPath.slice(topicPrefix.length);
		if (!topicRelativePath || hasHiddenOrExcludedSegment(topicRelativePath)) {
			continue;
		}

		const absolutePath = path.join(libraryRoot, entryPath);
		if (!(await isDirectory(absolutePath))) {
			continue;
		}

		const skillFiles = await listSkillFiles(absolutePath);
		const skills: SkillEntry[] = [];
		for (const skillFile of skillFiles) {
			const content = await Bun.file(skillFile).text();
			const skill = parseSkillEntry(content, toDisplayPath(path.relative(path.join(libraryRoot, topicName), skillFile)));
			skill.absolutePath = normalizePath(skillFile);
			skill.referencePaths = await extractReferencePaths(path.dirname(skillFile), content);
			skills.push(skill);
		}

		importEntries.push({
			absolutePath: normalizePath(absolutePath),
			relativePath: topicRelativePath,
			title: metadata.title,
			skills: skills.sort((first, second) => first.relativePath.localeCompare(second.relativePath)),
		});
	}

	return importEntries.sort((first, second) => first.relativePath.localeCompare(second.relativePath));
}

async function readTopicRecord(
	libraryRoot: string,
	topicName: string,
	manifest: Map<string, LibraryManifestEntry>,
): Promise<TopicRecord> {
	const topicDir = path.join(libraryRoot, topicName);
	const libPath = path.join(topicDir, 'LIB.md');
	const libContent = (await Bun.file(libPath).exists()) ? await Bun.file(libPath).text() : null;
	const libTitle = libContent ? parseMarkdownTitle(libContent) : null;
	const guideBody = libContent ? parseGuideBody(libContent) : null;

	return {
		name: topicName,
		title: libTitle,
		guideBody,
		markdownEntries: await listRootMarkdownEntries(topicDir),
		importEntries: await listImportEntries(libraryRoot, topicName, manifest),
	};
}

function printGuideBody(guideBody: string): void {
	for (const line of guideBody.split('\n')) {
		if (line.length === 0) {
			console.log('');
			continue;
		}
		printLine({ text: line });
	}
}

function printTopic(topic: TopicRecord, options: { showGuideBody: boolean }): void {
	printLine({ text: formatTopicHeading(topic) });

	if (options.showGuideBody && topic.guideBody) {
		printGuideBody(topic.guideBody);
		if (topic.markdownEntries.length > 0 || topic.importEntries.length > 0) {
			console.log('');
		}
	}

	if (topic.markdownEntries.length === 0 && topic.importEntries.length === 0) {
		printLine({ text: pc.dim('[no library entries found]'), indent: 2 });
		return;
	}

	for (const entry of topic.markdownEntries) {
		printMetadataEntry(entry);
		console.log('');
	}

	for (const entry of topic.importEntries) {
		printLine({ text: formatImportHeading(entry) });
		printLine({ text: `${pc.dim('path:')} ${pc.dim(entry.absolutePath)}` });
		if (entry.skills.length > 0) {
			console.log('');
		}
		for (const skill of entry.skills) {
			printSkillEntry(skill);
			console.log('');
		}
	}
}

const { positionals } = parseCommandArgs({});
if (positionals.length > 1) {
	fail('Usage: ngents library [topic]');
}

const requestedTopic = positionals[0]?.trim() ?? null;
const currentDir = normalizePath(process.cwd());
const repoRoot = await discoverRepoRoot(currentDir);
const libraryRoot = normalizePath(path.join(repoRoot ?? currentDir, 'library'));

if (!(await isDirectory(libraryRoot))) {
	fail(`Library root not found: ${libraryRoot}`);
}

const manifest = await readLibraryManifest(libraryRoot);
const topicNames = await listTopicNames(libraryRoot);

if (requestedTopic && !topicNames.includes(requestedTopic)) {
	fail(`Unknown library topic "${requestedTopic}". Available topics: ${topicNames.join(', ')}`);
}

const selectedTopics = requestedTopic ? [requestedTopic] : topicNames;
const singleTopicView = selectedTopics.length === 1;

for (const topicName of selectedTopics) {
	const topic = await readTopicRecord(libraryRoot, topicName, manifest);
	printTopic(topic, { showGuideBody: singleTopicView });
	if (topicName !== selectedTopics[selectedTopics.length - 1]) {
		console.log('');
	}
}
