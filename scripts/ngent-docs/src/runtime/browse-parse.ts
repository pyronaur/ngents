import path from "node:path";

import type {
	FrontMatterParseResult,
	FrontMatterValue,
	MarkdownEntry,
	SkillEntry,
} from "./browse-contracts.ts";
import browseContracts from "./browse-contracts.ts";

const { compactStrings, firstContentParagraph, stripQuotes } = browseContracts;

type PositionedLine = {
	index: number;
	line: string;
	indent: number;
};

type FrontMatterCollection = {
	values: Map<string, FrontMatterValue>;
	nextIndex: number;
};

function lineIndent(line: string): number {
	return line.match(/^(\s*)/)?.[1]?.length ?? 0;
}

function parseInlineArray(value: string): string[] {
	const normalized = value.trim();
	if (!normalized.startsWith("[") || !normalized.endsWith("]")) {
		return [];
	}

	const values: string[] = [];
	let token = "";
	let quote: "'" | "\"" | null = null;

	for (const char of normalized.slice(1, -1)) {
		if ((char === "'" || char === "\"") && quote === null) {
			quote = char;
			continue;
		}
		if (char === quote) {
			quote = null;
			continue;
		}
		if (char === "," && quote === null) {
			values.push(token);
			token = "";
			continue;
		}
		token += char;
	}

	if (quote !== null) {
		return [];
	}

	values.push(token);
	return compactStrings(values).map(stripQuotes);
}

function frontMatterKeyPattern(): RegExp {
	return /^(\s*)([A-Za-z0-9_./-]+):(.*)$/;
}

function nextMeaningfulLine(lines: string[], startIndex: number): PositionedLine | null {
	for (let index = startIndex; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		if (line.trim().length === 0) {
			continue;
		}

		const indent = lineIndent(line);
		return { index, line, indent };
	}

	return null;
}

function parseFrontMatterList(
	lines: string[],
	startIndex: number,
	indent: number,
): FrontMatterCollection {
	const values: string[] = [];
	let index = startIndex;

	for (;;) {
		const nextLine = nextMeaningfulLine(lines, index);
		if (!nextLine) {
			break;
		}

		index = nextLine.index;
		const currentIndent = nextLine.indent;
		if (currentIndent < indent || currentIndent !== indent) {
			break;
		}

		const listMatch = nextLine.line.match(/^\s*-\s+(.*)$/);
		if (!listMatch) {
			break;
		}

		values.push(stripQuotes(listMatch[1] ?? ""));
		index += 1;
	}

	return { values: new Map([["value", compactStrings(values)]]), nextIndex: index };
}

function blockIndentForLine(nextLine: PositionedLine | null, currentIndent: number): number {
	if (!nextLine || nextLine.indent <= currentIndent) {
		return currentIndent + 2;
	}
	return nextLine.indent;
}

function parseFrontMatterBlock(
	lines: string[],
	context: { startIndex: number; indent: number; value: string },
): { blockValue: string; nextIndex: number } {
	const nextLine = nextMeaningfulLine(lines, context.startIndex);
	const blockIndent = blockIndentForLine(nextLine, context.indent);
	const blockLines: string[] = [];
	let index = context.startIndex;

	for (; index < lines.length; index += 1) {
		const nextRawLine = lines[index] ?? "";
		if (nextRawLine.trim().length === 0) {
			blockLines.push("");
			continue;
		}

		const nextIndent = nextRawLine.match(/^(\s*)/)?.[1]?.length ?? 0;
		if (nextIndent < blockIndent) {
			break;
		}

		blockLines.push(nextRawLine.slice(Math.min(blockIndent, nextRawLine.length)));
	}

	const blockValue = context.value.startsWith(">")
		? collectFoldedLines(blockLines)
		: blockLines.join("\n").trim();
	return { blockValue, nextIndex: index };
}

