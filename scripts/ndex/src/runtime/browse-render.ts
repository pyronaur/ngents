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
	compactDescription,
	errorText,
	formatContains,
	heading,
	humanizeSlug,
	normalizeInlineText,
	normalizePath,
	printLine,
	referenceNames,
} = browseContracts;

function printGuideBody(guideBody: string): void {
	for (const line of guideBody.split("\n")) {
		printLine(line);
	}
}

function printTopicDescription(row: TopicIndexRow): string {
	return compactDescription(row.short, row.summary) ?? pc.gray("-");
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
		printLine(
			`${topic.name.padEnd(topicWidth)}  ${topic.title.padEnd(titleWidth)}  ${
				printTopicDescription(topic)
			}`,
		);
	}
}

function groupedDocs(docs: MarkdownEntry[]): Array<[string, MarkdownEntry[]]> {
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

	return Array.from(grouped.entries()).sort((left, right) => left[0].localeCompare(right[0]));
}

function printCompactDocEntry(entry: MarkdownEntry): void {
	const description = compactDescription(entry.short, entry.summary);
	if (!description) {
		printLine(path.basename(entry.absolutePath), 2);
		return;
	}

	printLine(`${path.basename(entry.absolutePath)} - ${description}`, 2);
}

function printCompactDocsIndex(docs: MarkdownEntry[]): void {
	if (docs.length === 0) {
		return;
	}

	printLine(heading(2, "Docs"));
	printLine("ndex ls [where]");
	printLine("ndex ls . - Project docs, expanded descriptions");
	printLine("ndex ls docs/subdir - Project docs in dir");
	printLine("ndex ls global - Global docs, expanded descriptions");
	printLine();

	for (const [index, [directoryPath, entries]] of groupedDocs(docs).entries()) {
		printLine(directoryPath);
		for (
			const entry of entries.sort((left, right) =>
				left.absolutePath.localeCompare(right.absolutePath)
			)
		) {
			printCompactDocEntry(entry);
		}
		if (index < groupedDocs(docs).length - 1) {
			printLine();
		}
	}
}

function printExpandedDocDescription(entry: MarkdownEntry): void {
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

function printExpandedDocsIndex(docs: MarkdownEntry[]): void {
	printLine("Usage: ndex ls [where]");
	printLine();
	printLine(heading(2, "Docs"));
	if (docs.length === 0) {
		printLine("- [no docs found]");
		return;
	}

	for (const [groupIndex, [directoryPath, entries]] of groupedDocs(docs).entries()) {
		printLine(pc.white(pc.bold(directoryPath)));
		for (
			const [entryIndex, entry] of entries
				.sort((left, right) => left.absolutePath.localeCompare(right.absolutePath))
				.entries()
		) {
			printLine(`- ${path.basename(entry.absolutePath)}`, 1);
			printExpandedDocDescription(entry);
			if (entry.error) {
				printLine(errorText(entry.error), 3);
			}
			if (entryIndex < entries.length - 1) {
				printLine();
			}
		}
		if (groupIndex < groupedDocs(docs).length - 1) {
			printLine();
		}
	}
}

function printRootHelpHeader(): void {
	printLine("Usage: ndex [options] [command]");
	printLine();
	printLine(heading(1, "Agent Doc Utils"));
	printLine();
	printLine(heading(2, "Query"));
	printLine("ndex query [options] [terms...]");
	printLine();
	printLine("Use this to search through global docs and topics with semantic search fast.");
	printLine("Returns matches optimized for quick context gathering with cat/sed followups.");
	printLine();
}

function printRootTopicSection(topics: TopicIndexRow[]): void {
	printLine(heading(2, "Topics"));
	printLine("ndex topic [topic] [section]");
	printLine();
	printLine("Topics contain specialized docs, available anywhere.");
	printLine("ndex topic foo - view foo about/index first");
	printLine("ndex topic foo bar - learn about bar section");
	printLine();
	printTopicsTable(topics);
}

function printRootHelp(
	topics: TopicIndexRow[],
	docs: MarkdownEntry[],
	options: { includeDocsIndex: boolean },
): void {
	printRootHelpHeader();
	printRootTopicSection(topics);
	if (!options.includeDocsIndex) {
		return;
	}

	printLine();
	printCompactDocsIndex(docs);
}

function printTopicBrowser(topics: TopicIndexRow[]): void {
	printLine("Usage: ndex topic [topic] [section]");
	printLine();
	printLine(heading(2, "Topics"));
	printLine("ndex topic foo - view foo about/index first");
	printLine("ndex topic foo bar - learn about bar section");
	printLine();
	printTopicsTable(topics);
}

function printMarkdownDetails(entry: MarkdownEntry, level: 3 | 2): void {
	printLine(heading(level, entry.title ?? entry.relativePath));
	printLine(`${pc.dim("path:")} ${pc.dim(entry.absolutePath)}`);

	const summary = normalizeInlineText(entry.summary) ?? compactDescription(entry.short, null);
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

function printSectionHeader(section: SectionEntry): void {
	printLine(heading(3, section.title));
	printLine(`${pc.dim("path:")} ${pc.dim(section.absolutePath)}`);

	const summary = normalizeInlineText(section.summary) ?? compactDescription(section.short, null);
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

function printSectionSummary(topicName: string, section: SectionEntry): void {
	printSectionHeader(section);

	const contains = formatContains(section);
	if (contains) {
		printLine(`${pc.dim("contains:")} ${contains}`);
	}

	printLine(`${pc.dim("view:")} ${pc.dim(`ndex topic ${topicName} ${section.key}`)}`);
}

function printContribution(topicName: string, contribution: TopicContribution): void {
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
		printSectionSummary(topicName, section);
		if (index < contribution.sectionEntries.length - 1) {
			printLine();
		}
	}
}

function printTopicView(topic: MergedTopic): void {
	printLine(heading(1, topic.title));
	printLine();
	printLine(`Tip: use \`ndex topic ${topic.name} <section>\` to focus one section.`);
	printLine();

	for (const [index, contribution] of topic.contributions.entries()) {
		printContribution(topic.name, contribution);
		if (index < topic.contributions.length - 1) {
			printLine();
		}
	}
}

function sharedSectionTitle(sectionKey: string, sections: SectionEntry[]): string {
	return sections.find(section => section.title.trim().length > 0)?.title
		?? humanizeSlug(path.basename(sectionKey));
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

function printFocusedSectionBody(section: SectionEntry): void {
	printLine(`${pc.dim("source:")} ${pc.dim(section.absolutePath)}`);
	printGuideSectionMetadata(section.guideBody, section.error, section.readWhen);

	for (const [index, skill] of section.skills.entries()) {
		printSkillSummary(skill);
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

function printFocusedSection(
	topic: MergedTopic,
	sectionView: { key: string; sections: SectionEntry[] },
): void {
	printLine(heading(1, topic.title));
	printLine(heading(2, sharedSectionTitle(sectionView.key, sectionView.sections)));
	printLine();

	for (const [index, section] of sectionView.sections.entries()) {
		printFocusedSectionBody(section);
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

	return Array.from(keys).sort((left, right) => left.localeCompare(right));
}

function printDocsBrowser(docs: MarkdownEntry[]): void {
	printExpandedDocsIndex(docs);
}

export default {
	availableSectionKeys,
	printDocsBrowser,
	printFocusedSection,
	printRootHelp,
	printTopicBrowser,
	printTopicView,
};
