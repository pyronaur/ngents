import { runtimeError } from "../core/errors.ts";
import browseContracts, {
	type MergedTopic,
	type SectionEntry,
} from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import browseRender from "./browse-render.ts";
import { discoverDocsSources } from "./browse-sources.ts";

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
			browseRender.availableSectionKeys(topic).join(", ")
		}`,
	);
}

export async function runNdexTopic(positionals: string[]): Promise<void> {
	if (positionals.length > 2) {
		fail("Usage: ndex topic [topic] [section]");
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
	browseRender.printFocusedSection(topic, { key: requestedSection, sections });
}
