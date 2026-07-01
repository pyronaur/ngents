import { symlink } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

import { runDocsCli } from "./helpers/cli.ts";
import { withDocsCliWorkspace, writeText } from "./helpers/docs-cli-fixture.ts";

test("docs ls lists a symlinked nested docs root once", async () => {
	await withDocsCliWorkspace(
		"docs-ls-symlinked-root-",
		async ({ repoDir, env }) => {
			await writeText(path.join(repoDir, "myapp", "docs", "foo.md"), "# Foo\n");
			await symlink(path.join("myapp", "docs"), path.join(repoDir, "docs"), "dir");

			const result = await runDocsCli(["ls"], { cwd: repoDir, env });

			expect(result.exitCode).toBe(0);
			expect(result.stdout.match(/foo\.md/gu)).toHaveLength(1);
		},
		{ seedLocalDocsRepo: false, seedGlobalDocsHome: false, seedGlobalDocsIndex: false },
	);
});
