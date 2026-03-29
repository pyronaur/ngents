import { fileURLToPath } from "node:url";

import { Liquid } from "liquidjs";

import { runtimeError } from "../core/errors.ts";

const TEMPLATES_DIR = fileURLToPath(new URL("../../templates", import.meta.url));
const LINE_ENDING_PATTERN = /\r\n/g;

type RenderOptions = {
	engine?: Liquid;
	templateName?: string;
};

const DOCS_SCREEN_TEMPLATE = {
	collection_selector: "screens/docs-collection-selector.md",
	combined_selector: "screens/docs-combined-selector.md",
	file: "screens/docs-file.md",
	ops_help: "screens/docs-ops-help.md",
	root_help: "screens/docs-root-help.md",
} as const;

const TOPIC_SCREEN_TEMPLATE = {
	browser: "screens/topic-browser.md",
	focused: "screens/topic-focused.md",
	overview: "screens/topic-overview.md",
	scoped_browser: "screens/topic-scoped-browser.md",
} as const;

const QUERY_SCREEN_TEMPLATE = {
	results: "screens/query-results.md",
	status: "screens/query-status.md",
} as const;

export type DocsTemplateDocsGroup = {
	entry_lines: string[];
	heading_line: string;
};

export type DocsTemplateTopicTable = {
	header_line: string;
	row_lines: string[];
};

export type DocsTemplateExpandedDocsEntry = {
	detail_lines: string[];
	file_line: string;
};

export type DocsTemplateExpandedDocsGroup = {
	entries: DocsTemplateExpandedDocsEntry[];
	heading_line: string;
};

export type DocsTemplateRootHelpContext = {
	view: "root_help";
	browse_heading_line: string;
	docs_heading_line: string;
	docs_groups: DocsTemplateDocsGroup[];
	ls_command: string;
	ls_usage: string;
	overview_heading_line: string;
	query_usage: string;
	query_heading_line: string;
	show_docs_index: boolean;
	topic_command: string;
	title_line: string;
	topic_table: DocsTemplateTopicTable;
	topics_heading_line: string;
	topic_usage: string;
};

export type DocsTemplateOpsHelpContext = {
	view: "ops_help";
	fetch_heading_line: string;
	fetch_command: string;
	fetch_usage: string;
	park_command: string;
	park_heading_line: string;
	park_usage: string;
	title_line: string;
	update_command: string;
	update_heading_line: string;
	update_usage: string;
};

export type DocsTemplateCollectionSelectorContext = {
	view: "collection_selector";
	docs_groups: DocsTemplateExpandedDocsGroup[];
	docs_title_line: string;
	title_line: string;
	topics: {
		title_line: string;
		topic_table: DocsTemplateTopicTable;
	} | null;
};

export type TopicTemplateGuideBlock = {
	lines: string[];
};

export type TopicTemplateDocsBucket = DocsTemplateDocsGroup;

export type TopicTemplateSkillSection = {
	text: string;
};

export type TopicTemplateOverviewContext = {
	view: "overview";
	docs_buckets: TopicTemplateDocsBucket[];
	docs_heading_line: string;
	guide_blocks: TopicTemplateGuideBlock[];
	skill_sections: TopicTemplateSkillSection[];
	skills_heading_line: string;
	title_line: string;
};

export type DocsTemplateCombinedSelectorContext = {
	view: "combined_selector";
	docs_groups: DocsTemplateExpandedDocsGroup[];
	docs_title_line: string;
	title_line: string;
	topic_view: TopicTemplateOverviewContext;
};

export type DocsTemplateFileContext = {
	view: "file";
	body_text: string | null;
	metadata_lines: string[];
	path_line: string;
	title_line: string;
};

export type DocsTemplateContext =
	| DocsTemplateCollectionSelectorContext
	| DocsTemplateCombinedSelectorContext
	| DocsTemplateFileContext
	| DocsTemplateOpsHelpContext
	| DocsTemplateRootHelpContext;

export type LsTemplateContext = {
	view: "browser";
	docs_groups: DocsTemplateExpandedDocsGroup[];
	title_line: string;
	topic_hint_line: string | null;
};

export type TopicTemplateBrowserContext = {
	view: "browser";
	examples: string[];
	title_line: string;
	topic_table: DocsTemplateTopicTable;
	usage_line: string;
};

export type TopicTemplateScopedBrowserContext = {
	view: "scoped_browser";
	title_line: string;
	topic_table: DocsTemplateTopicTable;
};

export type TopicTemplateFocusedContext = {
	view: "focused";
	sections: Array<{ text: string }>;
	title_line: string | null;
};

export type TopicTemplateContext =
	| TopicTemplateBrowserContext
	| TopicTemplateFocusedContext
	| TopicTemplateOverviewContext
	| TopicTemplateScopedBrowserContext;

export type QueryTemplateResultsContext = {
	view: "results";
	results: Array<{
		heading_line: string;
		overview_line: string | null;
		path_line: string;
		snippet_lines: string[];
	}>;
	tip_line: string;
};

export type QueryTemplateStatusContext = {
	view: "status";
	lines: string[];
};

export type QueryTemplateContext = QueryTemplateResultsContext | QueryTemplateStatusContext;

export type ParkTemplateContext = {
	view: "success";
	message_line: string;
};

function fail(message: string): never {
	throw runtimeError(message);
}

function normalizeTemplateText(templateText: string): string {
	return templateText.replaceAll(LINE_ENDING_PATTERN, "\n").replace(/^\n+/, "").replace(/\n+$/, "");
}

const liquidEngine = createCommandLiquidEngine();

function renderTemplate<Context extends Record<string, unknown>>(
	context: Context,
	defaultTemplateName: string,
	options: RenderOptions = {},
): string {
	const engine = options.engine ?? liquidEngine;
	const templateName = options.templateName ?? defaultTemplateName;
	try {
		return normalizeTemplateText(engine.renderFileSync(templateName, context));
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		fail(`Failed to render command template "${templateName}": ${reason}`);
	}
}

export function createCommandLiquidEngine(templatesDir = TEMPLATES_DIR): Liquid {
	return new Liquid({
		dynamicPartials: false,
		extname: "",
		layouts: [templatesDir],
		ownPropertyOnly: true,
		partials: [templatesDir],
		root: [templatesDir],
		strictFilters: true,
		strictVariables: true,
	});
}

export function renderDocsTemplate(
	context: DocsTemplateContext,
	options: RenderOptions = {},
): string {
	return renderTemplate(context, DOCS_SCREEN_TEMPLATE[context.view], options);
}

export function renderLsTemplate(
	context: LsTemplateContext,
	options: RenderOptions = {},
): string {
	return renderTemplate(context, "screens/ls-browser.md", options);
}

export function renderTopicTemplate(
	context: TopicTemplateContext,
	options: RenderOptions = {},
): string {
	return renderTemplate(context, TOPIC_SCREEN_TEMPLATE[context.view], options);
}

export function renderQueryTemplate(
	context: QueryTemplateContext,
	options: RenderOptions = {},
): string {
	return renderTemplate(context, QUERY_SCREEN_TEMPLATE[context.view], options);
}

export function renderParkTemplate(
	context: ParkTemplateContext,
	options: RenderOptions = {},
): string {
	return renderTemplate(context, "screens/park-success.md", options);
}

export default {
	createCommandLiquidEngine,
	renderDocsTemplate,
	renderLsTemplate,
	renderParkTemplate,
	renderQueryTemplate,
	renderTopicTemplate,
};
