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

async function docsEntriesForWhere(currentDir: string, where: string | null) {
	const sources = await discoverDocsSources(currentDir);
	if (!where) {
		return docsEntriesFromRoots(sources.mergedDocsRoots, currentDir);
	}

	if (where === ".") {
		return docsEntriesFromRoots(sources.localDocsRoots, ".");
	}

	if (where === "global") {
		return docsEntriesFromRoots(sources.globalDocsRoots, "global");
	}

	if (where.startsWith("docs/")) {
		ensureDocsRoots(sources.mergedDocsRoots, currentDir);
		const directories = await resolveMergedDocsDirectories(sources, where);
		return docsEntriesFromRoots(directories, currentDir);
	}

	if (isDocsFilesystemSelector(where)) {
		const directoryPath = await resolveFilesystemDocsDirectory(sources, where);
		return docsEntriesUnder(directoryPath);
	}

	const globalDirectoryPath = resolveGlobalDocsDirectoryByName(sources, where);
	if (globalDirectoryPath) {
		return docsEntriesUnder(globalDirectoryPath);
	}

	const registeredDirectories = await resolveRegisteredDocsDirectoriesByName(sources, where);
	if (registeredDirectories) {
		return docsEntriesUnderMany(registeredDirectories);
	}

	const directoryPath = await resolveLocalDocsDirectory(sources, where);
	return docsEntriesUnder(directoryPath);
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
	browseRender.printDocsBrowser(docs);
	return true;
}

export async function runDocsBrowseSelector(currentDir: string, where: string): Promise<void> {
	const { docs } = await docsEntriesForWhere(currentDir, where);
	browseRender.printDocsBrowser(docs);
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
		const { docs } = await docsEntriesForWhere(currentDir, where);
		browseRender.printDocsBrowser(docs);
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
