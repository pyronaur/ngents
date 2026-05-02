import { runtimeError } from "../core/errors.ts";
import browseContracts from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import { onlySkillMarkdownFile, resolveImplicitDocsMarkdownFile } from "./browse-file-fallbacks.ts";
import type {
	DocsBrowseView,
	DocsFileView,
	DocsSelectorRoute,
	DocsSelectorRouteMode,
	DocsView,
	ParkedCollectionSelectorView,
} from "./browse-route-contracts.ts";
import {
	discoverDocsSources,
	isBrowseSelectorNotFoundError,
	isDocsFileSelector,
	isDocsFilesystemSelector,
	resolveFilesystemDocsDirectory,
	resolveFilesystemDocsFile,
	resolveGlobalDocsDirectoryByName,
	resolveLocalDocsDirectory,
	resolveLocalDocsFile,
	resolveMergedDocsDirectories,
	resolveMergedDocsFile,
	resolveQualifiedDocsDirectory,
	resolveRegisteredDocsDirectoriesByName,
	resolveRegisteredDocsDirectoriesBySelector,
} from "./browse-sources.ts";
import { readMarkdownDocument } from "./markdown-document.ts";

const { normalizePath } = browseContracts;

type RouteSources = Awaited<ReturnType<typeof discoverDocsSources>>;

type DocsScope = {
	label: string;
	roots: string[];
};

function fail(message: string): never {
	throw runtimeError(message);
}

function ensureDocsRoots(docsRoots: string[], label: string): void {
	if (docsRoots.length > 0) {
		return;
	}

	fail(`Docs root not found: ${label}`);
}

function docsTitle(where: string | null): string {
	if (!where) {
		return "Docs";
	}
	return `Docs: ${where}`;
}

async function docsEntriesUnderMany(directoryPaths: string[]) {
	const index = await browseDiscovery.buildIndexData(directoryPaths);
	return {
		docs: index.docs,
	};
}

async function docsBrowseViewForDirectory(
	directoryPath: string,
	where: string,
): Promise<DocsBrowseView> {
	return {
		docs: await browseDiscovery.readDocsEntriesUnder(directoryPath),
		kind: "browse",
		title: docsTitle(where),
	} satisfies DocsBrowseView;
}

async function docsBrowseViewForDirectories(
	directoryPaths: string[],
	title: string,
	topicHint?: string,
): Promise<DocsBrowseView> {
	return {
		...(await docsEntriesUnderMany(directoryPaths)),
		kind: "browse",
		title,
		topicHint,
	} satisfies DocsBrowseView;
}

async function docsBrowseViewForRoots(
	docsRoots: string[],
	label: string,
	title: string,
): Promise<DocsBrowseView> {
	ensureDocsRoots(docsRoots, label);
	const index = await browseDiscovery.buildIndexData(docsRoots);
	return {
		docs: index.docs,
		kind: "browse",
		title,
	} satisfies DocsBrowseView;
}

async function docsFileViewForPath(filePath: string): Promise<DocsFileView> {
	return {
		doc: await readMarkdownDocument(filePath),
		kind: "file",
	} satisfies DocsFileView;
}

async function docsViewForDirectory(
	directoryPath: string,
	where: string,
): Promise<DocsView> {
	const skillFilePath = await onlySkillMarkdownFile(directoryPath);
	if (skillFilePath) {
		return docsFileViewForPath(skillFilePath);
	}

	return docsBrowseViewForDirectory(directoryPath, where);
}

async function docsViewForDirectories(
	directoryPaths: string[],
	title: string,
	topicHint?: string,
): Promise<DocsView> {
	if (directoryPaths.length === 1) {
		const skillFilePath = await onlySkillMarkdownFile(directoryPaths[0] ?? "");
		if (skillFilePath) {
			return docsFileViewForPath(skillFilePath);
		}
	}

	return docsBrowseViewForDirectories(directoryPaths, title, topicHint);
}

async function topicHintForSelector(
	selector: string,
	docsRoots: string[],
): Promise<string | undefined> {
	const topic = await browseDiscovery.readMergedTopic(docsRoots, selector);
	return topic?.name;
}

async function resolveDirectDocsDirectory(
	sources: RouteSources,
	where: string,
): Promise<string | null> {
	if (isDocsFilesystemSelector(where)) {
		return resolveFilesystemDocsDirectory(sources, where);
	}

	const qualifiedDirectoryPath = await resolveQualifiedDocsDirectory(sources, where);
	if (qualifiedDirectoryPath) {
		return qualifiedDirectoryPath;
	}

	return resolveGlobalDocsDirectoryByName(sources, where);
}

