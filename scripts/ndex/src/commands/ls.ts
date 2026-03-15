import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { runNdexLs } from "../runtime/browse.ts";

const lsOptionsSchema = z.object({
	expand: z.boolean().optional().default(false),
	global: z.boolean().optional().default(false),
});

export const lsCommand = defineCommand({
	path: ["ls"],
	description: "Browse local or global docs roots, topics, and sections.",
	configure: (command) => {
		command
			.argument("[topic]", "Topic to open.")
			.argument("[section]", "Section to focus within the topic.")
			.option("--expand", "Show nested skill references and file-level contents.")
			.option("-g, --global", "Only include docs from ~/.ngents/docs for browsing.")
			.usage("[topic] [section] [--expand] [--global]");
	},
	optionsSchema: lsOptionsSchema,
	run: async ({ args, options }) => {
		await runNdexLs(args, {
			expand: options.expand,
			global: options.global,
		});
	},
});
