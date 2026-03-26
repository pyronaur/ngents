import type { MergedTopic } from "./browse-contracts.ts";

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
