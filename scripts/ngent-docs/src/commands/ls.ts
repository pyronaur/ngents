import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { docsCommandUsage } from "../core/usage.ts";
import { runDocsLs } from "../runtime/browse.ts";

const lsOptionsSchema = z.object({});

export const lsCommand = defineCommand({
	path: ["ls"],
	description: "Browse local and global docs directories.",
	usage: docsCommandUsage.ls,
	configure: (command) => {
		command.argument("[where]",
			"Optional docs selector: `.`, `global`, `./docs/...`, or `docs/...`.");
	},
	optionsSchema: lsOptionsSchema,
	run: async ({ args }) => {
		await runDocsLs(args);
	},
});
