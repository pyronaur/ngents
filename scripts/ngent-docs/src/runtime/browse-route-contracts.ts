import type {
	MarkdownDocument,
	MarkdownEntry,
	MergedTopic,
	TopicIndexRow,
} from "./browse-contracts.ts";

export type DocsBrowseView = {
	kind: "browse";
	docs: MarkdownEntry[];
	title: string;
	topicHint?: string;
};

export type DocsFileView = {
	doc: MarkdownDocument;
	kind: "file";
};

export type DocsView = DocsBrowseView | DocsFileView;

export type ParkedCollectionSelectorView = {
	docsRoot: string;
	docs: MarkdownEntry[];
	topics: TopicIndexRow[];
};

export type DocsSelectorRoute =
	| {
		kind: "combined";
		docs: MarkdownEntry[];
		selector: string;
		topic: MergedTopic;
	}
	| {
		collection: ParkedCollectionSelectorView;
		kind: "collection";
		selector: string;
	}
	| {
		kind: "docs";
		view: DocsView;
	}
	| {
		kind: "topic";
		topic: MergedTopic;
	};

export type DocsSelectorRouteMode = "docs" | "root";
