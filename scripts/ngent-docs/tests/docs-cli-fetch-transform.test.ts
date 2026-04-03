import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";

import { runDocsCli } from "./helpers/cli.ts";
import {
	createGitFetchSource,
	readText,
	TEST_TOPIC_NAME,
	topicDocsPath,
	withDocsCliWorkspace,
	writeExecutable,
	writeText,
} from "./helpers/docs-cli-fixture.ts";

function fetchTargetPath(repoDir: string, ...segments: string[]): string {
	return topicDocsPath(repoDir, TEST_TOPIC_NAME, ...segments);
}

test("docs fetch pipes a single staged input file to transform stdin", async () => {
	await withDocsCliWorkspace("docs-fetch-transform-stdin-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const sourcePath = path.join(tempDir, "source.html");
			await writeText(sourcePath, "<main><h1>From stdin</h1></main>\n");
			const transformPath = path.join(binDir, "stdin-to-output");
			await writeExecutable(
				binDir,
				"stdin-to-output",
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
					pathToFileURL(sourcePath).href,
					fetchTargetPath(repoDir, "stdin-capture"),
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
				await readText(fetchTargetPath(repoDir, "stdin-capture", "captured.html")),
			).toBe("<main><h1>From stdin</h1></main>\n");
		});
});

test("docs fetch materializes transform stdout as README.md for a directory target", async () => {
	await withDocsCliWorkspace("docs-fetch-transform-stdout-dir-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const sourcePath = path.join(tempDir, "source.md");
			await writeText(sourcePath, "# Streamed Markdown\n");
			const transformPath = path.join(binDir, "stdout-transform");
			await writeExecutable(binDir, "stdout-transform", "#!/bin/sh\ncat\n");

			const result = await runDocsCli(
				[
					"fetch",
					pathToFileURL(sourcePath).href,
					fetchTargetPath(repoDir, "stdout-readme"),
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
				await readText(fetchTargetPath(repoDir, "stdout-readme", "README.md")),
			).toBe("# Streamed Markdown\n");
		});
});

