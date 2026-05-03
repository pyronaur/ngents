import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";

import { runDocsCli } from "./helpers/cli.ts";
import {
	createGitFetchSource,
	readText,
	readTextOrEmpty,
	TEST_TOPIC_NAME,
	topicDocsPath as fetchTargetPath,
	withDocsCliWorkspace,
	writeFetchHandler,
	writeText,
} from "./helpers/docs-cli-fixture.ts";

type FetchManifestEntry = {
	handler: string;
	hash: string;
	root?: string;
	source: string;
	target: string;
	transform?: string;
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
		const root = Reflect.get(entry, "root");
		const transform = Reflect.get(entry, "transform");
		if (
			typeof source !== "string" || typeof target !== "string" || typeof handler !== "string"
			|| typeof hash !== "string"
			|| (root !== undefined && typeof root !== "string")
			|| (transform !== undefined && typeof transform !== "string")
		) {
			throw new Error("Expected typed fetch manifest entry");
		}

		return {
			source,
			target,
			handler,
			hash,
			...(typeof root === "string" ? { root } : {}),
			...(typeof transform === "string" ? { transform } : {}),
		};
	});
}

function fetchManifestPath(repoDir: string): string {
	return path.join(repoDir, "docs", ".docs-fetch.json");
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

test("docs fetch writes a single staged file directly to a markdown file target", async () => {
	await withDocsCliWorkspace("docs-fetch-file-target-", async ({ tempDir, repoDir, env }) => {
		const sourcePath = path.join(tempDir, "source.md");
		const targetPath = fetchTargetPath(repoDir, "single-doc.md");
		await writeText(sourcePath, "# Single Doc\n");

		const result = await runDocsCli(
			[
				"fetch",
				pathToFileURL(sourcePath).href,
				targetPath,
				"--handler",
				"url",
			],
			{
				cwd: repoDir,
				env,
			},
		);

		expect(result.exitCode).toBe(0);
		expect(await readText(targetPath)).toBe("# Single Doc\n");

		const manifestEntries = readFetchManifestEntries(await readText(fetchManifestPath(repoDir)));
		expect(manifestEntries).toContainEqual({
			source: pathToFileURL(sourcePath).href,
			target: path.posix.join("topics", TEST_TOPIC_NAME, "single-doc.md"),
			handler: "docs-url-file-fetch",
			hash: expect.any(String),
		});
	});
});

test("docs fetch preserves local browse frontmatter when fetched markdown has none", async () => {
	await withDocsCliWorkspace("docs-fetch-frontmatter-preserve-",
		async ({ tempDir, repoDir, env }) => {
			const sourcePath = path.join(tempDir, "source.md");
			const targetPath = fetchTargetPath(repoDir, "preserve-frontmatter.md");
			await writeText(sourcePath, "# Fresh Body\n\nUpdated content.\n");
			await writeText(
				targetPath,
				[
					"---",
					"title: 'Local title'",
					"short: 'Local short'",
					"summary: 'Local summary'",
					"read_when:",
					"  - 'Local hint'",
					"---",
					"",
					"# Old Body",
					"",
					"Stale content.",
					"",
				].join("\n"),
			);

			const result = await runDocsCli(
				[
					"fetch",
					pathToFileURL(sourcePath).href,
					targetPath,
					"--handler",
					"url",
				],
				{
					cwd: repoDir,
					env,
				},
			);

			expect(result.exitCode).toBe(0);
			expect(await readText(targetPath)).toBe(
				[
					"---",
					"title: Local title",
					"short: Local short",
					"summary: Local summary",
					"read_when:",
					"  - Local hint",
					"---",
					"",
					"# Fresh Body",
					"",
					"Updated content.",
					"",
				].join("\n"),
			);
		});
});

test("docs fetch merges browse keys and keeps incoming non-merged frontmatter", async () => {
	await withDocsCliWorkspace("docs-fetch-frontmatter-merge-", async ({ tempDir, repoDir, env }) => {
		const sourcePath = path.join(tempDir, "source.md");
		const targetPath = fetchTargetPath(repoDir, "merge-frontmatter.md");
		await writeText(
			targetPath,
			[
				"---",
				"title: 'Local title'",
				"short: 'Local short'",
				"summary: 'Local summary'",
				"read_when:",
				"  - 'Local hint'",
				"local_only: 'discard me'",
				"---",
				"",
				"# Old Body",
				"",
			].join("\n"),
		);
		await writeText(
			sourcePath,
			[
				"---",
				"title: ''",
				"short: 'Incoming short'",
				"summary: ''",
				"read_when: []",
				"extra: 'keep me'",
				"---",
				"",
				"# Fresh Body",
				"",
				"Updated content.",
				"",
			].join("\n"),
		);

		const result = await runDocsCli(
			[
				"fetch",
				pathToFileURL(sourcePath).href,
				targetPath,
				"--handler",
				"url",
			],
			{
				cwd: repoDir,
				env,
			},
		);

		expect(result.exitCode).toBe(0);
		expect(await readText(targetPath)).toBe(
			[
				"---",
				"title: Local title",
				"short: Incoming short",
				"summary: Local summary",
				"read_when:",
				"  - Local hint",
				"extra: keep me",
				"---",
				"",
				"# Fresh Body",
				"",
				"Updated content.",
				"",
			].join("\n"),
		);
	});
});

test("docs fetch quotes only YAML-ambiguous frontmatter scalars", async () => {
	await withDocsCliWorkspace("docs-fetch-frontmatter-quote-minimal-",
		async ({ tempDir, repoDir, env }) => {
			const sourcePath = path.join(tempDir, "source.md");
			const targetPath = fetchTargetPath(repoDir, "quote-minimal-frontmatter.md");
			await writeText(
				targetPath,
				[
					"---",
					"title: Local title",
					"summary: keep plain",
					"---",
					"",
					"# Old Body",
					"",
				].join("\n"),
			);
			await writeText(
				sourcePath,
				[
					"---",
					"title: 'Needs: quotes'",
					"short: '@quoted-start'",
					"summary: keep plain",
					"read_when:",
					"  - 'Section: detail'",
					"extra: '#hash-start'",
					"---",
					"",
					"# Fresh Body",
					"",
				].join("\n"),
			);

			const result = await runDocsCli(
				[
					"fetch",
					pathToFileURL(sourcePath).href,
					targetPath,
					"--handler",
					"url",
				],
				{
					cwd: repoDir,
					env,
				},
			);

			expect(result.exitCode).toBe(0);
			expect(await readText(targetPath)).toBe(
				[
					"---",
					"title: 'Needs: quotes'",
					"short: '@quoted-start'",
					"summary: keep plain",
					"read_when:",
					"  - 'Section: detail'",
					"extra: '#hash-start'",
					"---",
					"",
					"# Fresh Body",
					"",
				].join("\n"),
			);
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

test("docs fetch --force clears the previous hash passed to the handler", async () => {
	await withDocsCliWorkspace("docs-fetch-force-", async ({ tempDir, repoDir, binDir, env }) => {
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
			["fetch", "https://example.com/source", targetPath, "--handler", handlerPath, "--force"],
			{
				cwd: repoDir,
				env: withEnv(env, {
					DOCS_TEST_FETCH_HASH: "hash-2",
					DOCS_TEST_FETCH_LOG: logFile,
				}),
			},
		);

		const logLines = (await readTextOrEmpty(logFile))
			.split(/\r?\n/)
			.filter(line => line.length > 0);
		const previousLines = logLines.filter(line => line.startsWith("previous="));

		expect(first.exitCode).toBe(0);
		expect(second.exitCode).toBe(0);
		expect(previousLines).toEqual(["previous=", "previous="]);
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
