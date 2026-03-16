import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { runNdexUpdate } from "../runtime/update.ts";

export const updateCommand = defineCommand({
	path: ["update"],
	description: "Refresh the global ~/.ngents/docs QMD index and embeddings.",
	optionsSchema: z.object({}),
	run: async () => {
		await runNdexUpdate();
	},
});
