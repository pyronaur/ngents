import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

const templatesDir = fileURLToPath(new URL("../templates", import.meta.url));

function readTemplate(relativePath: string): string {
	return readFileSync(`${templatesDir}/${relativePath}`, "utf8");
}

test("screen templates use the topic table partial", () => {
	expect(readTemplate("screens/docs-root-help.md")).toContain("partials/topic-table.md");
	expect(readTemplate("screens/docs-collection-selector.md")).toContain("partials/topic-table.md");
	expect(readTemplate("screens/topic-browser.md")).toContain("partials/topic-table.md");
	expect(readTemplate("screens/topic-scoped-browser.md")).toContain("partials/topic-table.md");
});

test("screen templates use docs group partials", () => {
	expect(readTemplate("screens/docs-root-help.md")).toContain("partials/compact-docs-group.md");
	expect(readTemplate("screens/topic-overview.md")).toContain("partials/compact-docs-group.md");
	expect(readTemplate("screens/docs-collection-selector.md")).toContain("partials/expanded-docs-group.md");
	expect(readTemplate("screens/docs-combined-selector.md")).toContain("partials/expanded-docs-group.md");
	expect(readTemplate("screens/ls-browser.md")).toContain("partials/expanded-docs-group.md");
});

test("docs and topic table partials stay as the central consistency points", () => {
	expect(readTemplate("partials/topic-table.md")).toContain("join");
	expect(readTemplate("partials/compact-docs-group.md")).toContain("join");
});
