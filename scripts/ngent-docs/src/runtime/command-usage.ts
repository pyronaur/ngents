import { docsCommandUsage } from "../core/usage.ts";

export const rootHelpCommandLines = {
	fetch: "docs fetch",
	ls: "docs ls",
	park: "docs park",
	topic: "docs topic",
	update: "docs update",
} as const;

export const rootHelpUsageLines = {
	fetch: `${rootHelpCommandLines.fetch} ${docsCommandUsage.fetch}`,
	ls: `${rootHelpCommandLines.ls} ${docsCommandUsage.ls}`,
	park: `${rootHelpCommandLines.park} ${docsCommandUsage.park}`,
	query: `docs query ${docsCommandUsage.query}`,
	topic: `${rootHelpCommandLines.topic} ${docsCommandUsage.topic}`,
	update: rootHelpCommandLines.update,
} as const;

export default {
	rootHelpCommandLines,
	rootHelpUsageLines,
};
