import pc from "picocolors";

import browseContracts, { type TopicIndexRow } from "./browse-contracts.ts";

const {
	compactDescription,
	heading,
	printLine,
} = browseContracts;

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

function renderTopicTableRow(
	topic: Pick<TopicIndexRow, "name" | "title" | "short" | "summary">,
	widths: { titleWidth: number; topicWidth: number },
): string {
	return `${topic.name.padEnd(widths.topicWidth)}  ${topic.title.padEnd(widths.titleWidth)}  ${
		printTopicDescription(topic)
	}`;
}

function renderTopicsTable(topics: TopicIndexRow[]): string {
	if (topics.length === 0) {
		return "- [no topics found]";
	}

	const widths = topicColumnWidths(topics);
	return [
		renderTopicTableHeader(topics),
		...topics.map(topic => renderTopicTableRow(topic, widths)),
	].join("\n");
}

export function renderTopicTableHeader(topics: TopicIndexRow[]): string {
	const { titleWidth, topicWidth } = topicColumnWidths(topics);
	return pc.bold(`${"TOPIC".padEnd(topicWidth)}  ${"TITLE".padEnd(titleWidth)}  DESCRIPTION`);
}

export function rootHelpTopicLines(topics: TopicIndexRow[]): string[] {
	const widths = topicColumnWidths(topics);
	return topics.map(topic => renderTopicTableRow(topic, widths));
}

export function printScopedTopicBrowser(
	topics: TopicIndexRow[],
	options: {
		title: string;
		titleLevel?: 1 | 2;
	},
): void {
	printLine(heading(options.titleLevel ?? 1, options.title));
	if (topics.length === 0) {
		printLine();
		printLine("- [no topics found]");
		return;
	}

	printLine();
	for (const line of renderTopicsTable(topics).split("\n")) {
		printLine(line);
	}
}

export function printTopicBrowser(topics: TopicIndexRow[]): void {
	printLine("Usage: docs topic [topic] [section]");
	printLine();
	printScopedTopicBrowser(topics, {
		title: "Topics",
		titleLevel: 2,
	});
	printLine();
	printLine("docs topic foo - view foo about/index first");
	printLine("docs topic foo bar - learn about bar section");
}
