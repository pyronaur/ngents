import path from "node:path";

import browseContracts, {
	type MarkdownEntry,
	type SectionEntry,
	type SkillEntry,
} from "./browse-contracts.ts";
import { isCompactFocusedSkillSection } from "./browse-focused-skills.ts";
import { renderDirectSkill, renderSkillList } from "./browse-skill-render.ts";
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

function sharedSectionTitle(sectionKey: string, sections: SectionEntry[]): string {
	for (const section of sections) {
		if (isCompactFocusedSkillSection(section)) {
			const [skill] = section.skills;
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

function mergedSectionLines(
	sectionView: { key: string; sections: SectionEntry[]; topicName: string },
): string[] {
	const lines: string[] = [];
	const metadataBlocks = sectionView.sections
		.map(section => sectionMetadataLines(section))
		.filter(block => block.length > 0);

	for (const [index, block] of metadataBlocks.entries()) {
		lines.push(...block);
		if (index < metadataBlocks.length - 1) {
			lines.push("");
		}
	}

	const docs = docsGroupLines(sectionView.sections);
	if (docs.length > 0) {
		if (lines.length > 0) {
			lines.push("");
		}
		lines.push(...docs);
	}

	const skills: SkillEntry[] = [];
	for (const section of sectionView.sections) {
		collectSkills(section, skills);
	}
	if (skills.length > 0) {
		if (lines.length > 0) {
			lines.push("");
		}
		lines.push(...renderSkillList({
			description: true,
			sectionKey: sectionView.key,
			sectionPath: sectionView.sections[0]?.absolutePath ?? "",
			skills,
			title: "Skills",
			topicName: sectionView.topicName,
		}));
	}

	if (lines.length === 0) {
		lines.push("[no section entries found]");
	}

	return lines;
}

export function createFocusedContext(
	sectionView: { key: string; sections: SectionEntry[]; topicName: string },
): TopicTemplateFocusedContext {
	const sections = sectionView.sections.every(section => isCompactFocusedSkillSection(section))
		? sectionView.sections.map(section => ({
			text: renderDirectSkill(section, sectionView.topicName).join("\n"),
		}))
		: [{ text: mergedSectionLines(sectionView).join("\n") }];

	return {
		sections,
		title_line: heading(2, sharedSectionTitle(sectionView.key, sectionView.sections)),
		view: "focused",
	};
}
