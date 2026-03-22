export const docsCommandUsage = {
	fetch: "<source> <path> [--root <subpath>] [--handler <command>] [--transform <command>]",
	ls: "[where]",
	park: "<name> [path]",
	query: "[--limit <n>] <query...> | status",
	topic: "[topic] [section]",
	update: "",
} as const;

export default {
	docsCommandUsage,
};
