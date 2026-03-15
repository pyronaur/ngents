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
			"summary: This topic collects iOS-focused references and Apple HIG skills.",
			"---",
			"",
			"# iOS Library",
			"",
			"Start with the local iOS docs.",
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
			"summary: Global QMD reference docs.",
			"---",
			"",
			"# QMD",
			"",
			"Search docs quickly.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(homeDir, ".ngents", "docs", "ngents", "docs.md"),
		[
			"---",
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

test("bare ndex prints the same top-level help as --help", async () => {
	const bare = await runNdexCli([]);
	const help = await runNdexCli(["--help"]);

	expect(bare.exitCode).toBe(0);
	expect(help.exitCode).toBe(0);
	expect(bare.stdout).toContain("Usage: ndex");
	expect(bare.stdout).toContain("ls");
	expect(bare.stdout).toContain("query");
	expect(bare.stdout).toBe(help.stdout);
});

test("standalone ndex ls works through node without Bun", async () => {
	await withTempDir("ndex-node-local-", async (repoDir) => {
		await seedLocalDocsRepo(repoDir);

		const result = await runNdexCli(["ls"], { cwd: repoDir });

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("## Topics");
		expect(result.stdout).toContain("ios");
	});
});

test("ndex ls preserves local browse output", async () => {
	await withTempDir("ndex-local-", async (repoDir) => {
		await seedLocalDocsRepo(repoDir);

		const result = await runNdexCli(["ls"], { cwd: repoDir });

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("## Topics");
		expect(result.stdout).toContain("ios");
		expect(result.stdout).toContain("iOS Library");
		expect(result.stdout).not.toContain("use `ndex query <subject>`");
	});
});

test("ndex ls --global shows the vector-search tip", async () => {
	await withTempDir("ndex-global-home-", async (homeDir) => {
		await seedGlobalDocsHome(homeDir);

		const result = await runNdexCli(["ls", "--global"], {
			env: {
				HOME: homeDir,
			},
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("use `ndex query <subject>` to search using vector search");
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
			env: {
				HOME: homeDir,
				PATH: `${binDir}:${process.env.PATH ?? ""}`,
			},
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("# ndex query status");
		expect(result.stdout).toContain("- Index: ngents-docs");
		expect(result.stdout).toContain("QMD Status");
	});
});

test("standalone ndex query status works through node without Bun", async () => {
	await withTempDir("ndex-node-query-status-", async (tempDir) => {
		const homeDir = path.join(tempDir, "home");
		const binDir = path.join(tempDir, "bin");
		await mkdir(binDir, { recursive: true });
		await seedGlobalDocsHome(homeDir);
		await seedFakeQmd(binDir);

		const result = await runNdexCli(["query", "status"], {
			env: {
				HOME: homeDir,
				PATH: `${binDir}:${process.env.PATH ?? ""}`,
			},
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
			env: {
				HOME: homeDir,
				PATH: `${binDir}:${process.env.PATH ?? ""}`,
			},
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
