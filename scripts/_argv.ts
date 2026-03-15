import mri from "mri";

type OptionConfig = {
	type: "boolean" | "string";
	short?: string;
};

type ParsedValues<T extends Record<string, OptionConfig>> = {
	[K in keyof T]: T[K]["type"] extends "boolean" ? boolean | undefined : string | undefined;
};

function scriptArgs(args?: string[]): string[] {
	if (args) {
		return [...args];
	}

	return process.argv.slice(2);
}

export function parseCommandArgs<T extends Record<string, OptionConfig>>(options: T, args?: string[]) {
	const boolean: string[] = [];
	const string: string[] = [];
	const alias: Record<string, string> = {};

	for (const [name, config] of Object.entries(options)) {
		if (config.type === "boolean") {
			boolean.push(name);
		}
		if (config.type === "string") {
			string.push(name);
		}
		if (config.short) {
			alias[config.short] = name;
		}
	}

	const parsed = mri(
		scriptArgs(args),
		Object.assign(
			{
				alias,
				boolean,
				string,
			},
			{ "--": true },
		),
	);

	const values = {} as ParsedValues<T>;
	for (const [name, config] of Object.entries(options) as [keyof T, T[keyof T]][]) {
		const value = parsed[name as string];
		if (config.type === "boolean") {
			values[name] = (typeof value === "boolean" ? value : undefined) as ParsedValues<T>[keyof T];
			continue;
		}

		if (typeof value === "string") {
			values[name] = value as ParsedValues<T>[keyof T];
			continue;
		}

		if (Array.isArray(value) && typeof value[0] === "string") {
			values[name] = value[0] as ParsedValues<T>[keyof T];
			continue;
		}

		values[name] = undefined as ParsedValues<T>[keyof T];
	}

	return {
		positionals: parsed._.map(value => String(value)),
		passthrough: Array.isArray(parsed["--"]) ? parsed["--"].map(value => String(value)) : [],
		values,
	};
}

export function fail(message: string): never {
	console.error(message);
	process.exit(1);
}
