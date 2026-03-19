import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { docsCommandUsage } from "../core/usage.ts";
import { runDocsUpdate } from "../runtime/update.ts";

export const updateCommand = defineCommand({
	path: ["update"],
	description: "Refresh the global docs QMD index and embeddings.",
	usage: docsCommandUsage.update,
	optionsSchema: z.object({}),
	run: async () => {
		await runDocsUpdate();
	},
});
