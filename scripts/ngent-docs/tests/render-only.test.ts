import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const snapshotTests = [
	"docs.snapshot.test.ts",
	"ls.snapshot.test.ts",
	"topic.snapshot.test.ts",
	"query.snapshot.test.ts",
	"park.snapshot.test.ts",
];

test("fixture tests do not call the CLI helpers", async () => {
	for (const fileName of snapshotTests) {
		const contents = await readFile(path.join(testsDir, fileName), "utf8");
		expect(contents).not.toContain("runDocsCli");
		expect(contents).not.toContain("runCommand(");
	}
});
