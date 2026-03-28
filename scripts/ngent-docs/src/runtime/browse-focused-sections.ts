import path from "node:path";

import browseContracts, {
	type MarkdownEntry,
	type SectionEntry,
	type SkillEntry,
} from "./browse-contracts.ts";
import { isCompactFocusedSkillSection } from "./browse-focused-skills.ts";
import type { TopicTemplateFocusedContext } from "./command-template.ts";
import { groupedDocs } from "./docs-grouping.ts";

const {
	compactDescription,
	directoryDisplayPath,
	errorText,
	firstContentParagraph,
	heading,
	normalizeInlineText,
	sortedMarkdownEntries,
} = browseContracts;

function blockText(lines: string[]): string {
	return lines.join("\n");
}

function directSkill(section: SectionEntry): SkillEntry | null {
	const [skill] = section.skills;
	if (!skill) {
		return null;
	}

	return skill;
}

function sharedSectionTitle(sectionKey: string, sections: SectionEntry[]): string {
	for (const section of sections) {
		if (isCompactFocusedSkillSection(section)) {
			const skill = directSkill(section);
			if (skill) {
				return skill.title ?? skill.name;
			}
		}

		const title = section.title.trim();
		if (title.length > 0) {
			return title;
		}
	}

	return path.basename(sectionKey);
}

function guideSummary(section: SectionEntry): string | null {
	return firstContentParagraph(section.guideBody);
}

function sectionMetadataLines(section: SectionEntry): string[] {
	const lines: string[] = [];
	const summary = guideSummary(section)
		?? normalizeInlineText(section.summary)
		?? compactDescription(section.short, null);
	if (summary) {
		lines.push(summary);
	}
	if (section.readWhen.length > 0) {
		lines.push(...section.readWhen);
	}
	if (section.error) {
		lines.push(errorText(section.error));
	}
	return lines;
}

function rootHelpDocsEntryLines(entries: MarkdownEntry[]): string[] {
	return sortedMarkdownEntries(entries)
		.map(entry => {
			const description = normalizeInlineText(entry.short)
				?? normalizeInlineText(entry.summary)
				?? normalizeInlineText(entry.title);
			const fileName = path.basename(entry.absolutePath);
			if (!description) {
				return `  ${fileName}`;
			}

			return `  ${fileName} - ${description}`;
		});
}

function collectDocs(section: SectionEntry, docs: MarkdownEntry[]): void {
	docs.push(...section.markdownEntries);
	for (const child of section.children) {
		collectDocs(child, docs);
	}
}

function allDocs(sections: SectionEntry[]): MarkdownEntry[] {
	const docs: MarkdownEntry[] = [];
	for (const section of sections) {
		collectDocs(section, docs);
	}
	return docs;
}

function docsGroupLines(sections: SectionEntry[]): string[] {
	const docs = allDocs(sections);
	if (docs.length === 0) {
		return [];
	}

	const groups = groupedDocs(docs);
	const lines: string[] = [];
	for (const [index, [directoryPath, entries]] of groups.entries()) {
		lines.push(heading(3, directoryDisplayPath(directoryPath)));
		lines.push(...rootHelpDocsEntryLines(entries));
		if (index < groups.length - 1) {
			lines.push("");
		}
	}
	return lines;
}

function collectSkills(section: SectionEntry, skills: SkillEntry[]): void {
	skills.push(...section.skills);
	for (const child of section.children) {
		collectSkills(child, skills);
	}
}

function skillLines(sections: SectionEntry[]): string[] {
	const skills: SkillEntry[] = [];
	for (const section of sections) {
		collectSkills(section, skills);
	}

	return skills
		.sort((left, right) => left.relativePath.localeCompare(right.relativePath))
		.map(skill => {
			const description = normalizeInlineText(skill.hint) ?? normalizeInlineText(skill.description);
			if (!description) {
				return `$${skill.name}`;
			}

			return `$${skill.name} - ${description}`;
		});
}

function appendCompactSkillBody(section: SectionEntry, lines: string[]): void {
	const skill = directSkill(section);
	if (!skill) {
		return;
	}

	const description = normalizeInlineText(skill.description) ?? normalizeInlineText(skill.hint);
	if (description) {
		lines.push(description);
	}
	if (skill.error) {
		lines.push(errorText(skill.error));
	}
	if (skill.referencePaths.length === 0) {
		return;
	}

	if (description || skill.error) {
		lines.push("");
	}
	lines.push(heading(3, "References"));
	lines.push(...skill.referencePaths.map(referencePath => `- ${path.basename(referencePath)}`));
}

function mergedSectionLines(sections: SectionEntry[]): string[] {
	const lines: string[] = [];
	const metadataBlocks = sections
		.map(section => sectionMetadataLines(section))
		.filter(block => block.length > 0);

	for (const [index, block] of metadataBlocks.entries()) {
		lines.push(...block);
		if (index < metadataBlocks.length - 1) {
			lines.push("");
		}
	}

	const docs = docsGroupLines(sections);
	if (docs.length > 0) {
		if (lines.length > 0) {
			lines.push("");
		}
		lines.push(...docs);
	}

	const skills = skillLines(sections);
	if (skills.length > 0) {
		if (lines.length > 0) {
			lines.push("");
		}
		lines.push(heading(3, "Skills"));
		lines.push(...skills);
	}

	if (lines.length === 0) {
		lines.push("[no section entries found]");
	}

	return lines;
}

export function createFocusedContext(
	sectionView: { key: string; sections: SectionEntry[] },
): TopicTemplateFocusedContext {
	const sections = sectionView.sections.every(section => isCompactFocusedSkillSection(section))
		? sectionView.sections.map(section => {
			const lines: string[] = [];
			appendCompactSkillBody(section, lines);
			return { text: blockText(lines) };
		})
		: [{ text: blockText(mergedSectionLines(sectionView.sections)) }];

	return {
		sections,
		title_line: heading(2, sharedSectionTitle(sectionView.key, sectionView.sections)),
		view: "focused",
	};
}
