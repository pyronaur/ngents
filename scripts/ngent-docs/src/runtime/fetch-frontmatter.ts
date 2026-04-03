import type { FrontMatterObject, FrontMatterValue } from "./browse-contracts.ts";
import browseContracts from "./browse-contracts.ts";
import browseParse from "./browse-parse.ts";

const { compactStrings } = browseContracts;

const MERGED_FRONTMATTER_KEYS = ["title", "short", "summary", "read_when"] as const;

type MergedFrontMatterKey = (typeof MERGED_FRONTMATTER_KEYS)[number];

type ParsedMarkdownFrontMatter = {
	found: boolean;
	values: FrontMatterObject;
	body: string;
};

function splitMarkdownFrontMatter(content: string): ParsedMarkdownFrontMatter {
	const normalized = content.replaceAll("\r\n", "\n");
	if (!normalized.startsWith("---\n")) {
		return {
			found: false,
			values: new Map(),
			body: normalized,
		};
	}

	const endIndex = normalized.indexOf("\n---", 4);
	if (endIndex === -1) {
		return {
			found: false,
			values: new Map(),
			body: normalized,
		};
	}

	const parsed = browseParse.parseFrontMatter(normalized);
	if (!parsed.found || parsed.error) {
		return {
			found: false,
			values: new Map(),
			body: normalized,
		};
	}

	return {
		found: true,
		values: cloneFrontMatterObject(parsed.values),
		body: normalized.slice(endIndex + "\n---".length).replace(/^\n+/, ""),
	};
}

function cloneFrontMatterValue(value: FrontMatterValue): FrontMatterValue {
	if (Array.isArray(value)) {
		return [...value];
	}
	if (value instanceof Map) {
		return cloneFrontMatterObject(value);
	}
	return value;
}

function cloneFrontMatterObject(values: FrontMatterObject): FrontMatterObject {
	return new Map(
		Array.from(values.entries(), ([key, value]) => [key, cloneFrontMatterValue(value)]),
	);
}

function hasMeaningfulFrontMatterValue(value: FrontMatterValue | undefined): boolean {
	if (typeof value === "string") {
		return value.trim().length > 0;
	}
	if (Array.isArray(value)) {
		return compactStrings(value).length > 0;
	}
	if (value instanceof Map) {
		return value.size > 0;
	}
	return false;
}

function mergedValueForKey(
	key: MergedFrontMatterKey,
	localValues: FrontMatterObject,
	incomingValues: FrontMatterObject,
): FrontMatterValue | undefined {
	const incomingValue = incomingValues.get(key);
	if (hasMeaningfulFrontMatterValue(incomingValue)) {
		return cloneFrontMatterValue(incomingValue as FrontMatterValue);
	}

	const localValue = localValues.get(key);
	if (hasMeaningfulFrontMatterValue(localValue)) {
		return cloneFrontMatterValue(localValue as FrontMatterValue);
	}

	return undefined;
}

function quoteScalar(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

function isYamlBooleanLike(value: string): boolean {
	return /^(?:true|false|yes|no|on|off)$/i.test(value);
}

function isYamlNullLike(value: string): boolean {
	return /^(?:null|~)$/i.test(value);
}

function isYamlNumericLike(value: string): boolean {
	return /^[-+]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?$/.test(value);
}

function shouldQuoteScalar(value: string): boolean {
	if (value.length === 0) {
		return true;
	}
	if (value.trim() !== value) {
		return true;
	}
	if (value === "---" || value === "...") {
		return true;
	}
	if (isYamlBooleanLike(value) || isYamlNullLike(value) || isYamlNumericLike(value)) {
		return true;
	}
	if (/^[\-[\]{}#&*!|>'"%@`,]/.test(value)) {
		return true;
	}
	if (/^[?:](?:\s|$)/.test(value)) {
		return true;
	}
	if (value.endsWith(":") || value.includes(": ")) {
		return true;
	}
	if (value.includes("\t")) {
		return true;
	}
	if (/(?:^|\s)#/.test(value)) {
		return true;
	}

	return false;
}

function serializeScalar(value: string): string {
	if (shouldQuoteScalar(value)) {
		return quoteScalar(value);
	}

	return value;
}

function serializeFrontMatterValue(
	key: string,
	value: FrontMatterValue,
	indent: number,
): string[] {
	const prefix = `${" ".repeat(indent)}${key}:`;

	if (typeof value === "string") {
		if (value.includes("\n")) {
			return [
				`${prefix} |`,
				...value.split("\n").map(line => `${" ".repeat(indent + 2)}${line}`),
			];
		}

		return [`${prefix} ${serializeScalar(value)}`];
	}

	if (Array.isArray(value)) {
		const items = compactStrings(value);
		if (items.length === 0) {
			return [`${prefix} []`];
		}

		return [
			`${prefix}`,
			...items.map(item => `${" ".repeat(indent + 2)}- ${serializeScalar(item)}`),
		];
	}

	if (value.size === 0) {
		return [`${prefix} {}`];
	}

	return [
		`${prefix}`,
		...Array.from(value.entries()).flatMap(([childKey, childValue]) =>
			serializeFrontMatterValue(childKey, childValue, indent + 2)
		),
	];
}

function serializeFrontMatter(values: FrontMatterObject): string | null {
	if (values.size === 0) {
		return null;
	}

	return [
		"---",
		...Array.from(values.entries()).flatMap(([key, value]) =>
			serializeFrontMatterValue(key, value, 0)
		),
		"---",
	].join("\n");
}

export function mergeFetchedMarkdownFrontMatter(input: {
	localContent: string | null;
	incomingContent: string;
}): string {
	const local = splitMarkdownFrontMatter(input.localContent ?? "");
	const incoming = splitMarkdownFrontMatter(input.incomingContent);
	const mergedValues = cloneFrontMatterObject(incoming.values);

	for (const key of MERGED_FRONTMATTER_KEYS) {
		const mergedValue = mergedValueForKey(key, local.values, incoming.values);
		if (mergedValue === undefined) {
			mergedValues.delete(key);
			continue;
		}

		mergedValues.set(key, mergedValue);
	}

	const frontMatter = serializeFrontMatter(mergedValues);
	if (!frontMatter) {
		return incoming.body;
	}
	if (incoming.body.length === 0) {
		return `${frontMatter}\n`;
	}

	return `${frontMatter}\n\n${incoming.body}`;
}

export default {
	mergeFetchedMarkdownFrontMatter,
};
