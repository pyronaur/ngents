import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";

import { runDocsCli } from "./helpers/cli.ts";
import {
	createGitFetchSource,
	readText,
	readTextOrEmpty,
	seedFakeQmd,
	TEST_TOPIC_NAME,
	topicDocsPath,
	withDocsCliWorkspace,
	writeExecutable,
	writeFetchHandler,
	writeFetchManifest,
	writeText,
} from "./helpers/docs-cli-fixture.ts";

type FetchManifestEntry = {
	handler: string;
	hash: string;
	source: string;
	target: string;
};

function readFetchManifestEntries(input: string): FetchManifestEntry[] {
	const parsed: unknown = JSON.parse(input);
	if (!parsed || typeof parsed !== "object") {
		throw new Error("Expected fetch manifest object");
	}

	const entries = Reflect.get(parsed, "entries");
	if (!Array.isArray(entries)) {
		throw new Error("Expected fetch manifest entries");
	}

	return entries.map((entry) => {
		if (!entry || typeof entry !== "object") {
			throw new Error("Expected fetch manifest entry");
		}

		const source = Reflect.get(entry, "source");
		const target = Reflect.get(entry, "target");
		const handler = Reflect.get(entry, "handler");
		const hash = Reflect.get(entry, "hash");
		if (
			typeof source !== "string" || typeof target !== "string" || typeof handler !== "string"
			|| typeof hash !== "string"
		) {
			throw new Error("Expected typed fetch manifest entry");
		}

		return {
			source,
			target,
			handler,
			hash,
		};
	});
}

function fetchManifestPath(repoDir: string): string {
	return path.join(repoDir, "docs", ".docs-fetch.json");
}

function fetchTargetPath(repoDir: string, ...segments: string[]): string {
	return topicDocsPath(repoDir, ...segments);
}

function withEnv(
	baseEnv: NodeJS.ProcessEnv,
	overrides: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
	return {
		...baseEnv,
		...overrides,
	};
}

async function expectSkippedFetchUpdate(
	result: { exitCode: number | null; stdout: string; stderr: string },
	logFile: string,
	manifestContents: string,
	options: {
		unsafeHash: string;
		unsafeTarget: string;
		unsafeSource: string;
		skipReason: string;
		safeSource?: string;
		safeHash?: string;
	},
): Promise<void> {
	expect(result.exitCode).toBe(1);
	expect(result.stderr).toContain("Skipping unsafe fetch entry");
	expect(result.stderr).toContain(options.skipReason);
	expect(result.stderr).toContain("1 unsafe fetch entry was skipped during docs update.");

	const logContents = await readTextOrEmpty(logFile);
	if (options.safeSource && logContents.length > 0) {
		expect(logContents).not.toContain(`source=${options.unsafeSource}`);
	}

	expect(manifestContents).toContain(`"target": "${options.unsafeTarget}"`);
	expect(manifestContents).toContain(`"hash": "${options.unsafeHash}"`);
	if (options.safeHash) {
		expect(manifestContents).toContain(`"hash": "${options.safeHash}"`);
	}
}

async function runDocsUpdateWithUnsafeTarget(
	options: {
		fixtureName: string;
		manifestEntries: FetchManifestEntry[];
		fetchHash: string;
	},
): Promise<{
	logFile: string;
	manifestContents: string;
	result: { exitCode: number | null; stdout: string; stderr: string };
}> {
	return await withDocsCliWorkspace(
		options.fixtureName,
		async ({ tempDir, repoDir, binDir, env }) => {
			const logFile = path.join(tempDir, "combined.log");
			await seedFakeQmd(binDir);
			const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");
			await writeFetchManifest(
				repoDir,
				options.manifestEntries.map(entry => ({
					...entry,
					handler: entry.handler === "<fixture-handler>" ? handlerPath : entry.handler,
				})),
			);

			const result = await runDocsCli(["update"], {
				cwd: repoDir,
				env: withEnv(env, {
					DOCS_TEST_FETCH_HASH: options.fetchHash,
					DOCS_TEST_FETCH_LOG: logFile,
					DOCS_TEST_QMD_LOG: logFile,
				}),
			});

			return {
				logFile,
				manifestContents: await readText(fetchManifestPath(repoDir)),
				result,
			};
		},
	);
}

