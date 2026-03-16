import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { runDocsTopic } from "../runtime/topic.ts";

const topicOptionsSchema = z.object({});

export const topicCommand = defineCommand({
	path: ["topic"],
	description: "Browse merged local and global topics.",
	configure: (command) => {
		command
			.argument("[topic]", "Topic to open.")
			.argument("[section]", "Section to focus within the topic.")
			.usage("[topic] [section]");
	},
	optionsSchema: topicOptionsSchema,
	run: async ({ args }) => {
		await runDocsTopic(args);
	},
});
