import { mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { assert, expect, test } from "vitest";

import { resolveDocsSelectorRoute } from "../src/runtime/browse-route.ts";
import { withTempDir, writeText } from "./helpers/fs.ts";

async function withBrowseProject(
	run: (fixture: {
		currentDir: string;
		registryPath: string;
		localDocs: string;
		globalDocs: string;
	}) => Promise<void>,
): Promise<void> {
	await withTempDir("docs-browse-", async tempDir => {
		const fixture = await realpath(tempDir);
		const currentDir = path.join(fixture, "project");
		const registryPath = path.join(fixture, "collections.json");
		const localDocs = path.join(currentDir, "docs");
		const globalDocs = path.join(fixture, "library", "docs");
		// Stop repository discovery before it can read outside the fixture.
		await mkdir(path.join(currentDir, ".git"), { recursive: true });
		await mkdir(localDocs, { recursive: true });
		await mkdir(globalDocs, { recursive: true });
		await writeText(registryPath, JSON.stringify([{ name: "library", path: globalDocs }]));
		await run({ currentDir, registryPath, localDocs, globalDocs });
	});
}

test.each([
	{
		scenario: "No selector returns local and global docs",
		selector: null,
		files: ["global.md", "local.md"],
	},
	{ scenario: "The dot selector returns only local docs", selector: ".", files: ["local.md"] },
	{
		scenario: "The global selector returns only global docs",
		selector: "global",
		files: ["global.md"],
	},
])("$scenario", async ({ selector, files }) => {
	await withBrowseProject(async ({ currentDir, registryPath, localDocs, globalDocs }) => {
		await writeText(path.join(localDocs, "local.md"), "# Local\n");
		await writeText(path.join(globalDocs, "global.md"), "# Global\n");
		const nestedDir = path.join(currentDir, "src");
		await mkdir(nestedDir);

		const route = await resolveDocsSelectorRoute({
			currentDir: nestedDir,
			registryPath,
			mode: "docs",
			selector,
		});

		assert(route.kind === "docs" && route.view.kind === "browse", "Expected a docs browse route");
		expect(route.view.docs.map(doc => path.basename(doc.absolutePath)).sort()).toEqual(files);
	});
});

test.each([
	{
		scenario: "A relative subtree returns only local docs",
		selector: "./docs/setup",
		mode: "docs" as const,
		files: ["local.md"],
	},
	{
		scenario: "A docs subtree returns matching local and global docs",
		selector: "docs/setup",
		mode: "docs" as const,
		files: ["global.md", "local.md"],
	},
	{
		scenario: "A bare subtree returns matching local and global docs",
		selector: "setup",
		mode: "root" as const,
		files: ["global.md", "local.md"],
	},
])("$scenario", async ({ selector, mode, files }) => {
	await withBrowseProject(async ({ currentDir, registryPath, localDocs, globalDocs }) => {
		await writeText(path.join(localDocs, "setup", "local.md"), "# Local\n");
		await writeText(path.join(globalDocs, "setup", "global.md"), "# Global\n");
		await writeText(path.join(localDocs, "other.md"), "# Other\n");
		await writeText(path.join(globalDocs, "other.md"), "# Other\n");

		const route = await resolveDocsSelectorRoute({ currentDir, registryPath, mode, selector });

		assert(route.kind === "docs" && route.view.kind === "browse", "Expected a docs browse route");
		expect(route.view.docs.map(doc => path.basename(doc.absolutePath)).sort()).toEqual(files);
	});
});

test("A nested selector returns matching local and global subtrees", async () => {
	await withBrowseProject(async ({ currentDir, registryPath, localDocs, globalDocs }) => {
		const localFile = path.join(localDocs, "setup", "secrets", "local.md");
		const globalFile = path.join(globalDocs, "setup", "secrets", "global.md");
		await writeText(localFile, "# Local\n");
		await writeText(globalFile, "# Global\n");
		await writeText(path.join(localDocs, "setup", "other.md"), "# Other\n");
		await writeText(path.join(globalDocs, "setup", "other.md"), "# Other\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "docs",
			selector: "setup/secrets",
		});

		assert(route.kind === "docs" && route.view.kind === "browse", "Expected a docs browse route");
		expect(route.view.docs.map(doc => doc.absolutePath).sort()).toEqual(
			[globalFile, localFile].sort(),
		);
	});
});

test.each([
	{
		scenario: "An explicit file selector prefers the local file",
		selector: "setup/guide.md",
		mode: "root" as const,
	},
	{
		scenario: "An implicit file selector prefers the local file",
		selector: "setup/guide",
		mode: "docs" as const,
	},
])("$scenario", async ({ selector, mode }) => {
	await withBrowseProject(async ({ currentDir, registryPath, localDocs, globalDocs }) => {
		const localFile = path.join(localDocs, "setup", "guide.md");
		await writeText(localFile, "---\ntitle: Local guide\n---\n# Guide\n\nLocal instructions.\n");
		await writeText(path.join(globalDocs, "setup", "guide.md"),
			"# Guide\n\nGlobal instructions.\n");

		const route = await resolveDocsSelectorRoute({ currentDir, registryPath, mode, selector });

		expect(route).toMatchObject({
			kind: "docs",
			view: {
				kind: "file",
				doc: { absolutePath: localFile, title: "Local guide", body: "Local instructions." },
			},
		});
	});
});

