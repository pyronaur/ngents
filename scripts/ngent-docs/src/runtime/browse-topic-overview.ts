import path from "node:path";

import type {
	MarkdownEntry,
	MergedTopic,
	SectionEntry,
	SkillEntry,
	TopicContribution,
} from "./browse-contracts.ts";
import browseContracts from "./browse-contracts.ts";

const {
	compactDescription,
	errorText,
	heading,
	normalizeInlineText,
	printLine,
	toDisplayPath,
} = browseContracts;

function printGuideBody(guideBody: string): void {
	for (const line of guideBody.split("\n")) {
		printLine(line);
	}
}

function printSeparator(): void {
	printLine();
	printLine("---");
	printLine();
}

function printTopicDocMetadata(entry: MarkdownEntry): void {
	const summary = normalizeInlineText(entry.summary) ?? compactDescription(entry.short, null);
	const readWhen = entry.readWhen.length > 0 ? `Read when: ${entry.readWhen.join("; ")}` : null;
	if (!summary && !readWhen && !entry.error) {
		return;
	}

	printLine();
	if (summary) {
		printLine(summary);
	}
	if (readWhen) {
		printLine(readWhen);
	}
	if (entry.error) {
		printLine(errorText(entry.error));
	}
}

function printTopicDoc(entry: MarkdownEntry, headingLevel: 3 | 4): void {
	printLine(
		heading(
			headingLevel,
			entry.title ?? path.basename(entry.absolutePath, path.extname(entry.absolutePath)),
		),
	);
	printLine(entry.absolutePath);
	printTopicDocMetadata(entry);
}

function printTopicDocs(entries: MarkdownEntry[], options: {
	sectionHeadingLevel: 2 | 3;
	entryHeadingLevel: 3 | 4;
}): void {
	printLine(heading(options.sectionHeadingLevel, "Docs"));
	printLine();

	if (entries.length === 1) {
		const [entry] = entries;
		if (entry) {
			printLine(entry.absolutePath);
			printTopicDocMetadata(entry);
		}
		return;
	}

	for (const [index, entry] of entries.entries()) {
		printTopicDoc(entry, options.entryHeadingLevel);
		if (index < entries.length - 1) {
			printSeparator();
		}
	}
}

function relativePathParts(basePath: string, absolutePath: string): string[] {
	return toDisplayPath(path.relative(basePath, absolutePath)).split("/").filter(Boolean);
}

function consistentPathParts(pathParts: string[][]): string[] | null {
	const firstParts = pathParts[0];
	if (!firstParts) {
		return null;
	}

	for (const parts of pathParts) {
		if (parts.length !== firstParts.length) {
			return null;
		}
	}

	return firstParts;
}

function variableIndexForTemplate(
	pathParts: string[][],
	entries: Array<{ variableSegment: string }>,
): number | null {
	const firstParts = consistentPathParts(pathParts);
	if (!firstParts) {
		return null;
	}

	const variableIndexes: number[] = [];
	for (let index = 0; index < firstParts.length; index += 1) {
		const expected = firstParts[index];
		if (pathParts.some(parts => parts[index] !== expected)) {
			variableIndexes.push(index);
		}
	}
	if (variableIndexes.length !== 1) {
		return null;
	}

	const [variableIndex] = variableIndexes;
	if (variableIndex === undefined) {
		return null;
	}

	for (const [index, entry] of entries.entries()) {
		if (pathParts[index]?.[variableIndex] !== entry.variableSegment) {
			return null;
		}
	}

	return variableIndex;
}

function entryPathTemplate(
	basePath: string,
	entries: Array<{
		absolutePath: string;
		variableSegment: string;
	}>,
): string | null {
	if (entries.length === 0) {
		return null;
	}

	if (entries.length === 1) {
		const [entry] = entries;
		return entry?.absolutePath ?? null;
	}

	const pathParts = entries.map(entry => relativePathParts(basePath, entry.absolutePath));
	const firstParts = consistentPathParts(pathParts);
	if (!firstParts) {
		return null;
	}

	const variableIndex = variableIndexForTemplate(pathParts, entries);
	if (variableIndex === null) {
		return null;
	}

	const templateParts = [...firstParts];
	templateParts[variableIndex] = "{$name}";
	return `${basePath}/${templateParts.join("/")}`;
}

function printTopicSkill(skill: SkillEntry): void {
	if (skill.hint) {
		printLine(`$${skill.name} - ${skill.hint}`);
		return;
	}

	printLine(`$${skill.name}`);
}

function printPathLine(templatePath: string | null): void {
	if (!templatePath) {
		return;
	}

	printLine(`Path: ${templatePath}`);
}

function skillPathTemplate(section: SectionEntry): string | null {
	return entryPathTemplate(
		section.absolutePath,
		section.skills.map(skill => ({
			absolutePath: skill.absolutePath,
			variableSegment: skill.name,
		})),
	);
}

function sectionDirectoryPath(section: SectionEntry): string {
	return `${section.absolutePath}/`;
}

