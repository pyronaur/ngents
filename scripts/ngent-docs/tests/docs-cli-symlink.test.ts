import { mkdir, realpath, symlink } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

import { resolveDocsSelectorRoute } from "../src/runtime/browse-route.ts";
import { withTempDir, writeText } from "./helpers/fs.ts";

test("A symlinked nested docs root contributes its document once", async () => {
	await withTempDir("docs-symlink-", async tempDir => {
		const currentDir = await realpath(tempDir);
		const registryPath = path.join(currentDir, "collections.json");
		await mkdir(path.join(currentDir, ".git"));
		await writeText(registryPath, "[]");
		await writeText(path.join(currentDir, "myapp", "docs", "guide.md"), "# Guide\n");
		await symlink(path.join("myapp", "docs"), path.join(currentDir, "docs"), "dir");

		const route = await resolveDocsSelectorRoute({
			currentDir,
			registryPath,
			mode: "docs",
			selector: null,
		});

		expect(route).toMatchObject({
			kind: "docs",
			view: { kind: "browse", docs: [{ relativePath: "guide.md" }] },
		});
	});
});
