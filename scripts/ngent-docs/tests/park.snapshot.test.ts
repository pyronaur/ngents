import { afterEach, expect, test, vi } from "vitest";

import { runDocsPark } from "../src/runtime/park.ts";
import { parkFixture } from "./fixtures/park.fixture.ts";
import { captureOutput } from "./helpers/render.ts";

const {
	mockAccess,
	mockAddQmdCollection,
	mockInvalidateQmdCollectionsCache,
	mockListQmdCollectionsFresh,
	mockReaddir,
	mockRunDocsUpdate,
	mockStat,
} = vi.hoisted(() => ({
	mockAccess: vi.fn(),
	mockAddQmdCollection: vi.fn(),
	mockInvalidateQmdCollectionsCache: vi.fn(),
	mockListQmdCollectionsFresh: vi.fn(),
	mockReaddir: vi.fn(),
	mockRunDocsUpdate: vi.fn(),
	mockStat: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
	access: mockAccess,
	readdir: mockReaddir,
	stat: mockStat,
}));

vi.mock("../src/runtime/qmd.ts", () => ({
	addQmdCollection: mockAddQmdCollection,
	invalidateQmdCollectionsCache: mockInvalidateQmdCollectionsCache,
	listQmdCollectionsFresh: mockListQmdCollectionsFresh,
}));

vi.mock("../src/runtime/update.ts", () => ({
	runDocsUpdate: mockRunDocsUpdate,
}));

afterEach(() => {
	vi.clearAllMocks();
});

test("docs park success output matches the current output", async () => {
	mockStat.mockImplementation(async (candidatePath: string) => {
		if (candidatePath === "/fixture/repo/docs" || candidatePath === "/fixture/repo/docs/topics") {
			return {
				isDirectory: () => true,
			};
		}

		throw new Error(`Unexpected stat path: ${candidatePath}`);
	});
	mockListQmdCollectionsFresh.mockResolvedValueOnce([]);
	mockAddQmdCollection.mockResolvedValueOnce(undefined);
	mockInvalidateQmdCollectionsCache.mockResolvedValueOnce(undefined);
	mockRunDocsUpdate.mockResolvedValueOnce(undefined);

	const rendered = await captureOutput(() =>
		runDocsPark([parkFixture.collectionName, "/fixture/repo"])
	);

	expect(rendered).toMatchSnapshot();
});