test("docs query status preserves the status output shape", async () => {
	await withDocsCliWorkspace(
		"docs-query-status-",
		async ({ env }) => {
			const result = await runDocsCli(["query", "status"], { env });

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("# docs query status");
			expect(result.stdout).toContain("- Index: ngents-docs");
			expect(result.stdout).toContain("- Collections: ngents");
			expect(result.stdout).toContain("QMD Status");
		},
		{ collectionName: "ngents", seedLocalDocsRepo: false },
	);
});

test("docs query status shows no collections when nothing is parked", async () => {
	await withDocsCliWorkspace(
		"docs-query-status-empty-",
		async ({ env }) => {
			const result = await runDocsCli(["query", "status"], { env });

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("- Collections: -");
			expect(result.stdout).not.toContain("- Collections: ngents");
		},
		{ seedLocalDocsRepo: false, seedGlobalDocsIndex: false },
	);
});

test("docs fetch creates a local manifest entry and saves the returned hash", async () => {
	await withDocsCliWorkspace("docs-fetch-manifest-", async ({ repoDir, binDir, env }) => {
		const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");

		const result = await runDocsCli(
			[
				"fetch",
				"https://example.com/source",
				fetchTargetPath(repoDir, "remote-bundle"),
				"--handler",
				handlerPath,
			],
			{
				cwd: repoDir,
				env: withEnv(env, {
					DOCS_TEST_FETCH_HASH: "hash-1",
				}),
			},
		);

		const manifestEntries = readFetchManifestEntries(
			await readText(fetchManifestPath(repoDir)),
		);

		expect(result.exitCode).toBe(0);
		expect(manifestEntries).toEqual([
			{
				source: "https://example.com/source",
				target: `topics/${TEST_TOPIC_NAME}/remote-bundle`,
				handler: handlerPath,
				hash: "hash-1",
			},
		]);
		expect(
			await readText(
				fetchTargetPath(repoDir, "remote-bundle", "handled.txt"),
			),
		).toContain("handled");
	});
});

test("docs fetch passes the previous hash back to the handler on later runs", async () => {
	await withDocsCliWorkspace("docs-fetch-previous-hash-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const logFile = path.join(tempDir, "fetch.log");
			const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");
			const targetPath = fetchTargetPath(repoDir, "remote-bundle");

			const first = await runDocsCli(
				["fetch", "https://example.com/source", targetPath, "--handler", handlerPath],
				{
					cwd: repoDir,
					env: withEnv(env, {
						DOCS_TEST_FETCH_HASH: "hash-1",
						DOCS_TEST_FETCH_LOG: logFile,
					}),
				},
			);
			const second = await runDocsCli(
				["fetch", "https://example.com/source", targetPath, "--handler", handlerPath],
				{
					cwd: repoDir,
					env: withEnv(env, {
						DOCS_TEST_FETCH_HASH: "hash-2",
						DOCS_TEST_FETCH_LOG: logFile,
					}),
				},
			);

			const logContents = await readTextOrEmpty(logFile);

			expect(first.exitCode).toBe(0);
			expect(second.exitCode).toBe(0);
			expect(logContents).toContain("previous=");
			expect(logContents).toContain("previous=hash-1");
			expect(await readText(fetchManifestPath(repoDir))).toContain(
				"\"hash\": \"hash-2\"",
			);
		});
});

test("docs fetch requires --handler", async () => {
	await withDocsCliWorkspace("docs-fetch-missing-handler-", async ({ repoDir, env }) => {
		const result = await runDocsCli(
			[
				"fetch",
				"https://example.com/source",
				fetchTargetPath(repoDir, "remote-bundle"),
			],
			{
				cwd: repoDir,
				env,
			},
		);

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("required option '--handler <command>' not specified");
	});
});

