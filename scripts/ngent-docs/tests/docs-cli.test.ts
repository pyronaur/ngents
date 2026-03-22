import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test } from "vitest";

import { runDocsCli } from "./helpers/cli.ts";

const CANONICAL_QUERY_USAGE = "docs query [--limit <n>] <query...> | status";
const STALE_QUERY_USAGE = "docs query [options] [terms...]";
const QMD_COLLECTIONS_CACHE_VERSION = 1;
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function makeTempDir(prefix: string): Promise<string> {
	return mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeText(filePath: string, contents: string): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, contents);
}

async function readText(filePath: string): Promise<string> {
	return readFile(filePath, "utf8");
}

async function readTextOrEmpty(filePath: string): Promise<string> {
	try {
		return await readText(filePath);
	} catch {
		return "";
	}
}

async function waitFor(
	description: string,
	check: () => Promise<boolean>,
	timeoutMs = 2_000,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		if (await check()) {
			return;
		}

		if (Date.now() >= deadline) {
			throw new Error(`Timed out waiting for ${description}`);
		}

		await new Promise(resolve => setTimeout(resolve, 25));
	}
}

async function writeExecutable(dir: string, name: string, body: string): Promise<void> {
	const filePath = path.join(dir, name);
	await writeText(filePath, body);
	await chmod(filePath, 0o755);
}

async function runCommand(
	command: string,
	args: string[],
	options: {
		cwd?: string;
		env?: NodeJS.ProcessEnv;
	} = {},
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			env: {
				...process.env,
				...options.env,
			},
		});

		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk: Buffer | string) => {
			stdout += chunk.toString();
		});
		child.stderr.on("data", (chunk: Buffer | string) => {
			stderr += chunk.toString();
		});
		child.on("error", reject);
		child.on("close", (exitCode) => {
			resolve({
				exitCode,
				stdout,
				stderr,
			});
		});
	});
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

async function withTempDir<T>(prefix: string, run: (dir: string) => Promise<T>): Promise<T> {
	const dir = await makeTempDir(prefix);
	try {
		return await run(dir);
	} finally {
		await rm(dir, { recursive: true, force: true });
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

async function writeFetchHandler(dir: string, name: string): Promise<string> {
	const filePath = path.join(dir, name);
	await writeExecutable(
		dir,
		name,
		[
			"#!/bin/sh",
			'source_url=""',
			'target_path=""',
			'previous_hash=""',
			'root_value=""',
			'transform_value=""',
			'while [ "$#" -gt 0 ]; do',
			'  case "$1" in',
			'    --source) source_url="$2"; shift 2 ;;',
			'    --target) target_path="$2"; shift 2 ;;',
			'    --previous-hash) previous_hash="$2"; shift 2 ;;',
			'    --root) root_value="$2"; shift 2 ;;',
			'    --transform) transform_value="$2"; shift 2 ;;',
			'    *) printf "unknown arg: %s\\n" "$1" >&2; exit 1 ;;',
			"  esac",
			"done",
			'if [ -n "${DOCS_TEST_FETCH_LOG:-}" ]; then',
			'  printf "source=%s\\n" "$source_url" >> "$DOCS_TEST_FETCH_LOG"',
			'  printf "target=%s\\n" "$target_path" >> "$DOCS_TEST_FETCH_LOG"',
			'  printf "previous=%s\\n" "$previous_hash" >> "$DOCS_TEST_FETCH_LOG"',
			'  printf "root=%s\\n" "$root_value" >> "$DOCS_TEST_FETCH_LOG"',
			'  printf "transform=%s\\n" "$transform_value" >> "$DOCS_TEST_FETCH_LOG"',
			"fi",
			'if [ "${DOCS_TEST_FETCH_FAIL:-0}" = "1" ]; then',
			'  printf "fake fetch handler failure\\n" >&2',
			"  exit 1",
			"fi",
			'mkdir -p "$target_path"',
			'printf "%s\\n" "${DOCS_TEST_FETCH_CONTENT:-handled}" > "$target_path/handled.txt"',
			'printf "%s\\n" "${DOCS_TEST_FETCH_HASH:-hash-1}"',
			"",
		].join("\n"),
	);
	return filePath;
}

async function createGitFetchSource(
	tempDir: string,
	repositoryName = "fetch-source.git",
): Promise<string> {
	const remoteDir = path.join(tempDir, repositoryName);
	const workDir = path.join(tempDir, "fetch-source-work");
	await expectCommandSuccess("git", ["init", "--bare", remoteDir]);
	await expectCommandSuccess("git", ["clone", remoteDir, workDir]);
	await expectCommandSuccess("git", ["-C", workDir, "config", "user.email", "docs-test@example.com"]);
	await expectCommandSuccess("git", ["-C", workDir, "config", "user.name", "Docs Test"]);
	await writeText(path.join(workDir, "skills", "alpha", "SKILL.md"), "# Alpha\n");
	await writeText(path.join(workDir, "README.md"), "# Repo Root\n");
	await expectCommandSuccess("git", ["-C", workDir, "add", "."]);
	await expectCommandSuccess("git", ["-C", workDir, "commit", "-m", "init"]);
	await expectCommandSuccess("git", ["-C", workDir, "push", "origin", "HEAD"]);
	return pathToFileURL(remoteDir).href;
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
		const normalizedStdout = result.stdout.replaceAll("/private/var", "/var");

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("# docs");
		expect(result.stdout).toContain(CANONICAL_QUERY_USAGE);
		expect(result.stdout).not.toContain(STALE_QUERY_USAGE);
		expect(result.stdout).not.toContain("docs park <name> [path]");
		expect(result.stdout).toContain("docs topic [topic] [section]");
		expect(result.stdout).toContain("docs ls [where]");
		expect(result.stdout).toContain("docs ls ~/work/foo - Resolve a workspace to its docs dir");
		expect(result.stdout).toContain("docs ls machine - Parked global docs by name");
		expect(result.stdout).toContain("To read docs operation manual use `docs --ops-help`.");
		expect(result.stdout).toContain("qmd");
		expect(result.stdout).toContain("local search docs");
		expect(result.stdout).toContain(
			"Ops Notes    This summary is intentionally longer than sixty-four characte...",
		);
		expect(result.stdout).toContain("web-fetching.md - web browser tools");
		expect(result.stdout).toContain(
			"long-summary.md - This summary is intentionally longer than sixty-four characte...",
		);
		expect(normalizedStdout).toContain(`### ${path.join(repoDir, "docs")}`);
		expect(normalizedStdout).toContain(`### ${path.join(homeDir, ".ngents", "docs", "browser")}`);
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
		expect(help.stdout).not.toContain("docs park <name> [path]");
		expect(help.stdout).toContain("docs topic [topic] [section]");
		expect(help.stdout).toContain("To read docs operation manual use `docs --ops-help`.");
		expect(help.stdout).not.toContain("web-fetching.md - web browser tools");
		expect(help.stdout).not.toContain("## Project Docs");
		expect(helpCommand.stdout).toBe(help.stdout);
		expect(bare.stdout).not.toBe(help.stdout);
	});
});

