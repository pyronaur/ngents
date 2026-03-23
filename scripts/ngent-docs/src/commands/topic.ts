import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { docsCommandUsage } from "../core/usage.ts";
import { runDocsTopic } from "../runtime/topic.ts";

const topicOptionsSchema = z.object({});

export const topicCommand = defineCommand({
	path: ["topic"],
	description: "Browse merged local and global topics.",
	usage: docsCommandUsage.topic,
	configure: (command) => {
		command
			.argument("[topic]", "Topic to open.")
			.argument("[path]", "Path to focus within the topic.");
	},
	optionsSchema: topicOptionsSchema,
	run: async ({ args }) => {
		await runDocsTopic(args);
	},
});
