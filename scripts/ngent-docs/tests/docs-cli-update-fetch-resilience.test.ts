import path from "node:path";
import { expect, test } from "vitest";

import { runDocsCli } from "./helpers/cli.ts";
import {
	readText,
	seedFakeQmd,
	TEST_TOPIC_NAME,
	topicDocsPath as fetchTargetPath,
	withDocsCliWorkspace,
	withHttpServer,
	writeExecutable,
	writeFetchManifest,
} from "./helpers/docs-cli-fixture.ts";

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

test("docs update runs registered fetches in the same docs root concurrently", async () => {
	await withDocsCliWorkspace("docs-update-fetch-parallel-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const logFile = path.join(tempDir, "combined.log");
			const startDir = path.join(tempDir, "starts");
			await seedFakeQmd(binDir);
			const handlerPath = path.join(binDir, "parallel-fetch-handler");
			await writeExecutable(
				binDir,
				"parallel-fetch-handler",
				[
					"#!/bin/sh",
					"source_url=\"\"",
					"target_path=\"\"",
					"while [ \"$#\" -gt 0 ]; do",
					"  case \"$1\" in",
					"    --source) source_url=\"$2\"; shift 2 ;;",
					"    --target) target_path=\"$2\"; shift 2 ;;",
					"    --previous-hash) shift 2 ;;",
					"    *) shift ;;",
					"  esac",
					"done",
					"mkdir -p \"$DOCS_TEST_FETCH_PARALLEL_DIR\"",
					"name=$(printf \"%s\" \"$source_url\" | tr -c 'A-Za-z0-9' '_')",
					"printf \"start=%s\\n\" \"$source_url\" >> \"$DOCS_TEST_FETCH_LOG\"",
					"touch \"$DOCS_TEST_FETCH_PARALLEL_DIR/$name\"",
					"i=0",
					"while [ \"$(find \"$DOCS_TEST_FETCH_PARALLEL_DIR\" -type f | wc -l | tr -d ' ')\" -lt 2 ]; do",
					"  i=$((i + 1))",
					"  if [ \"$i\" -gt 100 ]; then",
					"    printf \"parallel wait timed out\\n\" >&2",
					"    exit 1",
					"  fi",
					"  sleep 0.05",
					"done",
					"mkdir -p \"$target_path\"",
					"printf \"%s\\n\" \"$source_url\" > \"$target_path/source.txt\"",
					"printf \"hash-%s\\n\" \"$name\"",
					"",
				].join("\n"),
			);
			await writeFetchManifest(repoDir, [
				{
					source: "https://example.com/alpha",
					target: `topics/${TEST_TOPIC_NAME}/alpha`,
					handler: handlerPath,
					hash: "old-alpha",
				},
				{
					source: "https://example.com/beta",
					target: `topics/${TEST_TOPIC_NAME}/beta`,
					handler: handlerPath,
					hash: "old-beta",
				},
			]);

			const result = await runDocsCli(["update"], {
				cwd: repoDir,
				env: withEnv(env, {
					DOCS_TEST_FETCH_LOG: logFile,
					DOCS_TEST_FETCH_PARALLEL_DIR: startDir,
					FORCE_COLOR: "1",
				}),
			});

			expect(result.exitCode).toBe(0);
			expect(result.stderr).toContain("\u001b[");
			expect(await readText(fetchTargetPath(repoDir, "alpha", "source.txt"))).toBe(
				"https://example.com/alpha\n",
			);
			expect(await readText(fetchTargetPath(repoDir, "beta", "source.txt"))).toBe(
				"https://example.com/beta\n",
			);
		});
}, 10_000);

test("docs update skips HTTP 404 fetches and still refreshes qmd", async () => {
	await withDocsCliWorkspace("docs-update-fetch-404-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const logFile = path.join(tempDir, "qmd.log");
			await seedFakeQmd(binDir);
			await withHttpServer((_request, response) => {
				response.writeHead(404, {
					"content-type": "text/plain",
				});
				response.end("missing\n");
			}, async (baseUrl) => {
				await writeFetchManifest(repoDir, [
					{
						source: `${baseUrl}/missing.md`,
						target: `topics/${TEST_TOPIC_NAME}/missing.md`,
						handler: "docs-url-file-fetch",
						hash: "hash-old",
					},
				]);

				const result = await runDocsCli(["update"], {
					cwd: repoDir,
					env: withEnv(env, {
						DOCS_TEST_QMD_LOG: logFile,
					}),
				});

				expect(result.exitCode).toBe(0);
				expect(result.stderr).toContain("status=404");
				expect(result.stderr).toContain(`${baseUrl}/missing.md`);
				expect(result.stdout).toContain("Updating fake index");
				expect(result.stdout).toContain("Embedding fake index");
				expect(await readText(fetchManifestPath(repoDir))).toContain(
					"\"hash\": \"hash-old\"",
				);
			});
		});
}, 15_000);
