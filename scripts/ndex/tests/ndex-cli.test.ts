import { chmod, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

import { runNdexCli } from "./helpers/cli.ts";

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
		path.join(repoDir, "docs", "topics", "ios", ".ndex.md"),
		[
			"---",
			"title: iOS Library",
			"short: Apple-platform docs",
			"summary: This topic collects iOS-focused references, Apple HIG skills, and Dynamic Skills for Apple-platform work.",
			"---",
			"",
			"Use `ndex topic ios <section>` to focus one section.",
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
		path.join(repoDir, "docs", "topics", "qmd", ".ndex.md"),
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
		path.join(repoDir, "docs", "topics", "ops", ".ndex.md"),
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
		path.join(repoDir, "docs", "topics", "qmd", "references", ".ndex.md"),
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
		path.join(homeDir, ".ngents", "docs", "topics", "qmd", ".ndex.md"),
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
		path.join(homeDir, ".ngents", "docs", "topics", "qmd", "references", ".ndex.md"),
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
			"`ndex query` searches docs.",
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

async function seedFakeQmd(binDir: string): Promise<void> {
	await writeExecutable(
		binDir,
		"qmd",
		[
			"#!/bin/sh",
			'if [ "$3" = "status" ]; then',
			"  cat <<'EOF'",
			"QMD Status",
			"",
			"Index: fake.sqlite",
			"EOF",
			"  exit 0",
			"fi",
			'if [ "$3" = "query" ]; then',
			"  cat <<'EOF'",
			'[{"file":"qmd://global-docs/ngents/docs.md","title":"Documentation Commands","score":0.91,"context":"Need one place that explains which ngents script commands exist and how to run them.","snippet":"@@ -12,2 @@\\n# ndex query\\nSearch docs quickly."}]',
			"EOF",
			"  exit 0",
			"fi",
			'printf "unexpected qmd args: %s\\n" "$*" >&2',
			"exit 1",
			"",
		].join("\n"),
	);
}

function ndexEnv(homeDir: string, binDir?: string): NodeJS.ProcessEnv {
	return {
		HOME: homeDir,
		PATH: binDir ? `${binDir}:${process.env.PATH ?? ""}` : process.env.PATH,
	};
}

test("bare ndex renders compact markdown help with merged topics and docs", async () => {
	await withTempDir("ndex-root-help-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);

		const result = await runNdexCli([], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("# ndex");
		expect(result.stdout).toContain("ndex topic [topic] [section]");
		expect(result.stdout).toContain("ndex ls [where]");
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

test("ndex --help uses the same markdown help style without the docs index", async () => {
	await withTempDir("ndex-help-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);

		const bare = await runNdexCli([], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
		});
		const help = await runNdexCli(["--help"], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
		});
		const helpCommand = await runNdexCli(["help"], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
		});

		expect(help.exitCode).toBe(0);
		expect(helpCommand.exitCode).toBe(0);
		expect(help.stdout).toContain("# ndex");
		expect(help.stdout).toContain("ndex topic [topic] [section]");
		expect(help.stdout).not.toContain("web-fetching.md - web browser tools");
		expect(help.stdout).not.toContain("## Project Docs");
		expect(helpCommand.stdout).toBe(help.stdout);
		expect(bare.stdout).not.toBe(help.stdout);
	});
});

test("ndex ls merges local and global docs by default", async () => {
	await withTempDir("ndex-ls-merged-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);

		const result = await runNdexCli(["ls"], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Usage: ndex ls [where]");
		expect(result.stdout).toContain(path.join(repoDir, "docs"));
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs"));
		expect(result.stdout).toContain("web-fetching.md");
		expect(result.stdout).toContain("Need to fetch web content for research.");
		expect(result.stdout).toContain("cdp.md");
		expect(result.stdout).toContain("Need to start, stop, or inspect the local Chrome CDP session.");
		expect(result.stdout).not.toContain("## Topics");
	});
});

test("ndex ls . shows only local docs", async () => {
	await withTempDir("ndex-ls-local-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);

		const result = await runNdexCli(["ls", "."], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(path.join(repoDir, "docs"));
		expect(result.stdout).not.toContain(path.join(homeDir, ".ngents", "docs"));
	});
});

test("ndex ls global shows only global docs", async () => {
	await withTempDir("ndex-ls-global-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);

		const result = await runNdexCli(["ls", "global"], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs"));
		expect(result.stdout).not.toContain(path.join(repoDir, "docs"));
	});
});

test("ndex ls ./docs/subdir focuses a local docs subtree", async () => {
	await withTempDir("ndex-ls-subdir-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);

		const result = await runNdexCli(["ls", "./docs/architecture"], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(path.join(repoDir, "docs", "architecture"));
		expect(result.stdout).toContain("main.md");
		expect(result.stdout).toContain("local-only.md");
		expect(result.stdout).not.toContain("web-fetching.md");
		expect(result.stdout).not.toContain(path.join(homeDir, ".ngents", "docs"));
	});
});

test("ndex ls docs/subdir merges matching local and global doc subtrees", async () => {
	await withTempDir("ndex-ls-subdir-merged-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);

		const result = await runNdexCli(["ls", "docs/architecture"], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
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

test("ndex ls docs/subdir succeeds when only the global subtree exists", async () => {
	await withTempDir("ndex-ls-subdir-global-only-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);

		const result = await runNdexCli(["ls", "docs/process"], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs", "process"));
		expect(result.stdout).toContain("qa.md");
		expect(result.stdout).not.toContain(path.join(repoDir, "docs", "process"));
	});
});

test("ndex ls docs/subdir fails only when the subtree is missing everywhere", async () => {
	await withTempDir("ndex-ls-subdir-missing-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);

		const result = await runNdexCli(["ls", "docs/missing"], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
		});

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Docs directory not found: docs/missing");
	});
});

test("ndex topic shows the merged topic index", async () => {
	await withTempDir("ndex-topic-index-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);

		const result = await runNdexCli(["topic"], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Usage: ndex topic [topic] [section]");
		expect(result.stdout).toContain("qmd");
		expect(result.stdout).toContain("local search docs");
		expect(result.stdout).toContain("ios");
		expect(result.stdout).toContain("Apple-platform docs");
		expect(result.stdout).toContain(
			"Ops Notes    This summary is intentionally longer than sixty-four characte...",
		);
	});
});

test("ndex topic merges local and global topic contributions", async () => {
	await withTempDir("ndex-topic-merged-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);

		const result = await runNdexCli(["topic", "qmd"], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("# QMD");
		expect(result.stdout).toContain(path.join(repoDir, "docs", "topics", "qmd"));
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs", "topics", "qmd"));
		expect(result.stdout).toContain("Use the local QMD docs for repo-specific workflows.");
		expect(result.stdout).toContain("Search docs quickly from anywhere.");
	});
});

test("ndex topic renders docs and skills in the topic overview", async () => {
	await withTempDir("ndex-topic-dynamic-skills-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);
		await seedSkillBackedSection(repoDir);
		await seedGlobalDocsHome(homeDir);
		const normalizedRepoDir = await realpath(repoDir);

		const result = await runNdexCli(["topic", "ios"], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
		});

		const expected = [
			"# iOS Library",
			path.join(normalizedRepoDir, "docs", "topics", "ios"),
			"",
			"Use `ndex topic ios <section>` to focus one section.",
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
			"Expand skill information in this topic with: `ndex topic <topic> <section|glob>`",
			"For example: `ndex topic foo bar/lux*`",
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

test("ndex topic section focuses a merged section view", async () => {
	await withTempDir("ndex-topic-section-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);

		const result = await runNdexCli(["topic", "qmd", "references"], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("## References");
		expect(result.stdout).toContain(path.join(repoDir, "docs", "topics", "qmd", "references"));
		expect(result.stdout).toContain(path.join(homeDir, ".ngents", "docs", "topics", "qmd", "references"));
		expect(result.stdout).toContain("Local Indexing");
		expect(result.stdout).toContain("Global Indexing");
	});
});

test("ndex topic section renders a skill-backed section without root docs", async () => {
	await withTempDir("ndex-topic-skill-section-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		const homeDir = path.join(tempDir, "home");
		await seedLocalDocsRepo(repoDir);
		await seedGlobalDocsHome(homeDir);
		const normalizedRepoDir = await realpath(repoDir);

		const result = await runNdexCli(["topic", "ios", "ios-debugger-agent"], {
			cwd: repoDir,
			env: ndexEnv(homeDir),
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
			"# iOS Library",
			"## ios-debugger-agent",
			"",
			`source: ${path.join(normalizedRepoDir, "docs", "topics", "ios", "ios-debugger-agent")}`,
			"### Skills",
			"",
			"#### iOS Debugger Agent",
			`path: ${path.join(normalizedRepoDir, "docs", "topics", "ios", "ios-debugger-agent", "SKILL.md")}`,
			"Use XcodeBuildMCP to build, run, and debug the current iOS project on a booted simulator.",
			"",
			`##### ${referencesDir}/:`,
			"- quickstart.md",
		].join("\n");

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe(expected);
	});
});

test("ndex topic skill-backed sections show only skills and grouped references", async () => {
	await withTempDir("ndex-topic-skills-", async (tempDir) => {
		const repoDir = path.join(tempDir, "repo");
		await seedLocalDocsRepo(repoDir);
		await seedSkillBackedSection(repoDir);
		const normalizedRepoDir = await realpath(repoDir);

		const result = await runNdexCli(["topic", "ios", "hig-doctor"], {
			cwd: repoDir,
			env: ndexEnv(path.join(tempDir, "home")),
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
			"# iOS Library",
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

test("ndex query status preserves the status output shape", async () => {
	await withTempDir("ndex-query-status-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedFakeQmd(binDir);

		const result = await runNdexCli(["query", "status"], {
			env: ndexEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("# ndex query status");
		expect(result.stdout).toContain("- Index: ngents-docs");
		expect(result.stdout).toContain("QMD Status");
	});
});

test("ndex query preserves formatted search output and limit handling", async () => {
	await withTempDir("ndex-query-search-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedFakeQmd(binDir);

		const result = await runNdexCli(["query", "--limit", "3", "shell", "environment", "policy"], {
			env: ndexEnv(homeDir, binDir),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Tip: Write anchored queries");
		expect(result.stdout).toContain("## Documentation Commands: 91%");
		expect(result.stdout).toContain(
			path.join(homeDir, ".ngents", "docs", "ngents", "docs.md") + ":12-13",
		);
	});
});

test("unknown commands return a usage failure", async () => {
	const result = await runNdexCli(["wat"]);

	expect(result.exitCode).toBe(2);
	expect(result.stderr.toLowerCase()).toContain("unknown command");
});
