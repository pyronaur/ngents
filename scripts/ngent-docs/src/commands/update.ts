import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { docsCommandUsage } from "../core/usage.ts";
import { runDocsUpdate } from "../runtime/update.ts";

const updateOptionsSchema = z.object({
	force: z.boolean().optional(),
});

export const updateCommand = defineCommand({
	path: ["update"],
	description: "Refresh registered fetches.",
	usage: docsCommandUsage.update,
	configure: command => {
		command.option("--force", "Refresh registered fetches regardless of freshness.");
	},
	optionsSchema: updateOptionsSchema,
	run: async ({ options }) => {
		await runDocsUpdate(options);
	},
});