test("docs fetch accepts git and url handler shorthands", async () => {
	await withDocsCliWorkspace("docs-fetch-builtins-", async ({ tempDir, repoDir, env }) => {
		const gitSource = await createGitFetchSource(tempDir);
		const localFilePath = path.join(tempDir, "shell.txt");
		await writeText(localFilePath, "# Shell\n");
		const fileSource = pathToFileURL(localFilePath).href;

		const gitResult = await runDocsCli(
			[
				"fetch",
				gitSource,
				fetchTargetPath(repoDir, "git-import"),
				"--handler",
				"git",
				"--root",
				"skills",
			],
			{
				cwd: repoDir,
				env,
			},
		);
		const fileResult = await runDocsCli(
			[
				"fetch",
				fileSource,
				fetchTargetPath(repoDir, "file-import"),
				"--handler",
				"url",
			],
			{
				cwd: repoDir,
				env,
			},
		);

		const manifestEntries = readFetchManifestEntries(
			await readText(fetchManifestPath(repoDir)),
		);
		const handlersByTarget = new Map(manifestEntries.map(entry => [entry.target, entry.handler]));

		expect(gitResult.exitCode).toBe(0);
		expect(fileResult.exitCode).toBe(0);
		expect(handlersByTarget.get(`topics/${TEST_TOPIC_NAME}/git-import`)).toBe("docs-git-fetch");
		expect(handlersByTarget.get(`topics/${TEST_TOPIC_NAME}/file-import`)).toBe(
			"docs-url-file-fetch",
		);
		expect(
			await readText(
				fetchTargetPath(repoDir, "git-import", "alpha", "SKILL.md"),
			),
		).toContain("# Alpha");
		expect(
			await readText(
				fetchTargetPath(repoDir, "file-import", "shell.md"),
			),
		).toContain("# Shell");
	});
});

test("docs fetch rejects targets outside discovered docs roots", async () => {
	await withDocsCliWorkspace("docs-fetch-outside-root-", async ({ tempDir, repoDir, env }) => {
		const outsideDir = path.join(tempDir, "outside");

		const result = await runDocsCli(
			[
				"fetch",
				"https://example.com/source",
				outsideDir,
				"--handler",
				"url",
			],
			{
				cwd: repoDir,
				env,
			},
		);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Fetch target is outside discovered docs roots");
	});
});

test("docs fetch rejects targeting the docs root itself", async () => {
	await withDocsCliWorkspace("docs-fetch-docs-root-", async ({ repoDir, binDir, env }) => {
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
				env,
			},
		);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain(
			"Fetch target must be a subdirectory inside a discovered docs root",
		);
	});
});

