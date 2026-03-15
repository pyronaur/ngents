import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { runNdexLs } from "../runtime/browse.ts";

const lsOptionsSchema = z.object({});

export const lsCommand = defineCommand({
	path: ["ls"],
	description: "Browse local and global docs directories.",
	configure: (command) => {
		command
			.argument("[where]", "Optional docs selector: `.`, `global`, or `docs/...`.")
			.usage("[where]");
	},
	optionsSchema: lsOptionsSchema,
	run: async ({ args }) => {
		await runNdexLs(args);
	},
});
