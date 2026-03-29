import { runtimeError } from "../core/errors.ts";
import browseContracts, {
	type MarkdownDocument,
	type MarkdownEntry,
	type TopicIndexRow,
} from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import browseRender from "./browse-render.ts";
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
	resolveQualifiedDocsDirectory,
	resolveRegisteredDocsDirectoriesByName,
} from "./browse-sources.ts";
import { readMarkdownDocument } from "./markdown-document.ts";

const { normalizePath } = browseContracts;
type DocsBrowseView = {
	kind: "browse";
	docs: Awaited<ReturnType<typeof browseDiscovery.readDocsEntriesUnder>>;
	title: string;
	topicHint?: string;
};

type DocsFileView = {
	doc: MarkdownDocument;
	kind: "file";
};

type DocsView = DocsBrowseView | DocsFileView;

type ParkedCollectionSelectorView = {
	docsRoot: string;
	docs: MarkdownEntry[];
	topics: TopicIndexRow[];
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

async function docsEntriesFromRoots(docsRoots: string[], label: string) {
	ensureDocsRoots(docsRoots, label);
	const index = await browseDiscovery.buildIndexData(docsRoots);
	return {
		docs: index.docs,
	};
}

async function docsEntriesUnder(directoryPath: string) {
	return {
		docs: await browseDiscovery.readDocsEntriesUnder(directoryPath),
	};
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
		...(await docsEntriesUnder(directoryPath)),
		kind: "browse",
		title: docsTitle(where),
	} satisfies DocsBrowseView;
}

async function docsFileViewForPath(filePath: string): Promise<DocsFileView> {
	return {
		doc: await readMarkdownDocument(filePath),
		kind: "file",
	} satisfies DocsFileView;
}

function docsTitle(where: string | null): string {
	if (!where) {
		return "Docs";
	}
	return `Docs: ${where}`;
}

async function topicHintForSelector(
	selector: string,
	docsRoots: string[],
): Promise<string | undefined> {
	const topic = await browseDiscovery.readMergedTopic(docsRoots, selector);
	return topic?.name;
}

async function resolveDirectDocsDirectory(
	sources: Awaited<ReturnType<typeof discoverDocsSources>>,
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
	sources: Awaited<ReturnType<typeof discoverDocsSources>>,
	where: string,
): Promise<string | null> {
	if (!isDocsFileSelector(where)) {
		return null;
	}

	if (isDocsFilesystemSelector(where)) {
		return resolveFilesystemDocsFile(sources, where);
	}

	return resolveLocalDocsFile(sources, where);
}

async function docsEntriesForWhere(
	currentDir: string,
	where: string | null,
): Promise<DocsView> {
	const sources = await discoverDocsSources(currentDir);
	if (!where) {
		return {
			...(await docsEntriesFromRoots(sources.mergedDocsRoots, currentDir)),
			kind: "browse",
			title: docsTitle(where),
		} satisfies DocsBrowseView;
	}

	if (where === ".") {
		return {
			...(await docsEntriesFromRoots(sources.localDocsRoots, ".")),
			kind: "browse",
			title: docsTitle(where),
		} satisfies DocsBrowseView;
	}

	if (where === "global") {
		return {
			...(await docsEntriesFromRoots(sources.globalDocsRoots, "global")),
			kind: "browse",
			title: docsTitle(where),
		} satisfies DocsBrowseView;
	}

	const directFilePath = await resolveDirectDocsFile(sources, where);
	if (directFilePath) {
		return docsFileViewForPath(directFilePath);
	}

	if (where.startsWith("docs/")) {
		ensureDocsRoots(sources.mergedDocsRoots, currentDir);
		const directories = await resolveMergedDocsDirectories(sources, where);
		return {
			...(await docsEntriesFromRoots(directories, currentDir)),
			kind: "browse",
			title: docsTitle(where),
		} satisfies DocsBrowseView;
	}

	const directDirectoryPath = await resolveDirectDocsDirectory(sources, where);
	if (directDirectoryPath) {
		return docsBrowseViewForDirectory(directDirectoryPath, where);
	}

	const registeredDirectories = await resolveRegisteredDocsDirectoriesByName(sources, where);
	if (registeredDirectories) {
		return {
			...(await docsEntriesUnderMany(registeredDirectories)),
			kind: "browse",
			title: docsTitle(where),
			topicHint: await topicHintForSelector(where, sources.mergedDocsRoots),
		} satisfies DocsBrowseView;
	}

	const directoryPath = await resolveLocalDocsDirectory(sources, where);
	return {
		...(await docsEntriesUnder(directoryPath)),
		kind: "browse",
		title: docsTitle(where),
	} satisfies DocsBrowseView;
}

