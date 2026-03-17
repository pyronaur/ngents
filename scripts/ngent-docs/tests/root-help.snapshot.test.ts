import { afterEach, expect, test, vi } from "vitest";

import { rootHelpFixture } from "./fixtures/root-help.fixture.ts";

async function renderRootHelp(includeDocsIndex: boolean): Promise<string> {
	const captured: string[] = [];
	const originalNoColor = process.env.NO_COLOR;
	const originalForceColor = process.env.FORCE_COLOR;

	process.env.NO_COLOR = "1";
	delete process.env.FORCE_COLOR;

	const logSpy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
		captured.push(args.map(value => String(value)).join(" "));
	});

	try {
		const browseRenderModule = await import("../src/runtime/browse-render.ts");
		browseRenderModule.default.printRootHelp(rootHelpFixture.topics, rootHelpFixture.docs, {
			includeDocsIndex,
		});
	} finally {
		logSpy.mockRestore();
		if (originalNoColor === undefined) {
			delete process.env.NO_COLOR;
		} else {
			process.env.NO_COLOR = originalNoColor;
		}
		if (originalForceColor === undefined) {
			delete process.env.FORCE_COLOR;
		} else {
			process.env.FORCE_COLOR = originalForceColor;
		}
	}

	return `${captured.join("\n")}\n`;
}

afterEach(() => {
	vi.restoreAllMocks();
});

test("printRootHelp renders the bare root help snapshot", async () => {
	expect(await renderRootHelp(true)).toMatchSnapshot();
});

test("printRootHelp renders the help-only root help snapshot", async () => {
	expect(await renderRootHelp(false)).toMatchSnapshot();
});
