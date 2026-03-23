import { realpath } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

import { runDocsCli } from "./helpers/cli.ts";
import {
	compactListEntries,
	globalDocsPath,
	hasHeading,
	nonEmptySectionLines,
	normalizedPathForOutput,
	seedSkillBackedSection,
	TEST_TOPIC_NAME,
	TEST_TOPIC_SHORT,
	TEST_TOPIC_SUMMARY,
	TEST_TOPIC_TITLE,
	topicDocsPath,
	topicDocsPathForOutput,
	withDocsCliWorkspace,
	writeText,
} from "./helpers/docs-cli-fixture.ts";

function expectTopicIndex(stdout: string): void {
	expect(stdout).toContain("Usage: docs topic [topic] [section]");
	expect(stdout).toContain("qmd");
	expect(stdout).toContain("local search docs");
	expect(stdout).toContain(TEST_TOPIC_NAME);
	expect(stdout).toContain(TEST_TOPIC_SHORT);
	expect(stdout).toMatch(
		/ops\s+Ops Notes\s+This summary is intentionally longer than sixty-four characte\.\.\./,
	);
}

function expectSkillPathLine(
	stdout: string,
	normalizedRepoDir: string,
	...segments: string[]
): void {
	expect(nonEmptySectionLines(stdout, "Skills", 2)).toContain(
		`Path: ${normalizedPathForOutput(topicDocsPath(normalizedRepoDir, ...segments, "SKILL.md"))}`,
	);
}

test("docs topic shows the merged topic index", async () => {
	await withDocsCliWorkspace("docs-topic-index-", async ({ repoDir, env }) => {
		const result = await runDocsCli(["topic"], { cwd: repoDir, env });
		expect(result.exitCode).toBe(0);
		expectTopicIndex(result.stdout);
	});
});

test("docs topic merges local and global topic contributions", async () => {
	await withDocsCliWorkspace("docs-topic-merged-", async ({ repoDir, homeDir, env }) => {
		const result = await runDocsCli(["topic", "qmd"], { cwd: repoDir, env });
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("# Topic: QMD");
		expect(result.stdout).toContain(topicDocsPath(repoDir, "..", "qmd"));
		expect(result.stdout).toContain(globalDocsPath(homeDir, "topics", "qmd"));
		expect(result.stdout).toContain("Use the local QMD docs for repo-specific workflows.");
		expect(result.stdout).toContain("Search docs quickly from anywhere.");
	});
});

test("docs topic renders docs and skills in the topic overview", async () => {
	await withDocsCliWorkspace("docs-topic-dynamic-skills-", async ({ repoDir, env }) => {
		await seedSkillBackedSection(repoDir);
		const normalizedRepoDir = await realpath(repoDir);
		const result = await runDocsCli(["topic", TEST_TOPIC_NAME], { cwd: repoDir, env });
		expect(result.exitCode).toBe(0);
		expect(hasHeading(result.stdout, 1, `Topic: ${TEST_TOPIC_TITLE}`)).toBe(true);
		expect(result.stdout).toContain(topicDocsPathForOutput(normalizedRepoDir));
		expect(nonEmptySectionLines(result.stdout, "Docs", 2)).toContain(
			topicDocsPathForOutput(normalizedRepoDir, "SOSUMI.md"),
		);
		expectSkillPathLine(result.stdout, normalizedRepoDir, "hig-doctor", "skills",
			"hig-components-content");
		expectSkillPathLine(result.stdout, normalizedRepoDir, "ios-debugger-agent");
		expectSkillPathLine(result.stdout, normalizedRepoDir, "swiftui-pro");
	});
});

test("docs topic overview renders skill hints from ancestor guides with deeper overrides", async () => {
	await withDocsCliWorkspace(
		"docs-topic-skill-hints-",
		async ({ repoDir, env, normalizedRepoDir }) => {
			await seedSkillBackedSection(repoDir);

			await writeText(
				topicDocsPath(repoDir, ".docs.md"),
				[
					"---",
					`title: ${TEST_TOPIC_TITLE}`,
					`short: ${TEST_TOPIC_SHORT}`,
					`summary: ${TEST_TOPIC_SUMMARY}`,
					"hints:",
					"  - ios-debugger-agent: Build and debug on a booted simulator.",
					"  - hig-doctor/skills/hig-components-content: General HIG content guidance.",
					"  - malformed-entry-without-colon",
					"  - swiftui-pro:",
					"---",
					"",
					`Use \`docs topic ${TEST_TOPIC_NAME} <section>\` to focus one section.`,
					"",
				].join("\n"),
			);
			await writeText(
				topicDocsPath(repoDir, "hig-doctor", "skills", ".docs.md"),
				[
					"---",
					"title: HIG Skills",
					"hints:",
					"  - hig-components-content: Section override for HIG content guidance.",
					"---",
					"",
					"# HIG Skills",
					"",
				].join("\n"),
			);

			const result = await runDocsCli(["topic", TEST_TOPIC_NAME], { cwd: repoDir, env });

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain(
				"$hig-components-content - Section override for HIG content guidance.",
			);
			expect(result.stdout).toContain(
				[
					`### ios-debugger-agent`,
					`Path: ${topicDocsPath(normalizedRepoDir, "ios-debugger-agent", "SKILL.md")}`,
					"",
					"$ios-debugger-agent - Build and debug on a booted simulator.",
				].join("\n"),
			);
			expect(result.stdout).toContain(
				[
					`### swiftui-pro`,
					`Path: ${topicDocsPath(normalizedRepoDir, "swiftui-pro", "SKILL.md")}`,
					"",
					"$swiftui-pro",
				].join("\n"),
			);
		},
		{
			seedGlobalDocsIndex: false,
			seedGlobalDocsHome: false,
		},
	);
});

