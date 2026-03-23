import { describe, expect, test } from "vitest";

import { guideDirectoriesForSkill, isSameOrDescendantPath } from "../src/runtime/browse-guides.ts";

describe("browse guides path helpers", () => {
	test("treats normalized descendant paths consistently", () => {
		expect(
			isSameOrDescendantPath(
				"C:/repo/docs/topics/topic-a",
				"C:/repo/docs/topics/topic-a/skills/example-skill",
			),
		).toBe(true);
		expect(isSameOrDescendantPath("C:/repo/docs/topics/topic-a", "C:/repo/docs/topics/topic-b")).toBe(false);
	});

	test("collects guide directories from topic root to skill directory", () => {
		expect(
			guideDirectoriesForSkill(
				"/repo/docs/topics/topic-a",
				"/repo/docs/topics/topic-a/section-a/skills/example-skill/SKILL.md",
			),
		).toEqual([
			"/repo/docs/topics/topic-a",
			"/repo/docs/topics/topic-a/section-a",
			"/repo/docs/topics/topic-a/section-a/skills",
			"/repo/docs/topics/topic-a/section-a/skills/example-skill",
		]);
	});
});
