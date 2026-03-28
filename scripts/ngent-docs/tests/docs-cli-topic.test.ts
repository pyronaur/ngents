import path from "node:path";
import { expect, test } from "vitest";

import { runDocsCli } from "./helpers/cli.ts";
import {
	compactListEntries,
	globalDocsPath,
	hasHeading,
	normalizedPathForOutput,
	seedSkillBackedSection,
	TEST_TOPIC_NAME,
	TEST_TOPIC_SHORT,
	TEST_TOPIC_TITLE,
	topicDocsPath,
	topicDocsPathForOutput,
	withDocsCliWorkspace,
	writeText,
} from "./helpers/docs-cli-fixture.ts";

function countMatches(text: string, pattern: RegExp): number {
	return Array.from(text.matchAll(pattern)).length;
}

function expectTopicIndex(stdout: string): void {
	expect(stdout).toContain("Usage: docs topic [topic] [path]");
	expect(stdout).toContain("qmd");
	expect(stdout).toContain("local search docs");
	expect(stdout).toContain(TEST_TOPIC_NAME);
	expect(stdout).toContain(TEST_TOPIC_SHORT);
	expect(stdout).toMatch(
		/ops\s+Ops Notes\s+This summary is intentionally longer than sixty-four characte\.\.\./,
	);
}

function expectHigComponentsSkill(
	stdout: string,
	options: {
		description?: boolean;
		nameLine?: boolean;
		references?: boolean;
	},
): void {
	if (options.nameLine ?? true) {
		expect(stdout).toContain("$hig-components-content");
	}
	if (options.description ?? true) {
		expect(stdout).toContain("Apple Human Interface Guidelines for content display components.");
	}
	if (options.references ?? false) {
		expect(compactListEntries(stdout, "References", 3)).toEqual([
			"- alpha.md",
			"- beta.md",
		]);
	}
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
		const normalizedStdout = normalizedPathForOutput(result.stdout);
		expect(result.exitCode).toBe(0);
		const topicHeadingIndex = result.stdout.indexOf("# Topic: QMD");
		const localGuideIndex = result.stdout.indexOf(
			"Use the local QMD docs for repo-specific workflows.",
		);
		const globalGuideIndex = result.stdout.indexOf("Search docs quickly from anywhere.");
		expect(topicHeadingIndex).toBeGreaterThan(0);
		expect(localGuideIndex).toBeGreaterThanOrEqual(0);
		expect(globalGuideIndex).toBeGreaterThanOrEqual(0);
		expect(localGuideIndex).toBeLessThan(topicHeadingIndex);
		expect(globalGuideIndex).toBeLessThan(topicHeadingIndex);
		expect(countMatches(result.stdout, /^## Docs$/gm)).toBe(1);
		expect(normalizedStdout).toContain(
			`### ${topicDocsPathForOutput(repoDir, "..", "qmd", "references")}/`,
		);
		expect(normalizedStdout).toContain(
			`### ${normalizedPathForOutput(globalDocsPath(homeDir, "topics", "qmd", "references"))}/`,
		);
	});
});

