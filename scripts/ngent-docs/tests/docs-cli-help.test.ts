import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";

import { runDocsCli } from "./helpers/cli.ts";
import {
	CANONICAL_QUERY_USAGE,
	createGitFetchSource,
	readText,
	runFetchHandlerCli,
	STALE_QUERY_USAGE,
	withDocsCliWorkspace,
	withHttpServer,
	writeText,
} from "./helpers/docs-cli-fixture.ts";

function expectFetchHandlerHelp(stdout: string, name: string): void {
	expect(stdout).toContain(`Usage: ${name} [options]`);
	expect(stdout).toContain("--source <source>");
	expect(stdout).toContain("--target <path>");
	expect(stdout).toContain("--previous-hash <hash>");
	expect(stdout).toContain("--root <subpath>");
	expect(stdout).toContain("--transform <command>");
}

type FetchHandlerResult = {
	exitCode: number | null;
	stdout: string;
	stderr: string;
};

async function expectUrlFileFetchRedownload(
	targetPath: string,
	fileName: string,
	first: FetchHandlerResult,
	second: FetchHandlerResult,
): Promise<void> {
	expect(first.exitCode).toBe(0);
	expect(second.exitCode).toBe(0);
	expect(await readText(path.join(targetPath, fileName))).toBe("bravo");
	expect(second.stdout.trim()).not.toBe(first.stdout.trim());
}

async function runUrlFileFetchWithPreviousHash(
	source: string,
	targetPath: string,
	previousHash: string,
): Promise<FetchHandlerResult> {
	return await runFetchHandlerCli("docs-url-file-fetch", [
		`--source=${source}`,
		`--target=${targetPath}`,
		`--previous-hash=${previousHash}`,
	]);
}

