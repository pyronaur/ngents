import { runtimeError } from "../core/errors.ts";
import browseContracts from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import browseRender from "./browse-render.ts";
import { readParkedCollectionSelector } from "./browse-route.ts";
import { discoverDocsSources } from "./browse-sources.ts";
import { readTopicOrFail, resolveTopicSections } from "./browse-topic-sections.ts";

const { normalizePath } = browseContracts;

function fail(message: string): never {
	throw runtimeError(message);
}

function ensureDocsRoots(docsRoots: string[], currentDir: string): void {
	if (docsRoots.length > 0) {
		return;
	}

	fail(`Docs root not found: ${currentDir}`);
}

async function printTopicOrParkedCollection(
	currentDir: string,
	docsRoots: string[],
	requestedTopic: string,
): Promise<boolean> {
	const topic = await browseDiscovery.readMergedTopic(docsRoots, requestedTopic);
	if (topic) {
		browseRender.printTopicView(topic);
		return true;
	}

	const parkedCollection = await readParkedCollectionSelector(currentDir, requestedTopic);
	if (!parkedCollection) {
		return false;
	}

	browseRender.printScopedTopicBrowser(parkedCollection.topics, {
		title: `Topics: ${requestedTopic}`,
	});
	return true;
}

export async function runDocsTopic(positionals: string[]): Promise<void> {
	if (positionals.length > 2) {
		fail("Usage: docs topic [topic] [path]");
	}

	const currentDir = normalizePath(process.cwd());
	const requestedTopic = positionals[0]?.trim() || null;
	const requestedSection = positionals[1]?.trim() || null;
	const sources = await discoverDocsSources(currentDir);
	ensureDocsRoots(sources.mergedDocsRoots, currentDir);

	if (!requestedTopic) {
		const index = await browseDiscovery.buildIndexData(sources.mergedDocsRoots);
		browseRender.printTopicBrowser(index.topics);
		return;
	}

	if (
		!requestedSection && await printTopicOrParkedCollection(
			currentDir,
			sources.mergedDocsRoots,
			requestedTopic,
		)
	) {
		return;
	}

	if (!requestedSection) {
		await readTopicOrFail(sources.mergedDocsRoots, requestedTopic);
		return;
	}

	const sections = await resolveTopicSections(sources.mergedDocsRoots, requestedTopic,
		requestedSection);
	browseRender.printFocusedSection({ key: requestedSection, sections, topicName: requestedTopic });
}
