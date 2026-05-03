import type { Command } from "commander";
import type { output, ZodType } from "zod";

type CommandRunContext<TOptions> = {
	projectDir: string;
	args: string[];
	options: TOptions;
};

type CommandPath = readonly [string, ...string[]];

export type CommandDefinition<TSchema extends ZodType = ZodType> = {
	path: CommandPath;
	description: string;
	usage: string;
	configure?: (command: Command) => void;
	optionsSchema: TSchema;
	run: (context: CommandRunContext<output<TSchema>>) => Promise<void>;
};
