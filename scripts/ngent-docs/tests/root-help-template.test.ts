import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
	createRootHelpLiquidEngine,
	renderOpsHelpTemplate,
	renderRootHelpTemplate,
	type OpsHelpTemplateContext,
	type RootHelpTemplateContext,
} from "../src/runtime/root-help-template.ts";

const rootHelpTemplateContext: RootHelpTemplateContext = {
	docs_groups: [],
	ls_command: "docs ls",
	ls_usage: "docs ls [where]",
	query_usage: "docs query [--limit <n>] <query...> | status",
	show_docs_index: false,
	topic_command: "docs topic",
	topic_usage: "docs topic [topic] [section]",
	topic_lines: [],
	topics_header: "TOPIC  TITLE  DESCRIPTION",
};

const opsHelpTemplateContext: OpsHelpTemplateContext = {
	fetch_command: "docs fetch",
	fetch_usage:
		"docs fetch <source> <path> [--root <subpath>] [--handler <command>] [--transform <command>]",
	park_command: "docs park",
	park_usage: "docs park <name> [path]",
	update_command: "docs update",
	update_usage: "docs update",
};

async function makeTempDir(prefix: string): Promise<string> {
	return mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeText(filePath: string, contents: string): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, contents);
}

async function withTempDir<T>(prefix: string, run: (dir: string) => Promise<T>): Promise<T> {
	const dir = await makeTempDir(prefix);
	try {
		return await run(dir);
	} finally {
		await rm(dir, { force: true, recursive: true });
	}
}

test("renderRootHelpTemplate fails with a clear error when the template file is missing", async () => {
	await withTempDir("docs-root-help-template-missing-", async tempDir => {
		const engine = createRootHelpLiquidEngine(tempDir);

		expect(() => renderRootHelpTemplate(rootHelpTemplateContext, { engine })).toThrowError(
			'Failed to render root help template "root-help.md":',
		);
	});
});

test("renderRootHelpTemplate fails on Liquid syntax errors", async () => {
	await withTempDir("docs-root-help-template-parse-", async tempDir => {
		await writeText(path.join(tempDir, "root-help.md"), "{% if show_docs_index %}");
		const engine = createRootHelpLiquidEngine(tempDir);

		expect(() => renderRootHelpTemplate(rootHelpTemplateContext, { engine })).toThrowError(
			'Failed to render root help template "root-help.md":',
		);
	});
});

test("renderRootHelpTemplate fails when a required variable is missing", async () => {
	await withTempDir("docs-root-help-template-var-", async tempDir => {
		await writeText(path.join(tempDir, "root-help.md"), "{{ missing_var }}");
		const engine = createRootHelpLiquidEngine(tempDir);

		expect(() => renderRootHelpTemplate(rootHelpTemplateContext, { engine })).toThrowError(
			'Failed to render root help template "root-help.md": undefined variable: missing_var',
		);
	});
});

test("renderRootHelpTemplate fails on unknown filters", async () => {
	await withTempDir("docs-root-help-template-filter-", async tempDir => {
		await writeText(path.join(tempDir, "root-help.md"), "{{ 'x' | missing_filter }}");
		const engine = createRootHelpLiquidEngine(tempDir);

		expect(() => renderRootHelpTemplate(rootHelpTemplateContext, { engine })).toThrowError(
			'Failed to render root help template "root-help.md": undefined filter: missing_filter',
		);
	});
});

test("renderRootHelpTemplate supports standard Liquid composition from the templates root", async () => {
	await withTempDir("docs-root-help-template-render-", async tempDir => {
		await writeText(
			path.join(tempDir, "root-help.md"),
			["Before", "{% render shared.md %}", "After"].join("\n"),
		);
		await writeText(path.join(tempDir, "shared.md"), "Shared");
		const engine = createRootHelpLiquidEngine(tempDir);

		expect(renderRootHelpTemplate(rootHelpTemplateContext, { engine })).toBe(
			["Before", "Shared", "After"].join("\n"),
		);
	});
});

test("renderOpsHelpTemplate supports standard Liquid composition from the templates root", async () => {
	await withTempDir("docs-ops-help-template-render-", async tempDir => {
		await writeText(
			path.join(tempDir, "ops-help.md"),
			["Before", "{% render shared.md %}", "After"].join("\n"),
		);
		await writeText(path.join(tempDir, "shared.md"), "Shared");
		const engine = createRootHelpLiquidEngine(tempDir);

		expect(renderOpsHelpTemplate(opsHelpTemplateContext, { engine })).toBe(
			["Before", "Shared", "After"].join("\n"),
		);
	});
});
