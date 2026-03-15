import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
			"summary: This topic collects iOS-focused references and Apple HIG skills.",
			"---",
			"",
			"# iOS Library",
			"",
			"Start with local iOS docs.",
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
		expect(result.stdout).toContain("# Agent Doc Utils");
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
		expect(help.stdout).toContain("# Agent Doc Utils");
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

test("ndex ls docs/subdir focuses a local docs subtree", async () => {
	await withTempDir("ndex-ls-subdir-", async (tempDir) => {
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
		expect(result.stdout).toContain("main.md");
		expect(result.stdout).not.toContain("web-fetching.md");
		expect(result.stdout).not.toContain(path.join(homeDir, ".ngents", "docs"));
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
