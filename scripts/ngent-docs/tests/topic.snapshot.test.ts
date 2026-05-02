import { expect, test } from "vitest";

import browseRender from "../src/runtime/browse-render.ts";
import { platformTopicFixture, topicIndexRows } from "./fixtures/topic.fixture.ts";
import { captureOutput } from "./helpers/render.ts";

test("docs topic index matches the current output", async () => {
	const rendered = await captureOutput(() => browseRender.printTopicBrowser(topicIndexRows));

	expect(rendered).toMatchSnapshot();
});

test("docs topic parked collection browser matches the current output", async () => {
	const rendered = await captureOutput(() =>
		browseRender.printScopedTopicBrowser(topicIndexRows, {
			title: "Topics: machine",
		})
	);

	expect(rendered).toMatchSnapshot();
});

test("docs topic overview matches the current output", async () => {
	const rendered = await captureOutput(() =>
		browseRender.printTopicView(platformTopicFixture.topic)
	);

	expect(rendered).toMatchSnapshot();
});

test("docs topic focused path matches the current output", async () => {
	const rendered = await captureOutput(() =>
		browseRender.printFocusedSection({
			...platformTopicFixture.focusedSection,
			topicName: platformTopicFixture.topic.name,
		})
	);

	expect(rendered).toMatchSnapshot();
});

test("docs topic focused nested path matches the current output", async () => {
	const rendered = await captureOutput(() =>
		browseRender.printFocusedSection({
			...platformTopicFixture.deepFocusedSection,
			topicName: platformTopicFixture.topic.name,
		})
	);

	expect(rendered).toMatchSnapshot();
});

test("docs topic direct skill view matches the current output", async () => {
	const rendered = await captureOutput(() =>
		browseRender.printFocusedSection({
			key: platformTopicFixture.directSkillSection.key,
			sections: [platformTopicFixture.directSkillSection],
			topicName: platformTopicFixture.topic.name,
		})
	);

	expect(rendered).toMatchSnapshot();
});
