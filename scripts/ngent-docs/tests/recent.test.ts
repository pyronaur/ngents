import { appendFile, realpath } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

import { refreshRecentIndex } from "../src/runtime/recent-index.ts";
import { rankRecentDocs } from "../src/runtime/recent-rank.ts";
import { shellMarkdownReads } from "../src/runtime/recent-shell.ts";
import { withTempDir, writeText } from "./helpers/fs.ts";

type Fixture = {
	homeDir: string;
	indexPath: string;
	project: string;
	projectDoc: string;
	globalDocs: string;
	globalDoc: string;
	claudeLog: string;
};

function jsonl(...lines: unknown[]): string {
	return lines.map(line => `${JSON.stringify(line)}\n`).join("");
}

function claudeRead(cwd: string, filePath: string, timestamp: string) {
	return {
		type: "assistant",
		cwd,
		timestamp,
		message: { content: [{ type: "tool_use", name: "Read", input: { file_path: filePath } }] },
	};
}

async function withFixture(run: (fixture: Fixture) => Promise<void>): Promise<void> {
	await withTempDir("docs-recent-", async tempDir => {
		const home = await realpath(tempDir);
		const project = path.join(home, "work", "app");
		const globalDocs = path.join(home, "library", "docs");
		const fixture: Fixture = {
			homeDir: home,
			indexPath: path.join(home, "recent-index.json"),
			project,
			projectDoc: path.join(project, "docs", "setup.md"),
			globalDocs,
			globalDoc: path.join(globalDocs, "guides", "deploy.md"),
			claudeLog: path.join(home, ".claude", "projects", "-work-app", "session.jsonl"),
		};
		await writeText(fixture.projectDoc, "# Setup\n");
		await writeText(fixture.globalDoc, "# Deploy\n");
		await run(fixture);
	});
}

function rank(fixture: Fixture, index: Awaited<ReturnType<typeof refreshRecentIndex>>) {
	return rankRecentDocs(index, {
		projectRoot: fixture.project,
		globalDocsRoots: [fixture.globalDocs],
		limit: 10,
	});
}

test("Shell reads follow cd and ignore commands that only mention markdown files", () => {
	const reads = shellMarkdownReads(
		"cd /repo && sed -n '1,80p' docs/a.md && git add docs/b.md; cd docs && cat c.md | head",
		"/elsewhere",
	);

	expect(reads).toEqual(["/repo/docs/a.md", "/repo/docs/c.md"]);
});

test("Reads from every agent rank project docs and global docs most recent first", async () => {
	await withFixture(async fixture => {
		const piDir = `--${fixture.project.slice(1).replaceAll("/", "-")}--`;
		await writeText(fixture.claudeLog,
			jsonl(claudeRead(fixture.project, fixture.projectDoc, "2026-01-01T10:00:00.000Z")));
		await writeText(path.join(fixture.homeDir, ".codex", "sessions", "2026", "rollout.jsonl"),
			jsonl(
				{
					type: "session_meta",
					timestamp: "2026-01-02T10:00:00.000Z",
					payload: { cwd: "/elsewhere" },
				},
				{
					type: "response_item",
					timestamp: "2026-01-02T10:01:00.000Z",
					payload: {
						type: "function_call",
						name: "exec_command",
						arguments: JSON.stringify({ cmd: `cd ${fixture.globalDocs} && cat guides/deploy.md` }),
					},
				},
			));
		await writeText(path.join(fixture.homeDir, ".pi", "agent", "sessions", piDir, "session.jsonl"),
			jsonl(
				{ type: "session", timestamp: "2026-01-03T10:00:00.000Z", cwd: fixture.project },
				{
					type: "message",
					timestamp: "2026-01-03T10:01:00.000Z",
					message: {
						content: [{ type: "toolCall", name: "read", arguments: { path: "docs/setup.md" } }],
					},
				},
			));

		const ranked = await rank(fixture, await refreshRecentIndex(fixture));

		expect(ranked.project).toEqual([
			{ path: fixture.projectDoc, lastReadAt: Date.parse("2026-01-03T10:01:00.000Z"), sessions: 2 },
		]);
		expect(ranked.global).toEqual([
			{ path: fixture.globalDoc, lastReadAt: Date.parse("2026-01-02T10:01:00.000Z"), sessions: 1 },
		]);
	});
});

test("A grown log contributes only its new lines on the next refresh", async () => {
	await withFixture(async fixture => {
		await writeText(fixture.claudeLog,
			jsonl(claudeRead(fixture.project, fixture.projectDoc, "2026-01-01T10:00:00.000Z")));
		await refreshRecentIndex(fixture);

		await appendFile(fixture.claudeLog,
			jsonl(claudeRead(fixture.project, fixture.globalDoc, "2026-01-05T10:00:00.000Z")));
		const index = await refreshRecentIndex(fixture);

		expect(index.logs[fixture.claudeLog]?.reads).toEqual({
			[fixture.projectDoc]: [Date.parse("2026-01-01T10:00:00.000Z"), 1],
			[fixture.globalDoc]: [Date.parse("2026-01-05T10:00:00.000Z"), 1],
		});
		expect((await rank(fixture, index)).project.map(doc => doc.path)).toEqual([
			fixture.globalDoc,
			fixture.projectDoc,
		]);
	});
});

test("A partly written last line waits until the log writes its newline", async () => {
	await withFixture(async fixture => {
		const line = JSON.stringify(
			claudeRead(fixture.project, fixture.projectDoc, "2026-01-01T10:00:00.000Z"),
		);
		await writeText(fixture.claudeLog, line.slice(0, 40));
		expect((await refreshRecentIndex(fixture)).logs[fixture.claudeLog]?.reads).toEqual({});

		await appendFile(fixture.claudeLog, `${line.slice(40)}\n`);
		const index = await refreshRecentIndex(fixture);

		expect(Object.keys(index.logs[fixture.claudeLog]?.reads ?? {})).toEqual([fixture.projectDoc]);
	});
});
