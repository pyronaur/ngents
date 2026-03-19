import { stat } from "node:fs/promises";
import path from "node:path";

import { runtimeError } from "../core/errors.ts";
import browseContracts, { type DocsSources } from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import { isQmdRequiredError, listQmdCollections } from "./qmd.ts";

const { normalizePath } = browseContracts;

async function isDirectory(directoryPath: string): Promise<boolean> {
	try {
		return (await stat(directoryPath)).isDirectory();
	} catch {
		return false;
	}
}

function uniquePaths(paths: string[]): string[] {
	return Array.from(new Set(paths)).sort((left, right) => left.localeCompare(right));
}

function isWithinDocsRoots(targetPath: string, docsRoots: string[]): boolean {
	return docsRoots.some(docsRoot =>
		targetPath === docsRoot || targetPath.startsWith(`${docsRoot}${path.posix.sep}`)
	);
}

function docsRelativeSelector(selector: string): string {
	const normalizedSelector = selector.replaceAll("\\", path.posix.sep);
	const relativeSelector = path.posix.relative(
		"docs",
		path.posix.normalize(normalizedSelector),
	);
	return relativeSelector.length > 0 ? relativeSelector : ".";
}

export async function discoverDocsSources(currentDir: string): Promise<DocsSources> {
	const normalizedCurrentDir = normalizePath(currentDir);
	const repoRoot = await browseDiscovery.discoverRepoRoot(normalizedCurrentDir);
	const localDocsRoots = await browseDiscovery.discoverDocsRoots(repoRoot ?? normalizedCurrentDir);

	const globalDocsRoots: string[] = [];
	try {
		const collections = await listQmdCollections();
		for (const collection of collections) {
			const docsRoot = normalizePath(collection.path);
			if (!(await isDirectory(docsRoot))) {
				continue;
			}

			globalDocsRoots.push(docsRoot);
		}
	} catch (error) {
		if (!isQmdRequiredError(error)) {
			throw error;
		}
	}

	return {
		currentDir: normalizedCurrentDir,
		repoRoot,
		localDocsRoots,
		globalDocsRoots,
		mergedDocsRoots: uniquePaths([...localDocsRoots, ...globalDocsRoots]),
	};
}

export async function resolveLocalDocsDirectory(
	sources: DocsSources,
	selector: string,
): Promise<string> {
	if (sources.localDocsRoots.length === 0) {
		throw runtimeError(`Local docs root not found: ${selector}`);
	}

	const baseDir = sources.repoRoot ?? sources.currentDir;
	const directoryPath = normalizePath(path.resolve(baseDir, selector));
	if (!(await isDirectory(directoryPath))) {
		throw runtimeError(`Docs directory not found: ${selector}`);
	}
	if (!isWithinDocsRoots(directoryPath, sources.localDocsRoots)) {
		throw runtimeError(`Docs directory is outside project docs roots: ${selector}`);
	}

	return directoryPath;
}

export async function resolveMergedDocsDirectories(
	sources: DocsSources,
	selector: string,
): Promise<string[]> {
	const docsRoots = uniquePaths([...sources.localDocsRoots, ...sources.globalDocsRoots]);
	const relativeSelector = docsRelativeSelector(selector);
	const matchingDirectories: string[] = [];

	for (const docsRoot of docsRoots) {
		const directoryPath = normalizePath(path.resolve(docsRoot, relativeSelector));
		if (!isWithinDocsRoots(directoryPath, [docsRoot])) {
			throw runtimeError(`Docs directory is outside docs roots: ${selector}`);
		}
		if (!(await isDirectory(directoryPath))) {
			continue;
		}

		matchingDirectories.push(directoryPath);
	}

	if (matchingDirectories.length === 0) {
		throw runtimeError(`Docs directory not found: ${selector}`);
	}

	return uniquePaths(matchingDirectories);
}
