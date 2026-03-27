import path from "node:path";

import pc from "picocolors";

import browseContracts, {
	type MarkdownEntry,
	type SectionEntry,
} from "./browse-contracts.ts";
import type { TopicTemplateFocusedContext } from "./command-template.ts";
import {
	createCompactFocusedSkillContext,
	createFocusedSkillsBlock,
	isCompactFocusedSkillSection,
} from "./browse-focused-skills.ts";

const { compactDescription, errorText, heading, normalizeInlineText } = browseContracts;

function blockText(lines: string[]): string {
	return lines.join("\n");
}

function sharedSectionTitle(sectionKey: string, sections: SectionEntry[]): string {
	for (const section of sections) {
		const title = section.title.trim();
		if (title.length > 0) {
			return title;
		}
	}

	return path.basename(sectionKey);
}

function nextHeadingLevel(level: 2 | 3 | 4 | 5 | 6): 3 | 4 | 5 | 6 {
	if (level === 2) {
		return 3;
	}
	if (level === 3) {
		return 4;
	}
	if (level === 4) {
		return 5;
	}
	return 6;
}

function guideMetadataLines(
	guideBody: string | null,
	error: string | undefined,
	readWhen: string[],
): string[] {
	const lines: string[] = [];
	if (guideBody) {
		lines.push(...guideBody.split("\n"));
	}
	if (error) {
		lines.push(errorText(error));
	}
	if (readWhen.length > 0) {
		lines.push(`Read when: ${readWhen.join("; ")}`);
	}
	return lines;
}

function createMarkdownEntryContext(
	entry: MarkdownEntry,
	level: 2 | 3 | 4 | 5 | 6,
): {
	error_line: string | null;
	heading_line: string;
	path_line: string;
	read_when_line: string | null;
	summary_line: string | null;
} {
	return {
		error_line: entry.error ? errorText(entry.error) : null,
		heading_line: heading(level, entry.title ?? entry.relativePath),
		path_line: `path: ${entry.absolutePath}`,
		read_when_line: entry.readWhen.length > 0 ? `Read when: ${entry.readWhen.join("; ")}` : null,
		summary_line: normalizeInlineText(entry.summary) ?? compactDescription(entry.short, null),
	};
}

function appendReferenceGroups(
	referenceGroups: Array<{ heading_line: string; item_lines: string[] }>,
	lines: string[],
): void {
	for (const [index, referenceGroup] of referenceGroups.entries()) {
		lines.push(referenceGroup.heading_line);
		lines.push(...referenceGroup.item_lines);
		if (index < referenceGroups.length - 1) {
			lines.push("");
		}
	}
}

function appendCompactSkillLines(
	section: SectionEntry,
	lines: string[],
	options: { headingLevel?: 1 | 2 | 3 | 4 | 5 | 6 } = {},
): void {
	const compact = createCompactFocusedSkillContext(section, options);
	lines.push(compact.heading_line);
	lines.push(compact.path_line);
	if (compact.description_line || compact.reference_groups.length > 0) {
		lines.push("");
	}
	if (compact.description_line) {
		lines.push(compact.description_line);
	}
	if (compact.description_line && compact.reference_groups.length > 0) {
		lines.push("");
	}
	appendReferenceGroups(compact.reference_groups, lines);
}

function appendFocusedSkillsBlockLines(
	section: SectionEntry,
	lines: string[],
	options: {
		blockHeadingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		entryHeadingPrefix?: "####" | "#####";
	},
): void {
	const block = createFocusedSkillsBlock(section, options);
	if (!block) {
		return;
	}

	lines.push(block.heading_line);
	lines.push("");
	for (const [index, entry] of block.entries.entries()) {
		lines.push(entry.heading_line);
		lines.push(entry.path_line);
		if (entry.description_line || entry.error_line || entry.reference_groups.length > 0) {
			lines.push("");
		}
		if (entry.description_line) {
			lines.push(entry.description_line);
		}
		if (entry.error_line) {
			lines.push(entry.error_line);
		}
		if (entry.reference_groups.length > 0) {
			if (entry.description_line || entry.error_line) {
				lines.push("");
			}
			appendReferenceGroups(entry.reference_groups, lines);
		}
		if (index < block.entries.length - 1) {
			lines.push("");
		}
	}
}

