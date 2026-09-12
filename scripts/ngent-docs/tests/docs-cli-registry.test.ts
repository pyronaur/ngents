import { mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

import { resolveDocsSelectorRoute } from "../src/runtime/browse-route.ts";
import { withTempDir, writeText } from "./helpers/fs.ts";

async function withParkedProject(
	run: (fixture: { currentDir: string; registryPath: string; root: string }) => Promise<void>,
): Promise<void> {
	await withTempDir("docs-parked-browse-", async tempDir => {
		const fixture = await realpath(tempDir);
		const currentDir = path.join(fixture, "project");
		const registryPath = path.join(fixture, "collections.json");
		const root = path.join(fixture, "library", "docs");
		await mkdir(path.join(currentDir, ".git"), { recursive: true });
		await mkdir(root, { recursive: true });
		await writeText(registryPath, JSON.stringify([{ name: "Browser", path: root }]));
		await run({ currentDir, registryPath, root });
	});
}

test("A parked collection takes priority over a topic and docs with the same name", async () => {
	await withParkedProject(async ({ currentDir, registryPath, root }) => {
		await writeText(path.join(currentDir, "docs", "topics", "browser", "topic.md"),
			"# Local topic\n");
		await writeText(path.join(currentDir, "docs", "browser", "local.md"), "# Local doc\n");
		const parkedFile = path.join(root, "guide.md");
		await writeText(parkedFile, "# Parked doc\n");
		await writeText(path.join(root, "topics", "tools", "tool.md"), "# Tool\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "root",
			selector: "browser",
		});

		expect(route).toMatchObject({
			kind: "collection",
			collection: {
				docsRoot: root,
				docs: [{ absolutePath: parkedFile }],
				topics: [{ name: "tools" }],
			},
		});
	});
});

test("A parked docs selector ignores case and returns only that collection's docs", async () => {
	await withParkedProject(async ({ currentDir, registryPath, root }) => {
		await writeText(path.join(currentDir, "docs", "browser", "local.md"), "# Local\n");
		await writeText(path.join(root, "topics", "tools", "tool.md"), "# Tool\n");
		const parkedFile = path.join(root, "guide.md");
		await writeText(parkedFile, "# Parked\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "docs",
			selector: "BROWSER",
		});

		expect(route).toMatchObject({
			kind: "docs",
			view: { kind: "browse", docs: [{ absolutePath: parkedFile }] },
		});
	});
});

test("A qualified selector returns only the selected collection subtree", async () => {
	await withParkedProject(async ({ currentDir, registryPath, root }) => {
		await writeText(path.join(currentDir, "docs", "setup", "secrets", "local.md"), "# Local\n");
		await writeText(path.join(root, "setup", "other.md"), "# Other\n");
		const selectedFile = path.join(root, "setup", "secrets", "guide.md");
		await writeText(selectedFile, "# Guide\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "root",
			selector: "browser/setup/secrets",
		});

		expect(route).toMatchObject({
			kind: "docs",
			view: { kind: "browse", docs: [{ absolutePath: selectedFile }] },
		});
	});
});

test("A collection name prefix returns a selector-not-found error", async () => {
	await withParkedProject(async ({ currentDir, registryPath, root }) => {
		await writeText(path.join(root, "guide.md"), "# Guide\n");

		await expect(resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "root",
			selector: "brow",
		})).rejects.toMatchObject({ name: "BrowseSelectorNotFoundError", selector: "brow" });
	});
});
