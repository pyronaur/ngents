import { Command, CommanderError } from "commander";

import { commandDefinitions } from "../commands/index.ts";
import { runNdexRootHelp } from "../runtime/help.ts";
import { registerCommand } from "./command-definition.ts";
import { usageError } from "./errors.ts";

async function createProgram(projectDir: string): Promise<Command> {
	const program = new Command();
	program
		.name("ndex")
		.description("Browse docs and run global vector search.")
		.helpOption("--help", "Display help for command.")
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

function handleParseError(error: unknown): void {
	if (!isCommanderError(error)) {
		throw error;
	}
	if (isDisplayedOutputError(error)) {
		return;
	}
	throw usageError(toUsageMessage(error));
}

async function parseProgram(program: Command, argv: string[]): Promise<void> {
	await program.parseAsync(argv, { from: "user" });
}

function isRootHelpRequest(argv: string[]): { isHelp: boolean; includeDocsIndex: boolean } {
	if (argv.length === 0) {
		return { isHelp: true, includeDocsIndex: true };
	}
	if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help")) {
		return { isHelp: true, includeDocsIndex: false };
	}
	return { isHelp: false, includeDocsIndex: false };
}

export async function runNdexCli(argv: string[], projectDir: string): Promise<void> {
	const helpRequest = isRootHelpRequest(argv);
	if (helpRequest.isHelp) {
		await runNdexRootHelp({
			includeDocsIndex: helpRequest.includeDocsIndex,
		});
		return;
	}

	const program = await createProgram(projectDir);
	try {
		await parseProgram(program, argv);
	} catch (error) {
		handleParseError(error);
	}
}

export async function runNdexCliFromProcess(): Promise<void> {
	await runNdexCli(process.argv.slice(2), process.cwd());
}
