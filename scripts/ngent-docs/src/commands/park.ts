import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { docsCommandUsage } from "../core/usage.ts";
import { runDocsPark } from "../runtime/park.ts";

const parkOptionsSchema = z.object({});

export const parkCommand = defineCommand({
	path: ["park"],
	description: "Attach a docs root to the global docs index.",
	usage: docsCommandUsage.park,
	configure: (command) => {
		command
			.argument("<name>", "Collection name to park under.")
			.argument("[path]", "Optional project or docs directory (defaults to `.`).");
	},
	optionsSchema: parkOptionsSchema,
	run: async ({ args }) => {
		await runDocsPark(args);
	},
});