test("docs --ops-help renders the operations manual", async () => {
	const result = await runDocsCli(["--ops-help"]);

	expect(result.exitCode).toBe(0);
	expect(result.stdout).toContain("Usage: docs --ops-help");
	expect(result.stdout).toContain("# docs operations");
	expect(result.stdout).toContain("docs park <name> [path]");
	expect(result.stdout).toContain(
		"docs fetch <source> <path> [--root <subpath>] [--handler <command>] [--transform <command>]",
	);
	expect(result.stdout).toContain("docs update");
	expect(result.stdout).not.toContain(CANONICAL_QUERY_USAGE);
});

test("docs query --help uses the canonical query signature", async () => {
	const result = await runDocsCli(["query", "--help"]);

	expect(result.exitCode).toBe(0);
	expect(result.stdout).toContain(`Usage: ${CANONICAL_QUERY_USAGE}`);
	expect(result.stdout).not.toContain(STALE_QUERY_USAGE);
});

test("docs fetch --help uses the canonical fetch signature", async () => {
	const result = await runDocsCli(["fetch", "--help"]);

	expect(result.exitCode).toBe(0);
	expect(result.stdout).toContain(
		"Usage: docs fetch <source> <path> [--root <subpath>] [--handler <command>] [--transform <command>]",
	);
});

test("docs-git-fetch --help shows the handler options through commander", async () => {
	const result = await runFetchHandlerCli("docs-git-fetch", ["--help"]);

	expect(result.exitCode).toBe(0);
	expect(result.stdout).toContain("Usage: docs-git-fetch [options]");
	expect(result.stdout).toContain("--source <source>");
	expect(result.stdout).toContain("--target <path>");
	expect(result.stdout).toContain("--previous-hash <hash>");
	expect(result.stdout).toContain("--root <subpath>");
	expect(result.stdout).toContain("--transform <command>");
});

test("docs-url-file-fetch --help shows the handler options through commander", async () => {
	const result = await runFetchHandlerCli("docs-url-file-fetch", ["--help"]);

	expect(result.exitCode).toBe(0);
	expect(result.stdout).toContain("Usage: docs-url-file-fetch [options]");
	expect(result.stdout).toContain("--source <source>");
	expect(result.stdout).toContain("--target <path>");
	expect(result.stdout).toContain("--previous-hash <hash>");
	expect(result.stdout).toContain("--root <subpath>");
	expect(result.stdout).toContain("--transform <command>");
});

test("docs-url-file-fetch accepts commander equals-style option values", async () => {
	await withTempDir("docs-url-file-fetch-equals-", async (tempDir) => {
		const sourcePath = path.join(tempDir, "shell.txt");
		const targetPath = path.join(tempDir, "target");
		await writeText(sourcePath, "# Shell\n");

		const result = await runFetchHandlerCli("docs-url-file-fetch", [
			`--source=${pathToFileURL(sourcePath).href}`,
			`--target=${targetPath}`,
			"--previous-hash=",
		]);

		expect(result.exitCode).toBe(0);
		expect(result.stderr).toBe("");
		expect(result.stdout.trim()).not.toBe("");
		expect(await readText(path.join(targetPath, "shell.md"))).toContain("# Shell");
	});
});

test("docs-url-file-fetch rejects unknown options through commander", async () => {
	const result = await runFetchHandlerCli("docs-url-file-fetch", [
		"--source=https://example.com/shell.md",
		"--target=/tmp/target",
		"--previous-hash=",
		"--wat",
	]);

	expect(result.exitCode).toBe(1);
	expect(result.stderr).toContain("unknown option '--wat'");
});

test("docs-url-file-fetch requires the previous hash option through commander", async () => {
	const result = await runFetchHandlerCli("docs-url-file-fetch", [
		"--source=https://example.com/shell.md",
		"--target=/tmp/target",
	]);

	expect(result.exitCode).toBe(1);
	expect(result.stderr).toContain("required option '--previous-hash <hash>' not specified");
});

test("docs-url-file-fetch re-downloads when only Content-Length is available", async () => {
	await withTempDir("docs-url-file-fetch-content-length-", async (tempDir) => {
		let responseBody = "alpha";
		let getRequests = 0;

		await withHttpServer((request, response) => {
			if (request.url !== "/doc.txt") {
				response.statusCode = 404;
				response.end("missing");
				return;
			}

			response.statusCode = 200;
			response.setHeader("Content-Length", String(Buffer.byteLength(responseBody)));
			if (request.method === "HEAD") {
				response.end();
				return;
			}

			getRequests += 1;
			response.end(responseBody);
		}, async (baseUrl) => {
			const targetPath = path.join(tempDir, "target");
			const source = `${baseUrl}/doc.txt`;
			const first = await runFetchHandlerCli("docs-url-file-fetch", [
				`--source=${source}`,
				`--target=${targetPath}`,
				"--previous-hash=",
			]);

			expect(first.exitCode).toBe(0);
			expect(await readText(path.join(targetPath, "doc.md"))).toBe("alpha");

			responseBody = "bravo";
			const firstHash = first.stdout.trim();
			const second = await runFetchHandlerCli("docs-url-file-fetch", [
				`--source=${source}`,
				`--target=${targetPath}`,
				`--previous-hash=${firstHash}`,
			]);

			expect(second.exitCode).toBe(0);
			expect(await readText(path.join(targetPath, "doc.md"))).toBe("bravo");
			expect(second.stdout.trim()).not.toBe(firstHash);
			expect(getRequests).toBe(2);
		});
	});
});

