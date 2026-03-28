import { Command, CommanderError } from "commander";

import { commandDefinitions } from "../commands/index.ts";
import { runtimeError, usageError } from "../core/errors.ts";
import browseRender from "../runtime/browse-render.ts";
import { isBrowseSelectorNotFoundError } from "../runtime/browse-sources.ts";
import {
	readRegisteredDocsSelector,
	renderRootSelectorNotFound,
	runDocsBrowseSelector,
	runDocsParkedCollectionSelector,
} from "../runtime/browse.ts";
import helpRender from "../runtime/help-render.ts";
import { renderDocsRootHelp, runDocsRootHelp } from "../runtime/help.ts";
import { readDocsTopicSelector } from "../runtime/topic.ts";
import { registerCommand } from "./command-definition.ts";
import type { CommandDefinition } from "./contracts.ts";

const DOCS_ROOT_USAGE = "docs [options] [command]";

async function createProgram(projectDir: string): Promise<Command> {
	const program = new Command();
	program
		.name("docs")
		.description("Browse docs and run global vector search.")
		.helpOption("--help", "Display help for command.")
		.configureOutput({
			writeErr: () => {},
		})
		.showSuggestionAfterError()
		.exitOverride();
	for (const definition of commandDefinitions) {
		registerCommand({
			program,
			definition,
			projectDir,
		});
	}
	return program;
}

function isCommanderError(error: unknown): error is CommanderError {
	return error instanceof CommanderError;
}

function isDisplayedHelpError(error: CommanderError): boolean {
	return error.code === "commander.helpDisplayed" || error.message === "(outputHelp)";
}

function isDisplayedVersionError(error: CommanderError): boolean {
	return error.code === "commander.version";
}

function isDisplayedOutputError(error: CommanderError): boolean {
	return isDisplayedHelpError(error) || isDisplayedVersionError(error);
}

function toUsageMessage(error: CommanderError): string {
	const message = error.message.trim();
	if (message) {
		return message;
	}
	return "Invalid command usage.";
}

function toUsageLine(definition: CommandDefinition | undefined): string {
	if (!definition) {
		return `Usage: ${DOCS_ROOT_USAGE}`;
	}
	const suffix = definition.usage.length > 0 ? ` ${definition.usage}` : "";
	return `Usage: docs ${definition.path.join(" ")}${suffix}`;
}

function matchesPathPrefix(argv: string[], path: readonly string[]): boolean {
	if (argv.length < path.length) {
		return false;
	}
	return path.every((segment, index) => argv[index] === segment);
}

function findUsageDefinition(argv: string[]): CommandDefinition | undefined {
	let bestMatch: CommandDefinition | undefined;
	for (const definition of commandDefinitions) {
		if (!matchesPathPrefix(argv, definition.path)) {
			continue;
		}
		if (!bestMatch || definition.path.length > bestMatch.path.length) {
			bestMatch = definition;
		}
	}
	return bestMatch;
}

function rootCommandNames(): string[] {
	return commandDefinitions
		.filter(definition => definition.path.length === 1)
		.map(definition => definition.path[0] ?? "")
		.filter(name => name.length > 0);
}

function isRootCommand(token: string): boolean {
	return rootCommandNames().includes(token);
}

function isUnknownCommandError(error: CommanderError): boolean {
	return error.code === "commander.unknownCommand"
		|| error.message.startsWith("error: unknown command ");
}

async function readMultiTokenUnknownCommandRecovery(
	error: CommanderError,
	argv: string[],
): Promise<string | null> {
	const command = argv[0]?.trim();
	if (!command || argv.length < 2) {
		return null;
	}
	if (command.startsWith("-") || command === "help" || isRootCommand(command)) {
		return null;
	}
	if (!isUnknownCommandError(error)) {
		return null;
	}

	const rootHelp = await renderDocsRootHelp({
		includeDocsIndex: false,
	});
	return [
		error.message.trim(),
		"`docs <where>` accepts one selector.",
		`Use \`docs query ${argv.join(" ")}\` to search by multiple terms.`,
		rootHelp,
	].join("\n\n");
}

async function maybeRunRootSelectorFallback(argv: string[], projectDir: string): Promise<boolean> {
	if (argv.length !== 1) {
		return false;
	}

	const selector = argv[0]?.trim();
	if (!selector || isRootCommand(selector)) {
		return false;
	}

	if (await runDocsParkedCollectionSelector(projectDir, selector)) {
		return true;
	}

	const topic = await readDocsTopicSelector(projectDir, selector);
	const registeredDocs = await readRegisteredDocsSelector(projectDir, selector);
	if (topic && registeredDocs) {
		browseRender.printCombinedSelectorView(selector, topic, registeredDocs);
		return true;
	}

	if (topic) {
		browseRender.printTopicView(topic);
		return true;
	}

	if (registeredDocs) {
		browseRender.printDocsBrowser(registeredDocs, {
			title: `Docs: ${selector}`,
		});
		return true;
	}

	try {
		await runDocsBrowseSelector(projectDir, selector);
		return true;
	} catch (error) {
		if (!isBrowseSelectorNotFoundError(error)) {
			throw error;
		}

		throw runtimeError(await renderRootSelectorNotFound(projectDir, selector, rootCommandNames()));
	}
}

async function handleParseError(error: unknown, argv: string[]): Promise<void> {
	if (!isCommanderError(error)) {
		throw error;
	}
	if (isDisplayedOutputError(error)) {
		return;
	}
	const recovery = await readMultiTokenUnknownCommandRecovery(error, argv);
	if (recovery) {
		throw usageError(recovery);
	}
	const usageDefinition = findUsageDefinition(argv);
	throw usageError(`${toUsageMessage(error)}\n${toUsageLine(usageDefinition)}`);
}

async function parseProgram(program: Command, argv: string[]): Promise<void> {
	await program.parseAsync(argv, { from: "user" });
}

function readRootHelpRequest(
	argv: string[],
): { kind: "root"; includeDocsIndex: boolean } | { kind: "ops" } | { kind: "none" } {
	if (argv.length === 0) {
		return { kind: "root", includeDocsIndex: true };
	}
	if (argv.length === 1 && (argv[0] === "--init" || argv[0] === "-i")) {
		return { kind: "root", includeDocsIndex: true };
	}
	if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help")) {
		return { kind: "root", includeDocsIndex: false };
	}
	if (argv.length === 1 && argv[0] === "--ops-help") {
		return { kind: "ops" };
	}
	return { kind: "none" };
}

async function runDocsCli(argv: string[], projectDir: string): Promise<void> {
	const helpRequest = readRootHelpRequest(argv);
	if (helpRequest.kind === "root") {
		await runDocsRootHelp({
			includeDocsIndex: helpRequest.includeDocsIndex,
		});
		return;
	}
	if (helpRequest.kind === "ops") {
		helpRender.printOpsHelp();
		return;
	}

	if (await maybeRunRootSelectorFallback(argv, projectDir)) {
		return;
	}

	const program = await createProgram(projectDir);
	try {
		await parseProgram(program, argv);
	} catch (error) {
		await handleParseError(error, argv);
	}
}

export async function runDocsCliFromProcess(): Promise<void> {
	await runDocsCli(process.argv.slice(2), process.cwd());
}
