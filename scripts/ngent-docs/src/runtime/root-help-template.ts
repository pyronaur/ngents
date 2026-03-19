import { fileURLToPath } from "node:url";

import { Liquid } from "liquidjs";

import { runtimeError } from "../core/errors.ts";

const ROOT_HELP_TEMPLATES_DIR = fileURLToPath(new URL("../../templates", import.meta.url));
const ROOT_HELP_TEMPLATE_NAME = "root-help.md";
const LINE_ENDING_PATTERN = /\r\n/g;

export type RootHelpDocsGroup = {
	directory_path: string;
	entry_lines: string[];
};

export type RootHelpTemplateContext = {
	ls_command: string;
	docs_groups: RootHelpDocsGroup[];
	ls_usage: string;
	park_command: string;
	park_usage: string;
	query_usage: string;
	show_docs_index: boolean;
	topic_command: string;
	topic_usage: string;
	topic_lines: string[];
	topics_header: string;
};

function fail(message: string): never {
	throw runtimeError(message);
}

function normalizeTemplateText(templateText: string): string {
	return templateText
		.replaceAll(LINE_ENDING_PATTERN, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.replace(/\n+$/, "");
}

const rootHelpLiquidEngine = createRootHelpLiquidEngine();

export function createRootHelpLiquidEngine(templatesDir = ROOT_HELP_TEMPLATES_DIR): Liquid {
	const engine = new Liquid({
		dynamicPartials: false,
		extname: "",
		layouts: [templatesDir],
		ownPropertyOnly: true,
		partials: [templatesDir],
		root: [templatesDir],
		strictFilters: true,
		strictVariables: true,
	});
	return engine;
}

export function renderRootHelpTemplate(
	context: RootHelpTemplateContext,
	options: {
		engine?: Liquid;
		templateName?: string;
	} = {},
): string {
	const engine = options.engine ?? rootHelpLiquidEngine;
	const templateName = options.templateName ?? ROOT_HELP_TEMPLATE_NAME;
	try {
		return normalizeTemplateText(engine.renderFileSync(templateName, context));
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		fail(`Failed to render root help template "${templateName}": ${reason}`);
	}
}

export default {
	createRootHelpLiquidEngine,
	renderRootHelpTemplate,
};
