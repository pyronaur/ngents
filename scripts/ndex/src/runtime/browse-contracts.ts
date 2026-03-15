import path from "node:path";

import pc from "picocolors";

const EXCLUDED_DIRS = new Set(["archive", "research", "node_modules"]);
const META_FILE = ".ndex.md";
const TOPICS_DIR = "topics";
const POSIX_SEP = "/";
const GLOBAL_DOCS_LABEL = "~/.ngents/docs";

export type FrontMatterObject = Map<string, FrontMatterValue>;

export type FrontMatterValue = string | string[] | FrontMatterObject;

export type FrontMatterParseResult = {
	found: boolean;
	values: Map<string, FrontMatterValue>;
	error?: string;
};

export type GuideMetadata = {
	title: string | null;
	summary: string | null;
	guideBody: string | null;
	readWhen: string[];
	error?: string;
};

export type MarkdownEntry = {
	absolutePath: string;
	relativePath: string;
	title: string | null;
	summary: string | null;
	readWhen: string[];
	error?: string;
};

export type SkillEntry = {
	absolutePath: string;
	relativePath: string;
	name: string;
	title: string | null;
	description: string | null;
	error?: string;
	referencePaths: string[];
};

type BrowseNode = {
	absolutePath: string;
	title: string;
	summary: string | null;
	guideBody: string | null;
	readWhen: string[];
	error?: string;
	markdownEntries: MarkdownEntry[];
};

export type SectionEntry = BrowseNode & {
	key: string;
	skills: SkillEntry[];
};

export type TopicContribution = BrowseNode & {
	name: string;
	sectionEntries: SectionEntry[];
};

export type MergedTopic = {
	name: string;
	title: string;
	contributions: TopicContribution[];
};

export type TopicIndexRow = {
	name: string;
	title: string;
	summary: string | null;
};

export type IndexData = {
	topics: TopicIndexRow[];
	docs: MarkdownEntry[];
};

export type BrowseOptions = {
	expand: boolean;
	global: boolean;
};

function toDisplayPath(value: string): string {
	return value.replaceAll("\\", POSIX_SEP);
}

function normalizePath(value: string): string {
	return toDisplayPath(path.resolve(value));
}

function compactStrings(values: unknown[]): string[] {
	const result: string[] = [];
	for (const value of values) {
		if (value === null || value === undefined) {
			continue;
		}

		if (typeof value === "string") {
			const normalized = value.trim();
			if (normalized.length > 0) {
				result.push(normalized);
			}
			continue;
		}

		if (typeof value !== "number" && typeof value !== "boolean" && typeof value !== "bigint") {
			continue;
		}

		result.push(String(value));
	}

	return result;
}

function sameFileName(left: string, right: string): boolean {
	return left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;
}

function stripQuotes(value: string): string {
	return value.replace(/^['"]|['"]$/g, "").trim();
}

function humanizeSlug(value: string): string {
	return value
		.split(/[-_/]+/g)
		.filter(Boolean)
		.map(part => {
			if (part === part.toUpperCase() && part.length <= 5) {
				return part;
			}

			return part.charAt(0).toUpperCase() + part.slice(1);
		})
		.join(" ");
}

function normalizeInlineText(value: string | null): string | null {
	if (!value) {
		return null;
	}

	const normalized = value.replace(/\s+/g, " ").trim();
	if (normalized.length === 0) {
		return null;
	}

	return normalized;
}

function heading(level: 1 | 2 | 3, text: string): string {
	const content = `${"#".repeat(level)} ${text}`;
	if (level === 1) {
		return pc.cyan(pc.bold(content));
	}
	return pc.white(pc.bold(content));
}

function errorText(error: string): string {
	return pc.red(`[${error}]`);
}

function printLine(text = "", indent = 0): void {
	console.log(`${" ".repeat(indent)}${text}`);
}

function hasHiddenOrExcludedSegment(relativePath: string): boolean {
	const segments = toDisplayPath(relativePath).split(POSIX_SEP).filter(Boolean);
	for (const segment of segments) {
		if (segment.startsWith(".")) {
			return true;
		}
		if (EXCLUDED_DIRS.has(segment)) {
			return true;
		}
	}

	return false;
}

function referenceNames(skill: SkillEntry): string[] {
	return Array.from(
		new Set(skill.referencePaths.map(referencePath => path.basename(referencePath))),
	).sort((a, b) => a.localeCompare(b));
}

function formatContains(section: SectionEntry): string | null {
	const parts: string[] = [];
	if (section.markdownEntries.length > 0) {
		parts.push(
			`${section.markdownEntries.length} ${section.markdownEntries.length === 1 ? "doc" : "docs"}`,
		);
	}
	if (section.skills.length > 0) {
		parts.push(`${section.skills.length} ${section.skills.length === 1 ? "skill" : "skills"}`);
	}

	let referenceCount = 0;
	for (const skill of section.skills) {
		referenceCount += skill.referencePaths.length;
	}
	if (referenceCount > 0) {
		parts.push(`${referenceCount} ${referenceCount === 1 ? "reference file" : "reference files"}`);
	}

	if (parts.length === 0) {
		return null;
	}

	return parts.join(", ");
}

export default {
	EXCLUDED_DIRS,
	GLOBAL_DOCS_LABEL,
	META_FILE,
	POSIX_SEP,
	TOPICS_DIR,
	compactStrings,
	errorText,
	formatContains,
	hasHiddenOrExcludedSegment,
	heading,
	humanizeSlug,
	normalizeInlineText,
	normalizePath,
	printLine,
	referenceNames,
	sameFileName,
	stripQuotes,
	toDisplayPath,
};
