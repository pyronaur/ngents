import { afterEach, expect, test, vi } from "vitest";

import { rootHelpFixture } from "./fixtures/root-help.fixture.ts";

function normalizedLines(text: string): string[] {
	return text.trimEnd().split("\n");
}

function hasHeading(text: string, level: number, headingText: string): boolean {
	return normalizedLines(text).includes(`${"#".repeat(level)} ${headingText}`);
}

function sectionLines(text: string, headingText: string, level: number): string[] {
	const lines = normalizedLines(text);
	const heading = `${"#".repeat(level)} ${headingText}`;
	const start = lines.indexOf(heading);
	if (start === -1) {
		throw new Error(`Missing heading ${heading}`);
	}

	for (let index = start + 1; index < lines.length; index += 1) {
		const line = lines[index];
		if (line && /^#{1,6} /.test(line)) {
			const nextLevel = line.match(/^#+/)?.[0].length ?? 0;
			if (nextLevel <= level) {
				return lines.slice(start + 1, index);
			}
		}
	}

	return lines.slice(start + 1);
}

function restoreColorEnv(input: {
	originalForceColor: string | undefined;
	originalNoColor: string | undefined;
}): void {
	if (input.originalNoColor === undefined) {
		delete process.env.NO_COLOR;
	}
	if (input.originalNoColor !== undefined) {
		process.env.NO_COLOR = input.originalNoColor;
	}
	if (input.originalForceColor === undefined) {
		delete process.env.FORCE_COLOR;
	}
	if (input.originalForceColor !== undefined) {
		process.env.FORCE_COLOR = input.originalForceColor;
	}
}

async function captureRenderedOutput(render: () => Promise<void>): Promise<string> {
	const captured: string[] = [];
	const originalNoColor = process.env.NO_COLOR;
	const originalForceColor = process.env.FORCE_COLOR;

	process.env.NO_COLOR = "1";
	delete process.env.FORCE_COLOR;

	const logSpy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
		captured.push(args.map(value => String(value)).join(" "));
	});

	try {
		await render();
	} finally {
		logSpy.mockRestore();
		restoreColorEnv({
			originalForceColor,
			originalNoColor,
		});
	}

	return `${captured.join("\n")}\n`;
}

async function renderRootHelp(includeDocsIndex: boolean): Promise<string> {
	return captureRenderedOutput(async () => {
		const browseRenderModule = await import("../src/runtime/browse-render.ts");
		browseRenderModule.default.printRootHelp(rootHelpFixture.topics, rootHelpFixture.docs, {
			includeDocsIndex,
		});
	});
}

async function renderOpsHelp(): Promise<string> {
	return captureRenderedOutput(async () => {
		const browseRenderModule = await import("../src/runtime/browse-render.ts");
		browseRenderModule.default.printOpsHelp();
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

test("printRootHelp renders the bare root help behavior", async () => {
	const rendered = await renderRootHelp(true);

	expect(hasHeading(rendered, 1, "docs")).toBe(true);
	expect(rendered).toContain("docs <where>");
	expect(rendered).toContain("docs ls [where]");
	expect(rendered).toContain("docs query [--limit <n>] <query...> | status");
	expect(rendered).toContain("docs topic [topic] [section]");
	expect(rendered).toContain("docs <topic>");
	expect(rendered).toContain("docs <docs-root>");
	expect(rendered).toContain("platform  Platform Library  platform docs");
	expect(sectionLines(rendered, "/fixture/repo/docs", 3)).toEqual([
		"  long-summary.md - This summary is intentionally longer than sixty-four characte...",
		"  web-fetching.md - web browser tools",
		"",
	]);
	expect(rendered).toContain("To read docs operation manual use `docs --ops-help`.");
});

test("printRootHelp renders the help-only root help behavior", async () => {
	const rendered = await renderRootHelp(false);

	expect(hasHeading(rendered, 1, "docs")).toBe(true);
	expect(hasHeading(rendered, 2, "Docs")).toBe(false);
	expect(rendered).toContain("platform  Platform Library  platform docs");
	expect(rendered).toContain("To read docs operation manual use `docs --ops-help`.");
});

test("printOpsHelp renders the ops help behavior", async () => {
	const rendered = await renderOpsHelp();

	expect(hasHeading(rendered, 1, "docs operations")).toBe(true);
	expect(rendered).toContain("docs park <name> [path]");
	expect(rendered).toContain(
		"docs fetch <source> <path> --handler <command> [--root <subpath>] [--transform <command>]",
	);
	expect(rendered).toContain("docs update");
	expect(rendered).toContain("For command-specific syntax details, use each command's `--help`.");
});
