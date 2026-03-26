import path from "node:path";

import pc from "picocolors";

import browseContracts, {
	type BrowseInventory,
	type MarkdownEntry,
	type MergedTopic,
	type RegisteredDocsRow,
	type SectionEntry,
	type TopicIndexRow,
} from "./browse-contracts.ts";
import {
	isCompactFocusedSkillSection,
	printCompactFocusedSkillSection,
	printFocusedSkillsBlock,
} from "./browse-focused-skills.ts";
import {
	printScopedTopicBrowser,
	printTopicBrowser,
	renderTopicTableHeader,
	rootHelpTopicLines,
} from "./browse-topic-browser.ts";
import { printTopicOverview } from "./browse-topic-overview.ts";
import { availableSectionKeys } from "./browse-topic-sections.ts";
import { rootHelpCommandLines, rootHelpUsageLines } from "./command-usage.ts";
import rootHelpTemplate, {
	type OpsHelpTemplateContext,
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

function renderInventoryTopicLines(topics: TopicIndexRow[]): string[] {
	return topics.map(topic => {
		const description = compactDescription(topic.short, topic.summary);
		if (!description) {
			return `- ${topic.name}`;
		}
		return `- ${topic.name} - ${description}`;
	});
}

function renderRegisteredDocsLines(registeredDocs: RegisteredDocsRow[]): string[] {
	return registeredDocs.map(directory =>
		`- ${directory.name}: ${directory.absolutePaths.join(", ")}`
	);
}

function pushBrowseInventory(
	pushLine: (text?: string, indent?: number) => void,
	inventory: BrowseInventory,
): void {
	const hasTopics = inventory.topics.length > 0;
	const hasRegisteredDocs = inventory.registeredDocs.length > 0;
	if (!hasTopics && !hasRegisteredDocs) {
		pushLine("[no topics or registered docs found]");
		return;
	}

	if (hasTopics) {
		pushLine(heading(2, "Topics"));
		pushLine("Use `docs topic <name>` to inspect a topic directly.");
		for (const line of renderInventoryTopicLines(inventory.topics)) {
			pushLine(line);
		}
	}

	if (hasTopics && hasRegisteredDocs) {
		pushLine();
	}

	if (hasRegisteredDocs) {
		pushLine(heading(2, "Registered Docs"));
		pushLine("You can see the full index with compact descriptions using `docs ls`");
		pushLine("These are registered doc directories:");
		for (const line of renderRegisteredDocsLines(inventory.registeredDocs)) {
			pushLine(line);
		}
	}
}

function renderSelectorNotFound(
	selector: string,
	inventory: BrowseInventory,
	options: { topicHint?: string } = {},
): string {
	return renderBlock(pushLine => {
		pushLine(`Sorry, \`${selector}\` not found`);
		if (options.topicHint) {
			pushLine("- `docs ls` only opens registered docs directories");
			pushLine(
				`- \`${options.topicHint}\` is a topic you can inspect with \`docs topic ${options.topicHint}\``,
			);
		}
		if (!options.topicHint) {
			pushLine("- I couldn't locate a registered docs directory called that");
		}
		pushLine();
		pushLine("Here's what I do have:");
		pushBrowseInventory(pushLine, inventory);
	});
}

function renderRootSelectorNotFound(
	selector: string,
	commands: string[],
	inventory: BrowseInventory,
): string {
	return renderBlock(pushLine => {
		pushLine(`Sorry, \`${selector}\` not found`);
		pushLine(`- It's not a command: ${commands.join(", ")}`);
		pushLine("- I couldn't locate a topic or registered docs source called that either");
		pushLine();
		pushLine("Here's what I do have:");
		pushBrowseInventory(pushLine, inventory);
	});
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
		ls_command: rootHelpCommandLines.ls,
		ls_usage: rootHelpUsageLines.ls,
		query_usage: rootHelpUsageLines.query,
		show_docs_index: options.includeDocsIndex && docsGroups.length > 0,
		topic_command: rootHelpCommandLines.topic,
		topic_usage: rootHelpUsageLines.topic,
		topic_lines: rootHelpTopicLines(topics),
		topics_header: renderTopicTableHeader(topics),
	};
}