async function resolveDirectDocsFile(
	sources: RouteSources,
	where: string,
): Promise<string | null> {
	if (!isDocsFileSelector(where)) {
		return null;
	}

	if (isDocsFilesystemSelector(where)) {
		return resolveFilesystemDocsFile(sources, where);
	}

	try {
		return await resolveLocalDocsFile(sources, where);
	} catch (error) {
		if (!isBrowseSelectorNotFoundError(error)) {
			throw error;
		}
	}

	if (where.startsWith("docs/")) {
		return resolveMergedDocsFile(sources, where);
	}

	return resolveMergedDocsFile(sources, `docs/${where}`);
}

function topicMarkdownSelector(
	where: string,
	options: { allowImplicitExtension: boolean },
): string | null {
	if (isDocsFilesystemSelector(where) || where.startsWith("docs/")) {
		return null;
	}

	const normalized = where.replaceAll("\\", "/").trim();
	const segments = normalized.split("/").filter(segment => segment.length > 0);
	if (segments.length < 2) {
		return null;
	}
	if (segments.some(segment => segment === "." || segment === "..")) {
		return null;
	}
	if (!options.allowImplicitExtension && !isDocsFileSelector(normalized)) {
		return null;
	}

	const topicPath = normalized.endsWith(".md") ? normalized : `${normalized}.md`;
	return `docs/topics/${topicPath}`;
}

async function resolveTopicMarkdownFile(
	sources: RouteSources,
	where: string,
	options: { allowImplicitExtension: boolean },
): Promise<string | null> {
	const selector = topicMarkdownSelector(where, options);
	if (!selector) {
		return null;
	}

	return resolveMergedDocsFile(sources, selector);
}

async function docsFileViewForSelector(
	sources: RouteSources,
	where: string,
	options: { allowImplicitTopicExtension: boolean },
): Promise<DocsFileView | null> {
	const directFilePath = await resolveDirectDocsFile(sources, where);
	if (directFilePath) {
		return docsFileViewForPath(directFilePath);
	}

	const topicMarkdownPath = await resolveTopicMarkdownFile(sources, where, {
		allowImplicitExtension: options.allowImplicitTopicExtension,
	});
	if (topicMarkdownPath) {
		return docsFileViewForPath(topicMarkdownPath);
	}

	return null;
}

async function resolveIndirectDocsView(
	sources: RouteSources,
	where: string,
	title: string,
): Promise<DocsView> {
	const registeredDirectoriesBySelector = await resolveRegisteredDocsDirectoriesBySelector(
		sources,
		where,
	);
	if (registeredDirectoriesBySelector) {
		return docsViewForDirectories(registeredDirectoriesBySelector, title);
	}

	const registeredDirectories = await resolveRegisteredDocsDirectoriesByName(sources, where);
	if (registeredDirectories) {
		return docsViewForDirectories(
			registeredDirectories,
			title,
			await topicHintForSelector(where, sources.mergedDocsRoots),
		);
	}

	const directoryPath = await resolveLocalDocsDirectory(sources, where);
	return docsViewForDirectory(directoryPath, where);
}

async function resolveIndirectDocsViewWithFileFallback(
	sources: RouteSources,
	where: string,
	title: string,
): Promise<DocsView> {
	try {
		return await resolveIndirectDocsView(sources, where, title);
	} catch (error) {
		if (!isBrowseSelectorNotFoundError(error)) {
			throw error;
		}

		const fileView = await docsFileViewForSelector(sources, where, {
			allowImplicitTopicExtension: true,
		});
		if (fileView) {
			return fileView;
		}

		const implicitDocsFilePath = await resolveImplicitDocsMarkdownFile(sources, where);
		if (implicitDocsFilePath) {
			return docsFileViewForPath(implicitDocsFilePath);
		}

		throw error;
	}
}

async function docsViewForDocsSelector(
	sources: RouteSources,
	where: string,
	title: string,
): Promise<DocsView> {
	try {
		const directories = await resolveMergedDocsDirectories(sources, where);
		return docsViewForDirectories(directories, title);
	} catch (error) {
		if (!isBrowseSelectorNotFoundError(error)) {
			throw error;
		}

		const implicitDocsFilePath = await resolveImplicitDocsMarkdownFile(sources, where);
		if (implicitDocsFilePath) {
			return docsFileViewForPath(implicitDocsFilePath);
		}

		throw error;
	}
}

async function resolveDocsView(
	sources: RouteSources,
	where: string | null,
): Promise<DocsView> {
	const title = docsTitle(where);
	return await scopedDocsView(sources, where, title)
		?? await directFileDocsView(sources, where)
		?? await docsPrefixDocsView(sources, where, title)
		?? await directDirectoryDocsView(sources, where)
		?? await indirectDocsView(sources, where, title);
}

