import { access, lstat, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import browseContracts, {
	type BrowseInventory,
	type GuideMetadata,
	type IndexData,
	type MarkdownEntry,
	type MergedTopic,
	type RegisteredDocsRow,
	type SectionEntry,
	type SkillEntry,
	type TopicContribution,
	type TopicIndexRow,
} from "./browse-contracts.ts";
import browseParse from "./browse-parse.ts";

const {
	EXCLUDED_DIRS,
	hasHiddenOrExcludedSegment,
	META_FILE,
	normalizePath,
	sameFileName,
	toDisplayPath,
	TOPICS_DIR,
} = browseContracts;

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
async function fileExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}
async function hasGitMarker(candidateDir: string): Promise<boolean> {
	const gitPath = path.join(candidateDir, ".git");
	if (await isDirectory(gitPath)) {
		return true;
	}
	return fileExists(gitPath);
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
	if (!(await fileExists(guidePath))) {
		return { title: null, short: null, summary: null, guideBody: null, readWhen: [] };
	}

	const content = await readFile(guidePath, "utf8");
	const frontMatter = browseParse.parseFrontMatter(content);
	return {
		title: browseParse.stringField(frontMatter.values, "title")
			?? browseParse.stringField(frontMatter.values, "name"),
		short: browseParse.stringField(frontMatter.values, "short"),
		summary: browseParse.stringField(frontMatter.values, "summary")
			?? browseParse.parseGuideSummary(content),
		guideBody: browseParse.parseGuideBody(content),
		readWhen: browseParse.stringArrayField(frontMatter.values, "read_when"),
		error: frontMatter.error,
	};
}
function mergeGuideDescriptions(
	target: { short: string | null; summary: string | null },
	guide: GuideMetadata,
): void {
	if (!target.short && guide.short) {
		target.short = guide.short;
	}
	if (!target.summary && guide.summary) {
		target.summary = guide.summary;
	}
}
function createTopicIndexRow(topicName: string, guide: GuideMetadata): TopicIndexRow {
	return {
		name: topicName,
		title: guide.title ?? topicName,
		short: guide.short,
		summary: guide.summary,
	};
}
async function listMarkdownEntries(directoryPath: string): Promise<MarkdownEntry[]> {
	const entries = await readDirEntriesOrEmpty(directoryPath);
	if (entries.length === 0) {
		return [];
	}

	const result: MarkdownEntry[] = [];
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".md")) {
			continue;
		}
		if (sameFileName(entry.name, META_FILE) || sameFileName(entry.name, "SKILL.md")) {
			continue;
		}
		if (entry.name.startsWith(".") || hasHiddenOrExcludedSegment(entry.name)) {
			continue;
		}

		const absolutePath = normalizePath(path.join(directoryPath, entry.name));
		result.push(await readMarkdownEntryFromFile(absolutePath, entry.name));
	}

	return result.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function listDocsEntries(
	directoryPath: string,
	rootPath = directoryPath,
): Promise<MarkdownEntry[]> {
	const result: MarkdownEntry[] = [];
	const entries = await readDirEntriesOrEmpty(directoryPath);
	if (entries.length === 0) {
		return result;
	}
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

		if (!isMarkdownDocFile(entry)) {
			continue;
		}

		result.push(await readMarkdownEntryFromFile(absolutePath, relativePath));
	}

	return result.sort((a, b) => a.absolutePath.localeCompare(b.absolutePath));
}

async function readDirEntries(directoryPath: string) {
	try {
		return await readdir(directoryPath, { withFileTypes: true });
	} catch {
		return null;
	}
}

async function readDirEntriesOrEmpty(directoryPath: string) {
	return (await readDirEntries(directoryPath)) ?? [];
}

function isMarkdownDocFile(entry: { isFile(): boolean; name: string }): boolean {
	if (!entry.isFile() || !entry.name.endsWith(".md")) {
		return false;
	}

	if (sameFileName(entry.name, META_FILE) || sameFileName(entry.name, "SKILL.md")) {
		return false;
	}

	return true;
}

async function readMarkdownEntryFromFile(
	absolutePath: string,
	relativePath: string,
): Promise<MarkdownEntry> {
	const parsed = browseParse.parseMarkdownEntry(await readFile(absolutePath, "utf8"), relativePath);
	return {
		absolutePath,
		relativePath,
		...parsed,
	};
}

async function listTopLevelTopics(docsRoot: string): Promise<string[]> {
	return listVisibleDirectories(path.join(docsRoot, TOPICS_DIR));
}
async function listTopLevelDirectories(docsRoot: string): Promise<string[]> {
	return (await listVisibleDirectories(docsRoot)).filter(name => name !== TOPICS_DIR);
}
async function listSectionKeys(topicDir: string): Promise<string[]> {
	return listVisibleDirectories(topicDir);
}

