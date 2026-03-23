import type { MarkdownEntry, TopicIndexRow } from "../../src/runtime/browse-contracts.ts";

export const rootHelpFixture = {
	topics: [
		{
			name: "platform",
			title: "Platform Library",
			short: "platform docs",
			summary: "This topic collects platform references and HIG skills.",
		},
		{
			name: "ops",
			title: "Ops Notes",
			short: null,
			summary:
				"This summary is intentionally longer than sixty-four characters so compact views must truncate it.",
		},
		{
			name: "qmd",
			title: "QMD",
			short: "local search docs",
			summary: "Local QMD reference for CLI search and SDK integration.",
		},
	] satisfies TopicIndexRow[],
	docs: [
		{
			absolutePath: "/fixture/repo/docs/long-summary.md",
			relativePath: "long-summary.md",
			title: "Long Summary Doc",
			short: null,
			summary:
				"This summary is intentionally longer than sixty-four characters so compact views must truncate it.",
			readWhen: [],
		},
		{
			absolutePath: "/fixture/repo/docs/web-fetching.md",
			relativePath: "web-fetching.md",
			title: "Web Fetching",
			short: "web browser tools",
			summary: "Need to fetch web content for research.",
			readWhen: [],
		},
		{
			absolutePath: "/fixture/repo/docs/architecture/local-only.md",
			relativePath: "architecture/local-only.md",
			title: "Local Architecture Notes",
			short: "local architecture notes",
			summary: "Local architecture-only notes.",
			readWhen: [],
		},
		{
			absolutePath: "/fixture/repo/docs/architecture/main.md",
			relativePath: "architecture/main.md",
			title: "Main Architecture",
			short: "read this first",
			summary: "This is the long architecture summary that should stay out of compact listings.",
			readWhen: ["Need the main project architecture."],
		},
		{
			absolutePath: "/fixture/home/.ngents/docs/architecture/global-only.md",
			relativePath: "architecture/global-only.md",
			title: "Global Architecture Notes",
			short: "global architecture notes",
			summary: "Global architecture-only notes.",
			readWhen: [],
		},
		{
			absolutePath: "/fixture/home/.ngents/docs/browser/cdp.md",
			relativePath: "browser/cdp.md",
			title: "CDP",
			short: "Chrome CDP instructions",
			summary: "Need to start, stop, or inspect the local Chrome CDP session.",
			readWhen: [],
		},
		{
			absolutePath: "/fixture/home/.ngents/docs/ngents/docs.md",
			relativePath: "ngents/docs.md",
			title: "Documentation Commands",
			short: "command index",
			summary: "Need one place that explains which ngents script commands exist and how to run them.",
			readWhen: [],
		},
		{
			absolutePath: "/fixture/home/.ngents/docs/process/qa.md",
			relativePath: "process/qa.md",
			title: "QA Process",
			short: "qa process notes",
			summary: "Need a structured way to surface confusion instead of making assumptions.",
			readWhen: [],
		},
	] satisfies MarkdownEntry[],
};
