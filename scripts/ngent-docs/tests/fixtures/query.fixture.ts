type SearchResult = {
	context?: string;
	file?: string;
	score?: number;
	snippet?: string;
	title?: string;
};

export const queryFixture = {
	collectionRoots: new Map([
		["ngents", "/fixture/home/.ngents/docs"],
	]),
	results: [
		{
			file: "qmd://ngents/ngents/docs.md",
			title: "Documentation Commands",
			score: 0.91,
			context:
				"Need one place that explains which ngents script commands exist and how to run them.",
			snippet: "@@ -12,2 @@\n# docs query\nSearch docs quickly.",
		},
		{
			file: "qmd://ngents/browser/cdp.md",
			title: "CDP",
			score: 0.72,
			context: "Need to start, stop, or inspect the local Chrome CDP session.",
			snippet: "@@ -5,1 @@\nUse Chrome DevTools Protocol locally.",
		},
	] satisfies SearchResult[],
	noResults: [] satisfies SearchResult[],
	status: {
		commandLabel: "docs query",
		collectionNames: "ngents",
		qmdStatusOutput: "QMD Status\nindex: ngents-docs\n",
	},
};
