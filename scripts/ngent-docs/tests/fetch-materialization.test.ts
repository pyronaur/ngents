import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";

import { materializeHandlerOutput } from "../src/runtime/fetch-handler-runtime.ts";
import { materializeTransformOutput } from "../src/runtime/fetch-transform-output.ts";
import { readMarkdownDocument } from "../src/runtime/markdown-document.ts";
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

test("Transform stdout replaces a directory target with a README document", async () => {
	await withTempDir("docs-transform-stdout-", async directory => {
		const inputFile = path.join(directory, "staged", "source.txt");
		const outputDirectory = path.join(directory, "output");
		const targetPath = path.join(directory, "docs", "import");
		await writeText(inputFile, "Source text\n");
		await mkdir(outputDirectory);
		await writeText(path.join(targetPath, "old.md"), "# Saved\n");

		await materializeTransformOutput({
			command: "convert-docs",
			inputFiles: [inputFile],
			outputFiles: [],
			outputDirectory,
			targetPath,
			stdout: "# Converted\n\nNew content.\n",
		});

		expect(await readdir(targetPath)).toEqual(["README.md"]);
		expect(await readText(path.join(targetPath, "README.md"))).toBe(
			"# Converted\n\nNew content.\n",
		);
	});
});

test("Transform files replace a directory target with the output tree", async () => {
	await withTempDir("docs-transform-files-", async directory => {
		const inputFile = path.join(directory, "staged", "source.txt");
		const outputDirectory = path.join(directory, "output");
		const guidePath = path.join(outputDirectory, "guide.md");
		const assetPath = path.join(outputDirectory, "assets", "diagram.svg");
		const targetPath = path.join(directory, "docs", "import");
		await writeText(inputFile, "Source text\n");
		await writeText(guidePath, "# Converted guide\n");
		await writeText(assetPath, "<svg>Converted diagram</svg>\n");
		await writeText(path.join(targetPath, "old.md"), "# Saved\n");

		await materializeTransformOutput({
			command: "convert-docs",
			inputFiles: [inputFile],
			outputFiles: [guidePath, assetPath],
			outputDirectory,
			targetPath,
			stdout: "",
		});

		expect((await readdir(targetPath)).sort()).toEqual(["assets", "guide.md"]);
		expect(await readText(path.join(targetPath, "guide.md"))).toBe("# Converted guide\n");
		expect(await readText(path.join(targetPath, "assets", "diagram.svg"))).toBe(
			"<svg>Converted diagram</svg>\n",
		);
	});
});

test("Transform stdout replaces the file body and preserves the local title", async () => {
	await withTempDir("docs-transform-file-", async directory => {
		const inputFile = path.join(directory, "staged", "source.txt");
		const outputDirectory = path.join(directory, "output");
		const targetPath = path.join(directory, "docs", "guide.md");
		await writeText(inputFile, "Source text\n");
		await mkdir(outputDirectory);
		await writeText(targetPath, "---\ntitle: Local title\n---\n# Saved\n\nOld content.\n");

		await materializeTransformOutput({
			command: "convert-docs",
			inputFiles: [inputFile],
			outputFiles: [],
			outputDirectory,
			targetPath,
			stdout: "# Converted\n\nNew content.\n",
		});

		expect(await readMarkdownDocument(targetPath)).toMatchObject({
			title: "Local title",
			body: "New content.",
		});
	});
});

test.each([
	{
		scenario: "empty output",
		inputNames: ["source.txt"],
		outputNames: [],
		stdout: "",
		targetName: "import",
		savedName: "import/saved.md",
	},
	{
		scenario: "stdout with file output",
		inputNames: ["source.txt"],
		outputNames: ["guide.md"],
		stdout: "# Converted stdout\n",
		targetName: "import",
		savedName: "import/saved.md",
	},
	{
		scenario: "stdout from multiple inputs",
		inputNames: ["first.txt", "second.txt"],
		outputNames: [],
		stdout: "# Converted stdout\n",
		targetName: "import",
		savedName: "import/saved.md",
	},
	{
		scenario: "file output for a file target",
		inputNames: ["source.txt"],
		outputNames: ["guide.md"],
		stdout: "",
		targetName: "guide.md",
		savedName: "guide.md",
	},
])("A transform rejects $scenario and preserves saved content", async ({
	inputNames,
	outputNames,
	stdout,
	targetName,
	savedName,
}) => {
	await withTempDir("docs-transform-invalid-", async directory => {
		const outputDirectory = path.join(directory, "output");
		const targetPath = path.join(directory, "docs", targetName);
		const savedPath = path.join(directory, "docs", savedName);
		const inputFiles = inputNames.map(name => path.join(directory, "staged", name));
		const outputFiles = outputNames.map(name => path.join(outputDirectory, name));
		await mkdir(outputDirectory);
		for (const file of inputFiles) {
			await writeText(file, "Source text\n");
		}
		for (const file of outputFiles) {
			await writeText(file, "# Converted file\n");
		}
		await writeText(savedPath, "# Saved\n\nCurated content.\n");

		await expect(materializeTransformOutput({
			command: "convert-docs",
			inputFiles,
			outputFiles,
			outputDirectory,
			targetPath,
			stdout,
		})).rejects.toBeInstanceOf(Error);

		expect(await readText(savedPath)).toBe("# Saved\n\nCurated content.\n");
	});
});
