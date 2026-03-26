import path from "node:path";

import browseContracts, {
	type MarkdownEntry,
	type TopicIndexRow,
} from "./browse-contracts.ts";
import {
	renderTopicTableHeader,
	rootHelpTopicLines,
} from "./browse-topic-browser.ts";
import { rootHelpCommandLines, rootHelpUsageLines } from "./command-usage.ts";
import { groupedDocs } from "./docs-grouping.ts";
import rootHelpTemplate, {
	type OpsHelpTemplateContext,
	type RootHelpDocsGroup,
	type RootHelpTemplateContext,
} from "./root-help-template.ts";

const {
	compactDescription,
	heading,
	printLine,
} = browseContracts;

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

export function renderRootHelp(
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

export function printRootHelp(
	topics: TopicIndexRow[],
	docs: MarkdownEntry[],
	options: { includeDocsIndex: boolean },
): void {
	for (const line of renderRootHelp(topics, docs, options).split("\n")) {
		printLine(line);
	}
}

export function printOpsHelp(): void {
	const rendered = rootHelpTemplate.renderOpsHelpTemplate(opsHelpTemplateContext());
	for (const line of rendered.split("\n")) {
		printLine(formatRootHelpLine(line));
	}
}

export default {
	printOpsHelp,
	printRootHelp,
	renderRootHelp,
};
