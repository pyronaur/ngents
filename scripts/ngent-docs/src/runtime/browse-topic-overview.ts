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
} = browseContracts;

const ROOT_OVERVIEW_DEPTH = 2;

type DocsBucket = {
	directoryPath: string;
	entries: MarkdownEntry[];
};

function printGuideBody(guideBody: string): void {
	for (const line of guideBody.split("\n")) {
		printLine(line);
	}
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

function relativePathParts(basePath: string, absolutePath: string): string[] {
	return absolutePath.slice(`${basePath}/`.length).split("/").filter(Boolean);
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

function printNodeMetadata(
	node: Pick<
		SectionEntry,
		"summary" | "short" | "readWhen" | "error"
	>,
): boolean {
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

function hasContributionGuideContent(contribution: TopicContribution): boolean {
	return Boolean(contribution.guideBody || contribution.error || contribution.readWhen.length > 0);
}

function printContributionGuideContent(contribution: TopicContribution): void {
	if (contribution.guideBody) {
		printGuideBody(contribution.guideBody);
	}
	if (contribution.error) {
		printLine(errorText(contribution.error));
	}
	if (contribution.readWhen.length > 0) {
		printLine(`Read when: ${contribution.readWhen.join("; ")}`);
	}
}

function printMergedGuidePreamble(contributions: TopicContribution[]): boolean {
	const guidedContributions = contributions.filter(hasContributionGuideContent);
	if (guidedContributions.length === 0) {
		return false;
	}

	for (const [index, contribution] of guidedContributions.entries()) {
		if (index > 0) {
			printLine();
		}
		printContributionGuideContent(contribution);
	}

	return true;
}

function docBucketLine(entry: MarkdownEntry): string {
	const fileName = path.basename(entry.absolutePath);
	const description = compactDescription(entry.short, entry.summary);
	if (description) {
		return `- ${fileName} - ${description}`;
	}

	const title = entry.title ?? path.basename(entry.absolutePath, path.extname(entry.absolutePath));
	if (title !== fileName) {
		return `- ${fileName}: ${title}`;
	}

	return `- ${fileName}`;
}

function appendDocsBuckets(
	buckets: DocsBucket[],
	section: SectionEntry,
	options: { depth: number; maxDepth: number },
): void {
	if (sectionHasSkillContent(section)) {
		return;
	}

	if (section.markdownEntries.length > 0) {
		buckets.push({
			directoryPath: section.absolutePath,
			entries: section.markdownEntries,
		});
	}

	if (options.depth >= options.maxDepth) {
		return;
	}

	for (const child of section.children) {
		appendDocsBuckets(buckets, child, {
			depth: options.depth + 1,
			maxDepth: options.maxDepth,
		});
	}
}

function collectDocsBuckets(
	contributions: TopicContribution[],
	maxDepth: number,
): DocsBucket[] {
	const buckets: DocsBucket[] = [];

	for (const contribution of contributions) {
		if (contribution.markdownEntries.length > 0) {
			buckets.push({
				directoryPath: contribution.absolutePath,
				entries: contribution.markdownEntries,
			});
		}

		for (const section of contribution.sectionEntries) {
			appendDocsBuckets(buckets, section, { depth: 1, maxDepth });
		}
	}

	return buckets;
}

function printDocsBuckets(
	buckets: DocsBucket[],
	options: {
		sectionHeadingLevel: 2 | 3 | 4 | 5 | 6;
		bucketHeadingLevel: 3 | 4 | 5 | 6;
	},
): void {
	printLine(heading(options.sectionHeadingLevel, "Docs"));
	printLine();

	for (const [bucketIndex, bucket] of buckets.entries()) {
		printLine(heading(options.bucketHeadingLevel, bucket.directoryPath));
		for (const entry of bucket.entries) {
			printLine(docBucketLine(entry));
		}
		if (bucketIndex < buckets.length - 1) {
			printLine();
		}
	}
}

function printTopicSkillSection(section: SectionEntry, headingLevel: 3 | 4 | 5 | 6): void {
	const skills = collectOverviewSkills(section);
	if (skills.length === 0) {
		return;
	}

	printLine(heading(headingLevel, section.key));
	const pathLine = section.skills.length > 0
		? skillPathTemplate(section, skills)
		: sectionDirectoryPath(section);
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

function collectSkillSections(contributions: TopicContribution[]): SectionEntry[] {
	const sections: SectionEntry[] = [];

	for (const contribution of contributions) {
		for (const section of contribution.sectionEntries) {
			if (sectionHasSkillContent(section)) {
				sections.push(section);
			}
		}
	}

	return sections;
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
	const maxDepth = options.maxDepth ?? ROOT_OVERVIEW_DEPTH;
	const docsBuckets = collectDocsBuckets(topic.contributions, maxDepth);
	const skillSections = collectSkillSections(topic.contributions);
	const printedGuide = printMergedGuidePreamble(topic.contributions);

	if (printedGuide) {
		printLine();
	}

	printLine(heading(titleLevel, `${titlePrefix}${topic.title}`));

	if (docsBuckets.length === 0 && skillSections.length === 0) {
		return;
	}

	printLine();

	if (docsBuckets.length > 0) {
		printDocsBuckets(docsBuckets, {
			sectionHeadingLevel,
			bucketHeadingLevel: entryHeadingLevel,
		});
	}

	if (docsBuckets.length > 0 && skillSections.length > 0) {
		printLine();
	}

	if (skillSections.length > 0) {
		printTopicSkills(skillSections, {
			sectionHeadingLevel,
			entryHeadingLevel,
		});
	}
}
