import { Command } from "commander";

import type { FetchHandlerInvocation } from "./fetch-contract.ts";

function createFetchHandlerCommand(commandName: string): Command {
	return new Command(commandName)
		.description("Fetch docs through the handler contract used by docs fetch.")
		.helpOption("--help", "Display help for command.")
		.requiredOption("--source <source>", "Fetch source URL.")
		.requiredOption("--target <path>", "Handler-managed target directory.")
		.requiredOption("--previous-hash <hash>", "Previously stored source fingerprint.")
		.option("--root <subpath>", "Optional subtree or handler-specific source root.")
		.option("--transform <command>", "Optional transform command passed through to the handler.");
}

export function parseFetchHandlerInvocation(input: {
	commandName: string;
	argv: string[];
}): FetchHandlerInvocation {
	const command = createFetchHandlerCommand(input.commandName);
	command.parse(input.argv, { from: "user" });

	const options = command.opts<{
		source: string;
		target: string;
		previousHash: string;
		root?: string;
		transform?: string;
	}>();

	return {
		source: options.source,
		target: options.target,
		previousHash: options.previousHash,
		root: options.root,
		transform: options.transform,
	};
}
