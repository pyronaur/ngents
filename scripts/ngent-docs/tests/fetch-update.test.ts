import { rename } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { runRegisteredFetches } from "../src/runtime/fetch-update.ts";
import { runDocsFetch, writeFetchManifest } from "../src/runtime/fetch.ts";
import { readText, withTempDir, writeText } from "./helpers/fs.ts";

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-09-12T12:00:00.000Z"));
});
afterEach(() => vi.useRealTimers());

// Explicit roots avoid discovery. The real file handler needs no shell or network.
async function withDocuments(
	run: (paths: {
		projectDir: string;
		docsRoots: string[];
		docsRoot: string;
		source: string;
		targetArg: string;
	}) => Promise<void>,
): Promise<void> {
	await withTempDir("docs-update-", async projectDir => {
		// Preserve Node's environment object so child processes receive these values.
		for (const key of Object.keys(process.env)) {
			vi.stubEnv(key, undefined);
		}
		vi.stubEnv("HOME", projectDir);
		vi.stubEnv("TMPDIR", projectDir);
		vi.stubEnv("PATH", "");
		vi.stubEnv("NO_COLOR", "1");
		try {
			const root = path.join(projectDir, "docs");
			await writeText(path.join(root, "guide.md"), "# Saved edition\n");
			await writeText(path.join(projectDir, "source.md"), "# First edition\n");
			await run({
				projectDir,
				docsRoots: [root],
				docsRoot: root,
				source: pathToFileURL(path.join(projectDir, "source.md")).href,
				targetArg: path.join(root, "guide.md"),
			});
		} finally {
			vi.unstubAllEnvs();
		}
	});
}

test("A successful update keeps changed content fresh for one day", async () => {
	await withDocuments(async paths => {
		await runDocsFetch({ ...paths, handler: "url" });
		await writeText(path.join(paths.projectDir, "source.md"), "# Second edition\n");
		vi.setSystemTime(new Date("2026-09-13T12:00:00.000Z"));

		await runRegisteredFetches(paths.docsRoots);
		expect(await readText(paths.targetArg)).toBe("# Second edition\n");
		await writeText(path.join(paths.projectDir, "source.md"), "# Third edition\n");
		vi.setSystemTime(new Date("2026-09-14T11:59:59.999Z"));
		await runRegisteredFetches(paths.docsRoots);
		expect(await readText(paths.targetArg)).toBe("# Second edition\n");

		vi.setSystemTime(new Date("2026-09-14T12:00:00.000Z"));
		await runRegisteredFetches(paths.docsRoots);
		expect(await readText(paths.targetArg)).toBe("# Third edition\n");
	});
});

test("A successful update keeps unchanged content fresh for another day", async () => {
	await withDocuments(async paths => {
		await runDocsFetch({ ...paths, handler: "url" });
		vi.setSystemTime(new Date("2026-09-13T12:00:00.000Z"));

		await runRegisteredFetches(paths.docsRoots);
		await writeText(path.join(paths.projectDir, "source.md"), "# Second edition\n");
		vi.setSystemTime(new Date("2026-09-14T11:59:59.999Z"));
		await runRegisteredFetches(paths.docsRoots);

		expect(await readText(paths.targetArg)).toBe("# First edition\n");
	});
});

test("A forced update replaces a recently checked document", async () => {
	await withDocuments(async paths => {
		await runDocsFetch({ ...paths, handler: "url" });
		await writeText(path.join(paths.projectDir, "source.md"), "# Second edition\n");

		await runRegisteredFetches(paths.docsRoots, { force: true });

		expect(await readText(paths.targetArg)).toBe("# Second edition\n");
	});
});

test("An update restores a missing target with an unchanged source", async () => {
	await withDocuments(async paths => {
		await runDocsFetch({ ...paths, handler: "url" });
		await rename(paths.targetArg, path.join(paths.projectDir, "removed.md"));

		await runRegisteredFetches(paths.docsRoots);

		expect(await readText(paths.targetArg)).toBe("# First edition\n");
	});
});

test.each([
	{ scenario: "no check time", checkedAt: undefined },
	{ scenario: "an invalid check time", checkedAt: "invalid" },
	{ scenario: "a future check time", checkedAt: "2026-09-13T12:00:00.000Z" },
])("An update refreshes a document with $scenario", async ({ checkedAt }) => {
	await withDocuments(async paths => {
		await writeFetchManifest(paths.docsRoot, {
			entries: [{
				source: paths.source,
				target: "guide.md",
				handler: "docs-url-file-fetch",
				hash: "",
				checkedAt,
			}],
		});

		await runRegisteredFetches(paths.docsRoots);

		expect(await readText(paths.targetArg)).toBe("# First edition\n");
	});
});

test("An update preserves a missing source and retries it when the source returns", async () => {
	await withDocuments(async paths => {
		const missingSource = path.join(paths.projectDir, "missing.md");
		await writeText(path.join(paths.docsRoot, "missing.md"), "# Preserved edition\n");
		await writeFetchManifest(paths.docsRoot, {
			entries: [
				{
					source: pathToFileURL(missingSource).href,
					target: "missing.md",
					handler: "docs-url-file-fetch",
					hash: "",
				},
				{
					source: paths.source,
					target: "guide.md",
					handler: "docs-url-file-fetch",
					hash: "",
				},
			],
		});

		const result = await runRegisteredFetches(paths.docsRoots);
		expect(result.skippedMissingSources).toHaveLength(1);
		expect(await readText(path.join(paths.docsRoot, "missing.md"))).toBe("# Preserved edition\n");
		expect(await readText(paths.targetArg)).toBe("# First edition\n");

		await writeText(missingSource, "# Restored edition\n");
		await runRegisteredFetches(paths.docsRoots);
		expect(await readText(path.join(paths.docsRoot, "missing.md"))).toBe("# Restored edition\n");
	});
});

test.each([
	{ scenario: "parent traversal", target: "../outside.md" },
	{ scenario: "backslash traversal", target: "..\\outside.md" },
	{ scenario: "the docs root", target: "." },
])("An update skips $scenario and refreshes a safe document", async ({ target }) => {
	await withDocuments(async paths => {
		const outside = path.join(paths.projectDir, "outside.md");
		await writeText(outside, "# Protected edition\n");
		await writeFetchManifest(paths.docsRoot, {
			entries: [
				{ source: paths.source, target, handler: "docs-url-file-fetch", hash: "" },
				{
					source: paths.source,
					target: "safe.md",
					handler: "docs-url-file-fetch",
					hash: "",
				},
			],
		});

		const result = await runRegisteredFetches(paths.docsRoots);

		expect(result.skippedUnsafeEntries).toHaveLength(1);
		expect(await readText(path.join(paths.docsRoot, "safe.md"))).toBe("# First edition\n");
		expect(await readText(paths.targetArg)).toBe("# Saved edition\n");
		expect(await readText(outside)).toBe("# Protected edition\n");
	});
});
