import type { ZodType } from "zod";

import type { CommandDefinition } from "../core/contracts.ts";
import { lsCommand } from "./ls.ts";
import { queryCommand } from "./query.ts";

export const commandDefinitions: CommandDefinition<ZodType>[] = [lsCommand, queryCommand];
