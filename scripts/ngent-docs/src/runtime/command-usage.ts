import { docsCommandUsage } from "../core/usage.ts";

export const rootHelpCommandLines = {
	ls: "docs ls",
	topic: "docs topic",
} as const;

export const rootHelpUsageLines = {
	ls: `${rootHelpCommandLines.ls} ${docsCommandUsage.ls}`,
	query: `docs query ${docsCommandUsage.query}`,
	topic: `${rootHelpCommandLines.topic} ${docsCommandUsage.topic}`,
} as const;

export default {
	rootHelpCommandLines,
	rootHelpUsageLines,
};
