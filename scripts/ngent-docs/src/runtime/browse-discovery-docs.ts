import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import browseContracts, { type MarkdownEntry } from "./browse-contracts.ts";
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

function isVisibleDocsEntryName(name: string): boolean {
	return name.length > 0 && !name.startsWith(".") && !EXCLUDED_DIRS.has(name);
}

function shouldSkipRootTopicsDir(input: {
	directoryPath: string;
	entryName: string;
	rootPath: string;
}): boolean {
	return normalizePath(input.directoryPath) === normalizePath(input.rootPath)
		&& input.entryName === TOPICS_DIR;
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

async function readDocsEntryFromDirent(input: {
	directoryPath: string;
	entry: Awaited<ReturnType<typeof readDirEntriesOrEmpty>>[number];
	rootPath: string;
}): Promise<MarkdownEntry[]> {
	if (!isVisibleDocsEntryName(input.entry.name)) {
		return [];
	}

	const absolutePath = normalizePath(path.join(input.directoryPath, input.entry.name));
	const relativePath = toDisplayPath(path.relative(input.rootPath, absolutePath));
	if (hasHiddenOrExcludedSegment(relativePath)) {
		return [];
	}

	if (input.entry.isDirectory()) {
		if (
			shouldSkipRootTopicsDir({
				directoryPath: input.directoryPath,
				entryName: input.entry.name,
				rootPath: input.rootPath,
			})
		) {
			return [];
		}
		return listDocsEntries(absolutePath, input.rootPath);
	}

	if (!isMarkdownDocFile(input.entry)) {
		return [];
	}

	return [await readMarkdownEntryFromFile(absolutePath, relativePath)];
}

export async function listMarkdownEntries(directoryPath: string): Promise<MarkdownEntry[]> {
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

export async function listDocsEntries(
	directoryPath: string,
	rootPath = directoryPath,
): Promise<MarkdownEntry[]> {
	const result: MarkdownEntry[] = [];
	const entries = await readDirEntriesOrEmpty(directoryPath);
	if (entries.length === 0) {
		return result;
	}
	for (const entry of entries) {
		result.push(...(await readDocsEntryFromDirent({ directoryPath, entry, rootPath })));
	}

	return result.sort((a, b) => a.absolutePath.localeCompare(b.absolutePath));
}