test("docs topic overview resolves hints by skill path instead of skill name", async () => {
	await withDocsCliWorkspace(
		"docs-topic-skill-hints-path-",
		async ({ repoDir, env }) => {
			await writeText(
				topicDocsPath(repoDir, ".docs.md"),
				[
					"---",
					`title: ${TEST_TOPIC_TITLE}`,
					"hints:",
					"  - renamed-skill: Hint matched by skill directory path.",
					"---",
					"",
				].join("\n"),
			);
			await writeText(
				topicDocsPath(repoDir, "renamed-skill", "SKILL.md"),
				[
					"---",
					"name: display-name-from-frontmatter",
					"description: Uses a different display name.",
					"---",
					"",
					"# Renamed Skill",
					"",
				].join("\n"),
			);

			const result = await runDocsCli(["topic", TEST_TOPIC_NAME], { cwd: repoDir, env });

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain(
				"$display-name-from-frontmatter - Hint matched by skill directory path.",
			);
		},
		{ seedGlobalDocsHome: false, seedGlobalDocsIndex: false },
	);
});

test("docs topic overview renders multi-skill sections with a path template", async () => {
	await withDocsCliWorkspace(
		"docs-topic-skill-path-template-",
		async ({ repoDir, env, normalizedRepoDir }) => {
			await writeText(
				topicDocsPath(repoDir, "skills", "alpha-skill", "SKILL.md"),
				[
					"---",
					"name: alpha-skill",
					"description: Alpha skill.",
					"---",
					"",
					"# Alpha Skill",
					"",
				].join("\n"),
			);
			await writeText(
				topicDocsPath(repoDir, "skills", "beta-skill", "SKILL.md"),
				[
					"---",
					"name: beta-skill",
					"description: Beta skill.",
					"---",
					"",
					"# Beta Skill",
					"",
				].join("\n"),
			);

			const result = await runDocsCli(["topic", TEST_TOPIC_NAME], { cwd: repoDir, env });

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain(
				[
					"### skills",
					`Path: ${topicDocsPath(normalizedRepoDir, "skills", "{$name}", "SKILL.md")}`,
					"",
					"$alpha-skill",
					"$beta-skill",
				].join("\n"),
			);
		},
		{ seedGlobalDocsHome: false, seedGlobalDocsIndex: false },
	);
});

test("docs topic overview renders docs sections as compact doc lists", async () => {
	await withDocsCliWorkspace(
		"docs-topic-doc-section-overview-",
		async ({ repoDir, env, normalizedRepoDir }) => {
			await writeText(
				topicDocsPath(repoDir, "docs", "ng-hig-doctor.md"),
				[
					"---",
					"title: ng hig-doctor",
					"summary: Local CLI wrapper for HIG Doctor.",
					"---",
					"",
					"# ng hig-doctor",
					"",
				].join("\n"),
			);
			await writeText(
				topicDocsPath(repoDir, "docs", "SOSUMI.md"),
				[
					"---",
					"title: Sosumi CLI",
					"summary: Sosumi CLI docs.",
					"---",
					"",
					"# Sosumi CLI",
					"",
				].join("\n"),
			);

			const result = await runDocsCli(["topic", TEST_TOPIC_NAME], { cwd: repoDir, env });

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain(
				[
					"### docs",
					`Path: ${topicDocsPath(normalizedRepoDir, "docs")}/`,
					"",
					"- ng-hig-doctor.md: ng hig-doctor",
					"- SOSUMI.md: Sosumi CLI",
				].join("\n"),
			);
			expect(result.stdout).not.toContain("contains:");
		},
		{ seedGlobalDocsHome: false, seedGlobalDocsIndex: false },
	);
});

test("docs topic section focuses a merged section view", async () => {
	await withDocsCliWorkspace("docs-topic-section-", async ({ repoDir, homeDir, env }) => {
		const result = await runDocsCli(["topic", "qmd", "references"], { cwd: repoDir, env });

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("## References");
		expect(result.stdout).toContain(path.join(repoDir, "docs", "topics", "qmd", "references"));
		expect(result.stdout).toContain(globalDocsPath(homeDir, "topics", "qmd", "references"));
		expect(result.stdout).toContain("Local Indexing");
		expect(result.stdout).toContain("Global Indexing");
	});
});

