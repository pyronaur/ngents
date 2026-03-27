import {
	type TopicTemplateCompactSkillContext,
	type TopicTemplateFocusedSkillEntry,
	type TopicTemplateFocusedSkillsBlock,
	type TopicTemplateReferenceGroup,
} from "./command-template.ts";
import type { SectionEntry } from "./browse-contracts.ts";
import browseContracts from "./browse-contracts.ts";
import { groupedSkillReferenceNames } from "./browse-skill-references.ts";

const { errorText, heading, normalizeInlineText } = browseContracts;

function skillDisplayLabel(section: SectionEntry): string {
	const [skill] = section.skills;
	if (!skill) {
		return section.key;
	}

	return skill.title ?? skill.name;
}

function rootSkillRelativePath(section: SectionEntry): string {
	return `${section.key}/SKILL.md`;
}

function referenceGroups(
	skill: SectionEntry["skills"][number],
	headingPrefix: "###" | "#####",
): TopicTemplateReferenceGroup[] {
	return groupedSkillReferenceNames(skill).map(([directoryPath, fileNames]) => ({
		heading_line: `${headingPrefix} ${directoryPath}/:`,
		item_lines: fileNames.map(fileName => `- ${fileName}`),
	}));
}

function descriptionLine(skill: SectionEntry["skills"][number]): string | null {
	return normalizeInlineText(skill.description);
}

function createFocusedSkillEntry(
	skill: SectionEntry["skills"][number],
	entryHeadingPrefix: "####" | "#####",
): TopicTemplateFocusedSkillEntry {
	return {
		description_line: descriptionLine(skill),
		error_line: skill.error ? errorText(skill.error) : null,
		heading_line: `${entryHeadingPrefix} ${skill.title ?? skill.name}`,
		path_line: `path: ${skill.absolutePath}`,
		reference_groups: referenceGroups(skill, "#####"),
	};
}

export function isCompactFocusedSkillSection(section: SectionEntry): boolean {
	if (section.markdownEntries.length > 0 || section.skills.length !== 1) {
		return false;
	}

	const [skill] = section.skills;
	if (!skill) {
		return false;
	}

	return skill.relativePath === rootSkillRelativePath(section);
}

export function createCompactFocusedSkillContext(
	section: SectionEntry,
	options: { headingLevel?: 1 | 2 | 3 | 4 | 5 | 6 } = {},
): TopicTemplateCompactSkillContext {
	const [skill] = section.skills;
	if (!skill) {
		throw new Error("Compact focused skill section requires one skill");
	}

	return {
		description_line: descriptionLine(skill),
		heading_line: heading(options.headingLevel ?? 2, skillDisplayLabel(section)),
		kind: "compact_skill",
		path_line: skill.absolutePath,
		reference_groups: referenceGroups(skill, "###"),
	};
}

export function createFocusedSkillsBlock(
	section: SectionEntry,
	options: {
		blockHeadingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		entryHeadingPrefix?: "####" | "#####";
	} = {},
): TopicTemplateFocusedSkillsBlock | null {
	if (section.skills.length === 0) {
		return null;
	}

	return {
		entries: section.skills.map(skill =>
			createFocusedSkillEntry(skill, options.entryHeadingPrefix ?? "####")
		),
		heading_line: heading(options.blockHeadingLevel ?? 3, "Skills"),
	};
}

export default {
	createCompactFocusedSkillContext,
	createFocusedSkillsBlock,
	isCompactFocusedSkillSection,
};
