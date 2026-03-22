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

function skillCountLabel(count: number): string {
	return `${count} ${count === 1 ? "skill" : "skills"}`;
}

function printTopicSkill(skill: SkillEntry): void {
	if (skill.hint) {
		printLine(`- ${skill.name}: ${skill.hint}`);
		return;
	}

	printLine(`- ${skill.name}`);
}

function sectionPath(section: SectionEntry): string {
	return section.absolutePath.endsWith("/") ? section.absolutePath : `${section.absolutePath}/`;
}

function printTopicSkillSection(section: SectionEntry, headingLevel: 3 | 4): void {
	printLine(heading(headingLevel, `${section.key} - ${skillCountLabel(section.skills.length)}`));
	printLine(sectionPath(section));
	printLine();

	for (const skill of section.skills) {
		printTopicSkill(skill);
	}
}

function printTopicSkills(sections: SectionEntry[], sectionHeadingLevel: 2 | 3): void {
	printLine(heading(sectionHeadingLevel, "Skills"));
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
			printLine(
				`- ${entry.title ?? path.basename(entry.absolutePath, path.extname(entry.absolutePath))}`,
			);
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
