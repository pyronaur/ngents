import { mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

import { runDocsCli } from "./helpers/cli.ts";
import {
	seedLocalDocsRepo,
	TEST_TOPIC_NAME,
	TEST_TOPIC_SHORT,
	TEST_TOPIC_TITLE,
	withDocsCliWorkspace,
	writeText,
} from "./helpers/docs-cli-fixture.ts";

type CliResult = { exitCode: number | null; stdout: string; stderr: string };

function expectSuccessfulResults(results: CliResult[]): void {
	for (const result of results) {
		expect(result.exitCode).toBe(0);
	}
}

function expectFileSelectorResults(input: {
	rootResult: CliResult;
	bareResult: CliResult;
	bareNoExtensionResult: CliResult;
	globalBareResult: CliResult;
	globalBareNoExtensionResult: CliResult;
	globalPrefixedResult: CliResult;
	globalPrefixedNoExtensionResult: CliResult;
	lsResult: CliResult;
	repoDir: string;
	homeDir: string;
}): void {
	expectSuccessfulResults([
		input.rootResult,
		input.bareResult,
		input.bareNoExtensionResult,
		input.globalBareResult,
		input.globalBareNoExtensionResult,
		input.globalPrefixedResult,
		input.globalPrefixedNoExtensionResult,
		input.lsResult,
	]);
	expect(input.rootResult.stdout.trim()).toBe(input.lsResult.stdout.trim());
	expect(input.bareResult.stdout.trim()).toBe(input.rootResult.stdout.trim());
	expect(input.bareNoExtensionResult.stdout.trim()).toBe(input.rootResult.stdout.trim());
	expect(input.globalBareResult.stdout.trim()).toBe(input.globalPrefixedResult.stdout.trim());
	expect(input.globalBareNoExtensionResult.stdout.trim()).toBe(
		input.globalPrefixedResult.stdout.trim(),
	);
	expect(input.globalPrefixedNoExtensionResult.stdout.trim()).toBe(
		input.globalPrefixedResult.stdout.trim(),
	);
	expect(input.rootResult.stdout).toContain("# Doc: Web Fetching");
	expect(input.globalBareResult.stdout).toContain("# Doc: Ngents Docs");
	expect(input.rootResult.stdout.replaceAll("/private/var", "/var")).toContain(
		`Path: ${path.join(input.repoDir, "docs", "web-fetching.md")}`,
	);
	expect(input.globalBareResult.stdout).toContain(
		`Path: ${path.join(input.homeDir, ".ngents", "docs", "ngents-docs.md")}`,
	);
	expect(input.rootResult.stdout).toContain(
		"Use browser tools when fetch/search is blocked by JavaScript pages.",
	);
	expect(input.rootResult.stdout).not.toContain("title: Web Fetching");
}

function expectMergedQualifiedBrowse(input: {
	mergedLs: CliResult;
	mergedRoot: CliResult;
	repoDir: string;
	homeDir: string;
}): void {
	expectSuccessfulResults([input.mergedLs, input.mergedRoot]);
	expect(input.mergedLs.stdout.trim()).toBe(input.mergedRoot.stdout.trim());
	expect(input.mergedLs.stdout).toContain(path.join(input.repoDir, "docs", "setup"));
	expect(input.mergedLs.stdout).toContain(path.join(input.homeDir, ".ngents", "docs", "setup"));
	expect(input.mergedLs.stdout).toContain("local-only.md");
	expect(input.mergedLs.stdout).toContain("global-only.md");
}

function expectScopedQualifiedBrowse(input: {
	qualifiedLs: CliResult;
	qualifiedSplit: CliResult;
	qualifiedCase: CliResult;
	qualifiedRoot: CliResult;
	repoDir: string;
	homeDir: string;
}): void {
	expectSuccessfulResults([
		input.qualifiedLs,
		input.qualifiedSplit,
		input.qualifiedCase,
		input.qualifiedRoot,
	]);
	expect(input.qualifiedLs.stdout.trim()).toBe(input.qualifiedSplit.stdout.trim());
	expect(input.qualifiedLs.stdout.trim()).toBe(input.qualifiedRoot.stdout.trim());
	expect(input.qualifiedLs.stdout).toContain(path.join(input.homeDir, ".ngents", "docs", "setup"));
	expect(input.qualifiedLs.stdout).toContain("global-only.md");
	expect(input.qualifiedLs.stdout).not.toContain(path.join(input.repoDir, "docs", "setup"));
	expect(input.qualifiedLs.stdout).not.toContain("local-only.md");
	expect(input.qualifiedCase.stdout).toContain(
		path.join(input.homeDir, ".ngents", "docs", "setup"),
	);
	expect(input.qualifiedCase.stdout).toContain("global-only.md");
}

function expectNestedQualifiedBrowse(
	qualifiedNested: CliResult,
	homeDir: string,
): void {
	expect(qualifiedNested.exitCode).toBe(0);
	expect(qualifiedNested.stdout).toContain(
		path.join(homeDir, ".ngents", "docs", "setup", "secrets"),
	);
	expect(qualifiedNested.stdout).toContain("secret.md");
	expect(qualifiedNested.stdout).not.toContain("global-only.md");
}

function expectOverlappingRootResult(input: {
	result: CliResult;
	repoDir: string;
	homeDir: string;
}): void {
	expect(input.result.exitCode).toBe(0);
	expect(input.result.stdout).toContain("# Docs: browser");
	expect(input.result.stdout).toContain("## Topic: browser");
	expect(input.result.stdout).toContain(path.join(input.repoDir, "docs", "topics", "browser"));
	expect(input.result.stdout).toContain("### Docs");
	expect(input.result.stdout).not.toContain("#### extensive");
	expect(input.result.stdout).toContain("## Docs: browser");
	expect(input.result.stdout).toContain(`${path.join(input.repoDir, "docs", "browser")}/`);
	expect(input.result.stdout).toContain(
		`${path.join(input.homeDir, ".ngents", "docs", "browser")}/`,
	);
	expect(input.result.stdout).toContain("local-browser.md");
	expect(input.result.stdout).toContain("extensive.md");
	expect(input.result.stdout).toContain("cdp.md");
}

function expectOverlappingDocsOnlyResult(input: {
	result: CliResult;
	repoDir: string;
	homeDir: string;
}): void {
	expect(input.result.exitCode).toBe(0);
	expect(input.result.stdout).toContain("# Docs: browser");
	expect(input.result.stdout).toContain("Topic available: docs topic browser");
	expect(input.result.stdout).toContain(`${path.join(input.repoDir, "docs", "browser")}/`);
	expect(input.result.stdout).toContain(
		`${path.join(input.homeDir, ".ngents", "docs", "browser")}/`,
	);
	expect(input.result.stdout).not.toContain(path.join(input.repoDir, "docs", "topics", "browser"));
}

function expectOverlappingTopicOnlyResult(result: CliResult, repoDir: string): void {
	expect(result.exitCode).toBe(0);
	expect(result.stdout).toContain("# Topic: browser");
	expect(result.stdout).toContain(path.join(repoDir, "docs", "topics", "browser"));
	expect(result.stdout).toContain("## Docs");
	expect(result.stdout).not.toContain("---");
	expect(result.stdout).not.toContain("### extensive");
	expect(result.stdout).not.toContain(path.join(repoDir, "docs", "browser"));
}

function expectOverlappingBrowserResults(input: {
	bareResult: CliResult;
	docsOnlyResult: CliResult;
	topicOnlyResult: CliResult;
	repoDir: string;
	homeDir: string;
}): void {
	expectOverlappingRootResult({
		result: input.bareResult,
		repoDir: input.repoDir,
		homeDir: input.homeDir,
	});
	expectOverlappingDocsOnlyResult({
		result: input.docsOnlyResult,
		repoDir: input.repoDir,
		homeDir: input.homeDir,
	});
	expectOverlappingTopicOnlyResult(input.topicOnlyResult, input.repoDir);
}

function expectDocsLsSelectorMiss(
	result: { exitCode: number | null; stdout: string; stderr: string },
	selector: string,
	homeDir: string,
	architecturePath: string,
): void {
	expect(result.exitCode).toBe(1);
	expect(result.stderr).toContain(`Sorry, \`${selector}\` not found`);
	expect(result.stderr).toContain("Here's what I do have:");
	expect(result.stderr).toContain("Topics");
	expect(result.stderr).toContain("Registered Docs");
	expect(result.stderr).toContain(`architecture: ${architecturePath}`);
	expect(result.stderr).toContain(
		`browser: ${path.join(homeDir, ".ngents", "docs", "browser")}/`,
	);
}

async function runDocsLsSelectorMiss(
	repoDir: string,
	homeDir: string,
	env: NodeJS.ProcessEnv,
	selector: string,
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
	const result = await runDocsCli(["ls", selector], { cwd: repoDir, env });
	const expectedArchitecturePath = [
		`${await realpath(path.join(repoDir, "docs", "architecture"))}/`,
		`${path.join(homeDir, ".ngents", "docs", "architecture")}/`,
	].join(", ");

	expectDocsLsSelectorMiss(result, selector, homeDir, expectedArchitecturePath);
	return result;
}

async function withDocsLsSelectorMiss(
	workspaceName: string,
	assertions: (
		result: { exitCode: number | null; stdout: string; stderr: string },
	) => void | Promise<void>,
): Promise<void> {
	await withDocsCliWorkspace(workspaceName, async ({ repoDir, homeDir, env }) => {
		const result = await runDocsLsSelectorMiss(repoDir, homeDir, env, "poop");
		await assertions(result);
	});
}

async function seedArchitectureDecisions(repoDir: string, homeDir: string): Promise<void> {
	await writeText(
		path.join(repoDir, "docs", "architecture", "decisions", "local-adr.md"),
		[
			"---",
			"title: Local ADR",
			"summary: Local architecture decision record.",
			"---",
			"",
			"# Local ADR",
			"",
			"Local ADR details.",
			"",
		].join("\n"),
	);
	await writeText(
		path.join(homeDir, ".ngents", "docs", "architecture", "decisions", "global-adr.md"),
		[
			"---",
			"title: Global ADR",
			"summary: Global architecture decision record.",
			"---",
			"",
			"# Global ADR",
			"",
			"Global ADR details.",
			"",
		].join("\n"),
	);
}

test("docs ls merges local and global docs by default", async () => {
	await withDocsCliWorkspace("docs-ls-merged-", async ({ repoDir, homeDir, env }) => {
		const result = await runDocsCli(["ls"], { cwd: repoDir, env });

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("# Docs");
		expect(result.stdout).not.toContain("Usage: docs ls [where...]");
		expect(result.stdout).toContain(`${path.join(repoDir, "docs")}/`);
		expect(result.stdout).toContain(`${path.join(homeDir, ".ngents", "docs")}/`);
		expect(result.stdout).toContain("web-fetching.md");
		expect(result.stdout).toContain("Need to fetch web content for research.");
		expect(result.stdout).toContain("cdp.md");
		expect(result.stdout).toContain(
			"Need to start, stop, or inspect the local Chrome CDP session.",
		);
		expect(result.stdout).not.toContain("## Topics");
	});
});

test("docs ls . shows only local docs", async () => {
	await withDocsCliWorkspace("docs-ls-local-", async ({ repoDir, homeDir, env }) => {
		const result = await runDocsCli(["ls", "."], { cwd: repoDir, env });

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(`${path.join(repoDir, "docs")}/`);
		expect(result.stdout).not.toContain(path.join(homeDir, ".ngents", "docs"));
	});
});

test("docs ls global shows only global docs", async () => {
	await withDocsCliWorkspace("docs-ls-global-", async ({ repoDir, homeDir, env }) => {
		const result = await runDocsCli(["ls", "global"], { cwd: repoDir, env });

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(`${path.join(homeDir, ".ngents", "docs")}/`);
		expect(result.stdout).not.toContain(path.join(repoDir, "docs"));
	});
});

test("docs ls ./docs/subdir focuses a local docs subtree", async () => {
	await withDocsCliWorkspace("docs-ls-subdir-", async ({ repoDir, homeDir, env }) => {
		const result = await runDocsCli(["ls", "./docs/architecture"], { cwd: repoDir, env });

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(`${path.join(repoDir, "docs", "architecture")}/`);
		expect(result.stdout).toContain("main.md");
		expect(result.stdout).toContain("local-only.md");
		expect(result.stdout).not.toContain("web-fetching.md");
		expect(result.stdout).not.toContain(path.join(homeDir, ".ngents", "docs"));
	});
});

test("docs file selectors open a local markdown doc from root and ls browse", async () => {
	await withDocsCliWorkspace("docs-file-selector-", async ({ repoDir, homeDir, env }) => {
		await writeText(
			path.join(homeDir, ".ngents", "docs", "ngents-docs.md"),
			[
				"---",
				"title: Ngents Docs",
				"summary: Root-level global docs command reference.",
				"---",
				"",
				"# Ngents Docs",
				"",
				"Read root-level global docs files without a prefix.",
				"",
			].join("\n"),
		);

		const rootResult = await runDocsCli(["./docs/web-fetching.md"], { cwd: repoDir, env });
		const bareResult = await runDocsCli(["web-fetching.md"], { cwd: repoDir, env });
		const bareNoExtensionResult = await runDocsCli(["web-fetching"], { cwd: repoDir, env });
		const globalBareResult = await runDocsCli(["ngents-docs.md"], { cwd: repoDir, env });
		const globalBareNoExtensionResult = await runDocsCli(["ngents-docs"], {
			cwd: repoDir,
			env,
		});
		const globalPrefixedResult = await runDocsCli(["docs/ngents-docs.md"], {
			cwd: repoDir,
			env,
		});
		const globalPrefixedNoExtensionResult = await runDocsCli(["docs/ngents-docs"], {
			cwd: repoDir,
			env,
		});
		const lsResult = await runDocsCli(["ls", "./docs/web-fetching.md"], {
			cwd: repoDir,
			env,
		});

		expectFileSelectorResults({
			rootResult,
			bareResult,
			bareNoExtensionResult,
			globalBareResult,
			globalBareNoExtensionResult,
			globalPrefixedResult,
			globalPrefixedNoExtensionResult,
			lsResult,
			repoDir,
			homeDir,
		});
	});
});

test("docs selectors open skill-only docs roots without spelling SKILL.md", async () => {
	await withDocsCliWorkspace("docs-skill-selector-", async ({ repoDir, env }) => {
		await writeText(
			path.join(repoDir, "skills", "docs", "SKILL.md"),
			[
				"---",
				"title: Dynamic Docs Skill",
				"description: Read docs dynamically.",
				"---",
				"",
				"# Dynamic Docs Skill",
				"",
				"Use this skill when docs should be loaded on demand.",
				"",
			].join("\n"),
		);

		const explicitResult = await runDocsCli(["skills/docs/SKILL.md"], { cwd: repoDir, env });
		const implicitResult = await runDocsCli(["skills/docs"], { cwd: repoDir, env });

		expect(explicitResult.exitCode).toBe(0);
		expect(implicitResult.exitCode).toBe(0);
		expect(explicitResult.stdout).toContain("# Doc: Dynamic Docs Skill");
		expect(implicitResult.stdout).toBe(explicitResult.stdout);
	});
});

test("docs ls docs/subdir merges matching local and global doc subtrees", async () => {
	await withDocsCliWorkspace("docs-ls-subdir-merged-", async ({ repoDir, homeDir, env }) => {
		const result = await runDocsCli(["ls", "docs/architecture"], { cwd: repoDir, env });

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(`${path.join(repoDir, "docs", "architecture")}/`);
		expect(result.stdout).toContain(`${path.join(homeDir, ".ngents", "docs", "architecture")}/`);
		expect(result.stdout).toContain("main.md");
		expect(result.stdout).toContain("local-only.md");
		expect(result.stdout).toContain("global-only.md");
		expect(result.stdout).not.toContain("web-fetching.md");
		expect(result.stdout).not.toContain("cdp.md");
	});
});

test("docs ls registered-docs-root/subdir merges matching local and global doc subtrees", async () => {
	await withDocsCliWorkspace(
		"docs-ls-registered-doc-subdir-",
		async ({ repoDir, homeDir, env }) => {
			await seedArchitectureDecisions(repoDir, homeDir);

			const nestedDirectoryResult = await runDocsCli(["ls", "architecture/decisions"], {
				cwd: repoDir,
				env,
			});

			expect(nestedDirectoryResult.exitCode).toBe(0);
			expect(nestedDirectoryResult.stdout).toContain(
				`${path.join(repoDir, "docs", "architecture", "decisions")}/`,
			);
			expect(nestedDirectoryResult.stdout).toContain(
				`${path.join(homeDir, ".ngents", "docs", "architecture", "decisions")}/`,
			);
			expect(nestedDirectoryResult.stdout).toContain("local-adr.md");
			expect(nestedDirectoryResult.stdout).toContain("global-adr.md");
			expect(nestedDirectoryResult.stdout).not.toContain("main.md");
		},
	);
});

test("docs ls docs/subdir succeeds when only the global subtree exists", async () => {
	await withDocsCliWorkspace("docs-ls-subdir-global-only-", async ({ repoDir, homeDir, env }) => {
		const result = await runDocsCli(["ls", "docs/process"], { cwd: repoDir, env });

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(`${path.join(homeDir, ".ngents", "docs", "process")}/`);
		expect(result.stdout).toContain("qa.md");
		expect(result.stdout).not.toContain(path.join(repoDir, "docs", "process"));
	});
});

test("docs ls docs/subdir fails only when the subtree is missing everywhere", async () => {
	await withDocsCliWorkspace("docs-ls-subdir-missing-", async ({ repoDir, env }) => {
		const result = await runDocsCli(["ls", "docs/missing"], { cwd: repoDir, env });

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Sorry, `docs/missing` not found");
		expect(result.stderr).toContain("I couldn't locate a registered docs directory called that");
		expect(result.stderr).toContain("Here's what I do have:");
		expect(result.stderr).toContain("Topics");
		expect(result.stderr).toContain("Registered Docs");
	});
});

test("docs ls accepts workspace paths, docs paths, and docs subtrees via ~ expansion", async () => {
	await withDocsCliWorkspace(
		"docs-ls-paths-",
		async ({ tempDir, homeDir, env }) => {
			const workspaceDir = path.join(homeDir, "workspace");
			await seedLocalDocsRepo(workspaceDir);

			const workspaceResult = await runDocsCli(["ls", "~/workspace"], {
				cwd: tempDir,
				env,
			});
			const docsResult = await runDocsCli(["ls", "~/workspace/docs"], {
				cwd: tempDir,
				env,
			});
			const subtreeResult = await runDocsCli(["ls", "~/workspace/docs/architecture"], {
				cwd: tempDir,
				env,
			});

			expect(workspaceResult.exitCode).toBe(0);
			expect(workspaceResult.stdout).toContain(path.join(workspaceDir, "docs"));
			expect(workspaceResult.stdout).toContain("web-fetching.md");

			expect(docsResult.exitCode).toBe(0);
			expect(docsResult.stdout).toContain(path.join(workspaceDir, "docs"));
			expect(docsResult.stdout).toContain("web-fetching.md");

			expect(subtreeResult.exitCode).toBe(0);
			expect(subtreeResult.stdout).toContain(path.join(workspaceDir, "docs", "architecture"));
			expect(subtreeResult.stdout).toContain("main.md");
			expect(subtreeResult.stdout).not.toContain("web-fetching.md");
		},
	);
});

test("docs ls resolves parked global docs roots by case-insensitive name", async () => {
	await withDocsCliWorkspace(
		"docs-ls-parked-name-",
		async ({ repoDir, homeDir, env }) => {
			const result = await runDocsCli(["ls", "local"], { cwd: repoDir, env });

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain(`${path.join(homeDir, ".ngents", "docs")}/`);
			expect(result.stdout).toContain("cdp.md");
			expect(result.stdout).not.toContain(path.join(repoDir, "docs"));
		},
		{ collectionName: "Local" },
	);
});

test(
	"qualified parked collection selectors scope docs browse and root fallback",
	{ timeout: 10_000 },
	async () => {
		await withDocsCliWorkspace(
			"docs-ls-qualified-selector-",
			async ({ repoDir, homeDir, env }) => {
				await writeText(
					path.join(repoDir, "docs", "setup", "local-only.md"),
					["# Local Only", "", "Local setup docs.", ""].join("\n"),
				);
				await writeText(
					path.join(homeDir, ".ngents", "docs", "setup", "global-only.md"),
					["# Global Only", "", "Global setup docs.", ""].join("\n"),
				);
				await writeText(
					path.join(homeDir, ".ngents", "docs", "setup", "secrets", "secret.md"),
					["# Secret", "", "Collection-scoped docs.", ""].join("\n"),
				);

				const mergedLs = await runDocsCli(["ls", "setup"], { cwd: repoDir, env });
				const mergedRoot = await runDocsCli(["setup"], { cwd: repoDir, env });
				const qualifiedLs = await runDocsCli(["ls", "local/setup"], { cwd: repoDir, env });
				const qualifiedSplit = await runDocsCli(["ls", "local", "setup"], { cwd: repoDir, env });
				const qualifiedNested = await runDocsCli(["ls", "local", "setup", "secrets"], {
					cwd: repoDir,
					env,
				});
				const qualifiedCase = await runDocsCli(["ls", "Local/setup"], { cwd: repoDir, env });
				const qualifiedRoot = await runDocsCli(["local/setup"], { cwd: repoDir, env });

				expectMergedQualifiedBrowse({ mergedLs, mergedRoot, repoDir, homeDir });
				expectScopedQualifiedBrowse({
					qualifiedLs,
					qualifiedSplit,
					qualifiedCase,
					qualifiedRoot,
					repoDir,
					homeDir,
				});
				expectNestedQualifiedBrowse(qualifiedNested, homeDir);
			},
			{ collectionName: "Local" },
		);
	},
);

test("docs ls rejects non-docs paths with suggestions", async () => {
	await withDocsCliWorkspace("docs-ls-invalid-path-", async ({ tempDir, homeDir, env }) => {
		const miscDir = path.join(homeDir, "misc");
		await mkdir(miscDir, { recursive: true });
		const result = await runDocsCli(["ls", "~/misc"], { cwd: tempDir, env });

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain(`Not a docs directory: ${miscDir}/`);
		expect(result.stderr).toContain(`docs ls ${path.join(miscDir, "docs")}`);
	});
});

test("docs ls keeps parked-name matching exact instead of prefix-based", async () => {
	await withDocsCliWorkspace("docs-ls-name-prefix-", async ({ tempDir, homeDir, env }) => {
		const result = await runDocsCli(["ls", "n"], { cwd: tempDir, env });

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Sorry, `n` not found");
		expect(result.stderr).toContain("Here's what I do have:");
		expect(result.stderr).toContain("Registered Docs");
		expect(result.stderr).toContain(`browser: ${path.join(homeDir, ".ngents", "docs", "browser")}`);
	});
});

test("docs ls selector misses show merged topics and registered docs roots", async () => {
	await withDocsLsSelectorMiss("docs-ls-selector-miss-", async (result) => {
		expect(result.stderr).toContain(TEST_TOPIC_NAME);
		expect(result.stderr).toContain(TEST_TOPIC_SHORT);
		expect(result.stderr).toContain("qmd");
		expect(result.stderr).toContain(
			"You can see the full index with compact descriptions using `docs ls`",
		);
		expect(result.stderr).not.toContain("Commands:");
	});
});

test("docs ls suggests the topic command when the selector matches a topic", async () => {
	await withDocsCliWorkspace("docs-ls-topic-hint-", async ({ repoDir, env }) => {
		const result = await runDocsCli(["ls", TEST_TOPIC_NAME], { cwd: repoDir, env });

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain(`Sorry, \`${TEST_TOPIC_NAME}\` not found`);
		expect(result.stderr).toContain("`docs ls` only opens registered docs directories");
		expect(result.stderr).toContain(
			`\`${TEST_TOPIC_NAME}\` is a topic you can inspect with \`docs topic ${TEST_TOPIC_NAME}\``,
		);
		expect(result.stderr).toContain("Registered Docs");
	});
});

test("docs ls opens exact registered docs names as merged subtrees", async () => {
	await withDocsCliWorkspace("docs-ls-registered-doc-name-", async ({ repoDir, homeDir, env }) => {
		const result = await runDocsCli(["ls", "architecture"], { cwd: repoDir, env });

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("# Docs: architecture");
		expect(result.stdout).toContain(`${path.join(repoDir, "docs", "architecture")}/`);
		expect(result.stdout).toContain(`${path.join(homeDir, ".ngents", "docs", "architecture")}/`);
		expect(result.stdout).toContain("local-only.md");
		expect(result.stdout).toContain("global-only.md");
	});
});

test("docs browser shows both the topic and registered docs when names overlap", async () => {
	await withDocsCliWorkspace(
		"docs-root-selector-overlap-",
		async ({ repoDir, homeDir, env }) => {
			await writeText(
				path.join(repoDir, "docs", "topics", "browser", "extensive.md"),
				["# extensive", "", "Test topic notes.", ""].join("\n"),
			);
			await writeText(
				path.join(repoDir, "docs", "browser", "local-browser.md"),
				[
					"---",
					"title: Local Browser Notes",
					"summary: Local browser docs.",
					"---",
					"",
					"# Local Browser Notes",
					"",
					"Local browser details.",
					"",
				].join("\n"),
			);

			const bareResult = await runDocsCli(["browser"], { cwd: repoDir, env });
			const docsOnlyResult = await runDocsCli(["ls", "browser"], { cwd: repoDir, env });
			const topicOnlyResult = await runDocsCli(["topic", "browser"], { cwd: repoDir, env });

			expectOverlappingBrowserResults({
				bareResult,
				docsOnlyResult,
				topicOnlyResult,
				repoDir,
				homeDir,
			});
		},
	);
});

test("single-token root selectors open topics and registered docs", async () => {
	await withDocsCliWorkspace(
		"docs-root-selector-fallback-",
		async ({ tempDir, repoDir, homeDir, env }) => {
			const bareName = await runDocsCli(["local"], { cwd: repoDir, env });
			const bareTopic = await runDocsCli([TEST_TOPIC_NAME], { cwd: repoDir, env });
			const bareRegisteredDocs = await runDocsCli(["architecture"], { cwd: repoDir, env });
			const bareWorkspace = await runDocsCli([path.join(repoDir)], { cwd: tempDir, env });
			const bareDocsPath = await runDocsCli([path.join(repoDir, "docs")], {
				cwd: tempDir,
				env,
			});

			expect(bareName.exitCode).toBe(0);
			expect(bareName.stdout).toContain("# Docs: local");
			expect(bareName.stdout).toContain("## Topics: local");
			expect(bareName.stdout).toContain("qmd");
			expect(bareName.stdout).toContain(`${path.join(homeDir, ".ngents", "docs")}/`);
			expect(bareName.stdout).toContain("cdp.md");

			expect(bareTopic.exitCode).toBe(0);
			expect(bareTopic.stdout).toContain(`# Topic: ${TEST_TOPIC_TITLE}`);
			expect(bareTopic.stdout).toContain(path.join(repoDir, "docs", "topics", TEST_TOPIC_NAME));

			expect(bareRegisteredDocs.exitCode).toBe(0);
			expect(bareRegisteredDocs.stdout).toContain("# Docs: architecture");
			expect(bareRegisteredDocs.stdout).toContain(`${path.join(repoDir, "docs", "architecture")}/`);
			expect(bareRegisteredDocs.stdout).toContain(
				`${path.join(homeDir, ".ngents", "docs", "architecture")}/`,
			);

			expect(bareWorkspace.exitCode).toBe(0);
			expect(bareWorkspace.stdout).toContain(`${path.join(repoDir, "docs")}/`);
			expect(bareWorkspace.stdout).toContain("web-fetching.md");

			expect(bareDocsPath.exitCode).toBe(0);
			expect(bareDocsPath.stdout).toContain(`${path.join(repoDir, "docs")}/`);
			expect(bareDocsPath.stdout).toContain("web-fetching.md");
		},
		{ collectionName: "Local" },
	);
});

test("single-token root selectors open registered docs subpaths", async () => {
	await withDocsCliWorkspace(
		"docs-root-selector-registered-doc-subpath-",
		async ({ repoDir, homeDir, env }) => {
			await seedArchitectureDecisions(repoDir, homeDir);

			const result = await runDocsCli(["architecture/decisions"], { cwd: repoDir, env });

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("# Docs: architecture/decisions");
			expect(result.stdout).toContain(
				`${path.join(repoDir, "docs", "architecture", "decisions")}/`,
			);
			expect(result.stdout).toContain(
				`${path.join(homeDir, ".ngents", "docs", "architecture", "decisions")}/`,
			);
			expect(result.stdout).toContain("local-adr.md");
			expect(result.stdout).toContain("global-adr.md");
		},
	);
});

test("single-token root selectors open registered docs markdown files", async () => {
	await withDocsCliWorkspace(
		"docs-root-selector-registered-doc-file-",
		async ({ repoDir, env }) => {
			const result = await runDocsCli(["architecture/local-only.md"], {
				cwd: repoDir,
				env,
			});

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("# Doc: Local Architecture Notes");
			expect(result.stdout.replaceAll("/private/var", "/var")).toContain(
				`Path: ${path.join(repoDir, "docs", "architecture", "local-only.md")}`,
			);
			expect(result.stdout).toContain("Local architecture-only notes.");
			expect(result.stdout).not.toContain("title: Local Architecture Notes");
		},
	);
});

test("single-token registered docs markdown files prefer local matches over global", async () => {
	await withDocsCliWorkspace(
		"docs-root-selector-registered-doc-file-local-first-",
		async ({ repoDir, homeDir, env }) => {
			await writeText(
				path.join(homeDir, ".ngents", "docs", "architecture", "main.md"),
				[
					"---",
					"title: Global Main Architecture",
					"summary: Global main architecture summary.",
					"---",
					"",
					"# Global Main Architecture",
					"",
					"Global architecture details.",
					"",
				].join("\n"),
			);

			const result = await runDocsCli(["architecture/main.md"], {
				cwd: repoDir,
				env,
			});

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("# Doc: Main Architecture");
			expect(result.stdout).toContain("Architecture details.");
			expect(result.stdout).not.toContain("# Doc: Global Main Architecture");
			expect(result.stdout).not.toContain("Global architecture details.");
		},
	);
});

test("docs topic opens parked collection topic indexes without docs", async () => {
	await withDocsCliWorkspace(
		"docs-topic-parked-collection-",
		async ({ repoDir, homeDir, env }) => {
			const result = await runDocsCli(["topic", "local"], { cwd: repoDir, env });

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("# Topics: local");
			expect(result.stdout).toContain("qmd");
			expect(result.stdout).not.toContain(path.join(homeDir, ".ngents", "docs", "browser"));
			expect(result.stdout).not.toContain("cdp.md");
		},
		{ collectionName: "Local" },
	);
});

test("single-token unknown root selectors show commands plus browse inventory", async () => {
	await withDocsCliWorkspace("docs-root-selector-miss-", async ({ repoDir, homeDir, env }) => {
		const result = await runDocsCli(["poop"], { cwd: repoDir, env });
		const expectedArchitecturePath = [
			`${await realpath(path.join(repoDir, "docs", "architecture"))}/`,
			`${path.join(homeDir, ".ngents", "docs", "architecture")}/`,
		].join(", ");

		expectDocsLsSelectorMiss(result, "poop", homeDir, expectedArchitecturePath);
		expect(result.stderr).toContain("It's not a command: fetch, ls, park, topic, query, update");
		expect(result.stderr).toContain(
			"I couldn't locate a topic or registered docs source called that either",
		);
	});
});
