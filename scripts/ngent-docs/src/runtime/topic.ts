import { runtimeError } from "../core/errors.ts";
import browseContracts, {
	type MergedTopic,
	type SectionEntry,
} from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import browseRender from "./browse-render.ts";
import { discoverDocsSources } from "./browse-sources.ts";
import { availableSectionKeys } from "./browse-topic-sections.ts";

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

class TopicNotFoundError extends Error {
	public readonly topicName: string;

	constructor(topicName: string) {
		super(`Topic not found: ${topicName}`);
		this.name = "TopicNotFoundError";
		this.topicName = topicName;
	}
}

export function isTopicNotFoundError(error: unknown): error is TopicNotFoundError {
	return error instanceof TopicNotFoundError;
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

export async function runDocsTopicSelector(
	currentDir: string,
	requestedTopic: string,
): Promise<void> {
	const sources = await discoverDocsSources(currentDir);
	ensureDocsRoots(sources.mergedDocsRoots, currentDir);
	const topic = await readTopicOrNull(sources.mergedDocsRoots, requestedTopic);
	if (!topic) {
		throw new TopicNotFoundError(requestedTopic);
	}
	browseRender.printTopicView(topic);
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

	const topic = await readTopicOrFail(sources.mergedDocsRoots, requestedTopic);
	if (!requestedSection) {
		browseRender.printTopicView(topic);
		return;
	}

	const sections = sectionsOrFail(topic, requestedTopic, requestedSection);
	browseRender.printFocusedSection({ key: requestedSection, sections });
}
