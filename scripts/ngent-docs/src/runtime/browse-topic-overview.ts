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
	formatContains,
	heading,
	normalizeInlineText,
	printLine,
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

function printTopicDoc(entry: MarkdownEntry, headingLevel: 3 | 4): void {
	printLine(
		heading(
			headingLevel,
			entry.title ?? path.basename(entry.absolutePath, path.extname(entry.absolutePath)),
		),
	);
	printLine(entry.absolutePath);

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

function printTopicDocs(entries: MarkdownEntry[], options: {
	sectionHeadingLevel: 2 | 3;
	entryHeadingLevel: 3 | 4;
}): void {
	printLine(heading(options.sectionHeadingLevel, "Docs"));
	printLine();

	for (const [index, entry] of entries.entries()) {
		printTopicDoc(entry, options.entryHeadingLevel);
		if (index < entries.length - 1) {
			printSeparator();
		}
	}
}

function skillCountLabel(count: number): string {
	return `${count} ${count === 1 ? "skill" : "skills"}`;
}

function referenceCountLabel(count: number): string {
	return `${count} ${count === 1 ? "reference file" : "reference files"}`;
}

function printReferenceCount(count: number): void {
	if (count === 0) {
		return;
	}

	printLine(`contains: ${referenceCountLabel(count)}`);
}

function printTopicSkill(skill: SkillEntry): void {
	printLine(`#### ${skill.name}`);
	printLine(skill.absolutePath);
	printReferenceCount(skill.referencePaths.length);
}

function rootSkillForSection(section: SectionEntry): SkillEntry | null {
	if (section.skills.length !== 1) {
		return null;
	}

	const [skill] = section.skills;
	if (!skill) {
		return null;
	}

	return skill.relativePath === `${section.key}/SKILL.md` ? skill : null;
}

function sectionPath(section: SectionEntry): string {
	return section.absolutePath.endsWith("/") ? section.absolutePath : `${section.absolutePath}/`;
}

function printTopicRootSkill(section: SectionEntry, skill: SkillEntry): void {
	printLine(heading(3, section.key));
	printLine(skill.absolutePath);
	printReferenceCount(skill.referencePaths.length);
}

function printTopicSkillSection(section: SectionEntry, headingLevel: 3 | 4): void {
	const rootSkill = rootSkillForSection(section);
	if (rootSkill) {
		if (headingLevel === 3) {
			printTopicRootSkill(section, rootSkill);
			return;
		}

		printLine(heading(4, section.key));
		printLine(rootSkill.absolutePath);
		printReferenceCount(rootSkill.referencePaths.length);
		return;
	}

	printLine(heading(headingLevel, `${section.key} - ${skillCountLabel(section.skills.length)}`));
	printLine(sectionPath(section));
	printLine();

	for (const [index, skill] of section.skills.entries()) {
		printTopicSkill(skill);
		if (index < section.skills.length - 1) {
			printLine();
		}
	}
}

function printTopicSkills(sections: SectionEntry[], sectionHeadingLevel: 2 | 3): void {
	printLine(heading(sectionHeadingLevel, "Skills"));
	printLine();
	printLine(`Expand skill information in this topic with: \`docs topic <topic> <section|glob>\``);
	printLine(`For example: \`docs topic foo bar/lux*\``);
	printLine();

	for (const [index, section] of sections.entries()) {
		printTopicSkillSection(section, sectionHeadingLevel === 2 ? 3 : 4);
		if (index < sections.length - 1) {
			printLine();
		}
	}
}

function printTopicSection(section: SectionEntry, headingLevel: 3 | 4): void {
	printLine(heading(headingLevel, section.title));
	printLine(section.absolutePath);

	const summary = normalizeInlineText(section.summary) ?? compactDescription(section.short, null);
	const contains = formatContains(section);
	const readWhen = section.readWhen.length > 0 ? `Read when: ${section.readWhen.join("; ")}` : null;
	if (!summary && !contains && !readWhen && !section.error) {
		return;
	}

	printLine();
	if (summary) {
		printLine(summary);
	}
	if (contains) {
		printLine(`contains: ${contains}`);
	}
	if (readWhen) {
		printLine(readWhen);
	}
	if (section.error) {
		printLine(errorText(section.error));
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
		printSeparator();
		block();
		if (index < blocks.length - 1) {
			continue;
		}
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
