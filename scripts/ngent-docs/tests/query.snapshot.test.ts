import { afterEach, expect, test, vi } from "vitest";

import { runDocsQuery } from "../src/runtime/query.ts";
import { queryFixture } from "./fixtures/query.fixture.ts";
import { captureOutput } from "./helpers/render.ts";

const { mockListQmdCollections, mockRunQmd } = vi.hoisted(() => ({
	mockListQmdCollections: vi.fn(),
	mockRunQmd: vi.fn(),
}));

vi.mock("../src/runtime/qmd.ts", () => ({
	CACHE_ROOT: "/fixture/home/.cache/qmd",
	CONFIG_ROOT: "/fixture/home/.config/qmd",
	INDEX_NAME: "ngents-docs",
	listQmdCollections: mockListQmdCollections,
	runQmd: mockRunQmd,
}));

afterEach(() => {
	vi.clearAllMocks();
});

test("docs query results match the current output", async () => {
	mockListQmdCollections.mockResolvedValueOnce([
		{
			name: "ngents",
			path: "/fixture/home/.ngents/docs",
		},
	]);
	mockRunQmd.mockResolvedValueOnce({
		exitCode: 0,
		stderr: "",
		stdout: JSON.stringify(queryFixture.results),
	});

	const rendered = await captureOutput(() => runDocsQuery(["docs", "query"]));

	expect(rendered).toMatchSnapshot();
});

test("docs query no-results output matches the current output", async () => {
	mockListQmdCollections.mockResolvedValueOnce([
		{
			name: "ngents",
			path: "/fixture/home/.ngents/docs",
		},
	]);
	mockRunQmd.mockResolvedValueOnce({
		exitCode: 0,
		stderr: "",
		stdout: JSON.stringify(queryFixture.noResults),
	});

	const rendered = await captureOutput(() => runDocsQuery(["missing"]));

	expect(rendered).toMatchSnapshot();
});

test("docs query status output matches the current output", async () => {
	mockRunQmd.mockResolvedValueOnce({
		exitCode: 0,
		stderr: "",
		stdout: queryFixture.status.qmdStatusOutput,
	});
	mockListQmdCollections.mockResolvedValueOnce([
		{
			name: "ngents",
			path: "/fixture/home/.ngents/docs",
		},
	]);

	const rendered = await captureOutput(() => runDocsQuery(["status"]));

	expect(rendered).toMatchSnapshot();
});