async function browseInventoryForCurrentDir(currentDir: string) {
	const sources = await discoverDocsSources(currentDir);
	return browseDiscovery.buildBrowseInventory(sources);
}

function matchingTopicName(
	inventory: Awaited<ReturnType<typeof browseInventoryForCurrentDir>>,
	selector: string,
) {
	return inventory.topics.find(topic =>
		topic.name.localeCompare(selector, undefined, { sensitivity: "accent" }) === 0
	)?.name;
}

async function renderDocsSelectorNotFound(
	currentDir: string,
	selector: string,
): Promise<string> {
	const inventory = await browseInventoryForCurrentDir(currentDir);
	return browseRender.renderSelectorNotFound(selector, inventory, {
		topicHint: matchingTopicName(inventory, selector),
	});
}

export async function runDocsParkedCollectionSelector(
	currentDir: string,
	selector: string,
): Promise<boolean> {
	const collection = await readParkedCollectionSelector(currentDir, selector);
	if (!collection) {
		return false;
	}

	browseRender.printCollectionSelectorView(selector, collection.topics, collection.docs);
	return true;
}

export async function readRegisteredDocsSelector(
	currentDir: string,
	selector: string,
) {
	const sources = await discoverDocsSources(currentDir);
	const registeredDirectories = await resolveRegisteredDocsDirectoriesByName(sources, selector);
	if (!registeredDirectories) {
		return null;
	}
	const { docs } = await docsEntriesUnderMany(registeredDirectories);
	return docs;
}

export async function runDocsBrowseSelector(currentDir: string, where: string): Promise<void> {
	const view = await docsEntriesForWhere(currentDir, where);
	if (view.kind === "file") {
		browseRender.printDocsFile(view.doc);
		return;
	}

	browseRender.printDocsBrowser(view.docs, {
		title: view.title,
		topicHint: view.topicHint,
	});
}

export async function renderRootSelectorNotFound(
	currentDir: string,
	selector: string,
	commands: string[],
): Promise<string> {
	const inventory = await browseInventoryForCurrentDir(currentDir);
	return browseRender.renderRootSelectorNotFound(selector, commands, inventory);
}

export async function readParkedCollectionSelector(
	currentDir: string,
	selector: string,
): Promise<ParkedCollectionSelectorView | null> {
	const sources = await discoverDocsSources(currentDir);
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

export async function runDocsLs(positionals: string[]): Promise<void> {
	const currentDir = normalizePath(process.cwd());
	const where = positionals
		.map(part => part.trim())
		.filter(part => part.length > 0)
		.join("/") || null;
	if (!where) {
		const view = await docsEntriesForWhere(currentDir, where);
		if (view.kind !== "browse") {
			fail("Expected docs browse view");
		}
		browseRender.printDocsBrowser(view.docs, {
			title: view.title,
			topicHint: view.topicHint,
		});
		return;
	}

	try {
		await runDocsBrowseSelector(currentDir, where);
	} catch (error) {
		if (isBrowseSelectorNotFoundError(error)) {
			fail(await renderDocsSelectorNotFound(currentDir, where));
		}
		throw error;
	}
}
