/**
 * List installed library topics and browse topic contents.
 * @autohelp
 * @usage ngents library [topic] [skill] [--expand]
 * @flag --expand Show nested skill references and file-level contents
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

type MarkdownEntry = {
	absolutePath: string;
	relativePath: string;
	title: string | null;
	summary: string | null;
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

type ImportEntry = {
	absolutePath: string;
	relativePath: string;
	title: string | null;
	skills: SkillEntry[];
};

type TopicRecord = {
	name: string;
	title: string | null;
	summary: string | null;
	guideBody: string | null;
	markdownEntries: MarkdownEntry[];
	importEntries: ImportEntry[];
};

type LibraryManifestEntry = {
	title: string | null;
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

	const values: string[] = [];
	let token = '';
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
	let current: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.length === 0) {
			if (current.length > 0) {
				paragraphs.push(current.join(' '));
				current = [];
			}
			continue;
		}

		current.push(trimmed);
	}

	if (current.length > 0) {
		paragraphs.push(current.join(' '));
	}

	return paragraphs.join('\n\n').trim();
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
				if (/^[A-Za-z0-9_-]+:\s*/.test(nextLine)) {
					break;
				}

				const listMatch = nextLine.match(/^\s*-\s+(.*)$/);
				if (!listMatch) {
					if (nextLine.trim().length === 0) {
						continue;
					}
					break;
				}

				list.push(stripQuotes(listMatch[1] ?? ''));
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
				if (/^[A-Za-z0-9_-]+:\s*/.test(nextLine) || (!/^\s/.test(nextLine) && nextLine.trim().length > 0)) {
					break;
				}

				blockLines.push(nextLine.replace(/^\s+/, ''));
			}

			values.set(key, value.startsWith('>') ? collectFoldedLines(blockLines) : blockLines.join('\n').trim());
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

function contentWithoutFrontMatter(content: string): string {
	const normalized = content.replaceAll('\r\n', '\n');
	if (!normalized.startsWith('---\n')) {
		return normalized;
	}

	const endIndex = normalized.indexOf('\n---', 4);
	if (endIndex === -1) {
		return normalized;
	}

	return normalized.slice(endIndex + '\n---'.length).replace(/^\n+/, '');
}

function parseMarkdownTitle(content: string): string | null {
	for (const rawLine of contentWithoutFrontMatter(content).split('\n')) {
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
	const lines = contentWithoutFrontMatter(content).split('\n');
	const rendered: string[] = [];
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
			if (rendered[rendered.length - 1] !== '') {
				rendered.push('');
			}
			continue;
		}

		rendered.push(trimmed);
	}

	const normalized = rendered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
	return normalized.length > 0 ? normalized : null;
}

function parseGuideSummary(content: string): string | null {
	const guideBody = parseGuideBody(content);
	if (!guideBody) {
		return null;
	}

	for (const paragraph of guideBody.split('\n\n')) {
		const normalized = paragraph.replace(/\s+/g, ' ').trim();
		if (normalized.length === 0 || normalized.startsWith('- ')) {
			continue;
		}
		return normalized;
	}

	return null;
}

function normalizeInlineText(value: string | null): string | null {
	if (!value) {
		return null;
	}

	const normalized = value.replace(/\s+/g, ' ').trim();
	return normalized.length > 0 ? normalized : null;
}

function parseMarkdownEntry(content: string): Pick<MarkdownEntry, 'title' | 'summary' | 'error'> {
	const frontMatter = parseFrontMatter(content);
	if (frontMatter.error) {
		return {
			title: parseMarkdownTitle(content),
			summary: null,
			error: frontMatter.error,
		};
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
		description: stringField(frontMatter.values, 'description'),
		referencePaths: [],
	};
}

function indentLine(text: string, indent = 0): string {
	return `${' '.repeat(indent)}${text}`;
}

function printLine(text = '', indent = 0): void {
	console.log(indentLine(text, indent));
}

function heading(level: 1 | 2 | 3, text: string): string {
	const prefix = '#'.repeat(level);
	const content = `${prefix} ${text}`;
	if (level === 1) {
		return pc.cyan(pc.bold(content));
	}
	return pc.white(pc.bold(content));
}

function errorText(error: string): string {
	return pc.red(`[${error}]`);
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
		return (await stat(filePath)).isDirectory();
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
	try {
		const entries = await readdir(libraryRoot, { withFileTypes: true });
		return entries
			.filter(entry => entry.isDirectory() && entry.name.length > 0 && !entry.name.startsWith('.') && !EXCLUDED_DIRS.has(entry.name))
			.map(entry => entry.name)
			.sort((a, b) => a.localeCompare(b));
	} catch {
		return [];
	}
}