function parseStructuredFrontMatterValue(
	lines: string[],
	context: { startIndex: number; indent: number; value: string },
): { parsedValue: FrontMatterValue; nextIndex: number } | null {
	if (context.value === "" || context.value === "[]") {
		const nextLine = nextMeaningfulLine(lines, context.startIndex);
		if (!nextLine || nextLine.indent <= context.indent) {
			return {
				parsedValue: context.value === "[]" ? [] : "",
				nextIndex: context.startIndex,
			};
		}

		if (/^\s*-\s+/.test(nextLine.line)) {
			const parsed = parseFrontMatterList(lines, context.startIndex, nextLine.indent);
			return {
				parsedValue: parsed.values.get("value") ?? [],
				nextIndex: parsed.nextIndex,
			};
		}

		if (frontMatterKeyPattern().test(nextLine.line)) {
			const parsed = parseFrontMatterMap(lines, context.startIndex, nextLine.indent);
			return {
				parsedValue: parsed.values,
				nextIndex: parsed.nextIndex,
			};
		}

		return { parsedValue: "", nextIndex: context.startIndex };
	}

	if (
		context.value !== ">" && context.value !== ">-" && context.value !== "|"
		&& context.value !== "|-"
	) {
		return null;
	}

	const parsedBlock = parseFrontMatterBlock(lines, context);
	return {
		parsedValue: parsedBlock.blockValue,
		nextIndex: parsedBlock.nextIndex,
	};
}

function parseFrontMatterEntry(
	lines: string[],
	index: number,
	indent: number,
): { key: string; value: string; currentIndent: number } | null {
	const rawLine = lines[index] ?? "";
	if (rawLine.trim().length === 0) {
		return null;
	}

	const keyMatch = rawLine.match(frontMatterKeyPattern());
	if (!keyMatch) {
		return null;
	}

	const currentIndent = keyMatch[1]?.length ?? 0;
	if (currentIndent != indent) {
		return null;
	}

	return {
		key: keyMatch[2] ?? "",
		value: (keyMatch[3] ?? "").trim(),
		currentIndent,
	};
}

function parseFrontMatterMap(
	lines: string[],
	startIndex: number,
	indent: number,
): FrontMatterCollection {
	const values = new Map<string, FrontMatterValue>();
	let index = startIndex;

	for (; index < lines.length;) {
		const entry = parseFrontMatterEntry(lines, index, indent);
		if (!entry) {
			const rawLine = lines[index] ?? "";
			if (rawLine.trim().length === 0) {
				index += 1;
				continue;
			}
			break;
		}

		index += 1;
		const structuredValue = parseStructuredFrontMatterValue(lines, {
			startIndex: index,
			indent: entry.currentIndent,
			value: entry.value,
		});
		if (structuredValue) {
			values.set(entry.key, structuredValue.parsedValue);
			index = structuredValue.nextIndex;
			continue;
		}

		if (entry.value.startsWith("[") && entry.value.endsWith("]")) {
			values.set(entry.key, parseInlineArray(entry.value));
			continue;
		}

		values.set(entry.key, stripQuotes(entry.value));
	}

	return { values, nextIndex: index };
}

function contentWithoutFrontMatter(content: string): string {
	const normalized = content.replaceAll("\r\n", "\n");
	if (!normalized.startsWith("---\n")) {
		return normalized;
	}

	const endIndex = normalized.indexOf("\n---", 4);
	if (endIndex === -1) {
		return normalized;
	}

	return normalized.slice(endIndex + "\n---".length).replace(/^\n+/, "");
}

function parseFrontMatter(content: string): FrontMatterParseResult {
	const normalized = content.replaceAll("\r\n", "\n");
	if (!normalized.startsWith("---\n")) {
		return { found: false, values: new Map() };
	}

	const endIndex = normalized.indexOf("\n---", 4);
	if (endIndex === -1) {
		return { found: true, values: new Map(), error: "unterminated front matter" };
	}

	const lines = normalized.slice(4, endIndex).split("\n");
	return { found: true, values: parseFrontMatterMap(lines, 0, 0).values };
}

function stringField(values: Map<string, FrontMatterValue>, key: string): string | null {
	const value = values.get(key);
	if (typeof value !== "string") {
		return null;
	}

	const normalized = value.trim();
	if (normalized.length === 0) {
		return null;
	}

	return normalized;
}

function stringArrayField(values: Map<string, FrontMatterValue>, key: string): string[] {
	const value = values.get(key);
	if (!Array.isArray(value)) {
		return [];
	}

	return compactStrings(value);
}

