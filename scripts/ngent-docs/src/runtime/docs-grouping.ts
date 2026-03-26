import path from "node:path";

import browseContracts, {
	type MarkdownEntry,
} from "./browse-contracts.ts";

const { normalizePath } = browseContracts;

export function groupedDocs(docs: MarkdownEntry[]): Array<[string, MarkdownEntry[]]> {
	const grouped = new Map<string, MarkdownEntry[]>();
	for (const entry of docs) {
		const directoryPath = normalizePath(path.dirname(entry.absolutePath));
		const existing = grouped.get(directoryPath);
		if (existing) {
			existing.push(entry);
			continue;
		}

		grouped.set(directoryPath, [entry]);
	}

	return Array.from(grouped.entries()).sort((left, right) => left[0].localeCompare(right[0]));
}