async function listRootMarkdownEntries(topicDir: string): Promise<MarkdownEntry[]> {
	let entries;
	try {
		entries = await readdir(topicDir, { withFileTypes: true });
	} catch {
		return [];
	}

	const result: MarkdownEntry[] = [];
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'LIB.md') {
			continue;
		}
		if (entry.name.startsWith('.') || hasHiddenOrExcludedSegment(entry.name)) {
			continue;
		}

		const absolutePath = path.join(topicDir, entry.name);
		const parsed = parseMarkdownEntry(await Bun.file(absolutePath).text());
		result.push({
			absolutePath: normalizePath(absolutePath),
			relativePath: entry.name,
			...parsed,
		});
	}

	return result.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function listSkillFiles(importDir: string): Promise<string[]> {
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
			const relativePath = toDisplayPath(path.relative(importDir, absolutePath));
			if (hasHiddenOrExcludedSegment(relativePath)) {
				continue;
			}

			if (entry.isDirectory()) {
				await walk(absolutePath);
				continue;
			}

			if (entry.isFile() && entry.name === 'SKILL.md') {
				result.push(absolutePath);
			}
		}
	}

	await walk(importDir);
	return result.sort((a, b) => a.localeCompare(b));
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
		if (!(await Bun.file(absolutePath).exists()) || (await isDirectory(absolutePath))) {
			continue;
		}

		discovered.add(toDisplayPath(path.relative(skillDir, absolutePath)));
	}

	return Array.from(discovered).sort((a, b) => a.localeCompare(b));
}

async function listImportEntries(
	libraryRoot: string,
	topicName: string,
	manifest: Map<string, LibraryManifestEntry>,
): Promise<ImportEntry[]> {
	const result: ImportEntry[] = [];

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

		result.push({
			absolutePath: normalizePath(absolutePath),
			relativePath: topicRelativePath,
			title: metadata.title,
			skills: skills.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
		});
	}

	return result.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function readTopicRecord(
	libraryRoot: string,
	topicName: string,
	manifest: Map<string, LibraryManifestEntry>,
): Promise<TopicRecord> {
	const topicDir = path.join(libraryRoot, topicName);
	const guidePath = path.join(topicDir, 'LIB.md');
	const guideContent = (await Bun.file(guidePath).exists()) ? await Bun.file(guidePath).text() : null;

	return {
		name: topicName,
		title: guideContent ? parseMarkdownTitle(guideContent) : null,
		summary: guideContent ? parseGuideSummary(guideContent) : null,
		guideBody: guideContent ? parseGuideBody(guideContent) : null,
		markdownEntries: await listRootMarkdownEntries(topicDir),
		importEntries: await listImportEntries(libraryRoot, topicName, manifest),
	};
}

function referenceCount(skills: SkillEntry[]): number {
	return skills.reduce((sum, skill) => sum + skill.referencePaths.length, 0);
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
	return `${count} ${count === 1 ? singular : plural}`;
}

function referenceNames(skill: SkillEntry): string[] {
	return Array.from(new Set(skill.referencePaths.map(referencePath => path.basename(referencePath)))).sort((a, b) =>
		a.localeCompare(b),
	);
}

function printGuideBody(guideBody: string): void {
	for (const line of guideBody.split('\n')) {
		printLine(line);
	}
}

function printTopicHeader(topic: TopicRecord): void {
	printLine(heading(1, topic.title ?? topic.name));
	if (topic.guideBody) {
		printGuideBody(topic.guideBody);
	}
}

function printTopicTips(topic: TopicRecord, expand: boolean): void {
	const exampleImport = topic.importEntries[0]?.relativePath ?? null;

	if (expand) {
		if (exampleImport) {
			printLine(`Tip: pass a skill library name to focus one import, like \`ngents library ${topic.name} ${exampleImport}\`.`);
		}
		return;
	}

	printLine(`Tip: run \`ngents library ${topic.name} --expand\` for a full file-level table of contents.`);
	if (exampleImport) {
		printLine(`Tip: pass a skill library name to focus one import, like \`ngents library ${topic.name} ${exampleImport}\`.`);
	}
}

function printFocusedTips(topic: TopicRecord, importEntry: ImportEntry): void {
	printLine(`Tip: run \`ngents library ${topic.name} ${importEntry.relativePath} --expand\` for nested reference files.`);
}

function printMarkdownEntry(entry: MarkdownEntry): void {
	printLine(heading(2, entry.title ?? entry.relativePath));
	printLine(`${pc.dim('path:')} ${pc.dim(entry.absolutePath)}`);

	const summary = normalizeInlineText(entry.summary);
	if (summary) {
		printLine(summary);
	}

	if (entry.error) {
		printLine(errorText(entry.error));
	}
}

function printImportSummary(topic: TopicRecord, entry: ImportEntry): void {
	const title = entry.title ?? path.basename(entry.relativePath);
	printLine(heading(2, `Skill: ${title}`));
	printLine(`${pc.dim('path:')} ${pc.dim(entry.absolutePath)}`);
	printLine(`contains: ${countLabel(entry.skills.length, 'skill')}, ${countLabel(referenceCount(entry.skills), 'reference file')}`);
	printLine(`${pc.dim('view:')} ${pc.dim(`ngents library ${topic.name} ${entry.relativePath}`)}`);
}

