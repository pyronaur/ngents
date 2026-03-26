import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

import { runDocsCli } from "./helpers/cli.ts";
import {
	qmdCollectionsCachePath,
	readText,
	readTextOrEmpty,
	seedFakeQmd,
	seedQmdCollectionsCache,
	waitFor,
	withDocsCliWorkspace,
	writeText,
} from "./helpers/docs-cli-fixture.ts";

test("docs query preserves formatted search output and limit handling", async () => {
	await withDocsCliWorkspace(
		"docs-query-search-",
		async ({ homeDir, env }) => {
			const logFile = path.join(homeDir, "qmd.log");
			const result = await runDocsCli(
				["query", "--limit", "3", "shell", "environment", "policy"],
				{
					env: {
						...env,
						DOCS_TEST_QMD_LOG: logFile,
					},
				},
			);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Tip: Write anchored queries");
			expect(result.stdout).toContain("## Documentation Commands: 91%");
			expect(result.stdout).toContain(
				path.join(homeDir, ".ngents", "docs", "ngents", "docs.md") + ":12-13",
			);
			expect(await readFile(logFile, "utf8")).not.toContain(" -c ");
		},
	);
});

test("docs ls global reuses a fresh collection metadata cache without qmd lookups", async () => {
	await withDocsCliWorkspace("docs-cache-fresh-", async ({ homeDir, env }) => {
		const logFile = path.join(homeDir, "qmd.log");
		const docsRoot = path.join(homeDir, ".ngents", "docs");
		await seedQmdCollectionsCache(homeDir, {
			fetchedAt: new Date().toISOString(),
			collections: [{ name: "global", path: docsRoot }],
		});

		const result = await runDocsCli(["ls", "global"], {
			env: {
				...env,
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(docsRoot);
		expect(result.stdout).toContain(" - cdp.md");
		expect(result.stdout).toContain(
			"Need to start, stop, or inspect the local Chrome CDP session.",
		);
		expect(await readTextOrEmpty(logFile)).toBe("");
	});
});

test("docs ls global serves stale collection metadata and refreshes it in the background", async () => {
	await withDocsCliWorkspace("docs-cache-swr-", async ({ tempDir, homeDir, env }) => {
		const logFile = path.join(homeDir, "qmd.log");
		const freshDocsRoot = path.join(homeDir, ".ngents", "docs");
		const staleDocsRoot = path.join(tempDir, "stale-docs");
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
				...env,
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
				...env,
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(freshResult.exitCode).toBe(0);
		expect(freshResult.stdout).toContain(freshDocsRoot);
		expect(freshResult.stdout).toContain(" - cdp.md");
		expect(freshResult.stdout).toContain(
			"Need to start, stop, or inspect the local Chrome CDP session.",
		);
		expect(freshResult.stdout).not.toContain(staleDocsRoot);
		expect(await readTextOrEmpty(logFile)).toBe("");
	});
});

test("docs ls global rebuilds a corrupt collection metadata cache synchronously", async () => {
	await withDocsCliWorkspace("docs-cache-corrupt-", async ({ homeDir, env }) => {
		const logFile = path.join(homeDir, "qmd.log");
		await writeText(qmdCollectionsCachePath(homeDir), "{not json");

		const result = await runDocsCli(["ls", "global"], {
			env: {
				...env,
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
	await withDocsCliWorkspace(
		"docs-cache-query-",
		async ({ homeDir, env }) => {
			const logFile = path.join(homeDir, "qmd.log");
			const docsRoot = path.join(homeDir, ".ngents", "docs");
			await seedQmdCollectionsCache(homeDir, {
				fetchedAt: new Date().toISOString(),
				collections: [{ name: "ngents", path: docsRoot }],
			});

			const result = await runDocsCli(["query", "shell", "environment", "policy"], {
				env: {
					...env,
					DOCS_TEST_QMD_LOG: logFile,
				},
			});

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("qmd://global/ngents/docs.md");
			const logContents = await readText(logFile);
			expect(logContents).toContain(
				"--index ngents-docs query shell environment policy -n 5 --min-score 0.35 --json",
			);
			expect(logContents).not.toContain("collection list");
			expect(logContents).not.toContain("collection show");
		},
	);
});

test("docs update invalidates the collection metadata cache after a successful refresh", async () => {
	await withDocsCliWorkspace("docs-cache-update-invalidate-",
		async ({ tempDir, homeDir, binDir, env }) => {
			const logFile = path.join(tempDir, "qmd.log");
			await seedFakeQmd(binDir);
			await seedQmdCollectionsCache(homeDir, {
				fetchedAt: new Date().toISOString(),
				collections: [{ name: "global", path: path.join(homeDir, ".ngents", "docs") }],
			});

			const result = await runDocsCli(["update"], {
				env: {
					...env,
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
	await withDocsCliWorkspace("docs-park-", async ({ tempDir, env }) => {
		const projectDir = path.join(tempDir, "project");
		const logFile = path.join(tempDir, "qmd.log");
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
				...env,
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
			env,
		});
		expect(lsResult.exitCode).toBe(0);
		expect(lsResult.stdout).toContain(path.join(projectDir, "docs"));

		const topicResult = await runDocsCli(["topic", "infra"], {
			env,
		});
		expect(topicResult.exitCode).toBe(0);
		expect(topicResult.stdout).toContain("# Topic: Infrastructure");
		expect(topicResult.stdout).toContain("Infra body.");
		expect(topicResult.stdout.indexOf("Infra body.")).toBeLessThan(
			topicResult.stdout.indexOf("# Topic: Infrastructure"),
		);
	});
});

test("docs park allows ngents as a normal collection name", async () => {
	await withDocsCliWorkspace("docs-park-ngents-name-", async ({ tempDir, binDir, env }) => {
		const projectDir = path.join(tempDir, "project");
		const stateFile = path.join(tempDir, "qmd-state.tsv");
		await seedFakeQmd(binDir);
		await writeText(path.join(projectDir, "docs", "guide.md"), "# Guide\n");

		const result = await runDocsCli(["park", "ngents", projectDir], {
			env: {
				...env,
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
	await withDocsCliWorkspace(
		"docs-ls-global-explicit-",
		async ({ repoDir, homeDir, binDir, env }) => {
			await seedFakeQmd(binDir);

			const result = await runDocsCli(["ls", "global"], {
				cwd: repoDir,
				env,
			});

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("Docs root not found: global");
			expect(result.stdout).not.toContain(path.join(homeDir, ".ngents", "docs"));
		},
		{ seedGlobalDocsIndex: false },
	);
});

test("docs park rejects duplicate names and duplicate docs roots", async () => {
	await withDocsCliWorkspace("docs-park-collisions-", async ({ tempDir, binDir, env }) => {
		const projectDir = path.join(tempDir, "project");
		const otherProjectDir = path.join(tempDir, "other-project");
		const stateFile = path.join(tempDir, "qmd-state.tsv");
		await seedFakeQmd(binDir);
		await writeText(path.join(projectDir, "docs", "guide.md"), "# Guide\n");
		await writeText(path.join(otherProjectDir, "docs", "guide.md"), "# Other Guide\n");

		const first = await runDocsCli(["park", "nconf", projectDir], {
			env: {
				...env,
				DOCS_TEST_QMD_STATE: stateFile,
			},
		});
		expect(first.exitCode).toBe(0);

		const duplicateName = await runDocsCli(["park", "nconf", otherProjectDir], {
			env: {
				...env,
				DOCS_TEST_QMD_STATE: stateFile,
			},
		});
		expect(duplicateName.exitCode).toBe(1);
		expect(duplicateName.stderr).toContain("Docs collection already parked: nconf");

		const duplicatePath = await runDocsCli(["park", "other", projectDir], {
			env: {
				...env,
				DOCS_TEST_QMD_STATE: stateFile,
			},
		});
		expect(duplicatePath.exitCode).toBe(1);
		expect(duplicatePath.stderr).toContain("Docs root already parked as \"nconf\"");
	});
});

test("docs park rejects invalid docs roots before mutating qmd", async () => {
	await withDocsCliWorkspace("docs-park-invalid-", async ({ tempDir, binDir, env }) => {
		const projectDir = path.join(tempDir, "project");
		const logFile = path.join(tempDir, "qmd.log");
		await seedFakeQmd(binDir);

		const result = await runDocsCli(["park", "broken", projectDir], {
			env: {
				...env,
				DOCS_TEST_QMD_LOG: logFile,
			},
		});

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain(`Docs directory not found: ${projectDir}`);
		const logContents = await readFile(logFile, "utf8").catch(() => "");
		expect(logContents).toBe("");
	});
});

test("multi-token unknown commands show recovery help with the proper commands", async () => {
	const result = await runDocsCli(["maestro", "ios", "ui", "test", "screenshots", "runner"]);

	expect(result.exitCode).toBe(2);
	expect(result.stdout).toBe("");
	expect(result.stderr).toContain(
		"Use `docs query maestro ios ui test screenshots runner` to search by multiple terms.",
	);
	expect(result.stderr).toContain("`docs <where>` accepts one selector.");
	expect(result.stderr).toContain("# docs");
	expect(result.stderr).toContain("docs <where>");
	expect(result.stderr).toContain("docs ls [where]");
	expect(result.stderr).toContain("docs topic [topic] [path]");
	expect(result.stderr).toContain("docs query [--limit <n>] <query...> | status");
	expect(result.stderr).not.toContain("## Docs");
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
	expect(result.stderr).toContain("Usage: docs query [--limit <n>] <query...> | status");
	expect(result.stderr.match(/option '--limit <n>' argument missing/g)?.length ?? 0).toBe(1);
});
