import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, expect, test, vi } from "vitest";

import {
	MissingFetchSourceError,
	readFetchManifest,
	runDocsFetch,
} from "../src/runtime/fetch.ts";
import { readMarkdownDocument } from "../src/runtime/markdown-document.ts";
import { readText, withTempDir, writeText } from "./helpers/fs.ts";

afterEach(() => vi.unstubAllEnvs());

async function withDocuments(
	run: (paths: {
		projectDir: string;
		docsRoots: string[];
		source: string;
		targetArg: string;
		handler: string;
	}) => Promise<void>,
): Promise<void> {
	await withTempDir("docs-fetch-", async projectDir => {
		// The owned file handler runs with Node, without host commands or discovery.
		for (const key of Object.keys(process.env)) {
			vi.stubEnv(key, undefined);
		}
		vi.stubEnv("HOME", projectDir);
		vi.stubEnv("TMPDIR", projectDir);
		vi.stubEnv("PATH", "");
		vi.stubEnv("NO_COLOR", "1");
		const docsRoot = path.join(projectDir, "docs");
		await writeText(path.join(projectDir, "source.md"), "# Source\n\nNew content.\n");
		await writeText(path.join(docsRoot, "guide.md"), "# Saved\n\nSaved content.\n");
		await run({
			projectDir,
			docsRoots: [docsRoot],
			source: pathToFileURL(path.join(projectDir, "source.md")).href,
			targetArg: path.join(docsRoot, "guide.md"),
			handler: "url",
		});
	});
}

test.each([
	{
		scenario: "missing",
		incoming: "# Source\n\nNew content.\n",
	},
	{
		scenario: "empty",
		incoming: [
			"---",
			"title: ''",
			"short: ''",
			"summary: ''",
			"read_when: []",
			"---",
			"# Source",
			"",
			"New content.",
		].join("\n"),
	},
])("A fetch preserves local metadata when incoming values are $scenario", async ({ incoming }) => {
	await withDocuments(async paths => {
		await writeText(paths.targetArg, [
			"---",
			"title: Local title",
			"short: Local short",
			"summary: Local summary",
			"read_when:",
			"  - Local hint",
			"---",
			"# Saved",
			"",
			"Saved content.",
		].join("\n"));
		await writeText(path.join(paths.projectDir, "source.md"), incoming);

		await runDocsFetch(paths);

		expect(await readMarkdownDocument(paths.targetArg)).toMatchObject({
			title: "Local title",
			short: "Local short",
			summary: "Local summary",
			readWhen: ["Local hint"],
			body: "New content.",
		});
	});
});

test("A fetch replaces local metadata with non-empty incoming values", async () => {
	await withDocuments(async paths => {
		await writeText(paths.targetArg, [
			"---",
			"title: Local title",
			"short: Local short",
			"summary: Local summary",
			"read_when: [Local hint]",
			"---",
			"# Saved",
		].join("\n"));
		await writeText(path.join(paths.projectDir, "source.md"), [
			"---",
			"title: 'Section: detail'",
			"short: '@start'",
			"summary: '#summary'",
			"read_when:",
			"  - 'Need: details'",
			"---",
			"# Source",
			"",
			"New content.",
		].join("\n"));

		await runDocsFetch(paths);

		expect(await readMarkdownDocument(paths.targetArg)).toMatchObject({
			title: "Section: detail",
			short: "@start",
			summary: "#summary",
			readWhen: ["Need: details"],
			body: "New content.",
		});
	});
});

test.each([
	{ scenario: "preserves local changes", force: false, expected: "# Local edit\n" },
	{
		scenario: "replaces local changes with force",
		force: true,
		expected: "# Source\n\nNew content.\n",
	},
])("A fetch with an unchanged source $scenario", async ({ force, expected }) => {
	await withDocuments(async paths => {
		await runDocsFetch(paths);
		await writeText(paths.targetArg, "# Local edit\n");

		await runDocsFetch({ ...paths, force });

		expect(await readText(paths.targetArg)).toBe(expected);
	});
});

test("A fetch replaces one registration and preserves other registrations", async () => {
	await withDocuments(async paths => {
		const docsRoot = path.join(paths.projectDir, "docs");
		const replacement = path.join(paths.projectDir, "replacement.md");
		await writeText(replacement, "# Replacement\n");
		await runDocsFetch(paths);
		await runDocsFetch({ ...paths, targetArg: path.join(docsRoot, "other.md") });

		await runDocsFetch({ ...paths, source: pathToFileURL(replacement).href });

		const manifest = await readFetchManifest(docsRoot);
		expect(manifest.entries.map(({ source, target }) => ({ source, target })))
			.toEqual(expect.arrayContaining([
				{ source: pathToFileURL(replacement).href, target: "guide.md" },
				{ source: paths.source, target: "other.md" },
			]));
		expect(manifest.entries).toHaveLength(2);
		expect(await readText(paths.targetArg)).toBe("# Replacement\n");
	});
});

test("A failed fetch preserves the saved document and its registration", async () => {
	await withDocuments(async paths => {
		const docsRoot = path.join(paths.projectDir, "docs");
		await runDocsFetch(paths);
		const savedManifest = await readFetchManifest(docsRoot);

		await expect(runDocsFetch({
			...paths,
			source: pathToFileURL(path.join(paths.projectDir, "missing.md")).href,
		})).rejects.toBeInstanceOf(MissingFetchSourceError);

		expect(await readText(paths.targetArg)).toBe("# Source\n\nNew content.\n");
		expect(await readFetchManifest(docsRoot)).toEqual(savedManifest);
	});
});