function printTopicSkillSection(section: SectionEntry, headingLevel: 3 | 4): void {
	printLine(heading(headingLevel, section.key));
	printPathLine(skillPathTemplate(section));
	printLine();

	for (const skill of section.skills) {
		printTopicSkill(skill);
	}
}

function printTopicSkills(sections: SectionEntry[], sectionHeadingLevel: 2 | 3): void {
	printLine(heading(sectionHeadingLevel, "Skills"));

	for (const [index, section] of sections.entries()) {
		printTopicSkillSection(section, sectionHeadingLevel === 2 ? 3 : 4);
		if (index < sections.length - 1) {
			printLine();
		}
	}
}

function printTopicSectionDoc(entry: MarkdownEntry): void {
	const fileName = path.basename(entry.absolutePath);
	const title = entry.title ?? path.basename(entry.absolutePath, path.extname(entry.absolutePath));
	if (title === fileName) {
		printLine(`- ${fileName}`);
		return;
	}

	printLine(`- ${fileName}: ${title}`);
}

function printTopicSection(section: SectionEntry, headingLevel: 3 | 4): void {
	printLine(heading(headingLevel, section.title));
	printPathLine(sectionDirectoryPath(section));

	const summary = normalizeInlineText(section.summary) ?? compactDescription(section.short, null);
	const readWhen = section.readWhen.length > 0 ? `Read when: ${section.readWhen.join("; ")}` : null;
	if (!summary && section.markdownEntries.length === 0 && !readWhen && !section.error) {
		return;
	}

	printLine();
	if (summary) {
		printLine(summary);
	}
	if (readWhen) {
		printLine(readWhen);
	}
	if (section.error) {
		printLine(errorText(section.error));
	}
	if (section.markdownEntries.length > 0) {
		if (summary || readWhen || section.error) {
			printLine();
		}
		for (const entry of section.markdownEntries) {
			printTopicSectionDoc(entry);
		}
	}
}

function printTopicSections(sections: SectionEntry[], options: {
	sectionHeadingLevel: 2 | 3;
	entryHeadingLevel: 3 | 4;
}): void {
	printLine(heading(options.sectionHeadingLevel, "Sections"));
	printLine();

	for (const [index, section] of sections.entries()) {
		printTopicSection(section, options.entryHeadingLevel);
		if (index < sections.length - 1) {
			printLine();
		}
	}
}

function printContributionHeader(contribution: TopicContribution): void {
	printLine(contribution.absolutePath);
	printLine();

	if (contribution.guideBody) {
		printGuideBody(contribution.guideBody);
	}
	if (contribution.readWhen.length > 0) {
		printLine(`Read when: ${contribution.readWhen.join("; ")}`);
	}
	if (contribution.error) {
		printLine(errorText(contribution.error));
	}
}

function printContributionBlocksWithOptions(
	contribution: TopicContribution,
	options: {
		sectionHeadingLevel: 2 | 3;
		entryHeadingLevel: 3 | 4;
	},
): void {
	const skillSections = contribution.sectionEntries.filter(section => section.skills.length > 0);
	const regularSections = contribution.sectionEntries.filter(section =>
		section.skills.length === 0
	);
	const blocks: Array<() => void> = [];

	if (contribution.markdownEntries.length > 0) {
		blocks.push(() => printTopicDocs(contribution.markdownEntries, options));
	}
	if (skillSections.length > 0) {
		blocks.push(() => printTopicSkills(skillSections, options.sectionHeadingLevel));
	}
	if (regularSections.length > 0) {
		blocks.push(() => printTopicSections(regularSections, options));
	}

	for (const [index, block] of blocks.entries()) {
		if (index > 0) {
			printSeparator();
		}
		block();
	}
}

function printTopicContribution(
	contribution: TopicContribution,
	options: {
		sectionHeadingLevel: 2 | 3;
		entryHeadingLevel: 3 | 4;
	},
): void {
	printContributionHeader(contribution);
	if (contribution.guideBody || contribution.readWhen.length > 0 || contribution.error) {
		printLine();
	}
	printContributionBlocksWithOptions(contribution, options);
}

export function printTopicOverview(topic: MergedTopic, options: {
	titleLevel?: 1 | 2;
	titlePrefix?: string;
	sectionHeadingLevel?: 2 | 3;
	entryHeadingLevel?: 3 | 4;
} = {}): void {
	const titleLevel = options.titleLevel ?? 1;
	const titlePrefix = options.titlePrefix ?? "";
	const sectionHeadingLevel = options.sectionHeadingLevel ?? 2;
	const entryHeadingLevel = options.entryHeadingLevel ?? 3;
	printLine(heading(titleLevel, `${titlePrefix}${topic.title}`));

	for (const [index, contribution] of topic.contributions.entries()) {
		if (index > 0) {
			printLine();
		}
		printTopicContribution(contribution, {
			sectionHeadingLevel,
			entryHeadingLevel,
		});
		if (index < topic.contributions.length - 1) {
			printLine();
		}
	}
}