function docsScope(sources: RouteSources, where: string | null): DocsScope | null {
	if (!where) {
		return { label: sources.currentDir, roots: sources.mergedDocsRoots };
	}
	if (where === ".") {
		return { label: ".", roots: sources.localDocsRoots };
	}
	if (where === "global") {
		return { label: "global", roots: sources.globalDocsRoots };
	}
	return null;
}

async function scopedDocsView(
	sources: RouteSources,
	where: string | null,
	title: string,
): Promise<DocsView | null> {
	const scope = docsScope(sources, where);
	return scope ? docsBrowseViewForRoots(scope.roots, scope.label, title) : null;
}

async function directFileDocsView(
	sources: RouteSources,
	where: string | null,
): Promise<DocsView | null> {
	return where
		? docsFileViewForSelector(sources, where, { allowImplicitTopicExtension: false })
		: null;
}

async function docsPrefixDocsView(
	sources: RouteSources,
	where: string | null,
	title: string,
): Promise<DocsView | null> {
	if (!where?.startsWith("docs/")) {
		return null;
	}

	ensureDocsRoots(sources.mergedDocsRoots, sources.currentDir);
	return docsViewForDocsSelector(sources, where, title);
}

async function directDirectoryDocsView(
	sources: RouteSources,
	where: string | null,
): Promise<DocsView | null> {
	if (!where) {
		return null;
	}

	const directoryPath = await resolveDirectDocsDirectory(sources, where);
	return directoryPath ? docsViewForDirectory(directoryPath, where) : null;
}

async function indirectDocsView(
	sources: RouteSources,
	where: string | null,
	title: string,
): Promise<DocsView> {
	if (!where) {
		fail("Expected docs selector");
	}

	return resolveIndirectDocsViewWithFileFallback(sources, where, title);
}

async function resolveRootSelectorRoute(
	sources: RouteSources,
	selector: string,
): Promise<DocsSelectorRoute> {
	return await collectionRoute(sources, selector)
		?? await topicOrRegisteredDocsRoute(sources, selector)
		?? await docsRoute(sources, selector);
}

async function readParkedCollectionSelectorFromSources(
	sources: RouteSources,
	selector: string,
): Promise<ParkedCollectionSelectorView | null> {
	const docsRoot = resolveGlobalDocsDirectoryByName(sources, selector);
	if (!docsRoot) {
		return null;
	}

	const index = await browseDiscovery.buildIndexData([docsRoot]);
	return {
		docsRoot,
		docs: index.docs,
		topics: index.topics,
	};
}

async function collectionRoute(
	sources: RouteSources,
	selector: string,
): Promise<DocsSelectorRoute | null> {
	const collection = await readParkedCollectionSelectorFromSources(sources, selector);
	return collection ? { collection, kind: "collection", selector } : null;
}

async function topicOrRegisteredDocsRoute(
	sources: RouteSources,
	selector: string,
): Promise<DocsSelectorRoute | null> {
	const topic = await browseDiscovery.readMergedTopic(sources.mergedDocsRoots, selector);
	const registeredDirectories = await resolveRegisteredDocsDirectoriesByName(sources, selector);
	const registeredDocs = registeredDirectories
		? (await docsEntriesUnderMany(registeredDirectories)).docs
		: null;
	if (topic && registeredDocs) {
		return { docs: registeredDocs, kind: "combined", selector, topic };
	}
	if (topic) {
		return { kind: "topic", topic };
	}
	if (!registeredDocs) {
		return null;
	}

	return {
		kind: "docs",
		view: {
			docs: registeredDocs,
			kind: "browse",
			title: docsTitle(selector),
		},
	};
}

async function docsRoute(
	sources: RouteSources,
	selector: string | null,
): Promise<DocsSelectorRoute> {
	return { kind: "docs", view: await resolveDocsView(sources, selector) };
}

export async function readParkedCollectionSelector(
	currentDir: string,
	selector: string,
): Promise<ParkedCollectionSelectorView | null> {
	const sources = await discoverDocsSources(normalizePath(currentDir));
	return readParkedCollectionSelectorFromSources(sources, selector);
}

export async function resolveDocsSelectorRoute(input: {
	currentDir: string;
	mode: DocsSelectorRouteMode;
	selector: string | null;
}): Promise<DocsSelectorRoute> {
	const sources = await discoverDocsSources(normalizePath(input.currentDir));
	if (input.mode === "root" && input.selector) {
		return resolveRootSelectorRoute(sources, input.selector);
	}

	return docsRoute(sources, input.selector);
}