test("An implicit docs file selector opens a global file when no local file exists", async () => {
	await withBrowseProject(async ({ currentDir, registryPath, localDocs, globalDocs }) => {
		await writeText(path.join(localDocs, "other.md"), "# Other\n");
		const globalFile = path.join(globalDocs, "guide.md");
		await writeText(globalFile, "# Guide\n\nGlobal instructions.\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "root",
			selector: "docs/guide",
		});

		expect(route).toMatchObject({
			kind: "docs",
			view: { kind: "file", doc: { absolutePath: globalFile, body: "Global instructions." } },
		});
	});
});

test("A skill-only directory opens its skill file", async () => {
	await withBrowseProject(async ({ currentDir, registryPath }) => {
		const skillFile = path.join(currentDir, "skills", "docs", "SKILL.md");
		await writeText(skillFile, "# Docs skill\n\nRead the project docs.\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "root",
			selector: "skills/docs",
		});

		expect(route).toMatchObject({
			kind: "docs",
			view: { kind: "file", doc: { absolutePath: skillFile, body: "Read the project docs." } },
		});
	});
});

test("An absolute workspace selector returns that workspace's docs", async () => {
	await withBrowseProject(async ({ currentDir, registryPath, localDocs, globalDocs }) => {
		const selectedFile = path.join(localDocs, "guide.md");
		await writeText(selectedFile, "# Guide\n");
		await writeText(path.join(globalDocs, "other.md"), "# Other\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "docs",
			selector: currentDir,
		});

		expect(route).toMatchObject({
			kind: "docs",
			view: { kind: "browse", docs: [{ absolutePath: selectedFile }] },
		});
	});
});

test("An overlapping root selector returns the topic and matching docs", async () => {
	await withBrowseProject(async ({ currentDir, registryPath, localDocs, globalDocs }) => {
		const topicDir = path.join(localDocs, "topics", "browser");
		const localFile = path.join(localDocs, "browser", "local.md");
		const globalFile = path.join(globalDocs, "browser", "global.md");
		await writeText(path.join(topicDir, "topic.md"), "# Topic\n");
		await writeText(localFile, "# Local\n");
		await writeText(globalFile, "# Global\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "root",
			selector: "browser",
		});

		expect(route).toMatchObject({
			kind: "combined",
			topic: { name: "browser", contributions: [{ absolutePath: topicDir }] },
		});
		assert(route.kind === "combined", "Expected a combined route");
		expect(route.docs.map(doc => doc.absolutePath).sort()).toEqual([globalFile, localFile].sort());
	});
});

test("An overlapping docs selector returns only docs with a topic hint", async () => {
	await withBrowseProject(async ({ currentDir, registryPath, localDocs }) => {
		const docFile = path.join(localDocs, "browser", "guide.md");
		await writeText(path.join(localDocs, "topics", "browser", "topic.md"), "# Topic\n");
		await writeText(docFile, "# Guide\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "docs",
			selector: "browser",
		});

		expect(route).toMatchObject({
			kind: "docs",
			view: { kind: "browse", topicHint: "browser", docs: [{ absolutePath: docFile }] },
		});
	});
});

test("An exact topic selector returns its topic", async () => {
	await withBrowseProject(async ({ currentDir, registryPath, localDocs }) => {
		const topicFile = path.join(localDocs, "topics", "browser", "guide.md");
		await writeText(topicFile, "# Topic guide\n");
		await writeText(path.join(localDocs, "other.md"), "# Other\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "root",
			selector: "browser",
		});

		expect(route).toMatchObject({
			kind: "topic",
			topic: {
				name: "browser",
				contributions: [{ markdownEntries: [{ absolutePath: topicFile }] }],
			},
		});
	});
});

test("A missing subtree returns a selector-not-found error", async () => {
	await withBrowseProject(async ({ currentDir, registryPath, localDocs, globalDocs }) => {
		await writeText(path.join(localDocs, "setup", "local.md"), "# Local\n");
		await writeText(path.join(globalDocs, "setup", "global.md"), "# Global\n");

		await expect(resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "docs",
			selector: "docs/missing",
		})).rejects.toMatchObject({ name: "BrowseSelectorNotFoundError", selector: "docs/missing" });
	});
});

test("A file outside docs roots returns a runtime error", async () => {
	await withBrowseProject(async ({ currentDir, registryPath }) => {
		const outsideFile = path.join(currentDir, "private.md");
		await writeText(outsideFile, "# Private\n");

		await expect(resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "docs",
			selector: outsideFile,
		})).rejects.toMatchObject({ name: "RuntimeError", exitCode: 1 });
	});
});
