import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { docsCommandUsage } from "../core/usage.ts";
import { runDocsRecent } from "../runtime/recent.ts";

const recentOptionsSchema = z.object({});

export const recentCommand = defineCommand({
	path: ["recent"],
	description: "List docs agents read recently, in this project and globally.",
	usage: docsCommandUsage.recent,
	optionsSchema: recentOptionsSchema,
	run: async ({ projectDir }) => {
		await runDocsRecent(projectDir);
	},
});
