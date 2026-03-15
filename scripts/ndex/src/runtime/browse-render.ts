import path from "node:path";

import pc from "picocolors";

import browseContracts, {
	type MarkdownEntry,
	type MergedTopic,
	type SectionEntry,
	type SkillEntry,
	type TopicContribution,
	type TopicIndexRow,
} from "./browse-contracts.ts";

const {
	errorText,
	formatContains,
	heading,
	humanizeSlug,
	normalizeInlineText,
	normalizePath,
	printLine,
	referenceNames,
	toDisplayPath,
} = browseContracts;

function printGuideBody(guideBody: string): void {
	for (const line of guideBody.split("\n")) {
		printLine(line);
	}
}

function printMarkdownDetails(entry: MarkdownEntry, level: 3 | 2): void {
	printLine(heading(level, entry.title ?? entry.relativePath));
	printLine(`${pc.dim("path:")} ${pc.dim(entry.absolutePath)}`);

	const summary = normalizeInlineText(entry.summary);
	if (summary) {
		printLine(summary);
	}
	if (entry.readWhen.length > 0) {
		printLine(`${pc.dim("Read when:")} ${entry.readWhen.join("; ")}`);
	}
	if (entry.error) {
		printLine(errorText(entry.error));
	}
}

function printSectionSummary(topicName: string, section: SectionEntry): void {
	printSectionHeader(section);

	const contains = formatContains(section);
	if (contains) {
		printLine(`${pc.dim("contains:")} ${contains}`);
	}

	printLine(`${pc.dim("view:")} ${pc.dim(`ndex ${topicName} ${section.key}`)}`);
}

function printSectionHeader(section: SectionEntry): void {
	printLine(heading(3, section.title));
	printLine(`${pc.dim("path:")} ${pc.dim(section.absolutePath)}`);

	const summary = normalizeInlineText(section.summary);
	if (summary) {
		printLine(summary);
	}
	if (section.error) {
		printLine(errorText(section.error));
	}
	if (section.readWhen.length > 0) {
		printLine(`${pc.dim("Read when:")} ${section.readWhen.join("; ")}`);
	}
}

function printExpandedSection(section: SectionEntry): void {
	printSectionHeader(section);
	printExpandedSectionSkills(section.skills);

	if (section.skills.length > 0 && section.markdownEntries.length > 0) {
		printLine();
	}
	if (section.markdownEntries.length === 0) {
		return;
	}

	printLine(pc.dim("docs:"));
	for (const entry of section.markdownEntries) {
		printLine(`- ${entry.title ?? entry.relativePath}`, 2);
	}
}

function printExpandedSectionSkills(skills: SkillEntry[]): void {
	for (const skill of skills) {
		printSkillHeader(skill);
		for (const name of referenceNames(skill)) {
			printLine(`- ${pc.gray(name)}`, 2);
		}
	}
}

function printSkillSummary(skill: SkillEntry): void {
	printSkillHeader(skill);

	const names = referenceNames(skill);
	if (names.length === 0) {
		return;
	}

	printLine(pc.dim("references:"));
	for (const name of names) {
		printLine(`- ${pc.gray(name)}`, 2);
	}
}

function printExpandedSkill(skill: SkillEntry): void {
	printSkillHeader(skill);
	if (skill.referencePaths.length === 0) {
		return;
	}

	const grouped = new Map<string, string[]>();
	for (const referencePath of skill.referencePaths) {
		const absoluteReferencePath = normalizePath(
			path.resolve(path.dirname(skill.absolutePath), referencePath),
		);
		const directoryPath = toDisplayPath(path.dirname(absoluteReferencePath));
		const fileName = path.basename(absoluteReferencePath);
		const current = grouped.get(directoryPath) ?? [];
		current.push(fileName);
		grouped.set(directoryPath, current);
	}

	for (const [directoryPath, fileNames] of grouped.entries()) {
		printLine(pc.gray(`${directoryPath}/:`));
		for (const fileName of fileNames.sort((a, b) => a.localeCompare(b))) {
			printLine(`- ${pc.gray(fileName)}`, 2);
		}
	}
}

