import { runtimeError } from "../core/errors.ts";
import browseContracts from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import browseRender from "./browse-render.ts";
import {
	discoverDocsSources,
	isBrowseSelectorNotFoundError,
	isDocsFilesystemSelector,
	resolveFilesystemDocsDirectory,
	resolveGlobalDocsDirectoryByName,
	resolveLocalDocsDirectory,
	resolveMergedDocsDirectories,
	resolveRegisteredDocsDirectoriesByName,
} from "./browse-sources.ts";

const { normalizePath } = browseContracts;
type DocsBrowseView = {
	docs: Awaited<ReturnType<typeof browseDiscovery.readDocsEntriesUnder>>;
	title: string;
	topicHint?: string;
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

async function docsEntriesForWhere(
	currentDir: string,
	where: string | null,
): Promise<DocsBrowseView> {
	const sources = await discoverDocsSources(currentDir);
	if (!where) {
		return {
			...(await docsEntriesFromRoots(sources.mergedDocsRoots, currentDir)),
			title: docsTitle(where),
		} satisfies DocsBrowseView;
	}

	if (where === ".") {
		return {
			...(await docsEntriesFromRoots(sources.localDocsRoots, ".")),
			title: docsTitle(where),
		} satisfies DocsBrowseView;
	}

	if (where === "global") {
		return {
			...(await docsEntriesFromRoots(sources.globalDocsRoots, "global")),
			title: docsTitle(where),
		} satisfies DocsBrowseView;
	}

	if (where.startsWith("docs/")) {
		ensureDocsRoots(sources.mergedDocsRoots, currentDir);
		const directories = await resolveMergedDocsDirectories(sources, where);
		return {
			...(await docsEntriesFromRoots(directories, currentDir)),
			title: docsTitle(where),
		} satisfies DocsBrowseView;
	}

	if (isDocsFilesystemSelector(where)) {
		const directoryPath = await resolveFilesystemDocsDirectory(sources, where);
		return {
			...(await docsEntriesUnder(directoryPath)),
			title: docsTitle(where),
		} satisfies DocsBrowseView;
	}

	const globalDirectoryPath = resolveGlobalDocsDirectoryByName(sources, where);
	if (globalDirectoryPath) {
		return {
			...(await docsEntriesUnder(globalDirectoryPath)),
			title: docsTitle(where),
		} satisfies DocsBrowseView;
	}

	const registeredDirectories = await resolveRegisteredDocsDirectoriesByName(sources, where);
	if (registeredDirectories) {
		return {
			...(await docsEntriesUnderMany(registeredDirectories)),
			title: docsTitle(where),
			topicHint: await topicHintForSelector(where, sources.mergedDocsRoots),
		} satisfies DocsBrowseView;
	}

	const directoryPath = await resolveLocalDocsDirectory(sources, where);
	return {
		...(await docsEntriesUnder(directoryPath)),
		title: docsTitle(where),
	} satisfies DocsBrowseView;
}

async function browseInventoryForCurrentDir(currentDir: string) {
	const sources = await discoverDocsSources(currentDir);
	return browseDiscovery.buildBrowseInventory(sources.mergedDocsRoots);
}

function matchingTopicName(
	inventory: Awaited<ReturnType<typeof browseInventoryForCurrentDir>>,
	selector: string,
) {
	return inventory.topics.find(topic =>
		topic.name.localeCompare(selector, undefined, { sensitivity: "accent" }) === 0
	)?.name;
}

export async function runDocsParkedCollectionSelector(
	currentDir: string,
	selector: string,
): Promise<boolean> {
	const sources = await discoverDocsSources(currentDir);
	const globalDirectoryPath = resolveGlobalDocsDirectoryByName(sources, selector);
	if (!globalDirectoryPath) {
		return false;
	}

	const { docs } = await docsEntriesUnder(globalDirectoryPath);
	browseRender.printDocsBrowser(docs, {
		title: docsTitle(selector),
	});
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
	const { docs, title, topicHint } = await docsEntriesForWhere(currentDir, where);
	browseRender.printDocsBrowser(docs, {
		title,
		topicHint,
	});
}

export async function renderDocsSelectorNotFound(
	currentDir: string,
	selector: string,
): Promise<string> {
	const inventory = await browseInventoryForCurrentDir(currentDir);
	return browseRender.renderSelectorNotFound(selector, inventory, {
		topicHint: matchingTopicName(inventory, selector),
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

export async function runDocsLs(positionals: string[]): Promise<void> {
	if (positionals.length > 1) {
		fail("Usage: docs ls [where]");
	}

	const currentDir = normalizePath(process.cwd());
	const where = positionals[0]?.trim() || null;
	if (!where) {
		const { docs, title, topicHint } = await docsEntriesForWhere(currentDir, where);
		browseRender.printDocsBrowser(docs, {
			title,
			topicHint,
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
