import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { runDocsQuery } from "../runtime/query.ts";

const queryOptionsSchema = z.object({
	limit: z.string().optional(),
});

export const queryCommand = defineCommand({
	path: ["query"],
	description: "Search the global ~/.ngents/docs library with QMD.",
	configure: (command) => {
		command
			.argument("[terms...]", "Query terms, or `status`.")
			.option("--limit <n>", "Limit query results (default: 5).")
			.usage("[--limit <n>] <query...> | status");
	},
	optionsSchema: queryOptionsSchema,
	run: async ({ args, options }) => {
		await runDocsQuery(args, {
			limit: options.limit,
		});
	},
});