function printSkillHeader(skill: SkillEntry): void {
	printLine(heading(3, skill.title ?? skill.name));
	printLine(`${pc.dim("path:")} ${pc.dim(skill.absolutePath)}`);

	const description = normalizeInlineText(skill.description);
	if (description) {
		printLine(description);
	}
	if (skill.error) {
		printLine(errorText(skill.error));
	}
}

function groupedRootDocs(docs: MarkdownEntry[]): Array<[string, MarkdownEntry[]]> {
	const grouped = new Map<string, MarkdownEntry[]>();
	for (const entry of docs) {
		const directoryPath = normalizePath(path.dirname(entry.absolutePath));
		const existing = grouped.get(directoryPath);
		if (existing) {
			existing.push(entry);
			continue;
		}

		grouped.set(directoryPath, [entry]);
	}

	return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function printRootDocDescription(entry: MarkdownEntry): void {
	if (entry.readWhen.length > 0) {
		for (const readWhen of entry.readWhen) {
			printLine(pc.gray(readWhen), 3);
		}
		return;
	}

	const summary = normalizeInlineText(entry.summary);
	if (summary) {
		printLine(pc.gray(summary), 3);
	}
}

function printRootDocs(docs: MarkdownEntry[]): void {
	if (docs.length === 0) {
		return;
	}

	printLine(heading(2, "Docs"));
	const groups = groupedRootDocs(docs);
	for (const [index, [directoryPath, entries]] of groups.entries()) {
		printLine(pc.white(pc.bold(directoryPath)));
		const sortedEntries = entries.sort((left, right) =>
			left.absolutePath.localeCompare(right.absolutePath)
		);
		for (const [entryIndex, entry] of sortedEntries.entries()) {
			printLine(`- ${path.basename(entry.absolutePath)}`, 1);
			printRootDocDescription(entry);
			if (entry.error) {
				printLine(errorText(entry.error), 3);
			}
			if (entryIndex < sortedEntries.length - 1) {
				printLine();
			}
		}
		if (index < groups.length - 1) {
			printLine();
		}
	}
}

function printTopicsTable(topics: TopicIndexRow[]): void {
	if (topics.length === 0) {
		printLine("- [no topics found]");
		return;
	}

	const topicLabel = "TOPIC";
	const titleLabel = "TITLE";
	const descriptionLabel = "DESCRIPTION";
	const topicWidth = Math.max(topicLabel.length, ...topics.map(topic => topic.name.length));
	const titleWidth = Math.max(titleLabel.length, ...topics.map(topic => topic.title.length));
	printLine(
		pc.bold(
			`${topicLabel.padEnd(topicWidth)}  ${titleLabel.padEnd(titleWidth)}  ${descriptionLabel}`,
		),
	);

	for (const topic of topics) {
		const description = topic.summary ?? pc.gray("-");
		printLine(
			`${topic.name.padEnd(topicWidth)}  ${topic.title.padEnd(titleWidth)}  ${description}`,
		);
	}
}

function printTopicIndex(
	topics: TopicIndexRow[],
	docs: MarkdownEntry[],
	options: { showGlobalTip: boolean; showQueryTip: boolean },
): void {
	printLine("Usage: ndex ls [topic] [section] [--expand] [--global]");
	printLine();
	if (options.showGlobalTip) {
		printLine("> Tip: use `--global` to view global documentation.");
		printLine();
	}
	if (options.showQueryTip) {
		printLine("> Tip: use `ndex query <subject>` to search using vector search");
		printLine();
	}

	printLine(heading(2, "Topics"));
	printTopicsTable(topics);
	if (docs.length === 0) {
		return;
	}

	printLine();
	printRootDocs(docs);
}

function topicExampleSection(topic: MergedTopic): string | null {
	for (const contribution of topic.contributions) {
		const section = contribution.sectionEntries[0];
		if (section) {
			return section.key;
		}
	}
	return null;
}

function printTopicTips(topic: MergedTopic, expand: boolean): void {
	const exampleSection = topicExampleSection(topic);
	if (expand) {
		if (exampleSection) {
			printLine(`Tip: pass a section like \`${exampleSection}\` to focus one section.`);
		}
		return;
	}

	if (exampleSection) {
		printLine(
			`Tip: use \`--expand\` for a full file-level table of contents, or pass a section like \`${exampleSection}\`.`,
		);
		return;
	}

	printLine("Tip: use `--expand` for a full file-level table of contents.");
}

function printContribution(
	topicName: string,
	contribution: TopicContribution,
	expand: boolean,
): void {
	printLine(`${pc.dim("source:")} ${pc.dim(contribution.absolutePath)}`);
	if (contribution.guideBody) {
		printGuideBody(contribution.guideBody);
	}
	if (contribution.error) {
		printLine(errorText(contribution.error));
	}
	if (contribution.readWhen.length > 0) {
		printLine(`${pc.dim("Read when:")} ${contribution.readWhen.join("; ")}`);
	}
	if (
		contribution.markdownEntries.length > 0
		|| contribution.sectionEntries.length > 0
		|| contribution.guideBody
		|| contribution.error
		|| contribution.readWhen.length > 0
	) {
		printLine();
	}

	for (const entry of contribution.markdownEntries) {
		printMarkdownDetails(entry, 3);
		printLine();
	}
	for (const [index, section] of contribution.sectionEntries.entries()) {
		if (expand) {
			printExpandedSection(section);
		}
		if (!expand) {
			printSectionSummary(topicName, section);
		}
		if (index < contribution.sectionEntries.length - 1) {
			printLine();
		}
	}
}

function printTopicView(topic: MergedTopic, expand: boolean): void {
	printLine(heading(1, topic.title));
	printLine();
	printTopicTips(topic, expand);
	printLine();

	for (const [index, contribution] of topic.contributions.entries()) {
		printContribution(topic.name, contribution, expand);
		if (index < topic.contributions.length - 1) {
			printLine();
		}
	}
}

function sharedSectionTitle(sectionKey: string, sections: SectionEntry[]): string {
	return sections.find(section => section.title.trim().length > 0)?.title
		?? humanizeSlug(path.basename(sectionKey));
}

function printFocusedSectionBody(section: SectionEntry, expand: boolean): void {
	printLine(`${pc.dim("source:")} ${pc.dim(section.absolutePath)}`);
	printGuideSectionMetadata(section.guideBody, section.error, section.readWhen);

	for (const [index, skill] of section.skills.entries()) {
		if (expand) {
			printExpandedSkill(skill);
		}
		if (!expand) {
			printSkillSummary(skill);
		}
		if (index < section.skills.length - 1) {
			printLine();
		}
	}
	if (section.skills.length > 0 && section.markdownEntries.length > 0) {
		printLine();
	}

	for (const [index, entry] of section.markdownEntries.entries()) {
		printMarkdownDetails(entry, 3);
		if (index < section.markdownEntries.length - 1) {
			printLine();
		}
	}
	if (section.markdownEntries.length === 0 && section.skills.length === 0) {
		printLine(pc.dim("[no section entries found]"));
	}
}

function printGuideSectionMetadata(
	guideBody: string | null,
	error: string | undefined,
	readWhen: string[],
): void {
	if (guideBody) {
		printGuideBody(guideBody);
	}
	if (error) {
		printLine(errorText(error));
	}
	if (readWhen.length > 0) {
		printLine(`${pc.dim("Read when:")} ${readWhen.join("; ")}`);
	}
	if (guideBody || error || readWhen.length > 0) {
		printLine();
	}
}

function printFocusedSection(
	topic: MergedTopic,
	sectionView: { key: string; sections: SectionEntry[] },
	expand: boolean,
): void {
	printLine(heading(1, topic.title));
	printLine(heading(2, sharedSectionTitle(sectionView.key, sectionView.sections)));
	printLine();
	printLine(
		`Tip: use \`ndex ${topic.name} ${sectionView.key} --expand\` for nested reference files.`,
	);
	printLine();

	for (const [index, section] of sectionView.sections.entries()) {
		printFocusedSectionBody(section, expand);
		if (index < sectionView.sections.length - 1) {
			printLine();
		}
	}
}

function availableSectionKeys(topic: MergedTopic): string[] {
	const keys = new Set<string>();
	for (const contribution of topic.contributions) {
		for (const section of contribution.sectionEntries) {
			keys.add(section.key);
		}
	}

	return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

export default {
	availableSectionKeys,
	printFocusedSection,
	printTopicIndex,
	printTopicView,
};
