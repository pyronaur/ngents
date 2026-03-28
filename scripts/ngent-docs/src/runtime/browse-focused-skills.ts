import type { SectionEntry } from "./browse-contracts.ts";

function rootSkillRelativePath(section: SectionEntry): string {
	return `${section.key}/SKILL.md`;
}

export function isCompactFocusedSkillSection(section: SectionEntry): boolean {
	if (section.children.length > 0 || section.markdownEntries.length > 0 || section.skills.length !== 1) {
		return false;
	}

	const [skill] = section.skills;
	if (!skill) {
		return false;
	}

	return skill.relativePath === rootSkillRelativePath(section);
}

export default {
	isCompactFocusedSkillSection,
};