function opsHelpTemplateContext(): OpsHelpTemplateContext {
	return {
		fetch_command: rootHelpCommandLines.fetch,
		fetch_usage: rootHelpUsageLines.fetch,
		park_command: rootHelpCommandLines.park,
		park_usage: rootHelpUsageLines.park,
		update_command: rootHelpCommandLines.update,
		update_usage: rootHelpUsageLines.update,
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

function printExpandedDocsIndex(
	docs: MarkdownEntry[],
	options: {
		title: string;
		titleLevel: 1 | 2;
		groupHeadingLevel: 2 | 3;
		topicHint?: string;
	},
): void {
	printLine(heading(options.titleLevel, options.title));
	if (options.topicHint) {
		printLine(`Topic available: docs topic ${options.topicHint}`);
	}
	if (docs.length === 0) {
		printLine();
		printLine("- [no docs found]");
		return;
	}

	printLine();
	for (const [groupIndex, [directoryPath, entries]] of groupedDocs(docs).entries()) {
		printLine(heading(options.groupHeadingLevel, directoryPath));
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

function renderRootHelp(
	topics: TopicIndexRow[],
	docs: MarkdownEntry[],
	options: { includeDocsIndex: boolean },
): string {
	const rendered = rootHelpTemplate.renderRootHelpTemplate(
		rootHelpTemplateContext(topics, docs, options),
	);
	return rendered
		.split("\n")
		.map(formatRootHelpLine)
		.join("\n");
}

function printRootHelp(
	topics: TopicIndexRow[],
	docs: MarkdownEntry[],
	options: { includeDocsIndex: boolean },
): void {
	for (const line of renderRootHelp(topics, docs, options).split("\n")) {
		printLine(formatRootHelpLine(line));
	}
}

function printOpsHelp(): void {
	const rendered = rootHelpTemplate.renderOpsHelpTemplate(opsHelpTemplateContext());
	for (const line of rendered.split("\n")) {
		printLine(formatRootHelpLine(line));
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
	printTopicOverview(topic, {
		titlePrefix: "Topic: ",
	});
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

function nextHeadingLevel(level: number): 2 | 3 | 4 | 5 | 6 {
	return Math.min(6, level + 1) as 2 | 3 | 4 | 5 | 6;
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

	if (
		(section.skills.length > 0 || section.markdownEntries.length > 0) && section.children.length > 0
	) {
		printLine();
	}

	for (const [index, child] of section.children.entries()) {
		printFocusedSubtree(child, 3);
		if (index < section.children.length - 1) {
			printLine();
		}
	}
	if (
		section.markdownEntries.length === 0 && section.skills.length === 0
		&& section.children.length === 0
	) {
		printLine(pc.dim("[no section entries found]"));
	}
}

function printFocusedSubtree(section: SectionEntry, headingLevel: 2 | 3 | 4 | 5 | 6): void {
	if (isCompactFocusedSkillSection(section)) {
		printCompactFocusedSkillSection(section, { headingLevel });
		return;
	}

	printLine(heading(headingLevel, sharedSectionTitle(section.key, [section])));
	printLine(`${pc.dim("path:")} ${pc.dim(section.absolutePath)}/`);
	printGuideSectionMetadata(section.guideBody, section.error, section.readWhen);

	if (section.skills.length > 0) {
		printFocusedSkillsBlock(section, {
			blockHeadingLevel: nextHeadingLevel(headingLevel),
			entryHeadingPrefix: "#####",
		});
		if (section.markdownEntries.length > 0 || section.children.length > 0) {
			printLine();
		}
	}

	for (const [index, entry] of section.markdownEntries.entries()) {
		printMarkdownDetails(entry, nextHeadingLevel(headingLevel));
		if (index < section.markdownEntries.length - 1) {
			printLine();
		}
	}

	if (section.markdownEntries.length > 0 && section.children.length > 0) {
		printLine();
	}

	for (const [index, child] of section.children.entries()) {
		printFocusedSubtree(child, nextHeadingLevel(headingLevel));
		if (index < section.children.length - 1) {
			printLine();
		}
	}

	if (
		section.skills.length === 0 && section.markdownEntries.length === 0
		&& section.children.length === 0
	) {
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

function printDocsBrowser(
	docs: MarkdownEntry[],
	options: {
		title?: string;
		titleLevel?: 1 | 2;
		groupHeadingLevel?: 2 | 3;
		topicHint?: string;
	} = {},
): void {
	printExpandedDocsIndex(docs, {
		title: options.title ?? "Docs",
		titleLevel: options.titleLevel ?? 1,
		groupHeadingLevel: options.groupHeadingLevel ?? 2,
		topicHint: options.topicHint,
	});
}

function printCombinedSelectorView(
	selector: string,
	topic: MergedTopic,
	docs: MarkdownEntry[],
): void {
	printLine(heading(1, `Docs: ${selector}`));
	printLine();
	printTopicOverview(topic, {
		titleLevel: 2,
		titlePrefix: "Topic: ",
		sectionHeadingLevel: 3,
		entryHeadingLevel: 4,
	});
	printLine();
	printLine();
	printExpandedDocsIndex(docs, {
		title: `Docs: ${selector}`,
		titleLevel: 2,
		groupHeadingLevel: 3,
	});
}

function printCollectionSelectorView(
	selector: string,
	topics: TopicIndexRow[],
	docs: MarkdownEntry[],
): void {
	printLine(heading(1, `Docs: ${selector}`));

	if (topics.length > 0) {
		printLine();
		printScopedTopicBrowser(topics, {
			title: `Topics: ${selector}`,
			titleLevel: 2,
		});
	}

	if (docs.length > 0 || topics.length === 0) {
		if (topics.length > 0) {
			printLine();
			printLine();
		}
		printExpandedDocsIndex(docs, {
			title: `Docs: ${selector}`,
			titleLevel: 2,
			groupHeadingLevel: 3,
		});
	}
}

export default {
	availableSectionKeys,
	printCollectionSelectorView,
	printCombinedSelectorView,
	printDocsBrowser,
	printFocusedSection,
	printOpsHelp,
	printRootHelp,
	printScopedTopicBrowser,
	renderRootHelp,
	renderRootSelectorNotFound,
	renderSelectorNotFound,
	printTopicBrowser,
	printTopicView,
};
