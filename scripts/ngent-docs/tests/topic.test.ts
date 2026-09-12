import { mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { assert, expect, test } from "vitest";

import { resolveDocsSelectorRoute } from "../src/runtime/browse-route.ts";
import { withTempDir, writeText } from "./helpers/fs.ts";

async function withTopicProject(
	run: (fixture: {
		currentDir: string;
		registryPath: string;
		localTopic: string;
		globalTopic: string;
	}) => Promise<void>,
): Promise<void> {
	await withTempDir("docs-topic-", async tempDir => {
		const root = await realpath(tempDir);
		const currentDir = path.join(root, "project");
		const registryPath = path.join(root, "collections.json");
		const globalDocs = path.join(root, "library", "docs");
		const localTopic = path.join(currentDir, "docs", "topics", "platform");
		const globalTopic = path.join(globalDocs, "topics", "platform");
		// Bound repository discovery and registry reads to this fixture.
		await mkdir(path.join(currentDir, ".git"), { recursive: true });
		await mkdir(localTopic, { recursive: true });
		await mkdir(globalDocs, { recursive: true });
		await writeText(registryPath, JSON.stringify([{ name: "library", path: globalDocs }]));
		await run({ currentDir, registryPath, localTopic, globalTopic });
	});
}

test("A topic preserves local and global contributions at the same nested path", async () => {
	await withTopicProject(async ({ currentDir, registryPath, localTopic, globalTopic }) => {
		const localFile = path.join(localTopic, "docs", "guides", "setup.md");
		const globalFile = path.join(globalTopic, "docs", "guides", "setup.md");
		await writeText(path.join(localTopic, ".docs.md"), "# Platform\n\nLocal guidance.\n");
		await writeText(path.join(globalTopic, ".docs.md"), "# Platform\n\nGlobal guidance.\n");
		await writeText(localFile, "---\nsummary: Local setup.\n---\n");
		await writeText(globalFile, "---\nsummary: Global setup.\n---\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "root",
			selector: "platform",
		});

		assert(route.kind === "topic", "Expected a topic route");
		expect(route.topic.contributions).toHaveLength(2);
		expect(route.topic.contributions.find(item => item.absolutePath === localTopic)).toMatchObject({
			guideBody: "Local guidance.",
			sectionEntries: [{
				key: "docs",
				children: [{
					key: "docs/guides",
					markdownEntries: [{ absolutePath: localFile, summary: "Local setup." }],
				}],
			}],
		});
		expect(route.topic.contributions.find(item => item.absolutePath === globalTopic)).toMatchObject(
			{
				guideBody: "Global guidance.",
				sectionEntries: [{
					key: "docs",
					children: [{
						key: "docs/guides",
						markdownEntries: [{ absolutePath: globalFile, summary: "Global setup." }],
					}],
				}],
			},
		);
	});
});

test("A topic uses nested matches only in roots without an exact match", async () => {
	await withTopicProject(async ({ currentDir, registryPath, localTopic, globalTopic }) => {
		const nestedGlobal = path.join(globalTopic, "..", "agents", "platform");
		await writeText(path.join(localTopic, "local.md"), "# Local\n");
		await writeText(path.join(localTopic, "..", "agents", "platform", "shadow.md"), "# Shadow\n");
		await writeText(path.join(nestedGlobal, "global.md"), "# Global\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "root",
			selector: "platform",
		});

		assert(route.kind === "topic", "Expected a topic route");
		expect(route.topic.contributions.map(contribution => contribution.absolutePath).sort())
			.toEqual([nestedGlobal, localTopic].sort());
	});
});

