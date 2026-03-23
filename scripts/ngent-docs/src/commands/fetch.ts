import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { docsCommandUsage } from "../core/usage.ts";
import { runDocsFetch } from "../runtime/fetch.ts";

const fetchOptionsSchema = z.object({
	handler: z.string(),
	root: z.string().optional(),
	transform: z.string().optional(),
});

export const fetchCommand = defineCommand({
	path: ["fetch"],
	description: "Register and refresh fetched docs through an external handler CLI.",
	usage: docsCommandUsage.fetch,
	configure: (command) => {
		command
			.argument("<source>", "Fetch source URL.")
			.argument("<path>", "Target directory inside a discovered docs root.")
			.requiredOption(
				"--handler <command>",
				"Fetch handler CLI to run. Use `git` or `url` for the built-in handlers.",
			)
			.option("--root <subpath>", "Handler-specific subtree or source root.")
			.option("--transform <command>", "Optional transform CLI passed through to the handler.");
	},
	optionsSchema: fetchOptionsSchema,
	run: async ({ args, options, projectDir }) => {
		const source = args[0];
		const targetPath = args[1];
		if (!source || !targetPath) {
			throw new Error("docs fetch requires <source> and <path>");
		}

		await runDocsFetch({
			projectDir,
			source,
			targetArg: targetPath,
			handler: options.handler,
			root: options.root,
			transform: options.transform,
		});
	},
});
