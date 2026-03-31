export const docsCommandUsage = {
	fetch: "<source> <path> --handler <command> [--root <subpath>] [--transform <command>] [--force]",
	ls: "[where...]",
	park: "<name> [path]",
	query: "[--limit <n>] <query...> | status",
	topic: "[topic] [path]",
	update: "",
} as const;
