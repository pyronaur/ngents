import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

import { runDocsCli } from "./helpers/cli.ts";

const CANONICAL_QUERY_USAGE = "docs query [--limit <n>] <query...> | status";
const STALE_QUERY_USAGE = "docs query [options] [terms...]";

async function makeTempDir(prefix: string): Promise<string> {
	return mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeText(filePath: string, contents: string): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, contents);
}

async function writeExecutable(dir: string, name: string, body: string): Promise<void> {
	const filePath = path.join(dir, name);
	await writeText(filePath, body);
	await chmod(filePath, 0o755);
}

async function withTempDir<T>(prefix: string, run: (dir: string) => Promise<T>): Promise<T> {
	const dir = await makeTempDir(prefix);
	try {
		return await run(dir);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function seedLocalDocsRepo(repoDir: string): Promise<void> {
	await writeText(
		path.join(repoDir, "docs", "topics", "ios", ".docs.md"),
		[
			"---",
			"title: iOS Library",
			"short: Apple-platform docs",
			"summary: This topic collects iOS-focused references, Apple HIG skills, and Dynamic Skills for Apple-platform work.",
			"---",
			"",
			"Use `docs topic ios <section>` to focus one section.",
			"This topic collects iOS-focused references, Apple HIG skills, and Skill for Apple-platform work.",
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
		path.join(repoDir, "docs", "topics", "ios", "SOSUMI.md"),
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
		path.join(repoDir, "docs", "topics", "ios", "ios-debugger-agent", "SKILL.md"),
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
		path.join(repoDir, "docs", "topics", "ios", "ios-debugger-agent", "references", "quickstart.md"),
		[
			"# Quickstart",
			"",
			"Launch the app in the simulator.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(repoDir, "docs", "topics", "ios", "swiftui-pro", "SKILL.md"),
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
			"ios",
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
	const sectionDir = path.join(repoDir, "docs", "topics", "ios", "hig-doctor");
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
	await writeText(path.join(sectionDir, "package.json"), "{\n  \"name\": \"hidden-root-file\"\n}\n");
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

async function seedQmdState(homeDir: string, entries: Array<{ name: string; path: string }>): Promise<void> {
	const stateContents = entries.map(entry => `${entry.name}\t${entry.path}`).join("\n");
	await writeText(
		path.join(homeDir, ".ngents", "local", "qmd-config", "docs-qmd-state.tsv"),
		stateContents.length > 0 ? `${stateContents}\n` : "",
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
			'log_file="${DOCS_TEST_QMD_LOG:-}"',
			'state_file="${DOCS_TEST_QMD_STATE:-${XDG_CONFIG_HOME:-$HOME/.config}/docs-qmd-state.tsv}"',
			'state_dir=$(dirname "$state_file")',
			'mkdir -p "$state_dir"',
			'touch "$state_file"',
			'if [ -n "$log_file" ]; then',
			'  printf "%s\n" "$*" >> "$log_file"',
			"fi",
			'lookup_path() {',
			'  awk -F "\\t" -v collection_name="$1" \'$1 == collection_name { print $2; found = 1 } END { if (!found) exit 1 }\' "$state_file"',
			"}",
			'first_collection_name() {',
			'  awk -F "\\t" \'NF > 0 { print $1; exit }\' "$state_file"',
			"}",
			'if [ "$3" = "collection" ] && [ "$4" = "list" ]; then',
			'  count=$(grep -c "." "$state_file" 2>/dev/null || true)',
			'  if [ "$count" = "0" ]; then',
			"    printf \"No collections found. Run 'qmd collection add .' to create one.\\n\"",
			"    exit 0",
			"  fi",
			'  printf "Collections (%s):\\n\\n" "$count"',
			"  while IFS=\"$(printf '\\t')\" read -r collection_name collection_path; do",
			'    [ -z "$collection_name" ] && continue',
			'    printf "%s (qmd://%s/)\\n" "$collection_name" "$collection_name"',
			'    printf "  Pattern:  **/*.md\\n"',
			'    printf "  Files:    1\\n"',
			'    printf "  Updated:  0s ago\\n\\n"',
			'  done < "$state_file"',
			"  exit 0",
			"fi",
			'if [ "$3" = "collection" ] && [ "$4" = "show" ]; then',
			'  collection_name="$5"',
			'  collection_path=$(lookup_path "$collection_name") || { printf "collection not found\\n" >&2; exit 1; }',
			'  printf "Collection: %s\\n" "$collection_name"',
			'  printf "  Path:     %s\\n" "$collection_path"',
			'  printf "  Pattern:  **/*.md\\n"',
			'  printf "  Include:  yes (default)\\n"',
			"  exit 0",
			"fi",
			'if [ "$3" = "collection" ] && [ "$4" = "add" ]; then',
			'  collection_path="$5"',
			'  collection_name="$7"',
			'  if lookup_path "$collection_name" >/dev/null 2>&1; then',
			'    printf "collection already exists\\n" >&2',
			"    exit 1",
			"  fi",
			'  printf "%s\\t%s\\n" "$collection_name" "$collection_path" >> "$state_file"',
			"  printf \"Creating collection '%s'...\\n\" \"$collection_name\"",
			'  printf "Collection: %s (**/*.md)\\n\\n" "$collection_path"',
			'  printf "Indexed: 1 new, 0 updated, 0 unchanged, 0 removed\\n\\n"',
			"  printf \"Run 'qmd embed' to update embeddings (1 unique hashes need vectors)\\n\"",
			"  printf \"✓ Collection '%s' created successfully\\n\" \"$collection_name\"",
			"  exit 0",
			"fi",
			'if [ "$3" = "status" ]; then',
			"  cat <<'EOF'",
			"QMD Status",
			"",
			"Index: fake.sqlite",
			"EOF",
			"  exit 0",
			"fi",
			'if [ "$3" = "update" ]; then',
			'  if [ "${DOCS_TEST_QMD_FAIL_UPDATE:-0}" = "1" ]; then',
			'    printf "fake update failure\\n" >&2',
			"    exit 1",
			"  fi",
			'  printf "Updating fake index\\n"',
			"  exit 0",
			"fi",
			'if [ "$3" = "embed" ]; then',
			'  if [ "${DOCS_TEST_QMD_FAIL_EMBED:-0}" = "1" ]; then',
			'    printf "fake embed failure\\n" >&2',
			"    exit 1",
			"  fi",
			'  printf "Embedding fake index\\n"',
			"  exit 0",
			"fi",
			'if [ "$3" = "query" ]; then',
			'  if [ -n "${DOCS_TEST_QMD_QUERY_RESULTS:-}" ]; then',
			'    printf "%s\\n" "$DOCS_TEST_QMD_QUERY_RESULTS"',
			"    exit 0",
			"  fi",
			'  default_collection=$(first_collection_name)',
			'  [ -z "$default_collection" ] && default_collection="ngents"',
			"  printf '%s\\n' \"[{\\\"file\\\":\\\"qmd://$default_collection/ngents/docs.md\\\",\\\"title\\\":\\\"Documentation Commands\\\",\\\"score\\\":0.91,\\\"context\\\":\\\"Need one place that explains which ngents script commands exist and how to run them.\\\",\\\"snippet\\\":\\\"@@ -12,2 @@\\\\n# docs query\\\\nSearch docs quickly.\\\"}]\"",
			"  exit 0",
			"fi",
			'printf "unexpected qmd args: %s\\n" "$*" >&2',
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

test("bare docs renders compact markdown help with merged topics and docs", async () => {
	await withTempDir("docs-root-help-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);

		const result = await runDocsCli([], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("# docs");
		expect(result.stdout).toContain(CANONICAL_QUERY_USAGE);
		expect(result.stdout).not.toContain(STALE_QUERY_USAGE);
		expect(result.stdout).toContain("docs park <name> [path]");
		expect(result.stdout).toContain("docs topic [topic] [section]");
		expect(result.stdout).toContain("docs ls [where]");
		expect(result.stdout).toContain("docs ls ~/work/foo - Resolve a workspace to its docs dir");
		expect(result.stdout).toContain("docs ls machine - Parked global docs by name");
		expect(result.stdout).toContain("qmd");
		expect(result.stdout).toContain("local search docs");
		expect(result.stdout).toContain(
			"Ops Notes    This summary is intentionally longer than sixty-four characte...",
		);
		expect(result.stdout).toContain("web-fetching.md - web browser tools");
		expect(result.stdout).toContain(
			"long-summary.md - This summary is intentionally longer than sixty-four characte...",
		);
		expect(result.stdout).toContain("cdp.md - Chrome CDP instructions");
		expect(result.stdout).not.toContain(
			"This is the long architecture summary that should stay out of compact listings.",
		);
		expect(result.stdout).not.toContain(
			"This summary is intentionally longer than sixty-four characters so compact views must truncate it.",
		);
	});
});

test("docs --help uses the same markdown help style without the docs index", async () => {
	await withTempDir("docs-help-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);

		const bare = await runDocsCli([], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});
		const help = await runDocsCli(["--help"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});
		const helpCommand = await runDocsCli(["help"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(help.exitCode).toBe(0);
		expect(helpCommand.exitCode).toBe(0);
		expect(help.stdout).toContain("# docs");
		expect(help.stdout).toContain(CANONICAL_QUERY_USAGE);
		expect(help.stdout).not.toContain(STALE_QUERY_USAGE);
		expect(help.stdout).toContain("docs park <name> [path]");
		expect(help.stdout).toContain("docs topic [topic] [section]");
		expect(help.stdout).not.toContain("web-fetching.md - web browser tools");
		expect(help.stdout).not.toContain("## Project Docs");
		expect(helpCommand.stdout).toBe(help.stdout);
		expect(bare.stdout).not.toBe(help.stdout);
	});
});

test("docs query --help uses the canonical query signature", async () => {
	const result = await runDocsCli(["query", "--help"]);

	expect(result.exitCode).toBe(0);
	expect(result.stdout).toContain(`Usage: ${CANONICAL_QUERY_USAGE}`);
	expect(result.stdout).not.toContain(STALE_QUERY_USAGE);
});

test("docs reference doc uses the canonical query signature", async () => {
	const docPath = new URL("../../../docs/ngents-docs.md", import.meta.url);
	const contents = await readFile(docPath, "utf8");

	expect(contents).toContain(CANONICAL_QUERY_USAGE);
	expect(contents).not.toContain(STALE_QUERY_USAGE);
	expect(contents).toContain("docs park <name> [path]");
	expect(contents).toContain("workspace paths that contain `docs/`");
	expect(contents).toContain("Parked names match case-insensitively.");
	expect(contents).toContain("docs ls ~/work/foo");
	expect(contents).toContain("docs ls machine");
});

test("docs ls merges local and global docs by default", async () => {
	await withTempDir("docs-ls-merged-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);

		const result = await runDocsCli(["ls"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Usage: docs ls [where]");
		expect(result.stdout).toContain(path.join(repoDir, "docs"));
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs"));
		expect(result.stdout).toContain("web-fetching.md");
		expect(result.stdout).toContain("Need to fetch web content for research.");
		expect(result.stdout).toContain("cdp.md");
		expect(result.stdout).toContain("Need to start, stop, or inspect the local Chrome CDP session.");
		expect(result.stdout).not.toContain("## Topics");
	});
});

test("docs ls . shows only local docs", async () => {
	await withTempDir("docs-ls-local-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);

		const result = await runDocsCli(["ls", "."], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(path.join(repoDir, "docs"));
		expect(result.stdout).not.toContain(path.join(homeDir, ".ngents", "docs"));
	});
});

test("docs ls global shows only global docs", async () => {
	await withTempDir("docs-ls-global-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);

		const result = await runDocsCli(["ls", "global"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs"));
		expect(result.stdout).not.toContain(path.join(repoDir, "docs"));
	});
});

test("docs ls ./docs/subdir focuses a local docs subtree", async () => {
	await withTempDir("docs-ls-subdir-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);

		const result = await runDocsCli(["ls", "./docs/architecture"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(path.join(repoDir, "docs", "architecture"));
		expect(result.stdout).toContain("main.md");
		expect(result.stdout).toContain("local-only.md");
		expect(result.stdout).not.toContain("web-fetching.md");
		expect(result.stdout).not.toContain(path.join(homeDir, ".ngents", "docs"));
	});
});

test("docs ls docs/subdir merges matching local and global doc subtrees", async () => {
	await withTempDir("docs-ls-subdir-merged-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);

		const result = await runDocsCli(["ls", "docs/architecture"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(path.join(repoDir, "docs", "architecture"));
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs", "architecture"));
		expect(result.stdout).toContain("main.md");
		expect(result.stdout).toContain("local-only.md");
		expect(result.stdout).toContain("global-only.md");
		expect(result.stdout).not.toContain("web-fetching.md");
		expect(result.stdout).not.toContain("cdp.md");
	});
});

test("docs ls docs/subdir succeeds when only the global subtree exists", async () => {
	await withTempDir("docs-ls-subdir-global-only-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);

		const result = await runDocsCli(["ls", "docs/process"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs", "process"));
		expect(result.stdout).toContain("qa.md");
		expect(result.stdout).not.toContain(path.join(repoDir, "docs", "process"));
	});
});

test("docs ls docs/subdir fails only when the subtree is missing everywhere", async () => {
	await withTempDir("docs-ls-subdir-missing-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);

		const result = await runDocsCli(["ls", "docs/missing"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Sorry, `docs/missing` not found");
		expect(result.stderr).toContain("I couldn't locate a registered docs directory called that");
		expect(result.stderr).toContain("Here's what I do have:");
		expect(result.stderr).toContain("Topics");
		expect(result.stderr).toContain("Registered Docs");
	});
});

test("docs ls accepts workspace paths, docs paths, and docs subtrees via ~ expansion", async () => {
	await withTempDir("docs-ls-paths-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const workspaceDir = path.join(homeDir, "workspace");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(workspaceDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);

		const workspaceResult = await runDocsCli(["ls", "~/workspace"], {
			cwd: tempDir,
			env: docsEnv(homeDir, binDir),
		});
		const docsResult = await runDocsCli(["ls", "~/workspace/docs"], {
			cwd: tempDir,
			env: docsEnv(homeDir, binDir),
		});
		const subtreeResult = await runDocsCli(["ls", "~/workspace/docs/architecture"], {
			cwd: tempDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(workspaceResult.exitCode).toBe(0);
		expect(workspaceResult.stdout).toContain(path.join(workspaceDir, "docs"));
		expect(workspaceResult.stdout).toContain("web-fetching.md");

		expect(docsResult.exitCode).toBe(0);
		expect(docsResult.stdout).toContain(path.join(workspaceDir, "docs"));
		expect(docsResult.stdout).toContain("web-fetching.md");

		expect(subtreeResult.exitCode).toBe(0);
		expect(subtreeResult.stdout).toContain(path.join(workspaceDir, "docs", "architecture"));
		expect(subtreeResult.stdout).toContain("main.md");
		expect(subtreeResult.stdout).not.toContain("web-fetching.md");
	});
});

test("docs ls resolves parked global docs roots by case-insensitive name", async () => {
	await withTempDir("docs-ls-parked-name-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir, "Machine");

		const result = await runDocsCli(["ls", "machine"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs"));
		expect(result.stdout).toContain("cdp.md");
		expect(result.stdout).not.toContain(path.join(repoDir, "docs"));
	});
});

test("docs ls rejects non-docs paths with suggestions", async () => {
	await withTempDir("docs-ls-invalid-path-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const miscDir = path.join(homeDir, "misc");
		await mkdir(binDir, { recursive: true });
		await mkdir(miscDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir, "Machine");

		const result = await runDocsCli(["ls", "~/misc"], {
			cwd: tempDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain(`Not a docs directory: ${miscDir}`);
		expect(result.stderr).toContain(`docs ls ${path.join(miscDir, "docs")}`);
		expect(result.stderr).toContain("docs ls Machine");
	});
});

test("docs ls keeps parked-name matching exact instead of prefix-based", async () => {
	await withTempDir("docs-ls-name-prefix-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir, "Machine");

		const result = await runDocsCli(["ls", "n"], {
			cwd: tempDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Sorry, `n` not found");
		expect(result.stderr).toContain("Here's what I do have:");
		expect(result.stderr).toContain("Registered Docs");
		expect(result.stderr).toContain(`browser: ${path.join(homeDir, ".ngents", "docs", "browser")}`);
	});
});

test("docs ls selector misses show merged topics and registered docs roots", async () => {
	await withTempDir("docs-ls-selector-miss-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir, "Machine");

		const result = await runDocsCli(["ls", "poop"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});
		const expectedArchitecturePath = [
			await realpath(path.join(repoDir, "docs", "architecture")),
			path.join(homeDir, ".ngents", "docs", "architecture"),
		].join(", ");

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Sorry, `poop` not found");
		expect(result.stderr).toContain("Here's what I do have:");
		expect(result.stderr).toContain("Topics");
		expect(result.stderr).toContain("ios");
		expect(result.stderr).toContain("Apple-platform docs");
		expect(result.stderr).toContain("qmd");
		expect(result.stderr).toContain("Registered Docs");
		expect(result.stderr).toContain("You can see the full index with compact descriptions using `docs ls`");
		expect(result.stderr).toContain(`architecture: ${expectedArchitecturePath}`);
		expect(result.stderr).toContain(`browser: ${path.join(homeDir, ".ngents", "docs", "browser")}`);
		expect(result.stderr).not.toContain("Commands:");
	});
});

test("docs ls suggests the topic command when the selector matches a topic", async () => {
	await withTempDir("docs-ls-topic-hint-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir, "Machine");

		const result = await runDocsCli(["ls", "ios"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Sorry, `ios` not found");
		expect(result.stderr).toContain("`docs ls` only opens registered docs directories");
		expect(result.stderr).toContain("`ios` is a topic you can inspect with `docs topic ios`");
		expect(result.stderr).toContain("Registered Docs");
	});
});

test("docs ls opens exact registered docs names as merged subtrees", async () => {
	await withTempDir("docs-ls-registered-doc-name-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir, "Machine");

		const result = await runDocsCli(["ls", "architecture"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(path.join(repoDir, "docs", "architecture"));
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs", "architecture"));
		expect(result.stdout).toContain("local-only.md");
		expect(result.stdout).toContain("global-only.md");
	});
});

test("single-token root selectors open topics and registered docs", async () => {
	await withTempDir("docs-root-selector-fallback-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir, "Machine");

		const bareName = await runDocsCli(["machine"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});
		const bareTopic = await runDocsCli(["ios"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});
		const bareRegisteredDocs = await runDocsCli(["architecture"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});
		const bareWorkspace = await runDocsCli([path.join(repoDir)], {
			cwd: tempDir,
			env: docsEnv(homeDir, binDir),
		});
		const bareDocsPath = await runDocsCli([path.join(repoDir, "docs")], {
			cwd: tempDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(bareName.exitCode).toBe(0);
		expect(bareName.stdout).toContain(path.join(homeDir, ".ngents", "docs"));
		expect(bareName.stdout).toContain("cdp.md");

		expect(bareTopic.exitCode).toBe(0);
		expect(bareTopic.stdout).toContain("# iOS Library");
		expect(bareTopic.stdout).toContain(path.join(repoDir, "docs", "topics", "ios"));

		expect(bareRegisteredDocs.exitCode).toBe(0);
		expect(bareRegisteredDocs.stdout).toContain(path.join(repoDir, "docs", "architecture"));
		expect(bareRegisteredDocs.stdout).toContain(path.join(homeDir, ".ngents", "docs", "architecture"));

		expect(bareWorkspace.exitCode).toBe(0);
		expect(bareWorkspace.stdout).toContain(path.join(repoDir, "docs"));
		expect(bareWorkspace.stdout).toContain("web-fetching.md");

		expect(bareDocsPath.exitCode).toBe(0);
		expect(bareDocsPath.stdout).toContain(path.join(repoDir, "docs"));
		expect(bareDocsPath.stdout).toContain("web-fetching.md");
	});
});

test("single-token unknown root selectors show commands plus browse inventory", async () => {
	await withTempDir("docs-root-selector-miss-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir, "Machine");

		const result = await runDocsCli(["poop"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});
		const expectedArchitecturePath = [
			await realpath(path.join(repoDir, "docs", "architecture")),
			path.join(homeDir, ".ngents", "docs", "architecture"),
		].join(", ");

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Sorry, `poop` not found");
		expect(result.stderr).toContain("It's not a command: ls, park, topic, query, update");
		expect(result.stderr).toContain("I couldn't locate a topic or registered docs source called that either");
		expect(result.stderr).toContain("Here's what I do have:");
		expect(result.stderr).toContain("Topics");
		expect(result.stderr).toContain("Registered Docs");
		expect(result.stderr).toContain(`architecture: ${expectedArchitecturePath}`);
	});
});

test("docs topic shows the merged topic index", async () => {
	await withTempDir("docs-topic-index-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);

		const result = await runDocsCli(["topic"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Usage: docs topic [topic] [section]");
		expect(result.stdout).toContain("qmd");
		expect(result.stdout).toContain("local search docs");
		expect(result.stdout).toContain("ios");
		expect(result.stdout).toContain("Apple-platform docs");
		expect(result.stdout).toContain(
			"Ops Notes    This summary is intentionally longer than sixty-four characte...",
		);
	});
});

test("docs topic merges local and global topic contributions", async () => {
	await withTempDir("docs-topic-merged-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);

		const result = await runDocsCli(["topic", "qmd"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("# QMD");
		expect(result.stdout).toContain(path.join(repoDir, "docs", "topics", "qmd"));
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs", "topics", "qmd"));
		expect(result.stdout).toContain("Use the local QMD docs for repo-specific workflows.");
		expect(result.stdout).toContain("Search docs quickly from anywhere.");
	});
});

test("docs topic renders docs and skills in the topic overview", async () => {
	await withTempDir("docs-topic-dynamic-skills-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedSkillBackedSection(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);
		const normalizedRepoDir = await realpath(repoDir);

		const result = await runDocsCli(["topic", "ios"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		const expected = [
			"# iOS Library",
			path.join(normalizedRepoDir, "docs", "topics", "ios"),
			"",
			"Use `docs topic ios <section>` to focus one section.",
			"This topic collects iOS-focused references, Apple HIG skills, and Skill for Apple-platform work.",
			"",
			"- Prioritize `hig-doctor` first when you need Apple HIG guidance",
			"- Use `SOSUMI.md` when you need Apple Developer docs in Markdown.",
			"- Use `hig-doctor` when you need curated Apple HIG skills and references.",
			"- Use the Skill sections when you need an on-demand iOS, Swift, SwiftUI, SwiftData, or Apple-tooling skill without loading it into the always-available skill context.",
			"- Prefer `hig-doctor` before raw Apple docs when both could answer the question.",
			"",
			"---",
			"",
			"## Docs",
			"",
			"### Sosumi CLI",
			path.join(normalizedRepoDir, "docs", "topics", "ios", "SOSUMI.md"),
			"",
			"Sosumi CLI and MCP reference for fetching Apple Developer docs as Markdown.",
			"",
			"---",
			"",
			"## Skills",
			"",
			"Expand skill information in this topic with: `docs topic <topic> <section|glob>`",
			"For example: `docs topic foo bar/lux*`",
			"",
			"### hig-doctor - 1 skill",
			`${path.join(normalizedRepoDir, "docs", "topics", "ios", "hig-doctor")}/`,
			"",
			"#### hig-components-content",
			path.join(
				normalizedRepoDir,
				"docs",
				"topics",
				"ios",
				"hig-doctor",
				"skills",
				"hig-components-content",
				"SKILL.md",
			),
			"contains: 2 reference files",
			"",
			"### ios-debugger-agent",
			path.join(normalizedRepoDir, "docs", "topics", "ios", "ios-debugger-agent", "SKILL.md"),
			"contains: 1 reference file",
			"",
			"### swiftui-pro",
			path.join(normalizedRepoDir, "docs", "topics", "ios", "swiftui-pro", "SKILL.md"),
		].join("\n");

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe(expected);
	});
});

test("docs topic section focuses a merged section view", async () => {
	await withTempDir("docs-topic-section-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);

		const result = await runDocsCli(["topic", "qmd", "references"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("## References");
		expect(result.stdout).toContain(path.join(repoDir, "docs", "topics", "qmd", "references"));
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs", "topics", "qmd", "references"));
		expect(result.stdout).toContain("Local Indexing");
		expect(result.stdout).toContain("Global Indexing");
	});
});

test("docs topic section renders a single root skill directly", async () => {
	await withTempDir("docs-topic-skill-section-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);
		const normalizedRepoDir = await realpath(repoDir);

		const result = await runDocsCli(["topic", "ios", "ios-debugger-agent"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		const referencesDir = path.join(
			normalizedRepoDir,
			"docs",
			"topics",
			"ios",
			"ios-debugger-agent",
			"references",
		);
		const expected = [
			"## iOS Debugger Agent",
			path.join(normalizedRepoDir, "docs", "topics", "ios", "ios-debugger-agent", "SKILL.md"),
			"",
			"Use XcodeBuildMCP to build, run, and debug the current iOS project on a booted simulator.",
			"",
			`### ${referencesDir}/:`,
			"- quickstart.md",
		].join("\n");

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe(expected);
	});
});

test("docs topic section resolves single-skill titles as title then name then basename", async () => {
	await withTempDir("docs-topic-skill-title-fallback-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		await seedLocalDocsRepo(repoDir);

		await writeText(
			path.join(repoDir, "docs", "topics", "ios", "title-skill", "SKILL.md"),
			[
				"---",
				"title: Explicit Skill Title",
				"name: name-fallback-should-not-win",
				"description: Title frontmatter should win.",
				"---",
				"",
				"Skill body.",
				"",
			].join("\n"),
		);
		await writeText(
			path.join(repoDir, "docs", "topics", "ios", "name-skill", "SKILL.md"),
			[
				"---",
				"name: Name Frontmatter Title",
				"description: Name frontmatter should win when title is absent.",
				"---",
				"",
				"Skill body.",
				"",
			].join("\n"),
		);
		await writeText(
			path.join(repoDir, "docs", "topics", "ios", "basename-skill", "SKILL.md"),
			[
				"Skill body without frontmatter.",
				"",
			].join("\n"),
		);

		const titleResult = await runDocsCli(["topic", "ios", "title-skill"], {
			cwd: repoDir,
			env: docsEnv(path.join(tempDir, "home")),
		});
		const nameResult = await runDocsCli(["topic", "ios", "name-skill"], {
			cwd: repoDir,
			env: docsEnv(path.join(tempDir, "home")),
		});
		const basenameResult = await runDocsCli(["topic", "ios", "basename-skill"], {
			cwd: repoDir,
			env: docsEnv(path.join(tempDir, "home")),
		});

		expect(titleResult.exitCode).toBe(0);
		expect(titleResult.stdout).toContain("## Explicit Skill Title");
		expect(nameResult.exitCode).toBe(0);
		expect(nameResult.stdout).toContain("## Name Frontmatter Title");
		expect(basenameResult.exitCode).toBe(0);
		expect(basenameResult.stdout).toContain("## basename-skill");
	});
});

test("docs topic skill-backed sections show only skills and grouped references", async () => {
	await withTempDir("docs-topic-skills-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		await seedLocalDocsRepo(repoDir);
		await seedSkillBackedSection(repoDir);
		const normalizedRepoDir = await realpath(repoDir);

		const result = await runDocsCli(["topic", "ios", "hig-doctor"], {
			cwd: repoDir,
			env: docsEnv(path.join(tempDir, "home")),
		});

		const referencesDir = path.join(
			normalizedRepoDir,
			"docs",
			"topics",
			"ios",
			"hig-doctor",
			"skills",
			"hig-components-content",
			"references",
		);
		const expected = [
			"## hig-doctor",
			"",
			`source: ${path.join(normalizedRepoDir, "docs", "topics", "ios", "hig-doctor")}`,
			"### Skills",
			"",
			"#### Apple HIG: Content Components",
			`path: ${
				path.join(
					normalizedRepoDir,
					"docs",
					"topics",
					"ios",
					"hig-doctor",
					"skills",
					"hig-components-content",
					"SKILL.md",
				)
			}`,
			"Apple Human Interface Guidelines for content display components.",
			"",
			`##### ${referencesDir}/:`,
			"- alpha.md",
			"- beta.md",
		].join("\n");

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe(expected);
	});
});

test("docs query status preserves the status output shape", async () => {
	await withTempDir("docs-query-status-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir, "ngents");

		const result = await runDocsCli(["query", "status"], {
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("# docs query status");
		expect(result.stdout).toContain("- Index: ngents-docs");
		expect(result.stdout).toContain("- Collections: ngents");
		expect(result.stdout).toContain("QMD Status");
	});
});

test("docs query status shows no collections when nothing is parked", async () => {
	await withTempDir("docs-query-status-empty-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedFakeQmd(binDir);

		const result = await runDocsCli(["query", "status"], {
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("- Collections: -");
		expect(result.stdout).not.toContain("- Collections: ngents");
	});
});

test("docs update runs qmd update then embed for the docs index", async () => {
	await withTempDir("docs-update-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "qmd.log");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedFakeQmd(binDir);

		const result = await runDocsCli(["update"], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Updating fake index");
		expect(result.stdout).toContain("Embedding fake index");
		expect(await readFile(logFile, "utf8")).toBe(
			[
				"--index ngents-docs update",
				"--index ngents-docs embed",
				"",
			].join("\n"),
		);
	});
});

test("docs update stops before embed when qmd update fails", async () => {
	await withTempDir("docs-update-fail-update-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "qmd.log");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedFakeQmd(binDir);

		const result = await runDocsCli(["update"], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_FAIL_UPDATE: "1",
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("fake update failure");
		expect(await readFile(logFile, "utf8")).toBe(
			[
				"--index ngents-docs update",
				"",
			].join("\n"),
		);
	});
});

test("docs update fails when qmd embed fails after a successful update", async () => {
	await withTempDir("docs-update-fail-embed-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "qmd.log");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedFakeQmd(binDir);

		const result = await runDocsCli(["update"], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_FAIL_EMBED: "1",
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(result.exitCode).toBe(1);
		expect(result.stdout).toContain("Updating fake index");
		expect(result.stderr).toContain("fake embed failure");
		expect(await readFile(logFile, "utf8")).toBe(
			[
				"--index ngents-docs update",
				"--index ngents-docs embed",
				"",
			].join("\n"),
		);
	});
});

test("docs query preserves formatted search output and limit handling", async () => {
	await withTempDir("docs-query-search-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "qmd.log");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir, "ngents");

		const result = await runDocsCli(["query", "--limit", "3", "shell", "environment", "policy"], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Tip: Write anchored queries");
		expect(result.stdout).toContain("## Documentation Commands: 91%");
		expect(result.stdout).toContain(
			path.join(homeDir, ".ngents", "docs", "ngents", "docs.md") + ":12-13",
		);
		expect(await readFile(logFile, "utf8")).not.toContain(" -c ");
	});
});

test("docs park adds a named collection, refreshes the index, and exposes parked docs in browse", async () => {
	await withTempDir("docs-park-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const projectDir = path.join(tempDir, "project");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "qmd.log");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);
		await writeText(
			path.join(projectDir, "docs", "topics", "infra", ".docs.md"),
			[
				"---",
				"title: Infrastructure",
				"summary: Infrastructure docs.",
				"---",
				"",
				"# Infrastructure",
				"",
				"Infra body.",
				"",
			].join("\n"),
		);
		await writeText(
			path.join(projectDir, "docs", "runbook.md"),
			[
				"---",
				"title: Runbook",
				"summary: Parked runbook docs.",
				"---",
				"",
				"# Runbook",
				"",
				"Runbook body.",
				"",
			].join("\n"),
		);

		const parkResult = await runDocsCli(["park", "nconf", projectDir], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(parkResult.exitCode).toBe(0);
		expect(parkResult.stdout).toContain(`Parked "nconf" at ${path.join(projectDir, "docs")}`);
		const logContents = await readFile(logFile, "utf8");
		expect(logContents).toContain(
			`--index ngents-docs collection add ${path.join(projectDir, "docs")} --name nconf`,
		);
		expect(logContents).toContain("--index ngents-docs update");
		expect(logContents).toContain("--index ngents-docs embed");

		const lsResult = await runDocsCli(["ls", "global"], {
			env: docsEnv(homeDir, binDir),
		});
		expect(lsResult.exitCode).toBe(0);
		expect(lsResult.stdout).toContain(path.join(projectDir, "docs"));

		const topicResult = await runDocsCli(["topic", "infra"], {
			env: docsEnv(homeDir, binDir),
		});
		expect(topicResult.exitCode).toBe(0);
		expect(topicResult.stdout).toContain("# Infrastructure");
		expect(topicResult.stdout).toContain(path.join(projectDir, "docs", "topics", "infra"));
	});
});

test("docs park allows ngents as a normal collection name", async () => {
	await withTempDir("docs-park-ngents-name-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const projectDir = path.join(tempDir, "project");
		const binDir = path.join(tempDir, "bin");
		const stateFile = path.join(tempDir, "qmd-state.tsv");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedFakeQmd(binDir);
		await writeText(path.join(projectDir, "docs", "guide.md"), "# Guide\n");

		const result = await runDocsCli(["park", "ngents", projectDir], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_STATE: stateFile,
			},
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(`Parked "ngents" at ${path.join(projectDir, "docs")}`);
		expect(await readFile(stateFile, "utf8")).toContain(
			`ngents\t${path.join(projectDir, "docs")}\n`,
		);
	});
});

test("docs ls global ignores unparked global docs roots", async () => {
	await withTempDir("docs-ls-global-explicit-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedFakeQmd(binDir);

		const result = await runDocsCli(["ls", "global"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Docs root not found: global");
		expect(result.stdout).not.toContain(path.join(homeDir, ".ngents", "docs"));
	});
});

test("docs park rejects duplicate names and duplicate docs roots", async () => {
	await withTempDir("docs-park-collisions-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const projectDir = path.join(tempDir, "project");
		const otherProjectDir = path.join(tempDir, "other-project");
		const binDir = path.join(tempDir, "bin");
		const stateFile = path.join(tempDir, "qmd-state.tsv");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedFakeQmd(binDir);
		await writeText(path.join(projectDir, "docs", "guide.md"), "# Guide\n");
		await writeText(path.join(otherProjectDir, "docs", "guide.md"), "# Other Guide\n");

		const first = await runDocsCli(["park", "nconf", projectDir], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_STATE: stateFile,
			},
		});
		expect(first.exitCode).toBe(0);

		const duplicateName = await runDocsCli(["park", "nconf", otherProjectDir], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_STATE: stateFile,
			},
		});
		expect(duplicateName.exitCode).toBe(1);
		expect(duplicateName.stderr).toContain("Docs collection already parked: nconf");

		const duplicatePath = await runDocsCli(["park", "other", projectDir], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_STATE: stateFile,
			},
		});
		expect(duplicatePath.exitCode).toBe(1);
		expect(duplicatePath.stderr).toContain('Docs root already parked as "nconf"');
	});
});

test("docs park rejects invalid docs roots before mutating qmd", async () => {
	await withTempDir("docs-park-invalid-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const projectDir = path.join(tempDir, "project");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "qmd.log");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedFakeQmd(binDir);
		await mkdir(projectDir, { recursive: true });

		const result = await runDocsCli(["park", "broken", projectDir], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain(`Not a docs root: ${projectDir}`);
		const logContents = await readFile(logFile, "utf8").catch(() => "");
		expect(logContents).toBe("");
	});
});

test("multi-token unknown commands return a usage failure", async () => {
	const result = await runDocsCli(["wat", "now"]);

	expect(result.exitCode).toBe(2);
	expect(result.stderr.toLowerCase()).toContain("unknown command");
	expect(result.stderr).toContain("Usage: docs [options] [command]");
});

test("missing required arguments print one error line plus command usage", async () => {
	const result = await runDocsCli(["park"]);

	expect(result.exitCode).toBe(2);
	expect(result.stderr).toContain("error: missing required argument 'name'");
	expect(result.stderr).toContain("Usage: docs park <name> [path]");
	expect(result.stderr.match(/missing required argument 'name'/g)?.length ?? 0).toBe(1);
});

test("missing option values print one error line plus command usage", async () => {
	const result = await runDocsCli(["query", "--limit"]);

	expect(result.exitCode).toBe(2);
	expect(result.stderr.toLowerCase()).toContain("option '--limit <n>' argument missing");
	expect(result.stderr).toContain(`Usage: ${CANONICAL_QUERY_USAGE}`);
	expect(result.stderr.match(/option '--limit <n>' argument missing/g)?.length ?? 0).toBe(1);
});
