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
import commandTemplate, {
	type DocsTemplateExpandedDocsGroup,
	type LsTemplateContext,
} from "./command-template.ts";
import { createFocusedContext } from "./browse-focused-sections.ts";
import {
	renderTopicTableHeader,
	rootHelpTopicLines,
} from "./browse-topic-browser.ts";
import {
	createTopicOverviewContext,
	renderTopicOverview,
} from "./browse-topic-overview.ts";
import { availableSectionKeys } from "./browse-topic-sections.ts";
import { groupedDocs } from "./docs-grouping.ts";
import templateOutput from "./template-output.ts";

const {
	compactDescription,
	directoryDisplayPath,
	errorText,
	heading,
	normalizeInlineText,
} = browseContracts;

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
		`- ${directory.name}: ${directory.absolutePaths.map(directoryDisplayPath).join(", ")}`
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

function expandedDocDescriptionLines(entry: MarkdownEntry): string[] {
	const lines: string[] = [];

	if (entry.readWhen.length > 0) {
		for (const readWhen of entry.readWhen) {
			lines.push(`   ${pc.gray(readWhen)}`);
		}
	}
	if (entry.readWhen.length === 0) {
		const summary = normalizeInlineText(entry.summary);
		if (summary) {
			lines.push(`   ${pc.gray(summary)}`);
		}
	}

	if (entry.error) {
		lines.push(`   ${errorText(entry.error)}`);
	}

	return lines;
}

function docsBrowserGroups(
	docs: MarkdownEntry[],
	groupHeadingLevel: 2 | 3,
): LsTemplateContext["docs_groups"] {
	return groupedDocs(docs).map(([directoryPath, entries]) => ({
		entries: entries
			.sort((left, right) => left.absolutePath.localeCompare(right.absolutePath))
			.map(entry => ({
				detail_lines: expandedDocDescriptionLines(entry),
				file_line: ` - ${path.basename(entry.absolutePath)}`,
			})),
		heading_line: heading(groupHeadingLevel, directoryDisplayPath(directoryPath)),
	}));
}

function docsTemplateGroups(
	docs: MarkdownEntry[],
	groupHeadingLevel: 2 | 3,
): DocsTemplateExpandedDocsGroup[] {
	return groupedDocs(docs).map(([directoryPath, entries]) => ({
		entries: entries
			.sort((left, right) => left.absolutePath.localeCompare(right.absolutePath))
			.map(entry => ({
				detail_lines: expandedDocDescriptionLines(entry),
				file_line: ` - ${path.basename(entry.absolutePath)}`,
			})),
		heading_line: heading(groupHeadingLevel, directoryDisplayPath(directoryPath)),
	}));
}

function topicTable(topics: TopicIndexRow[]) {
	return {
		header_line: renderTopicTableHeader(topics),
		row_lines: rootHelpTopicLines(topics),
	};
}

function renderDocsBrowser(
	docs: MarkdownEntry[],
	options: {
		title?: string;
		titleLevel?: 1 | 2;
		groupHeadingLevel?: 2 | 3;
		topicHint?: string;
	} = {},
): string {
	return commandTemplate.renderLsTemplate({
		docs_groups: docsBrowserGroups(docs, options.groupHeadingLevel ?? 2),
		title_line: heading(options.titleLevel ?? 1, options.title ?? "Docs"),
		topic_hint_line: options.topicHint ? `Topic available: docs topic ${options.topicHint}` : null,
		view: "browser",
	});
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
	templateOutput.printRenderedTemplate(renderDocsBrowser(docs, options));
}

function printTopicBrowser(topics: TopicIndexRow[]): void {
	templateOutput.printRenderedTemplate(commandTemplate.renderTopicTemplate({
		examples: [
			"docs topic foo - view foo about/index first",
			"docs topic foo bar/baz - focus one path inside the topic",
		],
		title_line: heading(2, "Topics"),
		topic_table: topicTable(topics),
		usage_line: "Usage: docs topic [topic] [path]",
		view: "browser",
	}));
}

function printScopedTopicBrowser(
	topics: TopicIndexRow[],
	options: {
		title: string;
		titleLevel?: 1 | 2;
	},
): void {
	templateOutput.printRenderedTemplate(commandTemplate.renderTopicTemplate({
		title_line: heading(options.titleLevel ?? 1, options.title),
		topic_table: topicTable(topics),
		view: "scoped_browser",
	}));
}

function printTopicView(topic: MergedTopic): void {
	templateOutput.printRenderedTemplate(
		renderTopicOverview(topic, {
			titlePrefix: "Topic: ",
		}),
	);
}

function printFocusedSection(sectionView: { key: string; sections: SectionEntry[] }): void {
	templateOutput.printRenderedTemplate(commandTemplate.renderTopicTemplate(createFocusedContext(sectionView)));
}

function printCollectionSelectorView(
	selector: string,
	topics: TopicIndexRow[],
	docs: MarkdownEntry[],
): void {
	templateOutput.printRenderedTemplate(commandTemplate.renderDocsTemplate({
		docs_groups: docsTemplateGroups(docs, 3),
		docs_title_line: heading(2, `Docs: ${selector}`),
		title_line: heading(1, `Docs: ${selector}`),
		topics: topics.length > 0
			? {
				title_line: heading(2, `Topics: ${selector}`),
				topic_table: topicTable(topics),
			}
			: null,
		view: "collection_selector",
	}));
}

function printCombinedSelectorView(
	selector: string,
	topic: MergedTopic,
	docs: MarkdownEntry[],
): void {
	templateOutput.printRenderedTemplate(commandTemplate.renderDocsTemplate({
		docs_groups: docsTemplateGroups(docs, 3),
		docs_title_line: heading(2, `Docs: ${selector}`),
		title_line: heading(1, `Docs: ${selector}`),
		topic_view: createTopicOverviewContext(topic, {
			entryHeadingLevel: 4,
			sectionHeadingLevel: 3,
			titleLevel: 2,
			titlePrefix: "Topic: ",
		}),
		view: "combined_selector",
	}));
}

export default {
	availableSectionKeys,
	printCollectionSelectorView,
	printCombinedSelectorView,
	printDocsBrowser,
	printFocusedSection,
	printScopedTopicBrowser,
	printTopicBrowser,
	printTopicView,
	renderDocsBrowser,
	renderRootSelectorNotFound,
	renderSelectorNotFound,
};