test("docs topic overview renders grouped docs and skills without a Subtrees block", async () => {
	await withDocsCliWorkspace(
		"docs-topic-recursive-overview-",
		async ({ repoDir, env, normalizedRepoDir }) => {
			await seedSkillBackedSection(repoDir);
			await writeText(
				topicDocsPath(repoDir, "docs", "guides", "simulator.md"),
				[
					"---",
					"title: Simulator Guide",
					"summary: Boot and prepare the simulator for Apple tooling.",
					"---",
					"",
					"# Simulator Guide",
					"",
				].join("\n"),
			);
			await writeText(
				topicDocsPath(repoDir, "docs", "guides", "deep", "ignored.md"),
				[
					"---",
					"title: Deep Guide",
					"summary: This doc lives below the root overview depth.",
					"---",
					"",
					"# Deep Guide",
					"",
				].join("\n"),
			);

			const result = await runDocsCli(["topic", TEST_TOPIC_NAME], { cwd: repoDir, env });
			const normalizedStdout = normalizedPathForOutput(result.stdout);

			expect(result.exitCode).toBe(0);
			expect(
				result.stdout.indexOf(
					`Use \`docs topic ${TEST_TOPIC_NAME} <path>\` to focus one path inside the topic.`,
				),
			).toBeLessThan(result.stdout.indexOf(`# Topic: ${TEST_TOPIC_TITLE}`));
			expect(hasHeading(result.stdout, 1, `Topic: ${TEST_TOPIC_TITLE}`)).toBe(true);
			expect(result.stdout).toContain("## Docs");
			expect(result.stdout).toContain("## Skills");
			expect(result.stdout).not.toContain("## Subtrees");
			expect(countMatches(result.stdout, /^## Docs$/gm)).toBe(1);
			expect(countMatches(result.stdout, /^## Skills$/gm)).toBe(1);
			expect(normalizedStdout).toContain(`### ${topicDocsPathForOutput(normalizedRepoDir)}/`);
			expect(result.stdout).toContain(
				"- SOSUMI.md - Sosumi CLI and MCP reference for fetching Apple Developer doc...",
			);
			expect(normalizedStdout).toContain(
				`### ${topicDocsPathForOutput(normalizedRepoDir, "docs", "guides")}/`,
			);
			expect(result.stdout).toContain(
				"- simulator.md - Boot and prepare the simulator for Apple tooling.",
			);
			expect(result.stdout).not.toContain("ignored.md");
			expect(normalizedStdout).toContain(
				`### hig-doctor\nPath: ${
					topicDocsPathForOutput(
						normalizedRepoDir,
						"hig-doctor",
						"skills",
						"hig-components-content",
						"SKILL.md",
					)
				}`,
			);
			expect(result.stdout).toContain("$hig-components-content");
			expect(normalizedStdout).toContain(
				`### ios-debugger-agent\nPath: ${
					topicDocsPathForOutput(normalizedRepoDir, "ios-debugger-agent", "SKILL.md")
				}`,
			);
		},
		{ seedGlobalDocsHome: false, seedGlobalDocsIndex: false },
	);
});

test("docs topic overview renders root-level skill hints by directory path", async () => {
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

test("docs topic focus accepts nested topic paths", async () => {
	await withDocsCliWorkspace(
		"docs-topic-focus-nested-docs-",
		async ({ repoDir, env, normalizedRepoDir }) => {
			await writeText(
				topicDocsPath(repoDir, "docs", "guides", "simulator.md"),
				[
					"---",
					"title: Simulator Guide",
					"summary: Boot and prepare the simulator for Apple tooling.",
					"---",
					"",
					"# Simulator Guide",
					"",
				].join("\n"),
			);

			const result = await runDocsCli(["topic", TEST_TOPIC_NAME, "docs/guides"], {
				cwd: repoDir,
				env,
			});

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("## guides");
			expect(normalizedPathForOutput(result.stdout)).toContain(
				`### ${topicDocsPathForOutput(normalizedRepoDir, "docs", "guides")}/`,
			);
			expect(result.stdout).toContain(
				"  simulator.md - Boot and prepare the simulator for Apple tooling.",
			);
		},
		{ seedGlobalDocsHome: false, seedGlobalDocsIndex: false },
	);
});

test("docs topic focus keeps merged path views", async () => {
	await withDocsCliWorkspace("docs-topic-section-", async ({ repoDir, homeDir, env }) => {
		const result = await runDocsCli(["topic", "qmd", "references"], { cwd: repoDir, env });

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("## References");
		expect(result.stdout).toContain(`${path.join(repoDir, "docs", "topics", "qmd", "references")}/`);
		expect(result.stdout).toContain(`${globalDocsPath(homeDir, "topics", "qmd", "references")}/`);
		expect(result.stdout).toContain("Start with the local notes.");
		expect(result.stdout).toContain("Use these upstream references.");
		expect(result.stdout).toContain("  local-indexing.md - local index notes");
		expect(result.stdout).toContain("  global-indexing.md - global index notes");
	});
});

test("docs topic unknown path renders available paths as bullets", async () => {
	await withDocsCliWorkspace(
		"docs-topic-unknown-path-",
		async ({ repoDir, env }) => {
			await seedSkillBackedSection(repoDir);

			const result = await runDocsCli(["topic", TEST_TOPIC_NAME, "missing"], {
				cwd: repoDir,
				env,
			});

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain(
				`Unknown path "missing" for topic "${TEST_TOPIC_NAME}". Available:`,
			);
			expect(result.stderr).toContain("\n- hig-doctor\n");
			expect(result.stderr).toContain("\n- hig-doctor/skills\n");
			expect(result.stderr).toContain("\n- hig-doctor/skills/hig-components-content\n");
			expect(result.stderr).toContain("\n- ios-debugger-agent\n");
			expect(result.stderr).not.toContain("Available: SOSUMI.md,");
		},
		{ seedGlobalDocsHome: false, seedGlobalDocsIndex: false },
	);
});

test("docs topic section renders a single root skill directly", async () => {
	await withDocsCliWorkspace(
		"docs-topic-skill-section-",
	async ({ repoDir, env, normalizedRepoDir }) => {
			const result = await runDocsCli(["topic", TEST_TOPIC_NAME, "ios-debugger-agent"], {
				cwd: repoDir,
				env,
			});
			expect(result.exitCode).toBe(0);
			expect(hasHeading(result.stdout, 2, "iOS Debugger Agent")).toBe(true);
			expect(result.stdout).not.toContain(
				topicDocsPathForOutput(normalizedRepoDir, "ios-debugger-agent", "SKILL.md"),
			);
			expect(result.stdout).toContain(
				"Use XcodeBuildMCP to build, run, and debug the current iOS project on a booted simulator.",
			);
			expect(compactListEntries(result.stdout, "References", 3))
				.toContain("- quickstart.md");
		},
	);
});

test("docs topic focus resolves nested skill paths directly", async () => {
	await withDocsCliWorkspace(
		"docs-topic-skill-path-",
		async ({ repoDir, env, normalizedRepoDir }) => {
			await seedSkillBackedSection(repoDir);
			const result = await runDocsCli(
				["topic", TEST_TOPIC_NAME, "hig-doctor/skills/hig-components-content"],
				{ cwd: repoDir, env },
			);

			expect(result.exitCode).toBe(0);
			expect(normalizedPathForOutput(result.stdout)).not.toContain(
				topicDocsPathForOutput(
					normalizedRepoDir,
					"hig-doctor",
					"skills",
					"hig-components-content",
					"SKILL.md",
				),
			);
			expectHigComponentsSkill(result.stdout, {
				nameLine: false,
				references: true,
			});
		},
		{ seedGlobalDocsHome: false, seedGlobalDocsIndex: false },
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

test("docs topic path focus keeps sibling docs outside nested skill paths", async () => {
	await withDocsCliWorkspace(
		"docs-topic-skills-",
		async ({ repoDir, env, normalizedRepoDir }) => {
			await seedSkillBackedSection(repoDir);
			const result = await runDocsCli(["topic", TEST_TOPIC_NAME, "hig-doctor"], {
				cwd: repoDir,
				env,
			});
			expect(result.exitCode).toBe(0);
			expect(hasHeading(result.stdout, 2, "hig-doctor")).toBe(true);
			expect(normalizedPathForOutput(result.stdout)).toContain(
				`### ${topicDocsPathForOutput(normalizedRepoDir, "hig-doctor")}/`,
			);
			expect(result.stdout).toContain(
				"  usage.md - Run the HIG skill set against the current app before broader Apple docs.",
			);
			expect(result.stdout).toContain("### Skills");
			const usageIndex = result.stdout.indexOf(
				"  usage.md - Run the HIG skill set against the current app before broader Apple docs.",
			);
			const skillSectionIndex = result.stdout.indexOf("### Skills");
			expect(usageIndex).toBeGreaterThanOrEqual(0);
			expect(skillSectionIndex).toBeGreaterThanOrEqual(0);
			expect(usageIndex).toBeLessThan(skillSectionIndex);
			expectHigComponentsSkill(result.stdout, {
				references: false,
			});
		},
		{ seedGlobalDocsHome: false, seedGlobalDocsIndex: false },
	);
});
