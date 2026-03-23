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

const ROOT_OVERVIEW_DEPTH = 2;

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

function clampedHeading(level: number): 1 | 2 | 3 | 4 | 5 | 6 {
	return Math.max(1, Math.min(6, level)) as 1 | 2 | 3 | 4 | 5 | 6;
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

function printTopicDoc(entry: MarkdownEntry, headingLevel: 3 | 4 | 5 | 6): void {
	printLine(
		heading(
			headingLevel,
			entry.title ?? path.basename(entry.absolutePath, path.extname(entry.absolutePath)),
		),
	);
	printLine(entry.absolutePath);
	printTopicDocMetadata(entry);
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

function printPathLine(value: string | null): void {
	if (!value) {
		return;
	}

	printLine(`Path: ${value}`);
}

function printNodeMetadata(node: Pick<
	SectionEntry,
	"summary" | "short" | "readWhen" | "error"
>): boolean {
	const summary = normalizeInlineText(node.summary) ?? compactDescription(node.short, null);
	const readWhen = node.readWhen.length > 0 ? `Read when: ${node.readWhen.join("; ")}` : null;
	if (!summary && !readWhen && !node.error) {
		return false;
	}

	printLine();
	if (summary) {
		printLine(summary);
	}
	if (readWhen) {
		printLine(readWhen);
	}
	if (node.error) {
		printLine(errorText(node.error));
	}
	return true;
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

function sectionHasSkillContent(section: SectionEntry): boolean {
	if (section.skills.length > 0) {
		return true;
	}

	return section.children.some(child => sectionHasSkillContent(child));
}

function collectOverviewSkills(section: SectionEntry): SkillEntry[] {
	const skills = [...section.skills];
	for (const child of section.children) {
		skills.push(...collectOverviewSkills(child));
	}

	return skills.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function skillPathTemplate(section: SectionEntry, skills: SkillEntry[]): string | null {
	return entryPathTemplate(
		section.absolutePath,
		skills.map(skill => ({
			absolutePath: skill.absolutePath,
			variableSegment: skill.name,
		})),
	);
}

function sectionDirectoryPath(section: SectionEntry): string {
	return `${section.absolutePath}/`;
}

function printTopicSkillSection(section: SectionEntry, headingLevel: 3 | 4 | 5 | 6): void {
	const skills = collectOverviewSkills(section);
	if (skills.length === 0) {
		return;
	}

	printLine(heading(headingLevel, section.key));
	const pathLine = section.skills.length > 0 ? skillPathTemplate(section, skills) : sectionDirectoryPath(section);
	printPathLine(pathLine);
	const printedMetadata = printNodeMetadata(section);
	if (printedMetadata || skills.length > 0) {
		printLine();
	}

	for (const skill of skills) {
		printTopicSkill(skill);
	}
}

function printTopicSkills(
	sections: SectionEntry[],
	options: {
		sectionHeadingLevel: 2 | 3 | 4 | 5 | 6;
		entryHeadingLevel: 3 | 4 | 5 | 6;
	},
): void {
	printLine(heading(options.sectionHeadingLevel, "Skills"));
	printLine();

	for (const [index, section] of sections.entries()) {
		printTopicSkillSection(section, options.entryHeadingLevel);
		if (index < sections.length - 1) {
			printLine();
		}
	}
}

function printTopicDocGroup(
	section: SectionEntry,
	headingLevel: 3 | 4 | 5 | 6,
	depth: number,
	maxDepth: number,
): void {
	printLine(heading(headingLevel, section.title));
	printPathLine(sectionDirectoryPath(section));
	const printedMetadata = printNodeMetadata(section);
	const docChildren = section.children.filter(child => !sectionHasSkillContent(child));

	if (section.markdownEntries.length > 0) {
		printLine();
		for (const entry of section.markdownEntries) {
			printTopicSectionDoc(entry);
		}
	}

	if (depth >= maxDepth || docChildren.length === 0) {
		return;
	}

	if (printedMetadata || section.markdownEntries.length > 0) {
		printLine();
	}

	for (const [index, child] of docChildren.entries()) {
		printTopicDocGroup(child, clampedHeading(headingLevel + 1), depth + 1, maxDepth);
		if (index < docChildren.length - 1) {
			printLine();
		}
	}
}

function printTopicDocs(
	rootDocs: MarkdownEntry[],
	sections: SectionEntry[],
	options: {
		sectionHeadingLevel: 2 | 3 | 4 | 5 | 6;
		entryHeadingLevel: 3 | 4 | 5 | 6;
		maxDepth: number;
	},
): void {
	printLine(heading(options.sectionHeadingLevel, "Docs"));
	printLine();

	let printedAny = false;

	if (rootDocs.length === 1 && sections.length === 0) {
		const [entry] = rootDocs;
		if (entry) {
			printLine(entry.absolutePath);
			printTopicDocMetadata(entry);
			printedAny = true;
		}
	} else if (rootDocs.length > 0) {
		for (const [index, entry] of rootDocs.entries()) {
			printTopicDoc(entry, options.entryHeadingLevel);
			if (index < rootDocs.length - 1) {
				printSeparator();
			}
		}
		printedAny = true;
	}

	if (sections.length > 0) {
		if (printedAny) {
			printSeparator();
		}

		for (const [index, section] of sections.entries()) {
			printTopicDocGroup(section, options.entryHeadingLevel, 1, options.maxDepth);
			if (index < sections.length - 1) {
				printLine();
			}
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
		sectionHeadingLevel: 2 | 3 | 4 | 5 | 6;
		entryHeadingLevel: 3 | 4 | 5 | 6;
		maxDepth: number;
	},
): void {
	const docsSections = contribution.sectionEntries.filter(section => !sectionHasSkillContent(section));
	const skillSections = contribution.sectionEntries.filter(section => sectionHasSkillContent(section));
	const blocks: Array<() => void> = [];

	if (contribution.markdownEntries.length > 0 || docsSections.length > 0) {
		blocks.push(() => printTopicDocs(contribution.markdownEntries, docsSections, options));
	}
	if (skillSections.length > 0) {
		blocks.push(() => printTopicSkills(skillSections, options));
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
		sectionHeadingLevel: 2 | 3 | 4 | 5 | 6;
		entryHeadingLevel: 3 | 4 | 5 | 6;
		maxDepth: number;
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
	maxDepth?: number;
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
			maxDepth: options.maxDepth ?? ROOT_OVERVIEW_DEPTH,
		});
		if (index < topic.contributions.length - 1) {
			printLine();
		}
	}
}