test("docs topic section renders a single root skill directly", async () => {
	await withDocsCliWorkspace(
		"docs-topic-skill-section-",
		async ({ repoDir, env, normalizedRepoDir }) => {
			const result = await runDocsCli(["topic", TEST_TOPIC_NAME, "ios-debugger-agent"], {
				cwd: repoDir,
				env,
			});
			const referencesDir = topicDocsPath(normalizedRepoDir, "ios-debugger-agent", "references");
			expect(result.exitCode).toBe(0);
			expect(hasHeading(result.stdout, 2, "iOS Debugger Agent")).toBe(true);
			expect(result.stdout).toContain(
				topicDocsPathForOutput(normalizedRepoDir, "ios-debugger-agent", "SKILL.md"),
			);
			expect(result.stdout).toContain(
				"Use XcodeBuildMCP to build, run, and debug the current iOS project on a booted simulator.",
			);
			expect(compactListEntries(result.stdout, `${normalizedPathForOutput(referencesDir)}/:`, 3))
				.toContain("- quickstart.md");
		},
	);
});

test("docs topic section resolves single-skill titles as title then name then basename", async () => {
	await withDocsCliWorkspace(
		"docs-topic-skill-title-fallback-",
		async ({ repoDir, env }) => {
			await writeText(
				topicDocsPath(repoDir, "title-skill", "SKILL.md"),
				[
					"---",
					"title: Explicit Skill Title",
					"name: name-fallback-should-not-win",
					"description: Title frontmatter should win.",
					"---",
					"",
					"Skill body.",
					"",
				].join("\n"),
			);
			await writeText(
				topicDocsPath(repoDir, "name-skill", "SKILL.md"),
				[
					"---",
					"name: Name Frontmatter Title",
					"description: Name frontmatter should win when title is absent.",
					"---",
					"",
					"Skill body.",
					"",
				].join("\n"),
			);
			await writeText(
				topicDocsPath(repoDir, "basename-skill", "SKILL.md"),
				["Skill body without frontmatter.", ""].join("\n"),
			);

			const titleResult = await runDocsCli(["topic", TEST_TOPIC_NAME, "title-skill"], {
				cwd: repoDir,
				env,
			});
			const nameResult = await runDocsCli(["topic", TEST_TOPIC_NAME, "name-skill"], {
				cwd: repoDir,
				env,
			});
			const basenameResult = await runDocsCli(["topic", TEST_TOPIC_NAME, "basename-skill"], {
				cwd: repoDir,
				env,
			});

			expect(titleResult.exitCode).toBe(0);
			expect(titleResult.stdout).toContain("## Explicit Skill Title");
			expect(nameResult.exitCode).toBe(0);
			expect(nameResult.stdout).toContain("## Name Frontmatter Title");
			expect(basenameResult.exitCode).toBe(0);
			expect(basenameResult.stdout).toContain("## basename-skill");
		},
		{ seedGlobalDocsHome: false, seedGlobalDocsIndex: false },
	);
});

test("docs bare topic selectors match docs topic when no registered docs overlap", async () => {
	await withDocsCliWorkspace(
		"docs-topic-root-same-output-",
		async ({ repoDir, env }) => {
			await seedSkillBackedSection(repoDir);

			const bareResult = await runDocsCli([TEST_TOPIC_NAME], { cwd: repoDir, env });
			const topicResult = await runDocsCli(["topic", TEST_TOPIC_NAME], { cwd: repoDir, env });

			expect(bareResult.exitCode).toBe(0);
			expect(topicResult.exitCode).toBe(0);
			expect(bareResult.stdout.trim()).toBe(topicResult.stdout.trim());
		},
		{ seedGlobalDocsHome: false, seedGlobalDocsIndex: false },
	);
});

test("docs topic skill-backed sections show only skills and grouped references", async () => {
	await withDocsCliWorkspace(
		"docs-topic-skills-",
		async ({ repoDir, env, normalizedRepoDir }) => {
			await seedSkillBackedSection(repoDir);
			const result = await runDocsCli(["topic", TEST_TOPIC_NAME, "hig-doctor"], {
				cwd: repoDir,
				env,
			});
			const referencesDir = topicDocsPath(
				normalizedRepoDir,
				"hig-doctor",
				"skills",
				"hig-components-content",
				"references",
			);
			expect(result.exitCode).toBe(0);
			expect(hasHeading(result.stdout, 2, "hig-doctor")).toBe(true);
			expect(normalizedPathForOutput(result.stdout)).toContain(
				`source: ${topicDocsPathForOutput(normalizedRepoDir, "hig-doctor")}`,
			);
			expect(hasHeading(result.stdout, 3, "Skills")).toBe(true);
			expect(hasHeading(result.stdout, 4, "Apple HIG: Content Components")).toBe(true);
			expect(normalizedPathForOutput(result.stdout)).toContain(
				`path: ${
					topicDocsPathForOutput(
						normalizedRepoDir,
						"hig-doctor",
						"skills",
						"hig-components-content",
						"SKILL.md",
					)
				}`,
			);
			expect(compactListEntries(result.stdout, `${normalizedPathForOutput(referencesDir)}/:`, 5))
				.toEqual([
					"- alpha.md",
					"- beta.md",
				]);
		},
		{ seedGlobalDocsHome: false, seedGlobalDocsIndex: false },
	);
});
