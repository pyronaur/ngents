import path from "node:path";

import type {
	MarkdownEntry,
	MergedTopic,
	SectionEntry,
	SkillEntry,
	TopicContribution,
} from "./browse-contracts.ts";
import browseContracts from "./browse-contracts.ts";
import commandTemplate, {
	type TopicTemplateDocsBucket,
	type TopicTemplateGuideBlock,
	type TopicTemplateOverviewContext,
	type TopicTemplateSkillSection,
} from "./command-template.ts";

const {
	compactDescription,
	directoryDisplayPath,
	errorText,
	heading,
	normalizeInlineText,
} = browseContracts;

const ROOT_OVERVIEW_DEPTH = 2;

type DocsBucket = {
	directoryPath: string;
	entries: MarkdownEntry[];
};

type TopicOverviewOptions = {
	titleLevel?: 1 | 2;
	titlePrefix?: string;
	sectionHeadingLevel?: 2 | 3;
	entryHeadingLevel?: 3 | 4;
	maxDepth?: number;
};

function printTopicSkillLine(skill: SkillEntry): string {
	if (skill.hint) {
		return `$${skill.name} - ${skill.hint}`;
	}

	return `$${skill.name}`;
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

function metadataLines(
	node: Pick<SectionEntry, "summary" | "short" | "readWhen" | "error">,
): string[] {
	const lines: string[] = [];
	const summary = normalizeInlineText(node.summary) ?? compactDescription(node.short, null);
	const readWhen = node.readWhen.length > 0 ? `Read when: ${node.readWhen.join("; ")}` : null;
	if (summary) {
		lines.push(summary);
	}
	if (readWhen) {
		lines.push(readWhen);
	}
	if (node.error) {
		lines.push(errorText(node.error));
	}
	return lines;
}

function hasContributionGuideContent(contribution: TopicContribution): boolean {
	return Boolean(contribution.guideBody || contribution.error || contribution.readWhen.length > 0);
}

function guideBlockLines(contribution: TopicContribution): string[] {
	const lines: string[] = [];
	if (contribution.guideBody) {
		lines.push(...contribution.guideBody.split("\n"));
	}
	if (contribution.error) {
		lines.push(errorText(contribution.error));
	}
	if (contribution.readWhen.length > 0) {
		lines.push(`Read when: ${contribution.readWhen.join("; ")}`);
	}
	return lines;
}

function createGuideBlocks(contributions: TopicContribution[]): TopicTemplateGuideBlock[] {
	return contributions
		.filter(hasContributionGuideContent)
		.map(contribution => ({
			lines: guideBlockLines(contribution),
		}));
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

function createDocsBuckets(
	contributions: TopicContribution[],
	maxDepth: number,
	bucketHeadingLevel: 3 | 4 | 5 | 6,
): TopicTemplateDocsBucket[] {
	return collectDocsBuckets(contributions, maxDepth).map(bucket => ({
		entry_lines: bucket.entries.map(entry => docBucketLine(entry)),
		heading_line: heading(bucketHeadingLevel, directoryDisplayPath(bucket.directoryPath)),
	}));
}

function createSkillSection(
	section: SectionEntry,
	headingLevel: 3 | 4 | 5 | 6,
): TopicTemplateSkillSection | null {
	const skills = collectOverviewSkills(section);
	if (skills.length === 0) {
		return null;
	}

	const pathLine = skillPathTemplate(section, skills) ?? sectionDirectoryPath(section);
	const metadata = metadataLines(section);
	const lines = [heading(headingLevel, section.key)];
	if (pathLine) {
		lines.push(`Path: ${pathLine}`);
	}
	if (metadata.length > 0 || skills.length > 0) {
		lines.push("");
	}
	lines.push(...metadata);
	if (metadata.length > 0 && skills.length > 0) {
		lines.push("");
	}
	lines.push(...skills.map(skill => printTopicSkillLine(skill)));
	return {
		text: lines.join("\n"),
	};
}

function createSkillSections(
	contributions: TopicContribution[],
	entryHeadingLevel: 3 | 4 | 5 | 6,
): TopicTemplateSkillSection[] {
	const sections: TopicTemplateSkillSection[] = [];

	for (const contribution of contributions) {
		for (const section of contribution.sectionEntries) {
			if (!sectionHasSkillContent(section)) {
				continue;
			}

			const skillSection = createSkillSection(section, entryHeadingLevel);
			if (skillSection) {
				sections.push(skillSection);
			}
		}
	}

	return sections;
}

export function createTopicOverviewContext(
	topic: MergedTopic,
	options: TopicOverviewOptions = {},
): TopicTemplateOverviewContext {
	const titleLevel = options.titleLevel ?? 1;
	const titlePrefix = options.titlePrefix ?? "";
	const sectionHeadingLevel = options.sectionHeadingLevel ?? 2;
	const entryHeadingLevel = options.entryHeadingLevel ?? 3;
	const maxDepth = options.maxDepth ?? ROOT_OVERVIEW_DEPTH;

	return {
		docs_buckets: createDocsBuckets(topic.contributions, maxDepth, entryHeadingLevel),
		docs_heading_line: heading(sectionHeadingLevel, "Docs"),
		guide_blocks: createGuideBlocks(topic.contributions),
		skill_sections: createSkillSections(topic.contributions, entryHeadingLevel),
		skills_heading_line: heading(sectionHeadingLevel, "Skills"),
		title_line: heading(titleLevel, `${titlePrefix}${topic.title}`),
		view: "overview",
	};
}

export function renderTopicOverview(
	topic: MergedTopic,
	options: TopicOverviewOptions = {},
): string {
	return commandTemplate.renderTopicTemplate(createTopicOverviewContext(topic, options));
}

export default {
	createTopicOverviewContext,
	renderTopicOverview,
};