test("docs fetch materializes transform stdout as a file target", async () => {
	await withDocsCliWorkspace("docs-fetch-transform-stdout-file-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const sourcePath = path.join(tempDir, "source.md");
			const targetPath = fetchTargetPath(repoDir, "stdout-file.md");
			await writeText(sourcePath, "# Streamed Markdown\n");
			const transformPath = path.join(binDir, "stdout-file-transform");
			await writeExecutable(binDir, "stdout-file-transform", "#!/bin/sh\ncat\n");

			const result = await runDocsCli(
				[
					"fetch",
					pathToFileURL(sourcePath).href,
					targetPath,
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
			expect(await readText(targetPath)).toBe("# Streamed Markdown\n");
		});
});

test("docs fetch merges local browse frontmatter for stdout file transforms", async () => {
	await withDocsCliWorkspace("docs-fetch-transform-frontmatter-merge-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const sourcePath = path.join(tempDir, "source.md");
			const targetPath = fetchTargetPath(repoDir, "stdout-frontmatter.md");
			await writeText(sourcePath, "# Source body\n");
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
			const transformPath = path.join(binDir, "stdout-frontmatter-transform");
			await writeExecutable(
				binDir,
				"stdout-frontmatter-transform",
				[
					"#!/bin/sh",
					"cat <<'EOF'",
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
					"EOF",
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
					"--transform",
					transformPath,
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

test("docs fetch materializes a single staged input file as a file target", async () => {
	await withDocsCliWorkspace("docs-fetch-file-target-", async ({ tempDir, repoDir, env }) => {
		const sourcePath = path.join(tempDir, "source.md");
		const targetPath = fetchTargetPath(repoDir, "fetched-file.md");
		await writeText(sourcePath, "# Raw Markdown\n");

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
		expect(await readText(targetPath)).toBe("# Raw Markdown\n");
	});
});

test("docs fetch preserves DOCS_FETCH env vars for single-file stream transforms", async () => {
	await withDocsCliWorkspace("docs-fetch-transform-stream-env-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const sourcePath = path.join(tempDir, "source.md");
			const targetPath = fetchTargetPath(repoDir, "stdout-env");
			await writeText(sourcePath, "# Streamed Markdown\n");
			const transformPath = path.join(binDir, "stdout-env-transform");
			await writeExecutable(
				binDir,
				"stdout-env-transform",
				[
					"#!/bin/sh",
					"printf 'source=%s\\n' \"$DOCS_FETCH_SOURCE\"",
					"printf 'input=%s\\n' \"$DOCS_FETCH_INPUT\"",
					"printf 'output=%s\\n' \"$DOCS_FETCH_OUTPUT\"",
					"printf 'target=%s\\n' \"$DOCS_FETCH_TARGET\"",
					"cat",
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
					"--transform",
					transformPath,
				],
				{
					cwd: repoDir,
					env,
				},
			);

			expect(result.exitCode).toBe(0);
			const readme = (await readText(fetchTargetPath(repoDir, "stdout-env", "README.md")))
				.replaceAll("/private/var", "/var");
			expect(readme).toContain(`source=${pathToFileURL(sourcePath).href}`);
			expect(readme).toContain("input=");
			expect(readme).toContain("output=");
			expect(readme).toContain(`target=${targetPath.replaceAll("/private/var", "/var")}`);
			expect(readme).toContain("# Streamed Markdown\n");
		});
});

test("docs fetch fails when a transform writes both stdout and output files", async () => {
	await withDocsCliWorkspace("docs-fetch-transform-both-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const sourcePath = path.join(tempDir, "source.md");
			await writeText(sourcePath, "# Mixed Output\n");
			const transformPath = path.join(binDir, "both-transform");
			await writeExecutable(
				binDir,
				"both-transform",
				[
					"#!/bin/sh",
					"mkdir -p \"$DOCS_FETCH_OUTPUT\"",
					"printf \"# dir output\\n\" > \"$DOCS_FETCH_OUTPUT/README.md\"",
					"printf \"# stdout output\\n\"",
					"",
				].join("\n"),
			);

			const result = await runDocsCli(
				[
					"fetch",
					pathToFileURL(sourcePath).href,
					fetchTargetPath(repoDir, "mixed-transform"),
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

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("must write either stdout or output files, not both");
		});
});

test("docs fetch rejects file targets when a transform writes output files", async () => {
	await withDocsCliWorkspace("docs-fetch-file-transform-output-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const sourcePath = path.join(tempDir, "source.md");
			await writeText(sourcePath, "# File Target\n");
			const transformPath = path.join(binDir, "file-target-dir-output");
			await writeExecutable(
				binDir,
				"file-target-dir-output",
				[
					"#!/bin/sh",
					"mkdir -p \"$DOCS_FETCH_OUTPUT\"",
					"printf \"# dir output\\n\" > \"$DOCS_FETCH_OUTPUT/README.md\"",
					"",
				].join("\n"),
			);

			const result = await runDocsCli(
				[
					"fetch",
					pathToFileURL(sourcePath).href,
					fetchTargetPath(repoDir, "file-target.md"),
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

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain(
				"file target mode does not support directory output transforms",
			);
		});
});

test("docs fetch fails when a transform produces neither stdout nor output files", async () => {
	await withDocsCliWorkspace("docs-fetch-transform-none-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const sourcePath = path.join(tempDir, "source.md");
			await writeText(sourcePath, "# Nothing\n");
			const transformPath = path.join(binDir, "no-output-transform");
			await writeExecutable(binDir, "no-output-transform", "#!/bin/sh\nexit 0\n");

			const result = await runDocsCli(
				[
					"fetch",
					pathToFileURL(sourcePath).href,
					fetchTargetPath(repoDir, "no-transform-output"),
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

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("must write output files or stdout");
		});
});

test("docs fetch rejects stdout-only transforms when handler output contains multiple files", async () => {
	await withDocsCliWorkspace("docs-fetch-transform-multi-file-",
		async ({ tempDir, repoDir, binDir, env }) => {
			const source = await createGitFetchSource(tempDir);
			const transformPath = path.join(binDir, "stdout-only-transform");
			await writeExecutable(
				binDir,
				"stdout-only-transform",
				[
					"#!/bin/sh",
					"printf \"# stdout only\\n\"",
					"",
				].join("\n"),
			);

			const result = await runDocsCli(
				[
					"fetch",
					source,
					fetchTargetPath(repoDir, "multi-file-transform"),
					"--handler",
					"git",
					"--transform",
					transformPath,
				],
				{
					cwd: repoDir,
					env,
				},
			);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("stdout-only mode requires exactly one staged file");
		});
});

test("docs fetch rejects file targets when handler output contains multiple files", async () => {
	await withDocsCliWorkspace("docs-fetch-file-target-multi-file-",
		async ({ tempDir, repoDir, env }) => {
			const source = await createGitFetchSource(tempDir);

			const result = await runDocsCli(
				[
					"fetch",
					source,
					fetchTargetPath(repoDir, "multi-file.md"),
					"--handler",
					"git",
				],
				{
					cwd: repoDir,
					env,
				},
			);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("file target mode requires exactly one staged file");
		});
});
