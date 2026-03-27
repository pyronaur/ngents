import path from "node:path";

import { expect, test } from "vitest";

import { withTempDir, writeText } from "./helpers/fs.ts";

import {
	createCommandLiquidEngine,
	type DocsTemplateContext,
	type LsTemplateContext,
	type ParkTemplateContext,
	type QueryTemplateContext,
	renderDocsTemplate,
	renderLsTemplate,
	renderParkTemplate,
	renderQueryTemplate,
	renderTopicTemplate,
	type TopicTemplateContext,
} from "../src/runtime/command-template.ts";

const docsContext: DocsTemplateContext = {
	browse_heading_line: "### Browse",
	docs_groups: [],
	docs_heading_line: "## Docs",
	ls_command: "docs ls",
	ls_usage: "docs ls [where]",
	overview_heading_line: "## Overview",
	query_heading_line: "### Query",
	query_usage: "docs query [--limit <n>] <query...> | status",
	show_docs_index: false,
	topic_command: "docs topic",
	title_line: "# docs",
	topic_table: {
		header_line: "TOPIC  TITLE  DESCRIPTION",
		row_lines: [],
	},
	topics_heading_line: "## Topics",
	topic_usage: "docs topic [topic] [path]",
	view: "root_help",
};

const lsContext: LsTemplateContext = {
	docs_groups: [],
	title_line: "# Docs",
	topic_hint_line: null,
	view: "browser",
};

const topicContext: TopicTemplateContext = {
	examples: [],
	title_line: "## Topics",
	topic_table: {
		header_line: "TOPIC  TITLE  DESCRIPTION",
		row_lines: [],
	},
	usage_line: "Usage: docs topic [topic] [path]",
	view: "browser",
};

const queryContext: QueryTemplateContext = {
	results: [],
	tip_line: "Tip",
	view: "results",
};

const parkContext: ParkTemplateContext = {
	message_line: "Parked",
	view: "success",
};

test("renderDocsTemplate fails with a clear error when the template file is missing", async () => {
	await withTempDir("docs-command-template-missing-", async tempDir => {
		const engine = createCommandLiquidEngine(tempDir);

		expect(() => renderDocsTemplate(docsContext, { engine })).toThrowError(
			"Failed to render command template \"screens/docs-root-help.md\":",
		);
	});
});

test("renderDocsTemplate fails on Liquid syntax errors", async () => {
	await withTempDir("docs-command-template-parse-", async tempDir => {
		await writeText(path.join(tempDir, "screens/docs-root-help.md"), "{% if show_docs_index %}");
		const engine = createCommandLiquidEngine(tempDir);

		expect(() => renderDocsTemplate(docsContext, { engine })).toThrowError(
			"Failed to render command template \"screens/docs-root-help.md\":",
		);
	});
});

test("renderDocsTemplate fails when a required variable is missing", async () => {
	await withTempDir("docs-command-template-var-", async tempDir => {
		await writeText(path.join(tempDir, "screens/docs-root-help.md"), "{{ missing_var }}");
		const engine = createCommandLiquidEngine(tempDir);

		expect(() => renderDocsTemplate(docsContext, { engine })).toThrowError(
			"Failed to render command template \"screens/docs-root-help.md\": undefined variable: missing_var",
		);
	});
});

test("renderDocsTemplate fails on unknown filters", async () => {
	await withTempDir("docs-command-template-filter-", async tempDir => {
		await writeText(path.join(tempDir, "screens/docs-root-help.md"), "{{ 'x' | missing_filter }}");
		const engine = createCommandLiquidEngine(tempDir);

		expect(() => renderDocsTemplate(docsContext, { engine })).toThrowError(
			"Failed to render command template \"screens/docs-root-help.md\": undefined filter: missing_filter",
		);
	});
});

test("renderDocsTemplate supports standard Liquid composition from the templates root", async () => {
	await withTempDir("docs-command-template-render-", async tempDir => {
		await writeText(path.join(tempDir, "screens/docs-root-help.md"), "{% render shared.md %}");
		await writeText(path.join(tempDir, "shared.md"), "Shared");
		const engine = createCommandLiquidEngine(tempDir);

		expect(renderDocsTemplate(docsContext, { engine })).toBe("Shared");
	});
});

test("renderLsTemplate supports standard Liquid composition from the templates root", async () => {
	await withTempDir("docs-ls-template-render-", async tempDir => {
		await writeText(path.join(tempDir, "screens/ls-browser.md"), "{% render shared.md %}");
		await writeText(path.join(tempDir, "shared.md"), "Shared");
		const engine = createCommandLiquidEngine(tempDir);

		expect(renderLsTemplate(lsContext, { engine })).toBe("Shared");
	});
});

test("renderTopicTemplate supports standard Liquid composition from the templates root", async () => {
	await withTempDir("docs-topic-template-render-", async tempDir => {
		await writeText(path.join(tempDir, "screens/topic-browser.md"), "{% render shared.md %}");
		await writeText(path.join(tempDir, "shared.md"), "Shared");
		const engine = createCommandLiquidEngine(tempDir);

		expect(renderTopicTemplate(topicContext, { engine })).toBe("Shared");
	});
});

test("renderQueryTemplate supports standard Liquid composition from the templates root", async () => {
	await withTempDir("docs-query-template-render-", async tempDir => {
		await writeText(path.join(tempDir, "screens/query-results.md"), "{% render shared.md %}");
		await writeText(path.join(tempDir, "shared.md"), "Shared");
		const engine = createCommandLiquidEngine(tempDir);

		expect(renderQueryTemplate(queryContext, { engine })).toBe("Shared");
	});
});

test("renderParkTemplate supports standard Liquid composition from the templates root", async () => {
	await withTempDir("docs-park-template-render-", async tempDir => {
		await writeText(path.join(tempDir, "screens/park-success.md"), "{% render shared.md %}");
		await writeText(path.join(tempDir, "shared.md"), "Shared");
		const engine = createCommandLiquidEngine(tempDir);

		expect(renderParkTemplate(parkContext, { engine })).toBe("Shared");
	});
});
