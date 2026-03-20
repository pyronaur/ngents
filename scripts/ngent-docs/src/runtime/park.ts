import { access, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { runtimeError } from "../core/errors.ts";
import browseContracts from "./browse-contracts.ts";
import { addQmdCollection, invalidateQmdCollectionsCache, listQmdCollectionsFresh } from "./qmd.ts";
import { runDocsUpdate } from "./update.ts";

const { EXCLUDED_DIRS, hasHiddenOrExcludedSegment, META_FILE, normalizePath, TOPICS_DIR } =
	browseContracts;

function fail(message: string): never {
	throw runtimeError(message);
}

async function isDirectory(candidatePath: string): Promise<boolean> {
	try {
		return (await stat(candidatePath)).isDirectory();
	} catch {
		return false;
	}
}

async function fileExists(candidatePath: string): Promise<boolean> {
	try {
		await access(candidatePath);
		return true;
	} catch {
		return false;
	}
}

function isMarkdownFile(fileName: string): boolean {
	return fileName.endsWith(".md");
}

async function hasVisibleMarkdown(
	directoryPath: string,
	rootPath = directoryPath,
): Promise<boolean> {
	let entries;
	try {
		entries = await readdir(directoryPath, { withFileTypes: true });
	} catch {
		return false;
	}

	for (const entry of entries) {
		const absolutePath = path.join(directoryPath, entry.name);
		const relativePath = path.relative(rootPath, absolutePath);
		const isIgnoredEntry = entry.name.length === 0 || entry.name.startsWith(".")
			|| EXCLUDED_DIRS.has(entry.name)
			|| hasHiddenOrExcludedSegment(relativePath);
		if (isIgnoredEntry) {
			continue;
		}

		if (entry.isDirectory()) {
			if (await hasVisibleMarkdown(absolutePath, rootPath)) {
				return true;
			}
			continue;
		}

		if (entry.isFile() && isMarkdownFile(entry.name)) {
			return true;
		}
	}

	return false;
}

async function isDocsRoot(directoryPath: string): Promise<boolean> {
	if (!(await isDirectory(directoryPath))) {
		return false;
	}
	if (await isDirectory(path.join(directoryPath, TOPICS_DIR))) {
		return true;
	}
	if (await fileExists(path.join(directoryPath, META_FILE))) {
		return true;
	}

	return hasVisibleMarkdown(directoryPath);
}

async function resolveDocsRoot(pathArg: string): Promise<string> {
	const resolvedPath = normalizePath(path.resolve(process.cwd(), pathArg));
	const nestedDocsPath = normalizePath(path.join(resolvedPath, "docs"));
	if (await isDirectory(nestedDocsPath)) {
		return nestedDocsPath;
	}
	if (await isDirectory(resolvedPath)) {
		return resolvedPath;
	}

	fail(`Docs directory not found: ${pathArg}`);
}

function validateCollectionName(name: string): string {
	const normalized = name.trim();
	if (normalized.length === 0) {
		fail("Usage: docs park <name> [path]");
	}
	if (normalized.includes("/")) {
		fail(`Collection name cannot contain "/": ${normalized}`);
	}
	return normalized;
}

export async function runDocsPark(positionals: string[]): Promise<void> {
	if (positionals.length === 0 || positionals.length > 2) {
		fail("Usage: docs park <name> [path]");
	}

	const collectionName = validateCollectionName(positionals[0] ?? "");
	const pathArg = positionals[1]?.trim() || ".";
	const docsRoot = await resolveDocsRoot(pathArg);
	if (!(await isDocsRoot(docsRoot))) {
		fail(`Not a docs root: ${docsRoot}`);
	}

	const collections = await listQmdCollectionsFresh();
	const nameMatch = collections.find(collection => collection.name === collectionName);
	if (nameMatch) {
		fail(`Docs collection already parked: ${collectionName}`);
	}

	const docsRootPath = path.resolve(docsRoot);
	const pathMatch = collections.find(collection => path.resolve(collection.path) === docsRootPath);
	if (pathMatch) {
		fail(`Docs root already parked as "${pathMatch.name}": ${docsRoot}`);
	}

	await addQmdCollection(collectionName, docsRoot);
	await invalidateQmdCollectionsCache();
	await runDocsUpdate();
	console.log(`Parked "${collectionName}" at ${docsRoot}`);
}