test("docs-url-file-fetch uses validators from the final redirect response", async () => {
	await withTempDir("docs-url-file-fetch-redirect-", async (tempDir) => {
		let finalBody = "alpha";
		let finalEtag = "\"final-a\"";

		await withHttpServer((request, response) => {
			if (request.url === "/redirect.txt") {
				response.statusCode = 302;
				response.setHeader("Location", "/final.txt");
				response.setHeader("ETag", "\"redirect-etag\"");
				response.end();
				return;
			}

			if (request.url !== "/final.txt") {
				response.statusCode = 404;
				response.end("missing");
				return;
			}

			response.statusCode = 200;
			response.setHeader("ETag", finalEtag);
			if (request.method === "HEAD") {
				response.end();
				return;
			}

			response.end(finalBody);
		}, async (baseUrl) => {
			const targetPath = path.join(tempDir, "target");
			const source = `${baseUrl}/redirect.txt`;
			const first = await runFetchHandlerCli("docs-url-file-fetch", [
				`--source=${source}`,
				`--target=${targetPath}`,
				"--previous-hash=",
			]);

			expect(first.exitCode).toBe(0);
			expect(await readText(path.join(targetPath, "redirect.md"))).toBe("alpha");

			finalBody = "bravo";
			finalEtag = "\"final-b\"";
			const firstHash = first.stdout.trim();
			const second = await runFetchHandlerCli("docs-url-file-fetch", [
				`--source=${source}`,
				`--target=${targetPath}`,
				`--previous-hash=${firstHash}`,
			]);

			expect(second.exitCode).toBe(0);
			expect(await readText(path.join(targetPath, "redirect.md"))).toBe("bravo");
			expect(second.stdout.trim()).not.toBe(firstHash);
		});
	});
});

test("docs-git-fetch rejects traversal roots", async () => {
	await withTempDir("docs-git-fetch-root-traversal-", async (tempDir) => {
		const source = await createGitFetchSource(tempDir);
		const result = await runFetchHandlerCli("docs-git-fetch", [
			`--source=${source}`,
			`--target=${path.join(tempDir, "target")}`,
			"--previous-hash=",
			"--root=../../..",
		]);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Invalid git fetch root");
	});
});

test("docs-git-fetch rejects absolute roots", async () => {
	await withTempDir("docs-git-fetch-root-absolute-", async (tempDir) => {
		const source = await createGitFetchSource(tempDir);
		const result = await runFetchHandlerCli("docs-git-fetch", [
			`--source=${source}`,
			`--target=${path.join(tempDir, "target")}`,
			"--previous-hash=",
			`--root=${path.join(tempDir, "outside")}`,
		]);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Invalid git fetch root");
	});
});

test("docs-git-fetch accepts nested roots inside the repository", async () => {
	await withTempDir("docs-git-fetch-root-nested-", async (tempDir) => {
		const source = await createGitFetchSource(tempDir);
		const targetPath = path.join(tempDir, "target");
		const result = await runFetchHandlerCli("docs-git-fetch", [
			`--source=${source}`,
			`--target=${targetPath}`,
			"--previous-hash=",
			"--root=skills/alpha",
		]);

		expect(result.exitCode).toBe(0);
		expect(result.stderr).toBe("");
		expect(result.stdout.trim()).not.toBe("");
		expect(await readText(path.join(targetPath, "SKILL.md"))).toContain("# Alpha");
	});
});

test("docs reference doc uses the canonical query signature", async () => {
	const docPath = new URL("../../../docs/ngents-docs.md", import.meta.url);
	const contents = await readFile(docPath, "utf8");

	expect(contents).toContain(CANONICAL_QUERY_USAGE);
	expect(contents).not.toContain(STALE_QUERY_USAGE);
	expect(contents).toContain("docs --ops-help");
	expect(contents).toContain(
		"docs fetch <source> <path> [--root <subpath>] [--handler <command>] [--transform <command>]",
	);
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
		expect(result.stdout).toContain("# Docs");
		expect(result.stdout).not.toContain("Usage: docs ls [where]");
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
		expect(result.stdout).toContain("# Docs: architecture");
		expect(result.stdout).toContain(path.join(repoDir, "docs", "architecture"));
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs", "architecture"));
		expect(result.stdout).toContain("local-only.md");
		expect(result.stdout).toContain("global-only.md");
	});
});

