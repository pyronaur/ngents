import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { docsCommandUsage } from "../core/usage.ts";
import { runDocsQuery } from "../runtime/query.ts";

const queryOptionsSchema = z.object({
	limit: z.string().optional(),
});

export const queryCommand = defineCommand({
	path: ["query"],
	description: "Search the global docs index with QMD.",
	usage: docsCommandUsage.query,
	configure: (command) => {
		command
			.argument("[terms...]", "Query terms, or `status`.")
			.option("--limit <n>", "Limit query results (default: 5).");
	},
	optionsSchema: queryOptionsSchema,
	run: async ({ args, options }) => {
		await runDocsQuery(args, {
			limit: options.limit,
		});
	},
});
