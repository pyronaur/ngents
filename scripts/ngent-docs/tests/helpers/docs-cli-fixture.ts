import { mkdir, realpath } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runCommand } from "./cli.ts";
import {
	readText,
	readTextOrEmpty,
	waitFor,
	withTempDir,
	writeExecutable,
	writeText,
} from "./fs.ts";

export const CANONICAL_QUERY_USAGE = "docs query [--limit <n>] <query...> | status";
export const STALE_QUERY_USAGE = "docs query [options] [terms...]";
const QMD_COLLECTIONS_CACHE_VERSION = 1;
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const TEST_TOPIC_NAME = "platform";
export const TEST_TOPIC_TITLE = "Platform Library";
export const TEST_TOPIC_SHORT = "platform docs";
export const TEST_TOPIC_SUMMARY =
	"This topic collects platform references, HIG skills, and dynamic skills for platform work.";

type HeadingMatch = {
	level: number;
	text: string;
	lineIndex: number;
};

function normalizeMarkdownOutput(text: string): string {
	return text.replaceAll("/private/var", "/var").replaceAll("\r\n", "\n");
}

function outputLines(text: string): string[] {
	return normalizeMarkdownOutput(text).trimEnd().split("\n");
}

function markdownHeadings(text: string): HeadingMatch[] {
	return outputLines(text).flatMap((line, lineIndex) => {
		const match = /^(#{1,6}) (.+)$/.exec(line);
		if (!match) {
			return [];
		}

		const hashes = match[1];
		const headingText = match[2];
		if (!hashes || !headingText) {
			return [];
		}

		return [
			{
				level: hashes.length,
				text: headingText,
				lineIndex,
			},
		];
	});
}

function hasHeading(text: string, level: number, headingText: string): boolean {
	return markdownHeadings(text).some(heading =>
		heading.level === level && heading.text === headingText
	);
}

function sectionLines(text: string, headingText: string, level: number): string[] {
	const lines = outputLines(text);
	const headings = markdownHeadings(text);
	const start = headings.find(heading => heading.level === level && heading.text === headingText);
	if (!start) {
		throw new Error(`Missing heading ${"#".repeat(level)} ${headingText}`);
	}

	const end = headings.find(
		heading => heading.lineIndex > start.lineIndex && heading.level <= level,
	)?.lineIndex;
	return lines.slice(start.lineIndex + 1, end);
}

function nonEmptySectionLines(text: string, headingText: string, level: number): string[] {
	return sectionLines(text, headingText, level).filter(line => line.trim().length > 0);
}

function compactListEntries(text: string, headingText: string, level: number): string[] {
	return nonEmptySectionLines(text, headingText, level)
		.filter(line => line.startsWith("- ") || line.startsWith("  "))
		.map(line => line.trim());
}

const normalizedPathForOutput = normalizeMarkdownOutput;

export function topicDocsPath(repoDir: string, ...segments: string[]): string {
	return path.join(repoDir, "docs", "topics", TEST_TOPIC_NAME, ...segments);
}

export function globalDocsPath(homeDir: string, ...segments: string[]): string {
	return path.join(homeDir, ".ngents", "docs", ...segments);
}

export function topicDocsPathForOutput(repoDir: string, ...segments: string[]): string {
	return normalizedPathForOutput(topicDocsPath(repoDir, ...segments));
}

export function globalDocsPathForOutput(homeDir: string, ...segments: string[]): string {
	return normalizedPathForOutput(globalDocsPath(homeDir, ...segments));
}

export async function writeFetchManifest(
	repoDir: string,
	entries: Array<{
		handler: string;
		hash: string;
		source: string;
		target: string;
	}>,
): Promise<void> {
	await writeText(
		path.join(repoDir, "docs", ".docs-fetch.json"),
		`${JSON.stringify({ entries }, null, "\t")}\n`,
	);
}

function runFetchHandlerCli(
	handlerName: "docs-git-fetch" | "docs-url-file-fetch",
	args: string[],
	options: {
		cwd?: string;
		env?: NodeJS.ProcessEnv;
	} = {},
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
	return runCommand("node", [path.join(packageRoot, "bin", `${handlerName}.ts`), ...args], options);
}

type DocsCliWorkspace = {
	tempDir: string;
	repoDir: string;
	homeDir: string;
	binDir: string;
	env: NodeJS.ProcessEnv;
	normalizedRepoDir: string;
};

type DocsCliWorkspaceOptions = {
	seedLocalDocsRepo?: boolean;
	seedGlobalDocsHome?: boolean;
	seedGlobalDocsIndex?: boolean;
	collectionName?: string;
};

export async function withDocsCliWorkspace<T>(
	prefix: string,
	run: (workspace: DocsCliWorkspace) => Promise<T>,
	options: DocsCliWorkspaceOptions = {},
): Promise<T> {
	return withTempDir(prefix, async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(repoDir, { recursive: true });
		await mkdir(homeDir, { recursive: true });
		await mkdir(binDir, { recursive: true });
		if (options.seedLocalDocsRepo ?? true) {
			await seedLocalDocsRepo(repoDir);
		}
		if (options.seedGlobalDocsHome ?? true) {
			await seedGlobalDocsHome(homeDir);
		}
		if (options.seedGlobalDocsIndex ?? true) {
			await seedGlobalDocsIndex(homeDir, binDir, options.collectionName);
		}

		return run({
			tempDir,
			repoDir,
			homeDir,
			binDir,
			env: docsEnv(homeDir, binDir),
			normalizedRepoDir: await realpath(repoDir),
		});
	});
}

