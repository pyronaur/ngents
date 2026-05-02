import { runtimeError } from "../core/errors.ts";
import browseContracts from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import browseRender from "./browse-render.ts";
import type { DocsSelectorRoute } from "./browse-route-contracts.ts";
import {
	resolveDocsSelectorRoute,
} from "./browse-route.ts";
import { discoverDocsSources, isBrowseSelectorNotFoundError } from "./browse-sources.ts";

const { normalizePath } = browseContracts;

function fail(message: string): never {
	throw runtimeError(message);
}

function printDocsView(route: Extract<DocsSelectorRoute, { kind: "docs" }>): void {
	if (route.view.kind === "file") {
		browseRender.printDocsFile(route.view.doc);
		return;
	}

	browseRender.printDocsBrowser(route.view.docs, {
		title: route.view.title,
		topicHint: route.view.topicHint,
	});
}

function printDocsSelectorRoute(route: DocsSelectorRoute): void {
	if (route.kind === "collection") {
		browseRender.printCollectionSelectorView(
			route.selector,
			route.collection.topics,
			route.collection.docs,
		);
		return;
	}
	if (route.kind === "combined") {
		browseRender.printCombinedSelectorView(route.selector, route.topic, route.docs);
		return;
	}
	if (route.kind === "topic") {
		browseRender.printTopicView(route.topic);
		return;
	}

	printDocsView(route);
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

export async function runDocsRootSelector(currentDir: string, selector: string): Promise<void> {
	printDocsSelectorRoute(
		await resolveDocsSelectorRoute({
			currentDir,
			mode: "root",
			selector,
		}),
	);
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
	const currentDir = normalizePath(process.cwd());
	const where = positionals
		.map(part => part.trim())
		.filter(part => part.length > 0)
		.join("/") || null;

	try {
		const route = await resolveDocsSelectorRoute({
			currentDir,
			mode: "docs",
			selector: where,
		});
		if (route.kind !== "docs") {
			fail("Expected docs route");
		}
		printDocsView(route);
	} catch (error) {
		if (where && isBrowseSelectorNotFoundError(error)) {
			fail(await renderDocsSelectorNotFound(currentDir, where));
		}
		throw error;
	}
}
