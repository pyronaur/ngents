import { runtimeError } from "../core/errors.ts";
import type { MergedTopic, SectionEntry } from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";

function formatAvailableItems(label: string, items: string[]): string {
	if (items.length === 0) {
		return `${label}: [none]`;
	}
	return `${label}:\n${items.map(item => `- ${item}`).join("\n")}`;
}

function matchingSections(topic: MergedTopic, requestedPath: string): SectionEntry[] {
	const sections: SectionEntry[] = [];
	function collectMatches(section: SectionEntry): void {
		if (section.key === requestedPath) {
			sections.push(section);
		}
		for (const child of section.children) {
			collectMatches(child);
		}
	}
	for (const contribution of topic.contributions) {
		for (const section of contribution.sectionEntries) {
			collectMatches(section);
		}
	}
	return sections;
}

export async function readTopicOrFail(
	docsRoots: string[],
	requestedTopic: string,
): Promise<MergedTopic> {
	const topic = await browseDiscovery.readMergedTopic(docsRoots, requestedTopic);
	if (topic) {
		return topic;
	}
	const index = await browseDiscovery.buildIndexData(docsRoots);
	throw runtimeError(
		`Unknown topic "${requestedTopic}". ${
			formatAvailableItems("Available topics", index.topics.map(row => row.name))
		}`,
	);
}

export async function resolveTopicSections(
	docsRoots: string[],
	requestedTopic: string,
	requestedPath: string,
): Promise<SectionEntry[]> {
	const topic = await readTopicOrFail(docsRoots, requestedTopic);
	const sections = matchingSections(topic, requestedPath);
	if (sections.length > 0) {
		return sections;
	}
	throw runtimeError(
		`Unknown path "${requestedPath}" for topic "${requestedTopic}". ${
			formatAvailableItems("Available", availableSectionKeys(topic))
		}`,
	);
}

export function availableSectionKeys(topic: MergedTopic): string[] {
	const keys = new Set<string>();

	function collectKeys(
		section: MergedTopic["contributions"][number]["sectionEntries"][number],
	): void {
		keys.add(section.key);
		for (const child of section.children) {
			collectKeys(child);
		}
	}

	for (const contribution of topic.contributions) {
		for (const section of contribution.sectionEntries) {
			collectKeys(section);
		}
	}

	return Array.from(keys).sort((left, right) => left.localeCompare(right));
}