function appendMarkdownEntries(
	section: SectionEntry,
	lines: string[],
	level: 3 | 4 | 5 | 6,
): void {
	for (const [index, entry] of section.markdownEntries.entries()) {
		const markdown = createMarkdownEntryContext(entry, level);
		lines.push(markdown.heading_line);
		lines.push(markdown.path_line);
		if (markdown.summary_line) {
			lines.push(markdown.summary_line);
		}
		if (markdown.read_when_line) {
			lines.push(markdown.read_when_line);
		}
		if (markdown.error_line) {
			lines.push(markdown.error_line);
		}
		if (index < section.markdownEntries.length - 1) {
			lines.push("");
		}
	}
}

function appendSectionHeading(
	section: SectionEntry,
	lines: string[],
	options: {
		headingLevel: 2 | 3 | 4 | 5 | 6;
		isRoot: boolean;
	},
): void {
	if (options.isRoot) {
		lines.push(`source: ${section.absolutePath}`);
		return;
	}

	lines.push(heading(options.headingLevel, sharedSectionTitle(section.key, [section])));
	lines.push(`path: ${section.absolutePath}/`);
}

function appendSectionContent(
	section: SectionEntry,
	lines: string[],
	options: {
		headingLevel: 2 | 3 | 4 | 5 | 6;
		isRoot: boolean;
	},
): void {
	const metadataLines = guideMetadataLines(section.guideBody, section.error, section.readWhen);
	lines.push(...metadataLines);
	if (metadataLines.length > 0) {
		lines.push("");
	}

	const childHeadingLevel = options.isRoot ? 3 : nextHeadingLevel(options.headingLevel);
	appendFocusedSkillsBlockLines(section, lines, {
		blockHeadingLevel: options.isRoot ? 3 : childHeadingLevel,
		entryHeadingPrefix: options.isRoot ? "####" : "#####",
	});
	if (section.skills.length > 0 && section.markdownEntries.length > 0) {
		lines.push("");
	}

	appendMarkdownEntries(section, lines, options.isRoot ? 3 : childHeadingLevel);
	if (
		(section.skills.length > 0 || section.markdownEntries.length > 0) && section.children.length > 0
	) {
		lines.push("");
	}

	for (const [index, child] of section.children.entries()) {
		appendFocusedSectionLines(child, lines, {
			headingLevel: childHeadingLevel,
			isRoot: false,
		});
		if (index < section.children.length - 1) {
			lines.push("");
		}
	}

	if (section.markdownEntries.length === 0 && section.skills.length === 0 && section.children.length === 0) {
		lines.push(pc.dim("[no section entries found]"));
	}
}

function appendFocusedSectionLines(
	section: SectionEntry,
	lines: string[],
	options: {
		headingLevel: 2 | 3 | 4 | 5 | 6;
		isRoot: boolean;
	},
): void {
	if (isCompactFocusedSkillSection(section)) {
		appendCompactSkillLines(section, lines, {
			headingLevel: options.isRoot ? 2 : options.headingLevel,
		});
		return;
	}

	appendSectionHeading(section, lines, options);
	appendSectionContent(section, lines, options);
}

export function createFocusedContext(
	sectionView: { key: string; sections: SectionEntry[] },
): TopicTemplateFocusedContext {
	if (sectionView.sections.length === 1) {
		const [section] = sectionView.sections;
		if (section && isCompactFocusedSkillSection(section)) {
			const lines: string[] = [];
			appendCompactSkillLines(section, lines);
			return {
				sections: [{ text: blockText(lines) }],
				title_line: null,
				view: "focused",
			};
		}
	}

	return {
		sections: sectionView.sections.map(section => {
			const lines: string[] = [];
			appendFocusedSectionLines(section, lines, {
				headingLevel: 2,
				isRoot: true,
			});
			return { text: blockText(lines) };
		}),
		title_line: heading(2, sharedSectionTitle(sectionView.key, sectionView.sections)),
		view: "focused",
	};
}
