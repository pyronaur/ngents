import { docsCommandUsage } from "../core/usage.ts";

export const rootHelpCommandLines = {
	ls: "docs ls",
	park: "docs park",
	topic: "docs topic",
} as const;

export const rootHelpUsageLines = {
	ls: `${rootHelpCommandLines.ls} ${docsCommandUsage.ls}`,
	park: `${rootHelpCommandLines.park} ${docsCommandUsage.park}`,
	query: `docs query ${docsCommandUsage.query}`,
	topic: `${rootHelpCommandLines.topic} ${docsCommandUsage.topic}`,
} as const;

export default {
	rootHelpCommandLines,
	rootHelpUsageLines,
};
