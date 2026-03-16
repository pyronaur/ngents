import path from "node:path";

import type { SkillEntry } from "./browse-contracts.ts";
import browseContracts from "./browse-contracts.ts";

const { normalizePath } = browseContracts;

export function groupedSkillReferenceNames(skill: SkillEntry): Array<[string, string[]]> {
	const grouped = new Map<string, Set<string>>();
	const skillDir = path.dirname(skill.absolutePath);

	for (const referencePath of skill.referencePaths) {
		const absolutePath = normalizePath(path.resolve(skillDir, referencePath));
		const directoryPath = normalizePath(path.dirname(absolutePath));
		const existing = grouped.get(directoryPath) ?? new Set<string>();
		existing.add(path.basename(absolutePath));
		grouped.set(directoryPath, existing);
	}

	return Array.from(grouped.entries())
		.map(([directoryPath, fileNames]): [string, string[]] => [
			directoryPath,
			Array.from(fileNames).sort((left, right) => left.localeCompare(right)),
		])
		.sort(([leftDirectory], [rightDirectory]) => leftDirectory.localeCompare(rightDirectory));
}
