import path from "node:path";

import { runtimeError } from "../core/errors.ts";
import browseContracts, {
	type BrowseOptions,
	type MergedTopic,
	type SectionEntry,
} from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import browseRender from "./browse-render.ts";

const { GLOBAL_DOCS_LABEL, normalizePath } = browseContracts;

function fail(message: string): never {
	throw runtimeError(message);
}

async function resolveDocsRoots(currentDir: string, globalFlag: boolean): Promise<string[]> {
	if (globalFlag) {
		const homeDir = process.env.HOME ? normalizePath(process.env.HOME) : null;
		const globalDocsRoot = homeDir ? normalizePath(path.join(homeDir, ".ngents", "docs")) : null;
		if (!globalDocsRoot) {
			return [];
		}

		return [globalDocsRoot];
	}

	const repoRoot = await browseDiscovery.discoverRepoRoot(currentDir);
	return browseDiscovery.discoverDocsRoots(repoRoot ?? currentDir);
}

function ensureDocsRoots(docsRoots: string[], currentDir: string, globalFlag: boolean): void {
	if (docsRoots.length > 0) {
		return;
	}

	const label = globalFlag ? GLOBAL_DOCS_LABEL : currentDir;
	fail(`Docs root not found: ${label}`);
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

export async function runNdexLs(positionals: string[], options: BrowseOptions): Promise<void> {
	if (positionals.length > 2) {
		fail("Usage: ndex ls [topic] [section] [--expand] [--global]");
	}

	const currentDir = normalizePath(process.cwd());
	const requestedTopic = positionals[0]?.trim() ?? null;
	const requestedSection = positionals[1]?.trim() ?? null;
	const docsRoots = await resolveDocsRoots(currentDir, options.global);
	ensureDocsRoots(docsRoots, currentDir, options.global);

	if (!requestedTopic) {
		const index = await browseDiscovery.buildIndexData(docsRoots);
		browseRender.printTopicIndex(index.topics, index.docs, {
			showGlobalTip: !options.global,
			showQueryTip: options.global,
		});
		return;
	}

	const topic = await readTopicOrFail(docsRoots, requestedTopic);
	if (!requestedSection) {
		browseRender.printTopicView(topic, options.expand);
		return;
	}

	const sections = sectionsOrFail(topic, requestedTopic, requestedSection);
	browseRender.printFocusedSection(topic, { key: requestedSection, sections }, options.expand);
}
