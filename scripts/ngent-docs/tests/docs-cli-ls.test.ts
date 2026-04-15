import { mkdir } from "node:fs/promises";
import { realpath } from "node:fs/promises";
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
	await withDocsCliWorkspace("docs-file-selector-", async ({ repoDir, env }) => {
		const rootResult = await runDocsCli(["./docs/web-fetching.md"], { cwd: repoDir, env });
		const lsResult = await runDocsCli(["ls", "./docs/web-fetching.md"], {
			cwd: repoDir,
			env,
		});

		expect(rootResult.exitCode).toBe(0);
		expect(lsResult.exitCode).toBe(0);
		expect(rootResult.stdout.trim()).toBe(lsResult.stdout.trim());
		expect(rootResult.stdout).toContain("# Doc: Web Fetching");
		expect(rootResult.stdout.replaceAll("/private/var", "/var")).toContain(
			`Path: ${path.join(repoDir, "docs", "web-fetching.md")}`,
		);
		expect(rootResult.stdout).toContain(
			"Use browser tools when fetch/search is blocked by JavaScript pages.",
		);
		expect(rootResult.stdout).not.toContain("title: Web Fetching");
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

				expect(mergedLs.exitCode).toBe(0);
				expect(mergedRoot.exitCode).toBe(0);
				expect(mergedLs.stdout.trim()).toBe(mergedRoot.stdout.trim());
				expect(mergedLs.stdout).toContain(path.join(repoDir, "docs", "setup"));
				expect(mergedLs.stdout).toContain(path.join(homeDir, ".ngents", "docs", "setup"));
				expect(mergedLs.stdout).toContain("local-only.md");
				expect(mergedLs.stdout).toContain("global-only.md");

				expect(qualifiedLs.exitCode).toBe(0);
				expect(qualifiedSplit.exitCode).toBe(0);
				expect(qualifiedCase.exitCode).toBe(0);
				expect(qualifiedRoot.exitCode).toBe(0);
				expect(qualifiedLs.stdout.trim()).toBe(qualifiedSplit.stdout.trim());
				expect(qualifiedLs.stdout.trim()).toBe(qualifiedRoot.stdout.trim());
				expect(qualifiedLs.stdout).toContain(path.join(homeDir, ".ngents", "docs", "setup"));
				expect(qualifiedLs.stdout).toContain("global-only.md");
				expect(qualifiedLs.stdout).not.toContain(path.join(repoDir, "docs", "setup"));
				expect(qualifiedLs.stdout).not.toContain("local-only.md");

				expect(qualifiedNested.exitCode).toBe(0);
				expect(qualifiedNested.stdout).toContain(
					path.join(homeDir, ".ngents", "docs", "setup", "secrets"),
				);
				expect(qualifiedNested.stdout).toContain("secret.md");
				expect(qualifiedNested.stdout).not.toContain("global-only.md");

				expect(qualifiedCase.stdout).toContain(path.join(homeDir, ".ngents", "docs", "setup"));
				expect(qualifiedCase.stdout).toContain("global-only.md");
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

			expect(bareResult.exitCode).toBe(0);
			expect(bareResult.stdout).toContain("# Docs: browser");
			expect(bareResult.stdout).toContain("## Topic: browser");
			expect(bareResult.stdout).toContain(path.join(repoDir, "docs", "topics", "browser"));
			expect(bareResult.stdout).toContain("### Docs");
			expect(bareResult.stdout).not.toContain("#### extensive");
			expect(bareResult.stdout).toContain("## Docs: browser");
			expect(bareResult.stdout).toContain(`${path.join(repoDir, "docs", "browser")}/`);
			expect(bareResult.stdout).toContain(`${path.join(homeDir, ".ngents", "docs", "browser")}/`);
			expect(bareResult.stdout).toContain("local-browser.md");
			expect(bareResult.stdout).toContain("extensive.md");
			expect(bareResult.stdout).toContain("cdp.md");

			expect(docsOnlyResult.exitCode).toBe(0);
			expect(docsOnlyResult.stdout).toContain("# Docs: browser");
			expect(docsOnlyResult.stdout).toContain("Topic available: docs topic browser");
			expect(docsOnlyResult.stdout).toContain(`${path.join(repoDir, "docs", "browser")}/`);
			expect(docsOnlyResult.stdout).toContain(
				`${path.join(homeDir, ".ngents", "docs", "browser")}/`,
			);
			expect(docsOnlyResult.stdout).not.toContain(path.join(repoDir, "docs", "topics", "browser"));

			expect(topicOnlyResult.exitCode).toBe(0);
			expect(topicOnlyResult.stdout).toContain("# Topic: browser");
			expect(topicOnlyResult.stdout).toContain(path.join(repoDir, "docs", "topics", "browser"));
			expect(topicOnlyResult.stdout).toContain("## Docs");
			expect(topicOnlyResult.stdout).not.toContain("---");
			expect(topicOnlyResult.stdout).not.toContain("### extensive");
			expect(topicOnlyResult.stdout).not.toContain(path.join(repoDir, "docs", "browser"));
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
