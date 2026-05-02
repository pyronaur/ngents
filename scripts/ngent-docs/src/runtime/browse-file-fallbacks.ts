import { readdir } from "node:fs/promises";
import path from "node:path";

import browseContracts, { type DocsSources } from "./browse-contracts.ts";
import {
	isDocsFileSelector,
	isDocsFilesystemSelector,
	resolveMergedDocsFile,
} from "./browse-sources.ts";

const { normalizePath, sameFileName } = browseContracts;
const SKILL_FILE = "SKILL.md";

function implicitDocsMarkdownSelector(where: string): string | null {
	if (isDocsFilesystemSelector(where)) {
		return null;
	}

	const normalized = where.replaceAll("\\", "/").trim();
	if (normalized.length === 0 || isDocsFileSelector(normalized)) {
		return null;
	}
	if (path.posix.extname(normalized).length > 0) {
		return null;
	}

	let segmentCount = 0;
	for (const segment of normalized.split("/")) {
		if (segment.length === 0) {
			continue;
		}
		segmentCount += 1;
		if (segment === "." || segment === "..") {
			return null;
		}
	}
	if (segmentCount === 0) {
		return null;
	}

	const pathWithExtension = `${normalized}.md`;
	return normalized.startsWith("docs/") ? pathWithExtension : `docs/${pathWithExtension}`;
}

export async function onlySkillMarkdownFile(directoryPath: string): Promise<string | null> {
	let entries;
	try {
		entries = await readdir(directoryPath, { withFileTypes: true });
	} catch {
		return null;
	}

	const markdownFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith(".md"));
	if (markdownFiles.length !== 1) {
		return null;
	}

	const file = markdownFiles[0];
	if (!file || !sameFileName(file.name, SKILL_FILE)) {
		return null;
	}

	return normalizePath(path.join(directoryPath, file.name));
}

export async function resolveImplicitDocsMarkdownFile(
	sources: DocsSources,
	where: string,
): Promise<string | null> {
	const selector = implicitDocsMarkdownSelector(where);
	if (!selector) {
		return null;
	}

	return resolveMergedDocsFile(sources, selector);
}
