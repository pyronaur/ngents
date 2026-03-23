import { runtimeError } from "../core/errors.ts";
import browseContracts, {
	type MergedTopic,
	type SectionEntry,
} from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import browseRender from "./browse-render.ts";
import { discoverDocsSources } from "./browse-sources.ts";
import { availableSectionKeys } from "./browse-topic-sections.ts";
import { readParkedCollectionSelector } from "./browse.ts";

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

async function readTopicOrFail(docsRoots: string[], requestedTopic: string): Promise<MergedTopic> {
	const topic = await browseDiscovery.readMergedTopic(docsRoots, requestedTopic);
	if (topic) {
		return topic;
	}

	const index = await browseDiscovery.buildIndexData(docsRoots);
	const availableTopics = index.topics.map(row => row.name).join(", ");
	fail(`Unknown topic "${requestedTopic}". Available topics: ${availableTopics}`);
}

async function readTopicOrNull(
	docsRoots: string[],
	requestedTopic: string,
): Promise<MergedTopic | null> {
	return browseDiscovery.readMergedTopic(docsRoots, requestedTopic);
}

function matchingSections(topic: MergedTopic, requestedSection: string): SectionEntry[] {
	const sections: SectionEntry[] = [];
	for (const contribution of topic.contributions) {
		const match = contribution.sectionEntries.find(section => section.key === requestedSection);
		if (match) {
			sections.push(match);
		}
	}

	return sections;
}

function sectionsOrFail(
	topic: MergedTopic,
	requestedTopic: string,
	requestedSection: string,
): SectionEntry[] {
	const sections = matchingSections(topic, requestedSection);
	if (sections.length > 0) {
		return sections;
	}

	fail(
		`Unknown section "${requestedSection}" for topic "${requestedTopic}". Available: ${
			availableSectionKeys(topic).join(", ")
		}`,
	);
}

async function printTopicOrParkedCollection(
	currentDir: string,
	docsRoots: string[],
	requestedTopic: string,
): Promise<boolean> {
	const topic = await readTopicOrNull(docsRoots, requestedTopic);
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

export async function readDocsTopicSelector(
	currentDir: string,
	requestedTopic: string,
): Promise<MergedTopic | null> {
	const sources = await discoverDocsSources(currentDir);
	if (sources.mergedDocsRoots.length === 0) {
		return null;
	}
	return readTopicOrNull(sources.mergedDocsRoots, requestedTopic);
}

export async function runDocsTopic(positionals: string[]): Promise<void> {
	if (positionals.length > 2) {
		fail("Usage: docs topic [topic] [section]");
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

	const topic = await readTopicOrFail(sources.mergedDocsRoots, requestedTopic);
	const sections = sectionsOrFail(topic, requestedTopic, requestedSection);
	browseRender.printFocusedSection({ key: requestedSection, sections });
}
