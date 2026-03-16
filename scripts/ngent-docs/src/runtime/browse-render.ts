import path from "node:path";

import pc from "picocolors";

import browseContracts, {
	type MarkdownEntry,
	type MergedTopic,
	type SectionEntry,
	type TopicIndexRow,
} from "./browse-contracts.ts";
import {
	isCompactFocusedSkillSection,
	printCompactFocusedSkillSection,
	printFocusedSkillsBlock,
} from "./browse-focused-skills.ts";
import { printTopicOverview } from "./browse-topic-overview.ts";
import rootHelpTemplate, {
	type RootHelpDocsGroup,
	type RootHelpTemplateContext,
} from "./root-help-template.ts";

const {
	compactDescription,
	errorText,
	heading,
	normalizeInlineText,
	normalizePath,
	printLine,
} = browseContracts;

function printGuideBody(guideBody: string): void {
	for (const line of guideBody.split("\n")) {
		printLine(line);
	}
}

function renderBlock(
	renderLines: (pushLine: (text?: string, indent?: number) => void) => void,
): string {
	const lines: string[] = [];
	renderLines((text = "", indent = 0) => {
		lines.push(`${" ".repeat(indent)}${text}`);
	});
	return lines.join("\n");
}

function printTopicDescription(
	row: Pick<TopicIndexRow, "short" | "summary">,
): string {
	return compactDescription(row.short, row.summary) ?? pc.gray("-");
}

function topicColumnWidths(topics: TopicIndexRow[]): { titleWidth: number; topicWidth: number } {
	return {
		topicWidth: Math.max("TOPIC".length, ...topics.map(topic => topic.name.length)),
		titleWidth: Math.max("TITLE".length, ...topics.map(topic => topic.title.length)),
	};
}

function renderTopicsTable(topics: TopicIndexRow[]): string {
	return renderBlock(pushLine => {
		if (topics.length === 0) {
			pushLine("- [no topics found]");
			return;
		}

		const widths = topicColumnWidths(topics);
		pushLine(renderTopicTableHeader(topics));

		for (const topic of topics) {
			pushLine(renderTopicTableRow(topic, widths));
		}
	});
}

function renderTopicTableHeader(topics: TopicIndexRow[]): string {
	const { titleWidth, topicWidth } = topicColumnWidths(topics);
	return pc.bold(`${"TOPIC".padEnd(topicWidth)}  ${"TITLE".padEnd(titleWidth)}  DESCRIPTION`);
}

function renderTopicTableRow(
	topic: Pick<TopicIndexRow, "name" | "title" | "short" | "summary">,
	widths: { titleWidth: number; topicWidth: number },
): string {
	return `${topic.name.padEnd(widths.topicWidth)}  ${topic.title.padEnd(widths.titleWidth)}  ${
		printTopicDescription(topic)
	}`;
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

function rootHelpTopicLines(topics: TopicIndexRow[]): string[] {
	const widths = topicColumnWidths(topics);
	return topics.map(topic => renderTopicTableRow(topic, widths));
}

function rootHelpDocsEntryLines(entries: MarkdownEntry[]): string[] {
	return entries
		.sort((left, right) => left.absolutePath.localeCompare(right.absolutePath))
		.map(entry => {
			const description = compactDescription(entry.short, entry.summary);
			const fileName = path.basename(entry.absolutePath);
			if (description === null) {
				return `  ${fileName}`;
			}

			return `  ${fileName} - ${description}`;
		});
}

function rootHelpDocsGroups(docs: MarkdownEntry[]): RootHelpDocsGroup[] {
	return groupedDocs(docs).map(([directoryPath, entries]) => ({
		directory_path: directoryPath,
		entry_lines: rootHelpDocsEntryLines(entries),
	}));
}

function rootHelpTemplateContext(
	topics: TopicIndexRow[],
	docs: MarkdownEntry[],
	options: { includeDocsIndex: boolean },
): RootHelpTemplateContext {
	const docsGroups = rootHelpDocsGroups(docs);
	return {
		docs_groups: docsGroups,
		show_docs_index: options.includeDocsIndex && docsGroups.length > 0,
		topic_lines: rootHelpTopicLines(topics),
		topics_header: renderTopicTableHeader(topics),
	};
}

function formatRootHelpLine(line: string): string {
	if (!line.startsWith("#")) {
		return line;
	}

	const headingMatch = /^(#{1,3}) (.+)$/.exec(line);
	if (!headingMatch) {
		return line;
	}

	const hashes = headingMatch[1];
	const text = headingMatch[2];
	if (hashes === undefined || text === undefined) {
		return line;
	}
	if (hashes.length === 1) {
		return heading(1, text);
	}
	if (hashes.length === 2) {
		return heading(2, text);
	}
	if (hashes.length === 3) {
		return heading(3, text);
	}

	return line;
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
	printLine("Usage: docs ls [where]");
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

function printRootHelp(
	topics: TopicIndexRow[],
	docs: MarkdownEntry[],
	options: { includeDocsIndex: boolean },
): void {
	const rendered = rootHelpTemplate.renderRootHelpTemplate(
		rootHelpTemplateContext(topics, docs, options),
	);
	for (const line of rendered.split("\n")) {
		printLine(formatRootHelpLine(line));
	}
}

function printTopicBrowser(topics: TopicIndexRow[]): void {
	printLine("Usage: docs topic [topic] [section]");
	printLine();
	printLine(heading(2, "Topics"));
	printLine("docs topic foo - view foo about/index first");
	printLine("docs topic foo bar - learn about bar section");
	printLine();
	for (const line of renderTopicsTable(topics).split("\n")) {
		printLine(line);
	}
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

function printTopicView(topic: MergedTopic): void {
	printTopicOverview(topic);
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

	printFocusedSkillsBlock(section);
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

function printFocusedSection(sectionView: { key: string; sections: SectionEntry[] }): void {
	if (sectionView.sections.length === 1) {
		const [section] = sectionView.sections;
		if (section && isCompactFocusedSkillSection(section)) {
			printCompactFocusedSkillSection(section);
			return;
		}
	}

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
