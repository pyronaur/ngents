import { mkdir, realpath, symlink } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

import { discoverDocsSources } from "../src/runtime/browse-sources.ts";
import { addDocsCollection, listDocsCollections } from "../src/runtime/collections.ts";
import { withTempDir, writeText } from "./helpers/fs.ts";

test("Both saved roots remain available after a second registration", async () => {
	await withTempDir("docs-collections-", async tempDir => {
		const fixture = await realpath(tempDir);
		const registry = path.join(fixture, "collections.json");
		const project = path.join(fixture, "project");
		const firstRoot = path.join(fixture, "first", "docs");
		const secondRoot = path.join(fixture, "second", "docs");
		// Stop repository discovery at the fixture boundary.
		await mkdir(path.join(project, ".git"), { recursive: true });
		await writeText(path.join(firstRoot, "first-guide.md"), "# First guide\n");
		await writeText(path.join(secondRoot, "second-guide.md"), "# Second guide\n");
		await addDocsCollection(registry, "first", firstRoot);

		await addDocsCollection(registry, "second", secondRoot);
		const sources = await discoverDocsSources(project, registry);

		expect(new Set(sources.globalDocsCollections)).toEqual(new Set([
			{ name: "first", docsRoot: firstRoot },
			{ name: "second", docsRoot: secondRoot },
		]));
	});
});

test("Names that differ only by case cannot replace a saved collection", async () => {
	await withTempDir("docs-collections-", async tempDir => {
		const fixture = await realpath(tempDir);
		const registry = path.join(fixture, "collections.json");
		const root = path.join(fixture, "library", "docs");
		const otherRoot = path.join(fixture, "other", "docs");
		await writeText(path.join(root, "guide.md"), "# Saved guide\n");
		await writeText(path.join(otherRoot, "guide.md"), "# Other guide\n");
		await addDocsCollection(registry, "library", root);

		await expect(addDocsCollection(registry, "LIBRARY", otherRoot)).rejects.toMatchObject({
			name: "RuntimeError",
			exitCode: 1,
		});
		expect(await listDocsCollections(registry)).toEqual([
			{ name: "library", path: root },
		]);
	});
});

test("A symlink cannot register a saved root under another name", async () => {
	await withTempDir("docs-collections-", async tempDir => {
		const fixture = await realpath(tempDir);
		const registry = path.join(fixture, "collections.json");
		const root = path.join(fixture, "library", "docs");
		const alias = path.join(fixture, "alias");
		await writeText(path.join(root, "guide.md"), "# Saved guide\n");
		await symlink(root, alias);
		await addDocsCollection(registry, "library", root);

		await expect(addDocsCollection(registry, "alias", alias)).rejects.toMatchObject({
			name: "RuntimeError",
			exitCode: 1,
		});
		expect(await listDocsCollections(registry)).toEqual([
			{ name: "library", path: root },
		]);
	});
});
