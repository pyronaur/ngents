export const docsCommandUsage = {
	ls: "[where]",
	query: "[--limit <n>] <query...> | status",
	topic: "[topic] [section]",
	update: "",
} as const;

export default {
	docsCommandUsage,
};