test("docs fetch stores and replays root and transform options through docs update", async () => {
	await withDocsCliWorkspace("docs-fetch-options-replay-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const logFile = path.join(tempDir, "fetch.log");
			await seedFakeQmd(binDir);
			const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");
			const transformPath = path.join(binDir, "fake-transform");
			await writeExecutable(binDir, "fake-transform", "#!/bin/sh\nexit 0\n");
			const targetPath = fetchTargetPath(repoDir, "remote-bundle");

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
					env: withEnv(env, {
						DOCS_TEST_FETCH_HASH: "hash-1",
						DOCS_TEST_FETCH_LOG: logFile,
					}),
				},
			);
			const updateResult = await runDocsCli(["update"], {
				cwd: repoDir,
				env: withEnv(env, {
					DOCS_TEST_FETCH_HASH: "hash-2",
					DOCS_TEST_FETCH_LOG: logFile,
				}),
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
	await withDocsCliWorkspace("docs-update-fetch-first-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const logFile = path.join(tempDir, "combined.log");
			await seedFakeQmd(binDir);
			const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");
			const targetPath = fetchTargetPath(repoDir, "remote-bundle");

			const fetchResult = await runDocsCli(
				["fetch", "https://example.com/source", targetPath, "--handler", handlerPath],
				{
					cwd: repoDir,
					env: withEnv(env, {
						DOCS_TEST_FETCH_HASH: "hash-1",
						DOCS_TEST_FETCH_LOG: logFile,
					}),
				},
			);
			const updateResult = await runDocsCli(["update"], {
				cwd: repoDir,
				env: withEnv(env, {
					DOCS_TEST_FETCH_HASH: "hash-2",
					DOCS_TEST_FETCH_LOG: logFile,
					DOCS_TEST_QMD_LOG: logFile,
				}),
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
	const { logFile, manifestContents, result } = await runDocsUpdateWithUnsafeTarget({
		fixtureName: "docs-update-unsafe-target-",
		fetchHash: "hash-safe-new",
		manifestEntries: [
			{
				source: "https://example.com/unsafe",
				target: "../../outside",
				handler: "<fixture-handler>",
				hash: "hash-unsafe",
			},
			{
				source: "https://example.com/safe",
				target: `topics/${TEST_TOPIC_NAME}/remote-bundle`,
				handler: "<fixture-handler>",
				hash: "hash-safe-old",
			},
		],
	});

	await expectSkippedFetchUpdate(result, logFile, manifestContents, {
		unsafeHash: "hash-unsafe",
		unsafeTarget: "../../outside",
		unsafeSource: "https://example.com/unsafe",
		safeSource: "https://example.com/safe",
		safeHash: "hash-safe-new",
		skipReason: "target must not contain '..'",
	});
	expect(result.stdout).toContain("Updating fake index");
	expect(result.stdout).toContain("Embedding fake index");
});

test("docs update skips unsafe manifest targets that use backslash traversal", async () => {
	const { logFile, manifestContents, result } = await runDocsUpdateWithUnsafeTarget({
		fixtureName: "docs-update-unsafe-backslash-target-",
		fetchHash: "hash-next",
		manifestEntries: [
			{
				source: "https://example.com/unsafe",
				target: "..\\..\\outside",
				handler: "<fixture-handler>",
				hash: "hash-unsafe",
			},
		],
	});
	await expectSkippedFetchUpdate(result, logFile, manifestContents, {
		unsafeHash: "hash-unsafe",
		unsafeTarget: "..\\\\..\\\\outside",
		unsafeSource: "https://example.com/unsafe",
		skipReason: "target must not contain '..'",
	});
});

test("docs update skips manifest entries targeting the docs root itself", async () => {
	const { logFile, manifestContents, result } = await runDocsUpdateWithUnsafeTarget({
		fixtureName: "docs-update-root-target-",
		fetchHash: "hash-next",
		manifestEntries: [
			{
				source: "https://example.com/root",
				target: ".",
				handler: "<fixture-handler>",
				hash: "hash-root",
			},
		],
	});

	await expectSkippedFetchUpdate(result, logFile, manifestContents, {
		unsafeHash: "hash-root",
		unsafeTarget: ".",
		unsafeSource: "https://example.com/root",
		skipReason: "target must be a subdirectory",
	});
});

test("docs fetch keeps the prior stored hash when the handler fails", async () => {
	await withDocsCliWorkspace("docs-fetch-failure-hash-", async ({ repoDir, binDir, env }) => {
		const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");
		const targetPath = fetchTargetPath(repoDir, "remote-bundle");

		const first = await runDocsCli(
			["fetch", "https://example.com/source", targetPath, "--handler", handlerPath],
			{
				cwd: repoDir,
				env: withEnv(env, {
					DOCS_TEST_FETCH_HASH: "hash-1",
				}),
			},
		);
		const failed = await runDocsCli(
			["fetch", "https://example.com/source", targetPath, "--handler", handlerPath],
			{
				cwd: repoDir,
				env: withEnv(env, {
					DOCS_TEST_FETCH_FAIL: "1",
					DOCS_TEST_FETCH_HASH: "hash-2",
				}),
			},
		);

		expect(first.exitCode).toBe(0);
		expect(failed.exitCode).toBe(1);
		expect(failed.stderr).toContain("fake fetch handler failure");
		expect(await readText(fetchManifestPath(repoDir))).toContain(
			"\"hash\": \"hash-1\"",
		);
	});
});

test("docs update runs qmd update then embed for the docs index", async () => {
	await withDocsCliWorkspace("docs-update-", async ({ tempDir, binDir, env }) => {
		const logFile = path.join(tempDir, "qmd.log");
		await seedFakeQmd(binDir);

		const result = await runDocsCli(["update"], {
			env: {
				...env,
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
	await withDocsCliWorkspace("docs-update-fail-update-", async ({ tempDir, binDir, env }) => {
		const logFile = path.join(tempDir, "qmd.log");
		await seedFakeQmd(binDir);

		const result = await runDocsCli(["update"], {
			env: {
				...env,
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
	await withDocsCliWorkspace("docs-update-fail-embed-", async ({ tempDir, binDir, env }) => {
		const logFile = path.join(tempDir, "qmd.log");
		await seedFakeQmd(binDir);

		const result = await runDocsCli(["update"], {
			env: {
				...env,
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
