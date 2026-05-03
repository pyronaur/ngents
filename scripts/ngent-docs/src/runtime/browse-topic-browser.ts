import pc from "picocolors";

import browseContracts, { type TopicIndexRow } from "./browse-contracts.ts";

const {
	compactDescription,
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

export function renderTopicTableHeader(topics: TopicIndexRow[]): string {
	const { titleWidth, topicWidth } = topicColumnWidths(topics);
	return pc.bold(`${"TOPIC".padEnd(topicWidth)}  ${"TITLE".padEnd(titleWidth)}  DESCRIPTION`);
}

export function rootHelpTopicLines(topics: TopicIndexRow[]): string[] {
	const widths = topicColumnWidths(topics);
	return topics.map(topic => renderTopicTableRow(topic, widths));
}