test("docs browser shows both the topic and registered docs when names overlap", async () => {
	await withTempDir("docs-root-selector-overlap-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir, "Machine");
		await writeText(
			path.join(repoDir, "docs", "topics", "browser", "extensive.md"),
			[
				"# extensive",
				"",
				"Test topic notes.",
				"",
			].join("\n"),
		);
		await writeText(
			path.join(repoDir, "docs", "browser", "local-browser.md"),
			[
				"---",
				"title: Local Browser Notes",
				"summary: Local browser docs.",
				"---",
				"",
				"# Local Browser Notes",
				"",
				"Local browser details.",
				"",
			].join("\n"),
		);

		const bareResult = await runDocsCli(["browser"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});
		const docsOnlyResult = await runDocsCli(["ls", "browser"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});
		const topicOnlyResult = await runDocsCli(["topic", "browser"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(bareResult.exitCode).toBe(0);
		expect(bareResult.stdout).toContain("# Docs: browser");
		expect(bareResult.stdout).toContain("## Topic: browser");
		expect(bareResult.stdout).toContain(path.join(repoDir, "docs", "topics", "browser"));
		expect(bareResult.stdout).toContain("### Docs");
		expect(bareResult.stdout).not.toContain("#### extensive");
		expect(bareResult.stdout).toContain("## Docs: browser");
		expect(bareResult.stdout).toContain(path.join(repoDir, "docs", "browser"));
		expect(bareResult.stdout).toContain(path.join(homeDir, ".ngents", "docs", "browser"));
		expect(bareResult.stdout).toContain("local-browser.md");
		expect(bareResult.stdout).toContain("extensive.md");
		expect(bareResult.stdout).toContain("cdp.md");

		expect(docsOnlyResult.exitCode).toBe(0);
		expect(docsOnlyResult.stdout).toContain("# Docs: browser");
		expect(docsOnlyResult.stdout).toContain("Topic available: docs topic browser");
		expect(docsOnlyResult.stdout).toContain(path.join(repoDir, "docs", "browser"));
		expect(docsOnlyResult.stdout).toContain(path.join(homeDir, ".ngents", "docs", "browser"));
		expect(docsOnlyResult.stdout).not.toContain(path.join(repoDir, "docs", "topics", "browser"));

		expect(topicOnlyResult.exitCode).toBe(0);
		expect(topicOnlyResult.stdout).toContain("# Topic: browser");
		expect(topicOnlyResult.stdout).toContain(path.join(repoDir, "docs", "topics", "browser"));
		expect(topicOnlyResult.stdout).toContain("## Docs");
		expect(topicOnlyResult.stdout).not.toContain("---");
		expect(topicOnlyResult.stdout).not.toContain("### extensive");
		expect(topicOnlyResult.stdout).not.toContain(path.join(repoDir, "docs", "browser"));
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
		expect(bareName.stdout).toContain("# Docs: machine");
		expect(bareName.stdout).toContain("## Topics: machine");
		expect(bareName.stdout).toContain("qmd");
		expect(bareName.stdout).toContain(path.join(homeDir, ".ngents", "docs"));
		expect(bareName.stdout).toContain("cdp.md");

		expect(bareTopic.exitCode).toBe(0);
		expect(bareTopic.stdout).toContain("# Topic: iOS Library");
		expect(bareTopic.stdout).toContain(path.join(repoDir, "docs", "topics", "ios"));

		expect(bareRegisteredDocs.exitCode).toBe(0);
		expect(bareRegisteredDocs.stdout).toContain("# Docs: architecture");
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

test("docs topic opens parked collection topic indexes without docs", async () => {
	await withTempDir("docs-topic-parked-collection-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir, "Machine");

		const result = await runDocsCli(["topic", "machine"], {
			cwd: repoDir,
			env: docsEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("# Topics: machine");
		expect(result.stdout).toContain("qmd");
		expect(result.stdout).not.toContain(path.join(homeDir, ".ngents", "docs", "browser"));
		expect(result.stdout).not.toContain("cdp.md");
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
		expect(result.stderr).toContain("It's not a command: fetch, ls, park, topic, query, update");
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
		expect(result.stdout).toContain("# Topic: QMD");
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
			"# Topic: iOS Library",
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
			"## Docs",
			"",
			path.join(normalizedRepoDir, "docs", "topics", "ios", "SOSUMI.md"),
			"",
			"Sosumi CLI and MCP reference for fetching Apple Developer docs as Markdown.",
			"",
			"---",
			"",
			"## Skills",
			"### hig-doctor",
			`Path: ${path.join(normalizedRepoDir, "docs", "topics", "ios", "hig-doctor", "skills", "hig-components-content", "SKILL.md")}`,
			"",
			"$hig-components-content",
			"",
			"### ios-debugger-agent",
			`Path: ${path.join(normalizedRepoDir, "docs", "topics", "ios", "ios-debugger-agent", "SKILL.md")}`,
			"",
			"$ios-debugger-agent",
			"",
			"### swiftui-pro",
			`Path: ${path.join(normalizedRepoDir, "docs", "topics", "ios", "swiftui-pro", "SKILL.md")}`,
			"",
			"$swiftui-pro",
		].join("\n");

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe(expected);
	});
});

test("docs topic overview renders skill hints from ancestor guides with deeper overrides", async () => {
	await withTempDir("docs-topic-skill-hints-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		await seedLocalDocsRepo(repoDir);
		await seedSkillBackedSection(repoDir);
		const normalizedRepoDir = await realpath(repoDir);

		await writeText(
			path.join(repoDir, "docs", "topics", "ios", ".docs.md"),
			[
				"---",
				"title: iOS Library",
				"short: Apple-platform docs",
				"summary: This topic collects iOS-focused references, Apple HIG skills, and Dynamic Skills for Apple-platform work.",
				"hints:",
				"  - ios-debugger-agent: Build and debug on a booted simulator.",
				"  - hig-doctor/skills/hig-components-content: General HIG content guidance.",
				"  - malformed-entry-without-colon",
				"  - swiftui-pro:",
				"---",
				"",
				"Use `docs topic ios <section>` to focus one section.",
				"",
			].join("\n"),
		);
		await writeText(
			path.join(repoDir, "docs", "topics", "ios", "hig-doctor", "skills", ".docs.md"),
			[
				"---",
				"title: HIG Skills",
				"hints:",
				"  - hig-components-content: Section override for HIG content guidance.",
				"---",
				"",
				"# HIG Skills",
				"",
			].join("\n"),
		);

		const result = await runDocsCli(["topic", "ios"], {
			cwd: repoDir,
			env: docsEnv(path.join(tempDir, "home")),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("$hig-components-content - Section override for HIG content guidance.");
		expect(result.stdout).toContain(
			[
				`### ios-debugger-agent`,
				`Path: ${path.join(normalizedRepoDir, "docs", "topics", "ios", "ios-debugger-agent", "SKILL.md")}`,
				"",
				"$ios-debugger-agent - Build and debug on a booted simulator.",
			].join("\n"),
		);
		expect(result.stdout).toContain(
			[
				`### swiftui-pro`,
				`Path: ${path.join(normalizedRepoDir, "docs", "topics", "ios", "swiftui-pro", "SKILL.md")}`,
				"",
				"$swiftui-pro",
			].join("\n"),
		);
	});
});

test("docs topic overview resolves hints by skill path instead of skill name", async () => {
	await withTempDir("docs-topic-skill-hints-path-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		await seedLocalDocsRepo(repoDir);

		await writeText(
			path.join(repoDir, "docs", "topics", "ios", ".docs.md"),
			[
				"---",
				"title: iOS Library",
				"hints:",
				"  - renamed-skill: Hint matched by skill directory path.",
				"---",
				"",
			].join("\n"),
		);
		await writeText(
			path.join(repoDir, "docs", "topics", "ios", "renamed-skill", "SKILL.md"),
			[
				"---",
				"name: display-name-from-frontmatter",
				"description: Uses a different display name.",
				"---",
				"",
				"# Renamed Skill",
				"",
			].join("\n"),
		);

		const result = await runDocsCli(["topic", "ios"], {
			cwd: repoDir,
			env: docsEnv(path.join(tempDir, "home")),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("$display-name-from-frontmatter - Hint matched by skill directory path.");
	});
});

test("docs topic overview renders multi-skill sections with a path template", async () => {
	await withTempDir("docs-topic-skill-path-template-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		await seedLocalDocsRepo(repoDir);
		const normalizedRepoDir = await realpath(repoDir);

		await writeText(
			path.join(repoDir, "docs", "topics", "ios", "skills", "alpha-skill", "SKILL.md"),
			[
				"---",
				"name: alpha-skill",
				"description: Alpha skill.",
				"---",
				"",
				"# Alpha Skill",
				"",
			].join("\n"),
		);
		await writeText(
			path.join(repoDir, "docs", "topics", "ios", "skills", "beta-skill", "SKILL.md"),
			[
				"---",
				"name: beta-skill",
				"description: Beta skill.",
				"---",
				"",
				"# Beta Skill",
				"",
			].join("\n"),
		);

		const result = await runDocsCli(["topic", "ios"], {
			cwd: repoDir,
			env: docsEnv(path.join(tempDir, "home")),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(
			[
				"### skills",
				`Path: ${path.join(normalizedRepoDir, "docs", "topics", "ios", "skills", "{$name}", "SKILL.md")}`,
				"",
				"$alpha-skill",
				"$beta-skill",
			].join("\n"),
		);
	});
});

test("docs topic overview renders docs sections as compact doc lists", async () => {
	await withTempDir("docs-topic-doc-section-overview-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		await seedLocalDocsRepo(repoDir);
		const normalizedRepoDir = await realpath(repoDir);

		await writeText(
			path.join(repoDir, "docs", "topics", "ios", "docs", "ng-hig-doctor.md"),
			[
				"---",
				"title: ng hig-doctor",
				"summary: Local CLI wrapper for HIG Doctor.",
				"---",
				"",
				"# ng hig-doctor",
				"",
			].join("\n"),
		);
		await writeText(
			path.join(repoDir, "docs", "topics", "ios", "docs", "SOSUMI.md"),
			[
				"---",
				"title: Sosumi CLI",
				"summary: Sosumi CLI docs.",
				"---",
				"",
				"# Sosumi CLI",
				"",
			].join("\n"),
		);

		const result = await runDocsCli(["topic", "ios"], {
			cwd: repoDir,
			env: docsEnv(path.join(tempDir, "home")),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(
			[
				"### docs",
				`Path: ${path.join(normalizedRepoDir, "docs", "topics", "ios", "docs")}/`,
				"",
				"- ng-hig-doctor.md: ng hig-doctor",
				"- SOSUMI.md: Sosumi CLI",
			].join("\n"),
		);
		expect(result.stdout).not.toContain("contains:");
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

test("docs bare topic selectors match docs topic when no registered docs overlap", async () => {
	await withTempDir("docs-topic-root-same-output-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		await seedLocalDocsRepo(repoDir);
		await seedSkillBackedSection(repoDir);

		const bareResult = await runDocsCli(["ios"], {
			cwd: repoDir,
			env: docsEnv(path.join(tempDir, "home")),
		});
		const topicResult = await runDocsCli(["topic", "ios"], {
			cwd: repoDir,
			env: docsEnv(path.join(tempDir, "home")),
		});

		expect(bareResult.exitCode).toBe(0);
		expect(topicResult.exitCode).toBe(0);
		expect(bareResult.stdout.trim()).toBe(topicResult.stdout.trim());
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

test("docs fetch creates a local manifest entry and saves the returned hash", async () => {
	await withTempDir("docs-fetch-manifest-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");

		const result = await runDocsCli(
			[
				"fetch",
				"https://example.com/source",
				path.join(repoDir, "docs", "topics", "ios", "remote-bundle"),
				"--handler",
				handlerPath,
			],
			{
				cwd: repoDir,
				env: {
					...docsEnv(homeDir, binDir),
					DOCS_TEST_FETCH_HASH: "hash-1",
				},
			},
		);

		const manifest = JSON.parse(
			await readText(path.join(repoDir, "docs", ".docs-fetch.json")),
		) as {
			entries: Array<{
				source: string;
				target: string;
				handler: string;
				hash: string;
			}>;
		};

		expect(result.exitCode).toBe(0);
		expect(manifest.entries).toEqual([
			{
				source: "https://example.com/source",
				target: "topics/ios/remote-bundle",
				handler: handlerPath,
				hash: "hash-1",
			},
		]);
		expect(
			await readText(path.join(repoDir, "docs", "topics", "ios", "remote-bundle", "handled.txt")),
		).toContain("handled");
	});
});

test("docs fetch passes the previous hash back to the handler on later runs", async () => {
	await withTempDir("docs-fetch-previous-hash-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "fetch.log");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");
		const targetPath = path.join(repoDir, "docs", "topics", "ios", "remote-bundle");

		const first = await runDocsCli(
			["fetch", "https://example.com/source", targetPath, "--handler", handlerPath],
			{
				cwd: repoDir,
				env: {
					...docsEnv(homeDir, binDir),
					DOCS_TEST_FETCH_HASH: "hash-1",
					DOCS_TEST_FETCH_LOG: logFile,
				},
			},
		);
		const second = await runDocsCli(
			["fetch", "https://example.com/source", targetPath, "--handler", handlerPath],
			{
				cwd: repoDir,
				env: {
					...docsEnv(homeDir, binDir),
					DOCS_TEST_FETCH_HASH: "hash-2",
					DOCS_TEST_FETCH_LOG: logFile,
				},
			},
		);

		const logContents = await readText(logFile);

		expect(first.exitCode).toBe(0);
		expect(second.exitCode).toBe(0);
		expect(logContents).toContain("previous=");
		expect(logContents).toContain("previous=hash-1");
		expect(await readText(path.join(repoDir, "docs", ".docs-fetch.json"))).toContain('"hash": "hash-2"');
	});
});

test("docs fetch auto-selects the built-in git and url-file handlers", async () => {
	await withTempDir("docs-fetch-builtins-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);

		const gitSource = await createGitFetchSource(tempDir);
		const localFilePath = path.join(tempDir, "shell.txt");
		await writeText(localFilePath, "# Shell\n");
		const fileSource = pathToFileURL(localFilePath).href;

		const gitResult = await runDocsCli(
			[
				"fetch",
				gitSource,
				path.join(repoDir, "docs", "topics", "ios", "git-import"),
				"--root",
				"skills",
			],
			{
				cwd: repoDir,
				env: docsEnv(homeDir),
			},
		);
		const fileResult = await runDocsCli(
			[
				"fetch",
				fileSource,
				path.join(repoDir, "docs", "topics", "ios", "file-import"),
			],
			{
				cwd: repoDir,
				env: docsEnv(homeDir),
			},
		);

		const manifest = JSON.parse(
			await readText(path.join(repoDir, "docs", ".docs-fetch.json")),
		) as {
			entries: Array<{
				target: string;
				handler: string;
			}>;
		};
		const handlersByTarget = new Map(manifest.entries.map(entry => [entry.target, entry.handler]));

		expect(gitResult.exitCode).toBe(0);
		expect(fileResult.exitCode).toBe(0);
		expect(handlersByTarget.get("topics/ios/git-import")).toBe("docs-git-fetch");
		expect(handlersByTarget.get("topics/ios/file-import")).toBe("docs-url-file-fetch");
		expect(
			await readText(path.join(repoDir, "docs", "topics", "ios", "git-import", "alpha", "SKILL.md")),
		).toContain("# Alpha");
		expect(
			await readText(path.join(repoDir, "docs", "topics", "ios", "file-import", "shell.md")),
		).toContain("# Shell");
	});
});

test("docs fetch auto-selects the built-in git handler for dotted local git file URLs", async () => {
	await withTempDir("docs-fetch-dotted-local-git-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);

		const gitSource = await createGitFetchSource(tempDir, "fetch.source.repo.v2");
		const result = await runDocsCli(
			[
				"fetch",
				gitSource,
				path.join(repoDir, "docs", "topics", "ios", "git-import"),
				"--root",
				"skills",
			],
			{
				cwd: repoDir,
				env: docsEnv(homeDir),
			},
		);
		const manifest = JSON.parse(
			await readText(path.join(repoDir, "docs", ".docs-fetch.json")),
		) as {
			entries: Array<{
				target: string;
				handler: string;
			}>;
		};

		expect(result.exitCode).toBe(0);
		expect(manifest.entries).toContainEqual(expect.objectContaining({
			target: "topics/ios/git-import",
			handler: "docs-git-fetch",
		}));
		expect(
			await readText(path.join(repoDir, "docs", "topics", "ios", "git-import", "alpha", "SKILL.md")),
		).toContain("# Alpha");
	});
});

test("docs fetch auto-selects the built-in git handler for dotted hosted repo URLs", async () => {
	await withTempDir("docs-fetch-dotted-hosted-git-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await writeExecutable(
			binDir,
			"git",
			[
				"#!/bin/sh",
				'if [ "$1" = "ls-remote" ]; then',
				"  printf '0123456789abcdef0123456789abcdef01234567\\tHEAD\\n'",
				"  exit 0",
				"fi",
				'if [ "$1" = "clone" ]; then',
				'  for last_arg in "$@"; do checkout_dir="$last_arg"; done',
				'  mkdir -p "$checkout_dir/skills/alpha"',
				'  printf "# Alpha\\n" > "$checkout_dir/skills/alpha/SKILL.md"',
				'  printf "# Repo Root\\n" > "$checkout_dir/README.md"',
				"  exit 0",
				"fi",
				'if [ "$1" = "-C" ] && [ "$3" = "sparse-checkout" ] && [ "$4" = "set" ]; then',
				"  exit 0",
				"fi",
				'printf "unexpected git args: %s\\n" "$*" >&2',
				"exit 1",
				"",
			].join("\n"),
		);
		await writeExecutable(
			binDir,
			"curl",
			[
				"#!/bin/sh",
				'printf "curl should not run for hosted git auto-detection\\n" >&2',
				"exit 1",
				"",
			].join("\n"),
		);

		const result = await runDocsCli(
			[
				"fetch",
				"https://github.com/org/repo.v2",
				path.join(repoDir, "docs", "topics", "ios", "git-import"),
				"--root",
				"skills",
			],
			{
				cwd: repoDir,
				env: docsEnv(homeDir, binDir),
			},
		);
		const manifest = JSON.parse(
			await readText(path.join(repoDir, "docs", ".docs-fetch.json")),
		) as {
			entries: Array<{
				target: string;
				handler: string;
			}>;
		};

		expect(result.exitCode).toBe(0);
		expect(manifest.entries).toContainEqual(expect.objectContaining({
			target: "topics/ios/git-import",
			handler: "docs-git-fetch",
		}));
		expect(
			await readText(path.join(repoDir, "docs", "topics", "ios", "git-import", "alpha", "SKILL.md")),
		).toContain("# Alpha");
	});
});

test("docs fetch rejects targets outside discovered docs roots", async () => {
	await withTempDir("docs-fetch-outside-root-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const outsideDir = path.join(tempDir, "outside");
		await seedLocalDocsRepo(repoDir);

		const result = await runDocsCli(
			[
				"fetch",
				"https://example.com/source",
				outsideDir,
			],
			{
				cwd: repoDir,
				env: docsEnv(path.join(tempDir, "home")),
			},
		);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Fetch target is outside discovered docs roots");
	});
});

test("docs fetch rejects targeting the docs root itself", async () => {
	await withTempDir("docs-fetch-docs-root-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");

		const result = await runDocsCli(
			[
				"fetch",
				"https://example.com/source",
				path.join(repoDir, "docs"),
				"--handler",
				handlerPath,
			],
			{
				cwd: repoDir,
				env: docsEnv(homeDir, binDir),
			},
		);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Fetch target must be a subdirectory inside a discovered docs root");
	});
});

test("docs fetch stores and replays root and transform options through docs update", async () => {
	await withTempDir("docs-fetch-options-replay-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "fetch.log");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedFakeQmd(binDir);
		const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");
		const transformPath = path.join(binDir, "fake-transform");
		await writeExecutable(binDir, "fake-transform", "#!/bin/sh\nexit 0\n");
		const targetPath = path.join(repoDir, "docs", "topics", "ios", "remote-bundle");

		const fetchResult = await runDocsCli(
			[
				"fetch",
				"https://example.com/source",
				targetPath,
				"--handler",
				handlerPath,
				"--root",
				"skills",
				"--transform",
				transformPath,
			],
			{
				cwd: repoDir,
				env: {
					...docsEnv(homeDir, binDir),
					DOCS_TEST_FETCH_HASH: "hash-1",
					DOCS_TEST_FETCH_LOG: logFile,
				},
			},
		);
		const updateResult = await runDocsCli(["update"], {
			cwd: repoDir,
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_FETCH_HASH: "hash-2",
				DOCS_TEST_FETCH_LOG: logFile,
			},
		});

		const logContents = await readText(logFile);

		expect(fetchResult.exitCode).toBe(0);
		expect(updateResult.exitCode).toBe(0);
		expect(logContents).toContain("root=skills");
		expect(logContents).toContain(`transform=${transformPath}`);
		expect(logContents).toContain("previous=hash-1");
	});
});

test("docs update reruns registered fetch entries before qmd refresh", async () => {
	await withTempDir("docs-update-fetch-first-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "combined.log");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedFakeQmd(binDir);
		const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");
		const targetPath = path.join(repoDir, "docs", "topics", "ios", "remote-bundle");

		const fetchResult = await runDocsCli(
			["fetch", "https://example.com/source", targetPath, "--handler", handlerPath],
			{
				cwd: repoDir,
				env: {
					...docsEnv(homeDir, binDir),
					DOCS_TEST_FETCH_HASH: "hash-1",
					DOCS_TEST_FETCH_LOG: logFile,
				},
			},
		);
		const updateResult = await runDocsCli(["update"], {
			cwd: repoDir,
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_FETCH_HASH: "hash-2",
				DOCS_TEST_FETCH_LOG: logFile,
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		const logLines = (await readText(logFile)).trim().split("\n");

		expect(fetchResult.exitCode).toBe(0);
		expect(updateResult.exitCode).toBe(0);
		expect(logLines).toContain("previous=hash-1");
		expect(logLines[0]).toBe("source=https://example.com/source");
		expect(logLines).toContain("--index ngents-docs update");
		expect(logLines.indexOf("previous=hash-1")).toBeLessThan(
			logLines.indexOf("--index ngents-docs update"),
		);
	});
});

test("docs update skips unsafe manifest targets outside docs roots, refreshes safe entries, and exits non-zero", async () => {
	await withTempDir("docs-update-unsafe-target-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "combined.log");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedFakeQmd(binDir);
		const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");
		await writeText(
			path.join(repoDir, "docs", ".docs-fetch.json"),
			`${JSON.stringify(
				{
					entries: [
						{
							source: "https://example.com/unsafe",
							target: "../../outside",
							handler: handlerPath,
							hash: "hash-unsafe",
						},
						{
							source: "https://example.com/safe",
							target: "topics/ios/remote-bundle",
							handler: handlerPath,
							hash: "hash-safe-old",
						},
					],
				},
				null,
				"\t",
			)}\n`,
		);

		const result = await runDocsCli(["update"], {
			cwd: repoDir,
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_FETCH_HASH: "hash-safe-new",
				DOCS_TEST_FETCH_LOG: logFile,
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		const logContents = await readText(logFile);
		const manifestContents = await readText(path.join(repoDir, "docs", ".docs-fetch.json"));

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Skipping unsafe fetch entry");
		expect(result.stderr).toContain("target must not contain '..'");
		expect(result.stderr).toContain("1 unsafe fetch entry was skipped during docs update.");
		expect(result.stdout).toContain("Updating fake index");
		expect(result.stdout).toContain("Embedding fake index");
		expect(logContents).toContain("source=https://example.com/safe");
		expect(logContents).not.toContain("source=https://example.com/unsafe");
		expect(logContents).toContain("--index ngents-docs update");
		expect(logContents).toContain("--index ngents-docs embed");
		expect(manifestContents).toContain('"target": "../../outside"');
		expect(manifestContents).toContain('"hash": "hash-unsafe"');
		expect(manifestContents).toContain('"hash": "hash-safe-new"');
	});
});

test("docs update skips unsafe manifest targets that use backslash traversal", async () => {
	await withTempDir("docs-update-unsafe-backslash-target-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "combined.log");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedFakeQmd(binDir);
		const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");
		await writeText(
			path.join(repoDir, "docs", ".docs-fetch.json"),
			`${JSON.stringify(
				{
					entries: [
						{
							source: "https://example.com/unsafe",
							target: "..\\..\\outside",
							handler: handlerPath,
							hash: "hash-unsafe",
						},
					],
				},
				null,
				"\t",
			)}\n`,
		);

		const result = await runDocsCli(["update"], {
			cwd: repoDir,
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_FETCH_HASH: "hash-next",
				DOCS_TEST_FETCH_LOG: logFile,
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		const logContents = await readText(logFile);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Skipping unsafe fetch entry");
		expect(result.stderr).toContain("target must not contain '..'");
		expect(logContents).not.toContain("source=https://example.com/unsafe");
		expect(logContents).toContain("--index ngents-docs update");
		expect(logContents).toContain("--index ngents-docs embed");
	});
});

test("docs update skips manifest entries targeting the docs root itself", async () => {
	await withTempDir("docs-update-root-target-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "combined.log");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		await seedFakeQmd(binDir);
		const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");
		await writeText(
			path.join(repoDir, "docs", ".docs-fetch.json"),
			`${JSON.stringify(
				{
					entries: [
						{
							source: "https://example.com/root",
							target: ".",
							handler: handlerPath,
							hash: "hash-root",
						},
					],
				},
				null,
				"\t",
			)}\n`,
		);

		const result = await runDocsCli(["update"], {
			cwd: repoDir,
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_FETCH_HASH: "hash-next",
				DOCS_TEST_FETCH_LOG: logFile,
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		const logContents = await readText(logFile);
		const manifestContents = await readText(path.join(repoDir, "docs", ".docs-fetch.json"));

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Skipping unsafe fetch entry");
		expect(result.stderr).toContain("target must be a subdirectory");
		expect(result.stderr).toContain("1 unsafe fetch entry was skipped during docs update.");
		expect(logContents).not.toContain("source=https://example.com/root");
		expect(logContents).toContain("--index ngents-docs update");
		expect(logContents).toContain("--index ngents-docs embed");
		expect(manifestContents).toContain('"target": "."');
		expect(manifestContents).toContain('"hash": "hash-root"');
	});
});

test("docs fetch keeps the prior stored hash when the handler fails", async () => {
	await withTempDir("docs-fetch-failure-hash-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedLocalDocsRepo(repoDir);
		const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");
		const targetPath = path.join(repoDir, "docs", "topics", "ios", "remote-bundle");

		const first = await runDocsCli(
			["fetch", "https://example.com/source", targetPath, "--handler", handlerPath],
			{
				cwd: repoDir,
				env: {
					...docsEnv(homeDir, binDir),
					DOCS_TEST_FETCH_HASH: "hash-1",
				},
			},
		);
		const failed = await runDocsCli(
			["fetch", "https://example.com/source", targetPath, "--handler", handlerPath],
			{
				cwd: repoDir,
				env: {
					...docsEnv(homeDir, binDir),
					DOCS_TEST_FETCH_FAIL: "1",
					DOCS_TEST_FETCH_HASH: "hash-2",
				},
			},
		);

		expect(first.exitCode).toBe(0);
		expect(failed.exitCode).toBe(1);
		expect(failed.stderr).toContain("fake fetch handler failure");
		expect(await readText(path.join(repoDir, "docs", ".docs-fetch.json"))).toContain('"hash": "hash-1"');
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
		const logContents = await readFile(logFile, "utf8");
		expect(logContents).toContain("--index ngents-docs update");
		expect(logContents).toContain("--index ngents-docs embed");
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
		const logContents = await readFile(logFile, "utf8");
		expect(logContents).toContain("--index ngents-docs update");
		expect(logContents).not.toContain("--index ngents-docs embed");
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
		const logContents = await readFile(logFile, "utf8");
		expect(logContents).toContain("--index ngents-docs update");
		expect(logContents).toContain("--index ngents-docs embed");
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

test("docs ls global reuses a fresh collection metadata cache without qmd lookups", async () => {
	await withTempDir("docs-cache-fresh-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "qmd.log");
		const docsRoot = path.join(homeDir, ".ngents", "docs");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);
		await seedQmdCollectionsCache(homeDir, {
			fetchedAt: new Date().toISOString(),
			collections: [{ name: "global", path: docsRoot }],
		});

		const result = await runDocsCli(["ls", "global"], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(docsRoot);
		expect(result.stdout).toContain(" - cdp.md");
		expect(result.stdout).toContain("Need to start, stop, or inspect the local Chrome CDP session.");
		expect(await readTextOrEmpty(logFile)).toBe("");
	});
});

test("docs ls global serves stale collection metadata and refreshes it in the background", async () => {
	await withTempDir("docs-cache-swr-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "qmd.log");
		const freshDocsRoot = path.join(homeDir, ".ngents", "docs");
		const staleDocsRoot = path.join(tempDir, "stale-docs");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);
		await writeText(
			path.join(staleDocsRoot, "stale-only.md"),
			[
				"---",
				"title: Stale Only",
				"summary: Cached stale docs root.",
				"---",
				"",
				"# Stale Only",
				"",
				"Stale body.",
				"",
			].join("\n"),
		);
		await seedQmdCollectionsCache(homeDir, {
			fetchedAt: new Date(Date.now() - (2 * 60 * 60 * 1000)).toISOString(),
			collections: [{ name: "global", path: staleDocsRoot }],
		});

		const staleResult = await runDocsCli(["ls", "global"], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(staleResult.exitCode).toBe(0);
		expect(staleResult.stdout).toContain(staleDocsRoot);
		expect(staleResult.stdout).toContain(" - stale-only.md");
		expect(staleResult.stdout).toContain("Cached stale docs root.");
		expect(staleResult.stdout).not.toContain(freshDocsRoot);

		await waitFor("background collection refresh log entries", async () => {
			const logContents = await readTextOrEmpty(logFile);
			return logContents.includes("--index ngents-docs collection list")
				&& logContents.includes("--index ngents-docs collection show global");
		});
		await waitFor("refreshed collection cache", async () => {
			const cacheContents = await readText(qmdCollectionsCachePath(homeDir));
			return cacheContents.includes(freshDocsRoot) && !cacheContents.includes(staleDocsRoot);
		});

		await rm(logFile, { force: true });
		const freshResult = await runDocsCli(["ls", "global"], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(freshResult.exitCode).toBe(0);
		expect(freshResult.stdout).toContain(freshDocsRoot);
		expect(freshResult.stdout).toContain(" - cdp.md");
		expect(freshResult.stdout).toContain("Need to start, stop, or inspect the local Chrome CDP session.");
		expect(freshResult.stdout).not.toContain(staleDocsRoot);
		expect(await readTextOrEmpty(logFile)).toBe("");
	});
});

test("docs ls global rebuilds a corrupt collection metadata cache synchronously", async () => {
	await withTempDir("docs-cache-corrupt-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "qmd.log");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir);
		await writeText(qmdCollectionsCachePath(homeDir), "{not json");

		const result = await runDocsCli(["ls", "global"], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs"));
		const logContents = await readText(logFile);
		expect(logContents).toContain("--index ngents-docs collection list");
		expect(logContents).toContain("--index ngents-docs collection show global");
		const cacheContents = await readText(qmdCollectionsCachePath(homeDir));
		expect(cacheContents).toContain(path.join(homeDir, ".ngents", "docs"));
	});
});

test("docs query uses cached collection metadata and still runs a fresh qmd query", async () => {
	await withTempDir("docs-cache-query-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "qmd.log");
		const docsRoot = path.join(homeDir, ".ngents", "docs");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedGlobalDocsIndex(homeDir, binDir, "ngents");
		await seedQmdCollectionsCache(homeDir, {
			fetchedAt: new Date().toISOString(),
			collections: [{ name: "ngents", path: docsRoot }],
		});

		const result = await runDocsCli(["query", "shell", "environment", "policy"], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(path.join(docsRoot, "ngents", "docs.md"));
		const logContents = await readText(logFile);
		expect(logContents).toContain("--index ngents-docs query shell environment policy -n 5 --min-score 0.35 --json");
		expect(logContents).not.toContain("collection list");
		expect(logContents).not.toContain("collection show");
	});
});

test("docs update invalidates the collection metadata cache after a successful refresh", async () => {
	await withTempDir("docs-cache-update-invalidate-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		const logFile = path.join(tempDir, "qmd.log");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedFakeQmd(binDir);
		await seedQmdCollectionsCache(homeDir, {
			fetchedAt: new Date().toISOString(),
			collections: [{ name: "global", path: path.join(homeDir, ".ngents", "docs") }],
		});

		const result = await runDocsCli(["update"], {
			env: {
				...docsEnv(homeDir, binDir),
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(result.exitCode).toBe(0);
		expect(await readTextOrEmpty(qmdCollectionsCachePath(homeDir))).toBe("");
		expect(await readText(logFile)).toBe(
			[
				"--index ngents-docs update",
				"--index ngents-docs embed",
				"",
			].join("\n"),
		);
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
		expect(topicResult.stdout).toContain("# Topic: Infrastructure");
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
