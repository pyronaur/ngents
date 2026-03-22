import { fileURLToPath } from "node:url";

import { Liquid } from "liquidjs";

import { runtimeError } from "../core/errors.ts";

const ROOT_HELP_TEMPLATES_DIR = fileURLToPath(new URL("../../templates", import.meta.url));
const ROOT_HELP_TEMPLATE_NAME = "root-help.md";
const OPS_HELP_TEMPLATE_NAME = "ops-help.md";
const LINE_ENDING_PATTERN = /\r\n/g;

export type RootHelpDocsGroup = {
	directory_path: string;
	entry_lines: string[];
};

export type RootHelpTemplateContext = {
	ls_command: string;
	docs_groups: RootHelpDocsGroup[];
	ls_usage: string;
	query_usage: string;
	show_docs_index: boolean;
	topic_command: string;
	topic_usage: string;
	topic_lines: string[];
	topics_header: string;
};

export type OpsHelpTemplateContext = {
	fetch_command: string;
	fetch_usage: string;
	park_command: string;
	park_usage: string;
	update_command: string;
	update_usage: string;
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

function renderHelpTemplate(
	context: RootHelpTemplateContext | OpsHelpTemplateContext,
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

function renderNamedHelpTemplate(
	context: RootHelpTemplateContext | OpsHelpTemplateContext,
	defaultTemplateName: string,
	options: {
		engine?: Liquid;
		templateName?: string;
	} = {},
): string {
	return renderHelpTemplate(context, {
		engine: options.engine,
		templateName: options.templateName ?? defaultTemplateName,
	});
}

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
	return renderNamedHelpTemplate(context, ROOT_HELP_TEMPLATE_NAME, options);
}

export function renderOpsHelpTemplate(
	context: OpsHelpTemplateContext,
	options: {
		engine?: Liquid;
		templateName?: string;
	} = {},
): string {
	return renderNamedHelpTemplate(context, OPS_HELP_TEMPLATE_NAME, options);
}

export default {
	createRootHelpLiquidEngine,
	renderOpsHelpTemplate,
	renderRootHelpTemplate,
};
