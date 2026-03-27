import path from "node:path";

import browseContracts, {
	type MarkdownEntry,
	type TopicIndexRow,
} from "./browse-contracts.ts";
import {
	renderTopicTableHeader,
	rootHelpTopicLines,
} from "./browse-topic-browser.ts";
import commandTemplate, {
	type DocsTemplateDocsGroup,
	type DocsTemplateOpsHelpContext,
	type DocsTemplateRootHelpContext,
} from "./command-template.ts";
import { rootHelpCommandLines, rootHelpUsageLines } from "./command-usage.ts";
import { groupedDocs } from "./docs-grouping.ts";
import templateOutput from "./template-output.ts";

const { compactDescription, heading } = browseContracts;

function blockText(lines: string[]): string {
	return lines.join("\n");
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

function rootHelpDocsGroups(docs: MarkdownEntry[]): DocsTemplateDocsGroup[] {
	return groupedDocs(docs).map(([directoryPath, entries]) => ({
		text: blockText([heading(3, directoryPath), ...rootHelpDocsEntryLines(entries)]),
	}));
}

function rootHelpTemplateContext(
	topics: TopicIndexRow[],
	docs: MarkdownEntry[],
	options: { includeDocsIndex: boolean },
): DocsTemplateRootHelpContext {
	const docsGroups = rootHelpDocsGroups(docs);
	return {
		browse_heading_line: heading(3, "Browse"),
		docs_heading_line: heading(2, "Docs"),
		docs_groups: docsGroups,
		ls_command: rootHelpCommandLines.ls,
		ls_usage: rootHelpUsageLines.ls,
		overview_heading_line: heading(2, "Overview & Organization"),
		query_heading_line: heading(3, "Query"),
		query_usage: rootHelpUsageLines.query,
		show_docs_index: options.includeDocsIndex && docsGroups.length > 0,
		topic_command: rootHelpCommandLines.topic,
		title_line: heading(1, "docs"),
		topic_table: {
			text: blockText([renderTopicTableHeader(topics), ...rootHelpTopicLines(topics)]),
		},
		topics_heading_line: heading(2, "Topics"),
		topic_usage: rootHelpUsageLines.topic,
		view: "root_help",
	};
}

function opsHelpTemplateContext(): DocsTemplateOpsHelpContext {
	return {
		fetch_command: rootHelpCommandLines.fetch,
		fetch_heading_line: heading(2, "Fetch"),
		fetch_usage: rootHelpUsageLines.fetch,
		park_command: rootHelpCommandLines.park,
		park_heading_line: heading(2, "Parking"),
		park_usage: rootHelpUsageLines.park,
		title_line: heading(1, "docs operations"),
		update_command: rootHelpCommandLines.update,
		update_heading_line: heading(2, "Update"),
		update_usage: rootHelpUsageLines.update,
		view: "ops_help",
	};
}

export function renderRootHelp(
	topics: TopicIndexRow[],
	docs: MarkdownEntry[],
	options: { includeDocsIndex: boolean },
): string {
	return commandTemplate.renderDocsTemplate(rootHelpTemplateContext(topics, docs, options));
}

export function printRootHelp(
	topics: TopicIndexRow[],
	docs: MarkdownEntry[],
	options: { includeDocsIndex: boolean },
): void {
	templateOutput.printRenderedTemplate(renderRootHelp(topics, docs, options));
}

export function renderOpsHelp(): string {
	return commandTemplate.renderDocsTemplate(opsHelpTemplateContext());
}

export function printOpsHelp(): void {
	templateOutput.printRenderedTemplate(renderOpsHelp());
}

export default {
	printOpsHelp,
	printRootHelp,
	renderOpsHelp,
	renderRootHelp,
};
