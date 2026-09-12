import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";

import { runDocsFetch } from "../src/runtime/fetch.ts";
import { readText, withTempDir, writeText } from "./helpers/fs.ts";

test.each([
	{ scenario: "outside the docs root", target: "outside.md", protectedFile: "outside.md" },
	{ scenario: "at the docs root", target: "docs", protectedFile: "docs/guide.md" },
])("A fetch rejects targets $scenario and preserves saved content", async ({
	target,
	protectedFile,
}) => {
	await withTempDir("docs-fetch-boundary-", async projectDir => {
		const docsRoot = path.join(projectDir, "docs");
		const savedFile = path.join(projectDir, protectedFile);
		const source = path.join(projectDir, "source.md");
		await writeText(path.join(docsRoot, "guide.md"), "# Saved guide\n");
		await writeText(savedFile, "# Protected edition\n");
		await writeText(source, "# Incoming edition\n");

		await expect(runDocsFetch({
			projectDir,
			docsRoots: [docsRoot],
			source: pathToFileURL(source).href,
			targetArg: path.join(projectDir, target),
			handler: "url",
		})).rejects.toMatchObject({ name: "RuntimeError" });

		expect(await readText(savedFile)).toBe("# Protected edition\n");
	});
});
