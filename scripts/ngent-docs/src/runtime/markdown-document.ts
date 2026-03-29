import { readFile } from "node:fs/promises";
import path from "node:path";

import type { MarkdownDocument } from "./browse-contracts.ts";
import browseParse from "./browse-parse.ts";

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

function parseMarkdownBody(content: string): string | null {
	const lines = contentWithoutFrontMatter(content).split("\n");
	let startIndex = 0;

	while (startIndex < lines.length && (lines[startIndex]?.trim().length ?? 0) === 0) {
		startIndex += 1;
	}

	const firstLine = lines[startIndex]?.trim() ?? "";
	if (firstLine.startsWith("#")) {
		startIndex += 1;
	}

	const body = lines.slice(startIndex).join("\n").replace(/^\n+/, "").trimEnd();
	if (body.length === 0) {
		return null;
	}

	return body;
}

export async function readMarkdownDocument(
	absolutePath: string,
	relativePath = path.basename(absolutePath),
): Promise<MarkdownDocument> {
	const content = await readFile(absolutePath, "utf8");
	const parsed = browseParse.parseMarkdownEntry(content, relativePath);
	return {
		absolutePath,
		body: parseMarkdownBody(content),
		relativePath,
		...parsed,
	};
}
