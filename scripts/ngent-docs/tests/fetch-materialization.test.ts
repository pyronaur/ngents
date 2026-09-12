import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";

import { materializeHandlerOutput } from "../src/runtime/fetch-handler-runtime.ts";
import { readText, withTempDir, writeText } from "./helpers/fs.ts";

test("A directory target receives the staged tree instead of the saved tree", async () => {
	await withTempDir("docs-fetch-tree-", async directory => {
		const inputDirectory = path.join(directory, "staged");
		const targetPath = path.join(directory, "docs", "import");
		await writeText(path.join(inputDirectory, "guide.md"), "# Guide\n");
		await writeText(path.join(inputDirectory, "assets", "diagram.svg"), "<svg/>\n");
		await writeText(path.join(targetPath, "old.md"), "# Old\n");

		await materializeHandlerOutput({
			source: pathToFileURL(inputDirectory).href,
			inputDirectory,
			targetPath,
		});

		expect((await readdir(targetPath)).sort()).toEqual(["assets", "guide.md"]);
		expect(await readText(path.join(targetPath, "guide.md"))).toBe("# Guide\n");
		expect(await readText(path.join(targetPath, "assets", "diagram.svg"))).toBe("<svg/>\n");
	});
});

test("A file target rejects multiple staged files and preserves the saved document", async () => {
	await withTempDir("docs-fetch-files-", async directory => {
		const inputDirectory = path.join(directory, "staged");
		const targetPath = path.join(directory, "docs", "guide.md");
		await writeText(path.join(inputDirectory, "first.md"), "# First\n");
		await writeText(path.join(inputDirectory, "second.md"), "# Second\n");
		await writeText(targetPath, "# Saved\n");

		await expect(materializeHandlerOutput({
			source: pathToFileURL(inputDirectory).href,
			inputDirectory,
			targetPath,
		})).rejects.toBeInstanceOf(Error);

		expect(await readText(targetPath)).toBe("# Saved\n");
	});
});
