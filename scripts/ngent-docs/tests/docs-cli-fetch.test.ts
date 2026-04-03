import { readFile, realpath } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { expect, test } from "vitest";

import { runCommand, runDocsCli } from "./helpers/cli.ts";
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

async function prepareRelativeTransformFixture(
	tempDir: string,
	repoDir: string,
	binDir: string,
): Promise<{
	handlerPath: string;
	logFile: string;
	targetPath: string;
	transformPath: string;
}> {
	const logFile = path.join(tempDir, "fetch.log");
	await seedFakeQmd(binDir);
	const handlerPath = await writeFetchHandler(binDir, "fake-fetch-handler");
	const transformPath = path.join(binDir, "fake-transform");
	await writeExecutable(binDir, "fake-transform", "#!/bin/sh\nexit 0\n");
	return {
		handlerPath,
		logFile,
		targetPath: fetchTargetPath(repoDir, "remote-bundle"),
		transformPath,
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

async function withHttpServer<T>(
	handler: (request: IncomingMessage, response: ServerResponse<IncomingMessage>) => void,
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
	await withDocsCliWorkspace("docs-fetch-frontmatter-merge-",
		async ({ tempDir, repoDir, env }) => {
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

test("docs fetch decompresses compressed HTTP responses before transforms run", async () => {
	await withDocsCliWorkspace("docs-fetch-compressed-http-", async ({ repoDir, binDir, env }) => {
		await withHttpServer((request, response) => {
			if (request.method === "HEAD") {
				response.writeHead(200, {
					"content-encoding": "gzip",
					"content-type": "text/html; charset=utf-8",
					etag: "\"compressed-html\"",
				});
				response.end();
				return;
			}

			response.writeHead(200, {
				"content-encoding": "gzip",
				"content-type": "text/html; charset=utf-8",
			});
			response.end(gzipSync("<main><h1>Compressed</h1></main>\n"));
		}, async (baseUrl) => {
			const transformPath = path.join(binDir, "capture-compressed-html");
			await writeExecutable(
				binDir,
				"capture-compressed-html",
				[
					"#!/bin/sh",
					"mkdir -p \"$DOCS_FETCH_OUTPUT\"",
					"cat > \"$DOCS_FETCH_OUTPUT/captured.html\"",
					"",
				].join("\n"),
			);

			const result = await runDocsCli(
				[
					"fetch",
					`${baseUrl}/source.html`,
					fetchTargetPath(repoDir, "compressed-http"),
					"--handler",
					"url",
					"--transform",
					transformPath,
				],
				{
					cwd: repoDir,
					env,
				},
			);

			expect(result.exitCode).toBe(0);
			expect(
				await readText(fetchTargetPath(repoDir, "compressed-http", "captured.html")),
			).toBe("<main><h1>Compressed</h1></main>\n");
		});
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
			"Fetch target must be a docs path inside a discovered docs root",
		);
	});
});

test("docs fetch stores and replays root and transform options through docs update", async () => {
	await withDocsCliWorkspace("docs-fetch-options-replay-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const { handlerPath, logFile, targetPath, transformPath } =
				await prepareRelativeTransformFixture(
					tempDir,
					repoDir,
					binDir,
				);

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

test("docs update preserves local browse frontmatter for markdown file targets", async () => {
	await withDocsCliWorkspace("docs-update-frontmatter-preserve-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const sourcePath = path.join(tempDir, "source.md");
			const targetPath = fetchTargetPath(repoDir, "update-frontmatter.md");
			await seedFakeQmd(binDir);
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
				].join("\n"),
			);
			await writeFetchManifest(repoDir, [
				{
					source: pathToFileURL(sourcePath).href,
					target: path.posix.join("topics", TEST_TOPIC_NAME, "update-frontmatter.md"),
					handler: "docs-url-file-fetch",
					hash: "",
				},
			]);

			const result = await runDocsCli(["update"], {
				cwd: repoDir,
				env,
			});

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

test("docs fetch preserves relative transform paths in the manifest and resolves them on update", async () => {
	await withDocsCliWorkspace("docs-fetch-relative-transform-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const { handlerPath, logFile, targetPath, transformPath } =
				await prepareRelativeTransformFixture(
					tempDir,
					repoDir,
					binDir,
				);
			const relativeTransform = path.relative(path.join(repoDir, "docs"), transformPath);

			const fetchResult = await runDocsCli(
				[
					"fetch",
					"https://example.com/source",
					targetPath,
					"--handler",
					handlerPath,
					"--transform",
					relativeTransform,
				],
				{
					cwd: repoDir,
					env: withEnv(env, {
						DOCS_TEST_FETCH_HASH: "hash-1",
						DOCS_TEST_FETCH_LOG: logFile,
					}),
				},
			);
			const manifestEntries = readFetchManifestEntries(
				await readText(fetchManifestPath(repoDir)),
			);
			const updateResult = await runDocsCli(["update"], {
				cwd: repoDir,
				env: withEnv(env, {
					DOCS_TEST_FETCH_HASH: "hash-2",
					DOCS_TEST_FETCH_LOG: logFile,
				}),
			});

			const logContents = await readText(logFile);
			const resolvedTransformPath = await realpath(transformPath);

			expect(fetchResult.exitCode).toBe(0);
			expect(updateResult.exitCode).toBe(0);
			expect(manifestEntries[0]?.transform).toBe(relativeTransform);
			expect(logContents).toContain(`transform=${resolvedTransformPath}`);
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
		skipReason: "target must be a docs path inside the root",
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
	}, {
		seedLocalDocsRepo: false,
		seedGlobalDocsHome: false,
		seedGlobalDocsIndex: false,
	});
}, 15_000);

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
	}, {
		seedLocalDocsRepo: false,
		seedGlobalDocsHome: false,
		seedGlobalDocsIndex: false,
	});
}, 15_000);

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
	}, {
		seedLocalDocsRepo: false,
		seedGlobalDocsHome: false,
		seedGlobalDocsIndex: false,
	});
}, 10_000);

test("docs update tolerates a closed stdout pipe while streaming qmd output", async () => {
	await withDocsCliWorkspace("docs-update-epipe-", async ({ repoDir, binDir, env }) => {
		await seedFakeQmd(binDir);
		const docsBin = fileURLToPath(new URL("../bin/docs.ts", import.meta.url));

		const result = await runCommand(
			"/bin/zsh",
			["-lc", `set -o pipefail; node ${docsBin} update | head -n 1 >/dev/null`],
			{
				cwd: repoDir,
				env,
			},
		);

		expect(result.exitCode).toBe(0);
		expect(result.stderr).not.toContain("write EPIPE");
		expect(result.stderr).not.toContain("Unhandled 'error' event");
	}, {
		seedLocalDocsRepo: false,
		seedGlobalDocsHome: false,
		seedGlobalDocsIndex: false,
	});
}, 10_000);
