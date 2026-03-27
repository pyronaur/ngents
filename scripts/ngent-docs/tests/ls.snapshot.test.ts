import { expect, test } from "vitest";

import browseRender from "../src/runtime/browse-render.ts";
import { lsFixture } from "./fixtures/ls.fixture.ts";
import { captureOutput } from "./helpers/render.ts";

test("docs ls default browser matches the current output", async () => {
	const rendered = await captureOutput(() =>
		browseRender.printDocsBrowser(lsFixture.defaultView.docs)
	);

	expect(rendered).toMatchSnapshot();
});

test("docs ls selector browser matches the current output", async () => {
	const rendered = await captureOutput(() =>
		browseRender.printDocsBrowser(
			lsFixture.selectorView.docs,
			lsFixture.selectorView.options,
		)
	);

	expect(rendered).toMatchSnapshot();
});