async function expectCommandSuccess(
	command: string,
	args: string[],
	options: {
		cwd?: string;
		env?: NodeJS.ProcessEnv;
	} = {},
): Promise<void> {
	const result = await runCommand(command, args, options);
	if (result.exitCode !== 0) {
		throw new Error(result.stderr || result.stdout || `${command} failed`);
	}
}

async function withHttpServer<T>(
	handler: (request: IncomingMessage, response: ServerResponse) => void,
	run: (baseUrl: string) => Promise<T>,
): Promise<T> {
	const server = createServer(handler);
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => resolve());
	});

	const address = server.address();
	if (!address || typeof address === "string") {
		throw new Error("Failed to bind HTTP test server");
	}

	try {
		return await run(`http://127.0.0.1:${address.port}`);
	} finally {
		await new Promise<void>((resolve, reject) => {
			server.close(error => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
	}
}

async function seedLocalDocsRepo(repoDir: string): Promise<void> {
	await writeText(
		path.join(repoDir, "docs", "topics", TEST_TOPIC_NAME, ".docs.md"),
		[
			"---",
			`title: ${TEST_TOPIC_TITLE}`,
			`short: ${TEST_TOPIC_SHORT}`,
			`summary: ${TEST_TOPIC_SUMMARY}`,
			"---",
			"",
			`Use \`docs topic ${TEST_TOPIC_NAME} <section>\` to focus one section.`,
			"This topic collects platform references, HIG skills, and Skill for platform work.",
			"",
			"- Prioritize `hig-doctor` first when you need Apple HIG guidance",
			"- Use `SOSUMI.md` when you need Apple Developer docs in Markdown.",
			"- Use `hig-doctor` when you need curated Apple HIG skills and references.",
			"- Use the Skill sections when you need an on-demand iOS, Swift, SwiftUI, SwiftData, or Apple-tooling skill without loading it into the always-available skill context.",
			"- Prefer `hig-doctor` before raw Apple docs when both could answer the question.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(repoDir, "docs", "topics", TEST_TOPIC_NAME, "SOSUMI.md"),
		[
			"---",
			"title: Sosumi CLI",
			"summary: Sosumi CLI and MCP reference for fetching Apple Developer docs as Markdown.",
			"---",
			"",
			"# Sosumi CLI",
			"",
			"Use Sosumi when you want Apple Developer documentation in AI-readable Markdown from the command line.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(repoDir, "docs", "topics", TEST_TOPIC_NAME, "ios-debugger-agent", "SKILL.md"),
		[
			"---",
			"name: ios-debugger-agent",
			"title: iOS Debugger Agent",
			"description: Use XcodeBuildMCP to build, run, and debug the current iOS project on a booted simulator.",
			"---",
			"",
			"# iOS Debugger Agent",
			"",
			"Start with the booted simulator and default session setup.",
			"",
			"See [Quickstart](references/quickstart.md).",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(
			repoDir,
			"docs",
			"topics",
			TEST_TOPIC_NAME,
			"ios-debugger-agent",
			"references",
			"quickstart.md",
		),
		[
			"# Quickstart",
			"",
			"Launch the app in the simulator.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(repoDir, "docs", "topics", TEST_TOPIC_NAME, "swiftui-pro", "SKILL.md"),
		[
			"---",
			"name: swiftui-pro",
			"title: SwiftUI Pro",
			"description: Review and improve SwiftUI code.",
			"---",
			"",
			"# SwiftUI Pro",
			"",
			"Use this skill for SwiftUI code review.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(
			repoDir,
			"docs",
			"topics",
			TEST_TOPIC_NAME,
			"ios-debugger-agent",
			"SCREENSHOT_WORKFLOW.md",
		),
		[
			"---",
			"title: Screenshot Workflow",
			"summary: Capture simulator screenshots during debugging.",
			"---",
			"",
			"# Screenshot Workflow",
			"",
			"Capture screenshots after UI changes.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(repoDir, "docs", "topics", "qmd", ".docs.md"),
		[
			"---",
			"title: QMD",
			"short: local search docs",
			"summary: Local QMD reference for CLI search and SDK integration.",
			"---",
			"",
			"# QMD",
			"",
			"Use the local QMD docs for repo-specific workflows.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(repoDir, "docs", "topics", "ops", ".docs.md"),
		[
			"---",
			"title: Ops Notes",
			"summary: This summary is intentionally longer than sixty-four characters so compact views must truncate it.",
			"---",
			"",
			"# Ops Notes",
			"",
			"Ops topic details.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(repoDir, "docs", "topics", "qmd", "references", ".docs.md"),
		[
			"---",
			"title: References",
			"short: local refs",
			"summary: Local QMD reference files and notes.",
			"---",
			"",
			"# References",
			"",
			"Start with the local notes.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(repoDir, "docs", "topics", "qmd", "references", "local-indexing.md"),
		[
			"---",
			"title: Local Indexing",
			"short: local index notes",
			"summary: Local indexing workflow notes.",
			"---",
			"",
			"# Local Indexing",
			"",
			"Local indexing details.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(repoDir, "docs", "architecture", "main.md"),
		[
			"---",
			"title: Main Architecture",
			"short: read this first",
			"summary: This is the long architecture summary that should stay out of compact listings.",
			"read_when:",
			"  - Need the main project architecture.",
			"---",
			"",
			"# Main Architecture",
			"",
			"Architecture details.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(repoDir, "docs", "architecture", "local-only.md"),
		[
			"---",
			"title: Local Architecture Notes",
			"short: local architecture notes",
			"summary: Local architecture-only notes.",
			"---",
			"",
			"# Local Architecture Notes",
			"",
			"Local architecture details.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(repoDir, "docs", "web-fetching.md"),
		[
			"---",
			"title: Web Fetching",
			"short: web browser tools",
			"summary: Need to fetch web content for research.",
			"---",
			"",
			"# Web Fetching",
			"",
			"Use browser tools when fetch/search is blocked by JavaScript pages.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(repoDir, "docs", "long-summary.md"),
		[
			"---",
			"title: Long Summary Doc",
			"summary: This summary is intentionally longer than sixty-four characters so compact views must truncate it.",
			"---",
			"",
			"# Long Summary Doc",
			"",
			"Long summary details.",
			"",
		].join("\n"),
	);
}

async function seedSkillBackedSection(repoDir: string): Promise<void> {
	const sectionDir = path.join(repoDir, "docs", "topics", TEST_TOPIC_NAME, "hig-doctor");
	const skillDir = path.join(sectionDir, "skills", "hig-components-content");
	await writeText(
		path.join(skillDir, "SKILL.md"),
		[
			"---",
			"name: hig-components-content",
			"title: Apple HIG: Content Components",
			"description: Apple Human Interface Guidelines for content display components.",
			"---",
			"",
			"# Apple HIG: Content Components",
			"",
			"Reference index:",
			"- [Alpha](references/alpha.md)",
			"- [Beta](references/beta.md)",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(skillDir, "references", "alpha.md"),
		[
			"---",
			"title: Alpha",
			"summary: Alpha reference.",
			"---",
			"",
			"# Alpha",
			"",
			"Alpha reference body.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(skillDir, "references", "beta.md"),
		[
			"---",
			"title: Beta",
			"summary: Beta reference.",
			"---",
			"",
			"# Beta",
			"",
			"Beta reference body.",
			"",
		].join("\n"),
	);
	await writeText(path.join(sectionDir, "README.md"), "# Hidden README\n");
	await writeText(path.join(sectionDir, "AGENTS.md"), "# Hidden AGENTS\n");
	await writeText(path.join(sectionDir, "package.json"),
		"{\n  \"name\": \"hidden-root-file\"\n}\n");
}

async function seedGlobalDocsHome(homeDir: string): Promise<void> {
	await writeText(
		path.join(homeDir, ".ngents", "docs", "topics", "qmd", ".docs.md"),
		[
			"---",
			"title: QMD",
			"short: global search docs",
			"summary: Global QMD reference docs.",
			"---",
			"",
			"# QMD",
			"",
			"Search docs quickly from anywhere.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(homeDir, ".ngents", "docs", "topics", "qmd", "references", ".docs.md"),
		[
			"---",
			"title: References",
			"short: global refs",
			"summary: Global QMD reference files.",
			"---",
			"",
			"# References",
			"",
			"Use these upstream references.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(homeDir, ".ngents", "docs", "topics", "qmd", "references", "global-indexing.md"),
		[
			"---",
			"title: Global Indexing",
			"short: global index notes",
			"summary: Global indexing workflow notes.",
			"---",
			"",
			"# Global Indexing",
			"",
			"Global indexing details.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(homeDir, ".ngents", "docs", "browser", "cdp.md"),
		[
			"---",
			"title: CDP",
			"short: Chrome CDP instructions",
			"summary: Need to start, stop, or inspect the local Chrome CDP session.",
			"---",
			"",
			"# CDP",
			"",
			"CDP details.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(homeDir, ".ngents", "docs", "architecture", "global-only.md"),
		[
			"---",
			"title: Global Architecture Notes",
			"short: global architecture notes",
			"summary: Global architecture-only notes.",
			"---",
			"",
			"# Global Architecture Notes",
			"",
			"Global architecture details.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(homeDir, ".ngents", "docs", "ngents", "docs.md"),
		[
			"---",
			"title: Documentation Commands",
			"short: command index",
			"summary: Need one place that explains which ngents script commands exist and how to run them.",
			"overview: Need one place that explains which ngents script commands exist and how to run them.",
			"---",
			"",
			"# Documentation Commands",
			"",
			"`docs query` searches docs.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(homeDir, ".ngents", "docs", "process", "qa.md"),
		[
			"---",
			"title: QA Process",
			"short: qa process notes",
			"summary: Need a structured way to surface confusion instead of making assumptions.",
			"---",
			"",
			"# QA Process",
			"",
			"Global process details.",
			"",
		].join("\n"),
	);
}

async function seedQmdState(
	homeDir: string,
	entries: Array<{ name: string; path: string }>,
): Promise<void> {
	const stateContents = entries.map(entry => `${entry.name}\t${entry.path}`).join("\n");
	await writeText(
		path.join(homeDir, ".ngents", "local", "qmd-config", "docs-qmd-state.tsv"),
		stateContents.length > 0 ? `${stateContents}\n` : "",
	);
}

function qmdCollectionsCachePath(homeDir: string): string {
	return path.join(homeDir, ".ngents", "local", "qmd-cache", "docs-qmd-collections-cache.json");
}

async function seedQmdCollectionsCache(
	homeDir: string,
	options: {
		fetchedAt: string;
		collections: Array<{
			name: string;
			path: string;
			pattern?: string | null;
			includeByDefault?: boolean;
		}>;
	},
): Promise<void> {
	await writeText(
		qmdCollectionsCachePath(homeDir),
		JSON.stringify({
			version: QMD_COLLECTIONS_CACHE_VERSION,
			fetchedAt: options.fetchedAt,
			collections: options.collections.map(collection => ({
				name: collection.name,
				path: collection.path,
				pattern: collection.pattern ?? "**/*.md",
				includeByDefault: collection.includeByDefault ?? true,
			})),
		}),
	);
}

async function seedGlobalDocsIndex(
	homeDir: string,
	binDir: string,
	collectionName = "global",
): Promise<void> {
	await seedFakeQmd(binDir);
	await seedQmdState(homeDir, [{
		name: collectionName,
		path: path.join(homeDir, ".ngents", "docs"),
	}]);
}

async function seedFakeQmd(binDir: string): Promise<void> {
	await writeExecutable(
		binDir,
		"qmd",
		[
			"#!/bin/sh",
			"log_file=\"${DOCS_TEST_QMD_LOG:-}\"",
			"state_file=\"${DOCS_TEST_QMD_STATE:-${XDG_CONFIG_HOME:-$HOME/.config}/docs-qmd-state.tsv}\"",
			"state_dir=$(dirname \"$state_file\")",
			"mkdir -p \"$state_dir\"",
			"touch \"$state_file\"",
			"if [ -n \"$log_file\" ]; then",
			"  printf \"%s\n\" \"$*\" >> \"$log_file\"",
			"fi",
			"lookup_path() {",
			"  awk -F \"\\t\" -v collection_name=\"$1\" '$1 == collection_name { print $2; found = 1 } END { if (!found) exit 1 }' \"$state_file\"",
			"}",
			"first_collection_name() {",
			"  awk -F \"\\t\" 'NF > 0 { print $1; exit }' \"$state_file\"",
			"}",
			"if [ \"$3\" = \"collection\" ] && [ \"$4\" = \"list\" ]; then",
			"  count=$(grep -c \".\" \"$state_file\" 2>/dev/null || true)",
			"  if [ \"$count\" = \"0\" ]; then",
			"    printf \"No collections found. Run 'qmd collection add .' to create one.\\n\"",
			"    exit 0",
			"  fi",
			"  printf \"Collections (%s):\\n\\n\" \"$count\"",
			"  while IFS=\"$(printf '\\t')\" read -r collection_name collection_path; do",
			"    [ -z \"$collection_name\" ] && continue",
			"    printf \"%s (qmd://%s/)\\n\" \"$collection_name\" \"$collection_name\"",
			"    printf \"  Pattern:  **/*.md\\n\"",
			"    printf \"  Files:    1\\n\"",
			"    printf \"  Updated:  0s ago\\n\\n\"",
			"  done < \"$state_file\"",
			"  exit 0",
			"fi",
			"if [ \"$3\" = \"collection\" ] && [ \"$4\" = \"show\" ]; then",
			"  collection_name=\"$5\"",
			"  collection_path=$(lookup_path \"$collection_name\") || { printf \"collection not found\\n\" >&2; exit 1; }",
			"  printf \"Collection: %s\\n\" \"$collection_name\"",
			"  printf \"  Path:     %s\\n\" \"$collection_path\"",
			"  printf \"  Pattern:  **/*.md\\n\"",
			"  printf \"  Include:  yes (default)\\n\"",
			"  exit 0",
			"fi",
			"if [ \"$3\" = \"collection\" ] && [ \"$4\" = \"add\" ]; then",
			"  collection_path=\"$5\"",
			"  collection_name=\"$7\"",
			"  if lookup_path \"$collection_name\" >/dev/null 2>&1; then",
			"    printf \"collection already exists\\n\" >&2",
			"    exit 1",
			"  fi",
			"  printf \"%s\\t%s\\n\" \"$collection_name\" \"$collection_path\" >> \"$state_file\"",
			"  printf \"Creating collection '%s'...\\n\" \"$collection_name\"",
			"  printf \"Collection: %s (**/*.md)\\n\\n\" \"$collection_path\"",
			"  printf \"Indexed: 1 new, 0 updated, 0 unchanged, 0 removed\\n\\n\"",
			"  printf \"Run 'qmd embed' to update embeddings (1 unique hashes need vectors)\\n\"",
			"  printf \"✓ Collection '%s' created successfully\\n\" \"$collection_name\"",
			"  exit 0",
			"fi",
			"if [ \"$3\" = \"status\" ]; then",
			"  cat <<'EOF'",
			"QMD Status",
			"",
			"Index: fake.sqlite",
			"EOF",
			"  exit 0",
			"fi",
			"if [ \"$3\" = \"update\" ]; then",
			"  if [ \"${DOCS_TEST_QMD_FAIL_UPDATE:-0}\" = \"1\" ]; then",
			"    printf \"fake update failure\\n\" >&2",
			"    exit 1",
			"  fi",
			"  printf \"Updating fake index\\n\"",
			"  exit 0",
			"fi",
			"if [ \"$3\" = \"embed\" ]; then",
			"  if [ \"${DOCS_TEST_QMD_FAIL_EMBED:-0}\" = \"1\" ]; then",
			"    printf \"fake embed failure\\n\" >&2",
			"    exit 1",
			"  fi",
			"  printf \"Embedding fake index\\n\"",
			"  exit 0",
			"fi",
			"if [ \"$3\" = \"query\" ]; then",
			"  if [ -n \"${DOCS_TEST_QMD_QUERY_RESULTS:-}\" ]; then",
			"    printf \"%s\\n\" \"$DOCS_TEST_QMD_QUERY_RESULTS\"",
			"    exit 0",
			"  fi",
			"  default_collection=$(first_collection_name)",
			"  [ -z \"$default_collection\" ] && default_collection=\"ngents\"",
			"  printf '%s\\n' \"[{\\\"file\\\":\\\"qmd://$default_collection/ngents/docs.md\\\",\\\"title\\\":\\\"Documentation Commands\\\",\\\"score\\\":0.91,\\\"context\\\":\\\"Need one place that explains which ngents script commands exist and how to run them.\\\",\\\"snippet\\\":\\\"@@ -12,2 @@\\\\n# docs query\\\\nSearch docs quickly.\\\"}]\"",
			"  exit 0",
			"fi",
			"printf \"unexpected qmd args: %s\\n\" \"$*\" >&2",
			"exit 1",
			"",
		].join("\n"),
	);
}

function docsEnv(homeDir: string, binDir?: string): NodeJS.ProcessEnv {
	return {
		HOME: homeDir,
		PATH: binDir ? `${binDir}:${process.env.PATH ?? ""}` : process.env.PATH,
	};
}

async function writeFetchHandler(dir: string, name: string): Promise<string> {
	const filePath = path.join(dir, name);
	await writeExecutable(
		dir,
		name,
		[
			"#!/bin/sh",
			"source_url=\"\"",
			"target_path=\"\"",
			"previous_hash=\"\"",
			"root_value=\"\"",
			"transform_value=\"\"",
			"while [ \"$#\" -gt 0 ]; do",
			"  case \"$1\" in",
			"    --source) source_url=\"$2\"; shift 2 ;;",
			"    --target) target_path=\"$2\"; shift 2 ;;",
			"    --previous-hash) previous_hash=\"$2\"; shift 2 ;;",
			"    --root) root_value=\"$2\"; shift 2 ;;",
			"    --transform) transform_value=\"$2\"; shift 2 ;;",
			"    *) printf \"unknown arg: %s\\n\" \"$1\" >&2; exit 1 ;;",
			"  esac",
			"done",
			"if [ -n \"${DOCS_TEST_FETCH_LOG:-}\" ]; then",
			"  printf \"source=%s\\n\" \"$source_url\" >> \"$DOCS_TEST_FETCH_LOG\"",
			"  printf \"target=%s\\n\" \"$target_path\" >> \"$DOCS_TEST_FETCH_LOG\"",
			"  printf \"previous=%s\\n\" \"$previous_hash\" >> \"$DOCS_TEST_FETCH_LOG\"",
			"  printf \"root=%s\\n\" \"$root_value\" >> \"$DOCS_TEST_FETCH_LOG\"",
			"  printf \"transform=%s\\n\" \"$transform_value\" >> \"$DOCS_TEST_FETCH_LOG\"",
			"fi",
			"if [ \"${DOCS_TEST_FETCH_FAIL:-0}\" = \"1\" ]; then",
			"  printf \"fake fetch handler failure\\n\" >&2",
			"  exit 1",
			"fi",
			"mkdir -p \"$target_path\"",
			"printf \"%s\\n\" \"${DOCS_TEST_FETCH_CONTENT:-handled}\" > \"$target_path/handled.txt\"",
			"printf \"%s\\n\" \"${DOCS_TEST_FETCH_HASH:-hash-1}\"",
			"",
		].join("\n"),
	);
	return filePath;
}

async function createGitFetchSource(tempDir: string): Promise<string> {
	const remoteDir = path.join(tempDir, "fetch-source.git");
	const workDir = path.join(tempDir, "fetch-source-work");
	await expectCommandSuccess("git", ["init", "--bare", remoteDir]);
	await expectCommandSuccess("git", ["clone", remoteDir, workDir]);
	await expectCommandSuccess("git", [
		"-C",
		workDir,
		"config",
		"user.email",
		"docs-test@example.com",
	]);
	await expectCommandSuccess("git", ["-C", workDir, "config", "user.name", "Docs Test"]);
	await writeText(path.join(workDir, "skills", "alpha", "SKILL.md"), "# Alpha\n");
	await writeText(path.join(workDir, "README.md"), "# Repo Root\n");
	await expectCommandSuccess("git", ["-C", workDir, "add", "."]);
	await expectCommandSuccess("git", ["-C", workDir, "commit", "-m", "init"]);
	await expectCommandSuccess("git", ["-C", workDir, "push", "origin", "HEAD"]);
	return pathToFileURL(remoteDir).href;
}

export {
	compactListEntries,
	createGitFetchSource,
	docsEnv,
	hasHeading,
	nonEmptySectionLines,
	normalizedPathForOutput,
	qmdCollectionsCachePath,
	readText,
	readTextOrEmpty,
	runFetchHandlerCli,
	seedFakeQmd,
	seedGlobalDocsHome,
	seedGlobalDocsIndex,
	seedLocalDocsRepo,
	seedQmdCollectionsCache,
	seedSkillBackedSection,
	waitFor,
	withHttpServer,
	withTempDir,
	writeExecutable,
	writeFetchHandler,
	writeText,
};
