import type { MergedTopic } from "./browse-contracts.ts";

export function availableSectionKeys(topic: MergedTopic): string[] {
	const keys = new Set<string>();
	for (const contribution of topic.contributions) {
		for (const section of contribution.sectionEntries) {
			keys.add(section.key);
		}
	}

	return Array.from(keys).sort((left, right) => left.localeCompare(right));
}
