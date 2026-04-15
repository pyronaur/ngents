import { stat } from "node:fs/promises";
import path from "node:path";

import { runtimeError } from "../core/errors.ts";
import browseContracts, { type DocsSources } from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import { isQmdRequiredError, listQmdCollections, type QmdCollection } from "./qmd.ts";

const { META_FILE, directoryDisplayPath, normalizePath, sameFileName } = browseContracts;

async function isDirectory(directoryPath: string): Promise<boolean> {
	try {
		return (await stat(directoryPath)).isDirectory();
	} catch {
		return false;
	}
}

async function isFile(filePath: string): Promise<boolean> {
	try {
		return (await stat(filePath)).isFile();
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

function suggestionLine(examples: string[]): string {
	return `Try: ${examples.join(" | ")}`;
}

function defaultSuggestions(sources: DocsSources): string[] {
	const suggestions = ["docs ls .", "docs ls global", "docs ls docs/..."];
	for (const collection of sources.globalDocsCollections.slice(0, 2)) {
		suggestions.push(`docs ls ${collection.name}`);
	}
	return suggestions;
}

function expandHomeSelector(selector: string): string {
	const homeDir = process.env.HOME;
	if (!homeDir) {
		return selector;
	}
	if (selector === "~") {
		return homeDir;
	}
	if (selector.startsWith("~/")) {
		return path.join(homeDir, selector.slice(2));
	}
	return selector;
}

function findContainingDocsRoot(directoryPath: string): string | null {
	let current = normalizePath(directoryPath);
	for (;;) {
		if (path.posix.basename(current) === "docs") {
			return current;
		}
		const parent = normalizePath(path.dirname(current));
		if (parent === current) {
			return null;
		}
		current = parent;
	}
}

function normalizeCollection(collection: QmdCollection): { docsRoot: string; name: string } {
	return {
		name: collection.name,
		docsRoot: normalizePath(collection.path),
	};
}

function resolveGlobalDocsCollection(
	sources: DocsSources,
	selector: string,
): { docsRoot: string; name: string } | null {
	const normalizedSelector = selector.trim();
	if (normalizedSelector.length === 0) {
		return null;
	}

	return sources.globalDocsCollections.find(collection =>
		collection.name.localeCompare(normalizedSelector, undefined, { sensitivity: "accent" }) === 0
	) ?? null;
}

function docsRelativeSelector(selector: string): string {
	const normalizedSelector = selector.replaceAll("\\", path.posix.sep);
	const relativeSelector = path.posix.relative(
		"docs",
		path.posix.normalize(normalizedSelector),
	);
	return relativeSelector.length > 0 ? relativeSelector : ".";
}

function isBareSelectorName(selector: string): boolean {
	return selector.length > 0 && !selector.includes("/") && !selector.includes("\\");
}

function selectorSegments(selector: string): string[] {
	return selector.replaceAll("\\", path.posix.sep)
		.split(path.posix.sep)
		.map(segment => segment.trim())
		.filter(segment => segment.length > 0);
}

function isMarkdownDocFileName(fileName: string): boolean {
	if (!fileName.endsWith(".md")) {
		return false;
	}
	if (sameFileName(fileName, META_FILE) || sameFileName(fileName, "SKILL.md")) {
		return false;
	}
	return true;
}

async function isMarkdownDocFile(filePath: string): Promise<boolean> {
	if (!(await isFile(filePath))) {
		return false;
	}
	return isMarkdownDocFileName(path.posix.basename(filePath));
}

class BrowseSelectorNotFoundError extends Error {
	public readonly selector: string;

	constructor(selector: string) {
		super(`Browse selector not found: ${selector}`);
		this.name = "BrowseSelectorNotFoundError";
		this.selector = selector;
	}
}

async function tryResolveRegisteredDocsDirectories(
	sources: DocsSources,
	selector: string,
): Promise<string[] | null> {
	try {
		return await resolveMergedDocsDirectories(sources, `docs/${selector}`);
	} catch (error) {
		if (!isBrowseSelectorNotFoundError(error)) {
			throw error;
		}
		return null;
	}
}

async function resolveLocalDocsPath(
	sources: DocsSources,
	selector: string,
	options: {
		pathType: "directory" | "file";
		validate: (candidatePath: string) => Promise<boolean>;
	},
): Promise<string> {
	if (sources.localDocsRoots.length === 0) {
		throw new BrowseSelectorNotFoundError(selector);
	}

	const baseDir = sources.repoRoot ?? sources.currentDir;
	const targetPath = normalizePath(path.resolve(baseDir, selector));
	if (!(await options.validate(targetPath))) {
		throw new BrowseSelectorNotFoundError(selector);
	}
	if (!isWithinDocsRoots(targetPath, sources.localDocsRoots)) {
		throw runtimeError(
			`Docs ${options.pathType} is outside project docs roots: ${selector}\n${
				suggestionLine(defaultSuggestions(sources))
			}`,
		);
	}

	return targetPath;
}

export function isBrowseSelectorNotFoundError(
	error: unknown,
): error is BrowseSelectorNotFoundError {
	return error instanceof BrowseSelectorNotFoundError;
}

export async function discoverDocsSources(currentDir: string): Promise<DocsSources> {
	const normalizedCurrentDir = normalizePath(currentDir);
	const repoRoot = await browseDiscovery.discoverRepoRoot(normalizedCurrentDir);
	const localDocsRoots = await browseDiscovery.discoverDocsRoots(repoRoot ?? normalizedCurrentDir);

	const globalDocsCollections: Array<{ name: string; docsRoot: string }> = [];
	const globalDocsRoots: string[] = [];
	try {
		const collections = await listQmdCollections();
		for (const collection of collections) {
			const normalizedCollection = normalizeCollection(collection);
			const { docsRoot } = normalizedCollection;
			if (!(await isDirectory(docsRoot))) {
				continue;
			}

			globalDocsCollections.push(normalizedCollection);
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
		globalDocsCollections: globalDocsCollections.sort((left, right) =>
			left.name.localeCompare(right.name)
		),
		globalDocsRoots,
		mergedDocsRoots: uniquePaths([...localDocsRoots, ...globalDocsRoots]),
	};
}

export async function resolveFilesystemDocsDirectory(
	sources: DocsSources,
	selector: string,
): Promise<string> {
	const directoryPath = normalizePath(expandHomeSelector(selector));
	if (!(await isDirectory(directoryPath))) {
		throw runtimeError(
			`Docs directory not found: ${selector}\n${suggestionLine(defaultSuggestions(sources))}`,
		);
	}

	const docsRoot = findContainingDocsRoot(directoryPath);
	if (docsRoot) {
		return directoryPath;
	}

	const nestedDocsRoot = normalizePath(path.join(directoryPath, "docs"));
	if (await isDirectory(nestedDocsRoot)) {
		return nestedDocsRoot;
	}

	throw runtimeError(
		`Not a docs directory: ${directoryDisplayPath(directoryPath)}\n${
			suggestionLine([`docs ls ${nestedDocsRoot}`, ...defaultSuggestions(sources)])
		}`,
	);
}

export async function resolveFilesystemDocsFile(
	sources: DocsSources,
	selector: string,
): Promise<string> {
	const filePath = normalizePath(expandHomeSelector(selector));
	if (!(await isMarkdownDocFile(filePath))) {
		throw new BrowseSelectorNotFoundError(selector);
	}

	const docsRoot = findContainingDocsRoot(filePath);
	if (docsRoot && await isDirectory(docsRoot)) {
		return filePath;
	}

	throw runtimeError(
		`Docs file is outside docs roots: ${selector}\n${suggestionLine(defaultSuggestions(sources))}`,
	);
}

export function resolveGlobalDocsDirectoryByName(
	sources: DocsSources,
	selector: string,
): string | null {
	return resolveGlobalDocsCollection(sources, selector)?.docsRoot ?? null;
}

export async function resolveRegisteredDocsDirectoriesByName(
	sources: DocsSources,
	selector: string,
): Promise<string[] | null> {
	const normalizedSelector = selector.trim();
	if (!isBareSelectorName(normalizedSelector)) {
		return null;
	}

	return tryResolveRegisteredDocsDirectories(sources, normalizedSelector);
}

export async function resolveRegisteredDocsDirectoriesBySelector(
	sources: DocsSources,
	selector: string,
): Promise<string[] | null> {
	const normalizedSelector = selector.trim();
	if (normalizedSelector.length === 0) {
		return null;
	}

	if (isBareSelectorName(normalizedSelector)) {
		return null;
	}

	return tryResolveRegisteredDocsDirectories(sources, normalizedSelector);
}
export async function resolveLocalDocsDirectory(
	sources: DocsSources,
	selector: string,
): Promise<string> {
	return resolveLocalDocsPath(sources, selector, {
		pathType: "directory",
		validate: isDirectory,
	});
}

export async function resolveLocalDocsFile(
	sources: DocsSources,
	selector: string,
): Promise<string> {
	return resolveLocalDocsPath(sources, selector, {
		pathType: "file",
		validate: isMarkdownDocFile,
	});
}

export async function resolveQualifiedDocsDirectory(
	sources: DocsSources,
	selector: string,
): Promise<string | null> {
	const segments = selectorSegments(selector);
	if (segments.length < 2) {
		return null;
	}

	const collection = resolveGlobalDocsCollection(sources, segments[0] ?? "");
	if (!collection) {
		return null;
	}

	const relativeSelector = segments.slice(1).join(path.posix.sep);
	const directoryPath = normalizePath(path.resolve(collection.docsRoot, relativeSelector));
	if (!isWithinDocsRoots(directoryPath, [collection.docsRoot])) {
		throw runtimeError(`Docs directory is outside docs roots: ${selector}`);
	}
	if (!(await isDirectory(directoryPath))) {
		throw new BrowseSelectorNotFoundError(selector);
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
		throw new BrowseSelectorNotFoundError(selector);
	}

	return uniquePaths(matchingDirectories);
}

export function isDocsFilesystemSelector(selector: string): boolean {
	return selector === "~" || selector.startsWith("~/") || path.isAbsolute(selector);
}

export function isDocsFileSelector(selector: string): boolean {
	return path.posix.extname(selector.replaceAll("\\", path.posix.sep)).toLowerCase() === ".md";
}
