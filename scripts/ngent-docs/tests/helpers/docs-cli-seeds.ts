import path from "node:path";

import { writeExecutable, writeText } from "./fs.ts";

export const TEST_TOPIC_NAME = "platform";
export const TEST_TOPIC_TITLE = "Platform Library";
export const TEST_TOPIC_SHORT = "platform docs";
export const TEST_TOPIC_SUMMARY =
	"This topic collects platform references, HIG skills, and dynamic skills for platform work.";

const QMD_COLLECTIONS_CACHE_VERSION = 1;

type SeedFile = {
	segments: string[];
	lines: string[];
};

async function writeSeedFiles(rootDir: string, files: SeedFile[]): Promise<void> {
	for (const file of files) {
		await writeText(path.join(rootDir, ...file.segments), file.lines.join("\n"));
	}
}

const localDocsSeedFiles: SeedFile[] = [
	{
		segments: ["docs", "topics", TEST_TOPIC_NAME, ".docs.md"],
		lines: [
			"---",
			`title: ${TEST_TOPIC_TITLE}`,
			`short: ${TEST_TOPIC_SHORT}`,
			`summary: ${TEST_TOPIC_SUMMARY}`,
			"---",
			"",
			`Use \`docs topic ${TEST_TOPIC_NAME} <path>\` to focus one path inside the topic.`,
			"This topic collects platform references, HIG skills, and reusable docs for platform work.",
			"",
			"- Prioritize `hig-doctor` first when you need Apple HIG guidance",
			"- Use `SOSUMI.md` when you need Apple Developer docs in Markdown.",
			"- Use `hig-doctor` when you need curated Apple HIG skills and references.",
			"- Use the Skill sections when you need an on-demand iOS, Swift, SwiftUI, SwiftData, or Apple-tooling skill without loading it into the always-available skill context.",
			"- Prefer `hig-doctor` before raw Apple docs when both could answer the question.",
			"",
		],
	},
	{
		segments: ["docs", "topics", TEST_TOPIC_NAME, "SOSUMI.md"],
		lines: [
			"---",
			"title: Sosumi CLI",
			"summary: Sosumi CLI and MCP reference for fetching Apple Developer docs as Markdown.",
			"---",
			"",
			"# Sosumi CLI",
			"",
			"Use Sosumi when you want Apple Developer documentation in AI-readable Markdown from the command line.",
			"",
		],
	},
	{
		segments: ["docs", "topics", TEST_TOPIC_NAME, "ios-debugger-agent", "SKILL.md"],
		lines: [
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
		],
	},
	{
		segments: [
			"docs",
			"topics",
			TEST_TOPIC_NAME,
			"ios-debugger-agent",
			"references",
			"quickstart.md",
		],
		lines: ["# Quickstart", "", "Launch the app in the simulator.", ""],
	},
	{
		segments: ["docs", "topics", TEST_TOPIC_NAME, "swiftui-pro", "SKILL.md"],
		lines: [
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
		],
	},
	{
		segments: [
			"docs",
			"topics",
			TEST_TOPIC_NAME,
			"ios-debugger-agent",
			"SCREENSHOT_WORKFLOW.md",
		],
		lines: [
			"---",
			"title: Screenshot Workflow",
			"summary: Capture simulator screenshots during debugging.",
			"---",
			"",
			"# Screenshot Workflow",
			"",
			"Capture screenshots after UI changes.",
			"",
		],
	},
	{
		segments: ["docs", "topics", "qmd", ".docs.md"],
		lines: [
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
		],
	},
	{
		segments: ["docs", "topics", "ops", ".docs.md"],
		lines: [
			"---",
			"title: Ops Notes",
			"summary: This summary is intentionally longer than sixty-four characters so compact views must truncate it.",
			"---",
			"",
			"# Ops Notes",
			"",
			"Ops topic details.",
			"",
		],
	},
	{
		segments: ["docs", "topics", "qmd", "references", ".docs.md"],
		lines: [
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
		],
	},
	{
		segments: ["docs", "topics", "qmd", "references", "local-indexing.md"],
		lines: [
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
		],
	},
	{
		segments: ["docs", "architecture", "main.md"],
		lines: [
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
		],
	},
	{
		segments: ["docs", "architecture", "local-only.md"],
		lines: [
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
		],
	},
	{
		segments: ["docs", "web-fetching.md"],
		lines: [
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
		],
	},
	{
		segments: ["docs", "long-summary.md"],
		lines: [
			"---",
			"title: Long Summary Doc",
			"summary: This summary is intentionally longer than sixty-four characters so compact views must truncate it.",
			"---",
			"",
			"# Long Summary Doc",
			"",
			"Long summary details.",
			"",
		],
	},
];

const globalDocsSeedFiles: SeedFile[] = [
	{
		segments: [".ngents", "docs", "topics", "qmd", ".docs.md"],
		lines: [
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
		],
	},
	{
		segments: [".ngents", "docs", "topics", "qmd", "references", ".docs.md"],
		lines: [
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
		],
	},
	{
		segments: [".ngents", "docs", "topics", "qmd", "references", "global-indexing.md"],
		lines: [
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
		],
	},
	{
		segments: [".ngents", "docs", "browser", "cdp.md"],
		lines: [
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
		],
	},
	{
		segments: [".ngents", "docs", "architecture", "global-only.md"],
		lines: [
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
		],
	},
	{
		segments: [".ngents", "docs", "ngents", "docs.md"],
		lines: [
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
		],
	},
	{
		segments: [".ngents", "docs", "process", "qa.md"],
		lines: [
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
		],
	},
];

const qmdScriptLines = [
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
];

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

export function qmdCollectionsCachePath(homeDir: string): string {
	return path.join(homeDir, ".ngents", "local", "qmd-cache", "docs-qmd-collections-cache.json");
}

export async function seedLocalDocsRepo(repoDir: string): Promise<void> {
	await writeSeedFiles(repoDir, localDocsSeedFiles);
}

export async function seedGlobalDocsHome(homeDir: string): Promise<void> {
	await writeSeedFiles(homeDir, globalDocsSeedFiles);
}

export async function seedQmdCollectionsCache(
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

export async function seedFakeQmd(binDir: string): Promise<void> {
	await writeExecutable(binDir, "qmd", qmdScriptLines.join("\n"));
}

export async function seedGlobalDocsIndex(
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