test("A skill excludes its own documents but preserves ancestor and sibling documents", async () => {
	await withTopicProject(async ({ currentDir, registryPath, localTopic }) => {
		const section = path.join(localTopic, "tools");
		const skillFile = path.join(section, "review", "SKILL.md");
		const usageFile = path.join(section, "usage.md");
		const siblingFile = path.join(section, "guides", "setup.md");
		await writeText(path.join(section, ".docs.md"), "# Tools\n");
		await writeText(usageFile, "# Usage\n");
		await writeText(siblingFile, "# Setup\n");
		await writeText(skillFile, "---\nname: review-app\n---\n");
		await writeText(path.join(section, "review", "notes.md"), "# Skill notes\n");
		await writeText(path.join(section, "review", "references", "detail.md"), "# Detail\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "root",
			selector: "platform",
		});

		expect(route).toMatchObject({
			kind: "topic",
			topic: {
				contributions: [{
					sectionEntries: [{
						key: "tools",
						markdownEntries: [{ absolutePath: usageFile }],
						skills: [],
						children: expect.arrayContaining([
							expect.objectContaining({
								key: "tools/guides",
								markdownEntries: [expect.objectContaining({ absolutePath: siblingFile })],
							}),
							expect.objectContaining({
								key: "tools/review",
								markdownEntries: [],
								children: [],
								skills: [expect.objectContaining({ absolutePath: skillFile, name: "review-app" })],
							}),
						]),
					}],
				}],
			},
		});
	});
});

test("A skill uses the nearest guide hint for its directory instead of its name", async () => {
	await withTopicProject(async ({ currentDir, registryPath, localTopic }) => {
		await writeText(path.join(localTopic, ".docs.md"),
			"---\nhints:\n  - tools/review: General review.\n---\n");
		await writeText(path.join(localTopic, "tools", ".docs.md"),
			"---\nhints:\n  - review: Local review.\n  - display-name: Wrong directory.\n---\n");
		await writeText(path.join(localTopic, "tools", "review", "SKILL.md"),
			"---\nname: display-name\n---\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "root",
			selector: "platform",
		});

		expect(route).toMatchObject({
			kind: "topic",
			topic: {
				contributions: [{
					sectionEntries: [{
						children: [{ skills: [{ name: "display-name", hint: "Local review." }] }],
					}],
				}],
			},
		});
	});
});

test.each([
	{
		scenario: "A skill title takes priority over its name",
		content: "---\ntitle: Review Guide\nname: review-name\n---\n",
		title: "Review Guide",
	},
	{
		scenario: "A skill without a title uses its name",
		content: "---\nname: review-name\n---\n",
		title: "review-name",
	},
	{
		scenario: "A skill without metadata uses its directory name",
		content: "Review the application.\n",
		title: "review",
	},
])("$scenario", async ({ content, title }) => {
	await withTopicProject(async ({ currentDir, registryPath, localTopic }) => {
		await writeText(path.join(localTopic, "review", "SKILL.md"), content);

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "root",
			selector: "platform",
		});

		expect(route).toMatchObject({
			kind: "topic",
			topic: { contributions: [{ sectionEntries: [{ skills: [{ title }] }] }] },
		});
	});
});

test("A skill lists only linked references to visible local files", async () => {
	await withTopicProject(async ({ currentDir, registryPath, localTopic }) => {
		const skillDir = path.join(localTopic, "review");
		await writeText(path.join(skillDir, "references", "guide.md"), "# Guide\n");
		await writeText(path.join(skillDir, "references", "unlinked.md"), "# Unlinked\n");
		await writeText(path.join(skillDir, ".hidden.md"), "# Hidden\n");
		await writeText(path.join(skillDir, "SKILL.md"), [
			"[Guide](references/guide.md#setup)",
			"[Again](references/guide.md)",
			"[Missing](missing.md)",
			"[Directory](references)",
			"[Hidden](.hidden.md)",
			"[Remote](https://example.invalid/guide.md)",
		].join("\n"));

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "root",
			selector: "platform",
		});

		expect(route).toMatchObject({
			kind: "topic",
			topic: {
				contributions: [{
					sectionEntries: [{ skills: [{ referencePaths: ["references/guide.md"] }] }],
				}],
			},
		});
	});
});

test.each([
	{ scenario: "An explicit topic file selector opens the document", selector: "platform/guide.md" },
	{ scenario: "An implicit topic file selector opens the document", selector: "platform/guide" },
])("$scenario", async ({ selector }) => {
	await withTopicProject(async ({ currentDir, registryPath, localTopic }) => {
		const file = path.join(localTopic, "guide.md");
		await writeText(file, "---\ntitle: Setup Guide\n---\n# Setup\n\nPrepare the application.\n");
		await writeText(path.join(localTopic, "other.md"), "# Other\n");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "root",
			selector,
		});

		expect(route).toMatchObject({
			kind: "docs",
			view: {
				kind: "file",
				doc: { absolutePath: file, title: "Setup Guide", body: "Prepare the application." },
			},
		});
	});
});