test("bare docs renders compact markdown help with merged topics and docs", async () => {
	await withDocsCliWorkspace("docs-root-help-", async ({ repoDir, homeDir, env }) => {
		const result = await runDocsCli([], { cwd: repoDir, env });
		const normalizedStdout = result.stdout.replaceAll("/private/var", "/var");

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("# docs");
		expect(result.stdout).toContain(CANONICAL_QUERY_USAGE);
		expect(result.stdout).not.toContain(STALE_QUERY_USAGE);
		expect(result.stdout).not.toContain("docs park <name> [path]");
		expect(result.stdout).toContain("docs topic [topic] [path]");
		expect(result.stdout).toContain("docs <where>");
		expect(result.stdout).toContain("docs ls [where...]");
		expect(result.stdout).toContain(
			"It may open a topic like `docs <topic>` or a docs view like `docs <docs-root>`.",
		);
		expect(result.stdout).toContain("`docs/file.md` or `./docs/file.md`");
		expect(result.stdout).toContain("an explicit docs file path like `~/work/foo/docs/file.md`");
		expect(result.stdout).toContain("docs ls docs/subdir");
		expect(result.stdout).toContain("To read docs operation manual use `docs --ops-help`.");
		expect(result.stdout).toContain("qmd");
		expect(result.stdout).toContain("local search docs");
		expect(result.stdout).toMatch(
			/ops\s+Ops Notes\s+This summary is intentionally longer than sixty-four characte\.\.\./,
		);
		expect(result.stdout).toContain("web-fetching.md - web browser tools");
		expect(result.stdout).toContain(
			"long-summary.md - This summary is intentionally longer than sixty-four characte...",
		);
		expect(normalizedStdout).toContain(`### ${path.join(repoDir, "docs")}/`);
		expect(normalizedStdout).toContain(
			`### ${path.join(homeDir, ".ngents", "docs", "browser")}/`,
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
	await withDocsCliWorkspace("docs-help-", async ({ repoDir, env }) => {
		const bare = await runDocsCli([], { cwd: repoDir, env });
		const help = await runDocsCli(["--help"], { cwd: repoDir, env });
		const helpCommand = await runDocsCli(["help"], { cwd: repoDir, env });

		expect(help.exitCode).toBe(0);
		expect(helpCommand.exitCode).toBe(0);
		expect(help.stdout).toContain("# docs");
		expect(help.stdout).toContain(CANONICAL_QUERY_USAGE);
		expect(help.stdout).not.toContain(STALE_QUERY_USAGE);
		expect(help.stdout).not.toContain("docs park <name> [path]");
		expect(help.stdout).toContain("docs topic [topic] [path]");
		expect(help.stdout).toContain("To read docs operation manual use `docs --ops-help`.");
		expect(help.stdout).not.toContain("web-fetching.md - web browser tools");
		expect(help.stdout).not.toContain("## Project Docs");
		expect(helpCommand.stdout).toBe(help.stdout);
		expect(bare.stdout).not.toBe(help.stdout);
	});
});

test("docs --init and docs -i render the main docs page", async () => {
	await withDocsCliWorkspace("docs-init-", async ({ repoDir, env }) => {
		const bare = await runDocsCli([], { cwd: repoDir, env });
		const init = await runDocsCli(["--init"], { cwd: repoDir, env });
		const shortInit = await runDocsCli(["-i"], { cwd: repoDir, env });

		expect(init.exitCode).toBe(0);
		expect(shortInit.exitCode).toBe(0);
		expect(init.stdout).toBe(bare.stdout);
		expect(shortInit.stdout).toBe(bare.stdout);
	});
});

test("docs --ops-help renders the operations manual", async () => {
	const result = await runDocsCli(["--ops-help"]);

	expect(result.exitCode).toBe(0);
	expect(result.stdout).toContain("Usage: docs --ops-help");
	expect(result.stdout).toContain("# docs operations");
	expect(result.stdout).toContain("docs park <name> [path]");
	expect(result.stdout).toContain(
		"docs fetch <source> <path> --handler <command> [--root <subpath>] [--transform <command>]",
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
		"Usage: docs fetch <source> <path> --handler <command> [--root <subpath>] [--transform <command>]",
	);
	expect(result.stdout).toContain("--handler <command>");
	expect(result.stdout).toContain("git");
	expect(result.stdout).toContain("url");
});

test("docs-git-fetch --help shows the handler options through commander", async () => {
	const result = await runFetchHandlerCli("docs-git-fetch", ["--help"]);

	expect(result.exitCode).toBe(0);
	expectFetchHandlerHelp(result.stdout, "docs-git-fetch");
});

test("docs-url-file-fetch --help shows the handler options through commander", async () => {
	const result = await runFetchHandlerCli("docs-url-file-fetch", ["--help"]);

	expect(result.exitCode).toBe(0);
	expectFetchHandlerHelp(result.stdout, "docs-url-file-fetch");
});

test("docs-url-file-fetch accepts commander equals-style option values", async () => {
	await withDocsCliWorkspace("docs-url-file-fetch-equals-", async ({ tempDir }) => {
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
	await withDocsCliWorkspace("docs-url-file-fetch-content-length-", async ({ tempDir }) => {
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
			const second = await runUrlFileFetchWithPreviousHash(
				source,
				targetPath,
				first.stdout.trim(),
			);

			await expectUrlFileFetchRedownload(targetPath, "doc.md", first, second);
			expect(getRequests).toBe(2);
		});
	});
});

test("docs-url-file-fetch uses validators from the final redirect response", async () => {
	await withDocsCliWorkspace("docs-url-file-fetch-redirect-", async ({ tempDir }) => {
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
			const second = await runUrlFileFetchWithPreviousHash(
				source,
				targetPath,
				first.stdout.trim(),
			);

			await expectUrlFileFetchRedownload(targetPath, "redirect.md", first, second);
		});
	});
});

test("docs-git-fetch rejects traversal roots", async () => {
	await withDocsCliWorkspace("docs-git-fetch-root-traversal-", async ({ tempDir }) => {
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
	await withDocsCliWorkspace("docs-git-fetch-root-absolute-", async ({ tempDir }) => {
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
	await withDocsCliWorkspace("docs-git-fetch-root-nested-", async ({ tempDir }) => {
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
		"docs fetch <source> <path> --handler <command> [--root <subpath>] [--transform <command>]",
	);
	expect(contents).toContain("docs park <name> [path]");
	expect(contents).toContain("workspace paths that contain `docs/`");
	expect(contents).toContain("Parked names match case-insensitively.");
	expect(contents).toContain("docs ls ~/work/foo");
	expect(contents).toContain("docs ls local");
});
