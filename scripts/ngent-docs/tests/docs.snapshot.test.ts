import { expect, test } from "vitest";

import browseRender from "../src/runtime/browse-render.ts";
import helpRender from "../src/runtime/help-render.ts";
import { docsRootHelpFixture } from "./fixtures/docs.fixture.ts";
import { captureOutput } from "./helpers/render.ts";

test("docs root help with docs index matches the current output", async () => {
	const rendered = await captureOutput(() =>
		helpRender.printRootHelp(docsRootHelpFixture.topics, docsRootHelpFixture.docs, {
			includeDocsIndex: true,
		})
	);

	expect(rendered).toMatchSnapshot();
});

test("docs root help without docs index matches the current output", async () => {
	const rendered = await captureOutput(() =>
		helpRender.printRootHelp(docsRootHelpFixture.topics, docsRootHelpFixture.docs, {
			includeDocsIndex: false,
		})
	);

	expect(rendered).toMatchSnapshot();
});

test("docs ops help matches the current output", async () => {
	const rendered = await captureOutput(() => helpRender.printOpsHelp());

	expect(rendered).toMatchSnapshot();
});

test("docs parked collection selector view matches the current output", async () => {
	const rendered = await captureOutput(() =>
		browseRender.printCollectionSelectorView(
			docsRootHelpFixture.collectionSelector.selector,
			docsRootHelpFixture.collectionSelector.topics,
			docsRootHelpFixture.collectionSelector.docs,
		)
	);

	expect(rendered).toMatchSnapshot();
});

test("docs overlapping topic and docs selector view matches the current output", async () => {
	const rendered = await captureOutput(() =>
		browseRender.printCombinedSelectorView(
			docsRootHelpFixture.combinedSelector.selector,
			docsRootHelpFixture.combinedSelector.topic,
			docsRootHelpFixture.combinedSelector.docs,
		)
	);

	expect(rendered).toMatchSnapshot();
});