async function listVisibleDirectories(directoryPath: string): Promise<string[]> {
	let entries;
	try {
		entries = await readdir(directoryPath, { withFileTypes: true });
	} catch {
		return [];
	}

	return entries
		.filter(entry =>
			entry.isDirectory() && entry.name.length > 0 && !entry.name.startsWith(".")
			&& !EXCLUDED_DIRS.has(entry.name)
		)
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
		if (
			!rawReference || rawReference.startsWith("http://") || rawReference.startsWith("https://")
		) {
			continue;
		}

		const withoutAnchor = rawReference.split("#")[0] ?? "";
		const normalizedRelative = toDisplayPath(withoutAnchor).replace(/^\.\//, "");
		if (normalizedRelative.length === 0 || hasHiddenOrExcludedSegment(normalizedRelative)) {
			continue;
		}

		const absolutePath = normalizePath(path.resolve(skillDir, withoutAnchor));
		if (!(await fileExists(absolutePath)) || (await isDirectory(absolutePath))) {
			continue;
		}

		discovered.add(toDisplayPath(path.relative(skillDir, absolutePath)));
	}

	return Array.from(discovered).sort((a, b) => a.localeCompare(b));
}

async function readSectionEntry(topicDir: string, sectionKey: string): Promise<SectionEntry> {
	const absolutePath = normalizePath(path.join(topicDir, sectionKey));
	const guide = await readGuideMetadata(absolutePath);
	const skillFiles = await listSkillFiles(absolutePath);
	const markdownEntries = skillFiles.length > 0 ? [] : await listMarkdownEntries(absolutePath);
	const skills: SkillEntry[] = [];

	for (const skillFile of skillFiles) {
		const content = await readFile(skillFile, "utf8");
		const skill = browseParse.parseSkillEntry(
			content,
			toDisplayPath(path.relative(topicDir, skillFile)),
		);
		skill.absolutePath = normalizePath(skillFile);
		skill.referencePaths = await extractReferencePaths(path.dirname(skillFile), content);
		skills.push(skill);
	}

	return {
		key: sectionKey,
		absolutePath,
		title: guide.title ?? path.basename(sectionKey),
		short: guide.short,
		summary: guide.summary,
		guideBody: guide.guideBody,
		readWhen: guide.readWhen,
		error: guide.error,
		markdownEntries,
		skills: skills.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
	};
}

async function readTopicContribution(
	docsRoot: string,
	topicName: string,
): Promise<TopicContribution | null> {
	const topicDir = normalizePath(path.join(docsRoot, TOPICS_DIR, topicName));
	if (!(await isDirectory(topicDir))) {
		return null;
	}

	const guide = await readGuideMetadata(topicDir);
	const markdownEntries = await listMarkdownEntries(topicDir);
	const sectionEntries: SectionEntry[] = [];

	for (const sectionKey of await listSectionKeys(topicDir)) {
		sectionEntries.push(await readSectionEntry(topicDir, sectionKey));
	}

	return {
		name: topicName,
		absolutePath: topicDir,
		title: guide.title ?? topicName,
		short: guide.short,
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
		for (const topicName of await listTopLevelTopics(docsRoot)) {
			const guide = await readGuideMetadata(path.join(docsRoot, TOPICS_DIR, topicName));
			const existing = topicMap.get(topicName);
			if (!existing) {
				topicMap.set(topicName, createTopicIndexRow(topicName, guide));
				continue;
			}

			mergeGuideDescriptions(existing, guide);
			if (guide.title) {
				existing.title = guide.title;
			}
		}

		docs.push(...(await listDocsEntries(docsRoot)));
	}

	return {
		topics: Array.from(topicMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
		docs: docs.sort((a, b) => a.absolutePath.localeCompare(b.absolutePath)),
	};
}

async function buildBrowseInventory(docsRoots: string[]): Promise<BrowseInventory> {
	const index = await buildIndexData(docsRoots);
	const registeredDocsMap = new Map<string, RegisteredDocsRow>();

	for (const docsRoot of docsRoots) {
		for (const directoryName of await listTopLevelDirectories(docsRoot)) {
			const directoryPath = normalizePath(path.join(docsRoot, directoryName));
			const existing = registeredDocsMap.get(directoryName);
			if (!existing) {
				registeredDocsMap.set(directoryName, {
					name: directoryName,
					absolutePaths: [directoryPath],
				});
				continue;
			}

			if (!existing.absolutePaths.includes(directoryPath)) {
				existing.absolutePaths.push(directoryPath);
				existing.absolutePaths.sort((left, right) => left.localeCompare(right));
			}
		}
	}

	return {
		topics: index.topics,
		registeredDocs: Array.from(registeredDocsMap.values()).sort((a, b) =>
			a.name.localeCompare(b.name)
		),
	};
}

async function readDocsEntriesUnder(directoryPath: string): Promise<MarkdownEntry[]> {
	return listDocsEntries(directoryPath);
}

async function readMergedTopic(
	docsRoots: string[],
	topicName: string,
): Promise<MergedTopic | null> {
	const contributions: TopicContribution[] = [];

	for (const docsRoot of docsRoots) {
		const contribution = await readTopicContribution(docsRoot, topicName);
		if (contribution) {
			contributions.push(contribution);
		}
	}

	if (contributions.length === 0) {
		return null;
	}

	const sharedTitle =
		contributions.find(contribution => contribution.title.trim().length > 0)?.title
			?? topicName;

	return {
		name: topicName,
		title: sharedTitle,
		contributions,
	};
}

export default {
	buildBrowseInventory,
	buildIndexData,
	discoverDocsRoots,
	discoverRepoRoot,
	readDocsEntriesUnder,
	readMergedTopic,
};
