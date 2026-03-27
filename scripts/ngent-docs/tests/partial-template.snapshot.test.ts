import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

import { createCommandLiquidEngine } from "../src/runtime/command-template.ts";

const templatesDir = fileURLToPath(new URL("../templates", import.meta.url));
const engine = createCommandLiquidEngine(templatesDir);

function normalize(text: string): string {
	return text.replaceAll(/\r\n/g, "\n").replace(/^\n+/, "").replace(/\n+$/, "");
}

function render(template: string, context: Record<string, unknown>): string {
	return normalize(engine.parseAndRenderSync(template, context));
}

test("topic table partial matches the current output", () => {
	const rendered = render("{% render partials/topic-table.md, topic_table: topic_table %}", {
		topic_table: {
			header_line: "TOPIC     TITLE             DESCRIPTION",
			row_lines: [
				"platform  Platform Library  platform docs",
				"ops       Ops Notes         broader operational references",
			],
		},
	});

	expect(rendered).toMatchSnapshot();
});

test("compact docs group partial matches the current output", () => {
	const rendered = render("{% render partials/compact-docs-group.md, group: group %}", {
		group: {
			entry_lines: [
				"  main.md - read this first",
				"  reference.md - deeper material",
			],
			heading_line: "### /fixture/docs/architecture",
		},
	});

	expect(rendered).toMatchSnapshot();
});

test("expanded docs group partial matches the current output in tight mode", () => {
	const rendered = render(
		"{% render partials/expanded-docs-group.md, group: group, spaced_entries: false %}",
		{
			group: {
				entries: [
					{
						detail_lines: ["   First summary line."],
						file_line: " - main.md",
					},
					{
						detail_lines: ["   Second summary line.", "   Follow-up note."],
						file_line: " - reference.md",
					},
				],
				heading_line: "### /fixture/docs/architecture",
			},
		},
	);

	expect(rendered).toMatchSnapshot();
});

test("expanded docs group partial matches the current output in spaced mode", () => {
	const rendered = render(
		"{% render partials/expanded-docs-group.md, group: group, spaced_entries: true %}",
		{
			group: {
				entries: [
					{
						detail_lines: ["   First summary line."],
						file_line: " - main.md",
					},
					{
						detail_lines: ["   Second summary line."],
						file_line: " - reference.md",
					},
				],
				heading_line: "## /fixture/docs/architecture",
			},
		},
	);

	expect(rendered).toMatchSnapshot();
});
