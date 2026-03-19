import type { ZodType } from "zod";

import type { CommandDefinition } from "../core/contracts.ts";
import { lsCommand } from "./ls.ts";
import { parkCommand } from "./park.ts";
import { queryCommand } from "./query.ts";
import { topicCommand } from "./topic.ts";
import { updateCommand } from "./update.ts";

export const commandDefinitions: CommandDefinition<ZodType>[] = [
	lsCommand,
	parkCommand,
	topicCommand,
	queryCommand,
	updateCommand,
];