function hintMapField(values: Map<string, FrontMatterValue>, key: string): Map<string, string> {
	const entries = stringArrayField(values, key);
	const hints = new Map<string, string>();

	for (const entry of entries) {
		const separatorIndex = entry.indexOf(":");
		if (separatorIndex <= 0) {
			continue;
		}

		const hintKey = entry.slice(0, separatorIndex).trim();
		const hintValue = entry.slice(separatorIndex + 1).trim();
		if (hintKey.length === 0 || hintValue.length === 0) {
			continue;
		}

		hints.set(hintKey, hintValue);
	}

	return hints;
}

function markdownBasename(relativePath: string): string {
	return path.basename(relativePath, path.extname(relativePath));
}

function titleField(values: Map<string, FrontMatterValue>): string | null {
	return stringField(values, "title") ?? stringField(values, "name");
}

function collectFoldedLines(lines: string[]): string {
	const paragraphs: string[] = [];
	let current: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.length === 0) {
			if (current.length > 0) {
				paragraphs.push(current.join(" "));
				current = [];
			}
			continue;
		}

		current.push(trimmed);
	}

	if (current.length > 0) {
		paragraphs.push(current.join(" "));
	}

	return paragraphs.join("\n\n").trim();
}

function parseGuideBody(content: string): string | null {
	const lines = contentWithoutFrontMatter(content).split("\n");
	const rendered: string[] = [];
	let skippedTitle = false;
	let inCodeBlock = false;

	for (const rawLine of lines) {
		const trimmed = rawLine.trim();
		if (trimmed.startsWith("```")) {
			inCodeBlock = !inCodeBlock;
			continue;
		}
		if (inCodeBlock) {
			continue;
		}
		if (!skippedTitle && trimmed.startsWith("#")) {
			skippedTitle = true;
			continue;
		}
		if (trimmed.length === 0) {
			if (rendered[rendered.length - 1] !== "") {
				rendered.push("");
			}
			continue;
		}

		rendered.push(trimmed);
	}
	const normalized = rendered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
	if (normalized.length === 0) {
		return null;
	}
	return normalized;
}

function parseGuideSummary(content: string): string | null {
	const guideBody = parseGuideBody(content);
	return firstContentParagraph(guideBody);
}

function parseMarkdownTitle(content: string): string | null {
	const lines = contentWithoutFrontMatter(content).split("\n");
	for (const rawLine of lines) {
		const trimmed = rawLine.trim();
		if (!trimmed.startsWith("#")) {
			continue;
		}
		const title = trimmed.replace(/^#+\s*/, "").trim();
		if (title.length > 0) {
			return title;
		}
	}
	return null;
}

function parseMarkdownEntry(
	content: string,
	relativePath: string,
): Pick<MarkdownEntry, "title" | "short" | "summary" | "readWhen" | "error"> {
	const frontMatter = parseFrontMatter(content);
	if (frontMatter.error) {
		return {
			title: markdownBasename(relativePath),
			short: null,
			summary: null,
			readWhen: [],
			error: frontMatter.error,
		};
	}
	return {
		title: titleField(frontMatter.values)
			?? parseMarkdownTitle(content)
			?? markdownBasename(relativePath),
		short: stringField(frontMatter.values, "short"),
		summary: stringField(frontMatter.values, "summary")
			?? stringField(frontMatter.values, "description"),
		readWhen: stringArrayField(frontMatter.values, "read_when"),
	};
}

function parseSkillEntry(content: string, relativePath: string): SkillEntry {
	const frontMatter = parseFrontMatter(content);
	const fallbackName = path.basename(path.dirname(relativePath)) || path.basename(relativePath);
	if (frontMatter.error) {
		return {
			absolutePath: "",
			relativePath,
			name: fallbackName,
			title: fallbackName,
			description: null,
			hint: null,
			error: frontMatter.error,
			referencePaths: [],
		};
	}

	return {
		absolutePath: "",
		relativePath,
		name: stringField(frontMatter.values, "name") ?? fallbackName,
		title: titleField(frontMatter.values) ?? fallbackName,
		description: stringField(frontMatter.values, "description"),
		hint: null,
		referencePaths: [],
	};
}

export default {
	hintMapField,
	parseFrontMatter,
	parseGuideBody,
	parseGuideSummary,
	parseMarkdownEntry,
	parseSkillEntry,
	stringArrayField,
	stringField,
};