function printSkillSummary(skill: SkillEntry, options: { showReferenceIndex: boolean; showPath: boolean }): void {
	printLine(heading(2, skill.title ?? skill.name));
	if (options.showPath) {
		printLine(`${pc.dim('path:')} ${pc.dim(skill.absolutePath)}`);
	}

	const description = normalizeInlineText(skill.description);
	if (description) {
		printLine(description);
	}

	if (skill.error) {
		printLine(errorText(skill.error));
	}

	if (!options.showReferenceIndex) {
		return;
	}

	const names = referenceNames(skill);
	if (names.length === 0) {
		return;
	}

	printLine('Reference Index:');
	for (const name of names) {
		printLine(`- ${pc.gray(name)}`, 2);
	}
}

function printExpandedSkillToc(skill: SkillEntry): void {
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

function printExpandedSkillDetails(skill: SkillEntry): void {
	printLine(heading(2, skill.title ?? skill.name));
	printLine(`${pc.dim('path:')} ${pc.dim(skill.absolutePath)}`);

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

function printTopicIndex(topics: TopicRecord[]): void {
	printLine('Usage: ngents library [topic] [skill] [--expand]');
	printLine();
	printLine('Tip: run `ngents library <topic>` to browse a topic, or add `--expand` for a topic-wide TOC.');
	printLine();

	const topicLabel = 'TOPIC';
	const libraryLabel = 'LIBRARY';
	const descriptionLabel = 'DESCRIPTION';
	const topicWidth = Math.max(topicLabel.length, ...topics.map(topic => topic.name.length));
	const libraryWidth = Math.max(libraryLabel.length, ...topics.map(topic => (topic.title ?? topic.name).length));

	printLine(pc.bold(`${topicLabel.padEnd(topicWidth)}  ${libraryLabel.padEnd(libraryWidth)}  ${descriptionLabel}`));
	for (const topic of topics) {
		const row = `${topic.name.padEnd(topicWidth)}  ${(topic.title ?? topic.name).padEnd(libraryWidth)}  ${topic.summary ?? 'No library description available.'}`;
		printLine(row);
	}
}

function printTopic(topic: TopicRecord, options: { expand: boolean; focusedImport: ImportEntry | null }): void {
	printTopicHeader(topic);
	printLine();

	if (options.focusedImport) {
		printFocusedTips(topic, options.focusedImport);
		printLine();

		for (const [index, skill] of options.focusedImport.skills.entries()) {
			if (options.expand) {
				printExpandedSkillDetails(skill);
			} else {
				printSkillSummary(skill, { showReferenceIndex: true, showPath: true });
			}
			if (index < options.focusedImport.skills.length - 1) {
				printLine();
			}
		}
		return;
	}

	printTopicTips(topic, options.expand);
	if (topic.markdownEntries.length > 0 || topic.importEntries.length > 0) {
		printLine();
	}

	if (topic.markdownEntries.length === 0 && topic.importEntries.length === 0) {
		printLine(pc.dim('[no library entries found]'));
		return;
	}

	for (const entry of topic.markdownEntries) {
		printMarkdownEntry(entry);
		printLine();
	}

	for (const [index, entry] of topic.importEntries.entries()) {
		if (!options.expand) {
			printImportSummary(topic, entry);
		} else {
			const title = entry.title ?? path.basename(entry.relativePath);
			printLine(heading(2, `Skill: ${title}`));
			printLine(`${pc.dim('path:')} ${pc.dim(entry.absolutePath)}`);
			printLine(`${pc.dim('view:')} ${pc.dim(`ngents library ${topic.name} ${entry.relativePath}`)}`);
			printLine();

			for (const [skillIndex, skill] of entry.skills.entries()) {
				printExpandedSkillToc(skill);
				if (skillIndex < entry.skills.length - 1) {
					printLine();
				}
			}
		}

		if (index < topic.importEntries.length - 1) {
			printLine();
		}
	}
}

const { positionals, values } = parseCommandArgs({
	expand: { type: 'boolean' },
});

if (positionals.length > 2) {
	fail('Usage: ngents library [topic] [skill] [--expand]');
}

const requestedTopic = positionals[0]?.trim() ?? null;
const requestedImport = positionals[1]?.trim() ?? null;
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

if (!requestedTopic) {
	const topics: TopicRecord[] = [];
	for (const topicName of topicNames) {
		topics.push(await readTopicRecord(libraryRoot, topicName, manifest));
	}
	printTopicIndex(topics);
	process.exit(0);
}

const topic = await readTopicRecord(libraryRoot, requestedTopic, manifest);
const focusedImport = requestedImport
	? topic.importEntries.find(entry => entry.relativePath === requestedImport) ?? null
	: null;

if (requestedImport && !focusedImport) {
	const availableImports = topic.importEntries.map(entry => entry.relativePath).sort((a, b) => a.localeCompare(b));
	fail(`Unknown skill library "${requestedImport}" for topic "${requestedTopic}". Available: ${availableImports.join(', ')}`);
}

printTopic(topic, {
	expand: values.expand === true,
	focusedImport,
});
