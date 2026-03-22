import { describe, expect, test } from "vitest";

import { guideDirectoriesForSkill, isSameOrDescendantPath } from "../src/runtime/browse-guides.ts";

describe("browse guides path helpers", () => {
	test("treats normalized descendant paths consistently", () => {
		expect(
			isSameOrDescendantPath(
				"C:/repo/docs/topics/ios",
				"C:/repo/docs/topics/ios/skills/ios-debugger-agent",
			),
		).toBe(true);
		expect(isSameOrDescendantPath("C:/repo/docs/topics/ios", "C:/repo/docs/topics/ops")).toBe(false);
	});

	test("collects guide directories from topic root to skill directory", () => {
		expect(
			guideDirectoriesForSkill(
				"/repo/docs/topics/ios",
				"/repo/docs/topics/ios/hig-doctor/skills/hig-patterns/SKILL.md",
			),
		).toEqual([
			"/repo/docs/topics/ios",
			"/repo/docs/topics/ios/hig-doctor",
			"/repo/docs/topics/ios/hig-doctor/skills",
			"/repo/docs/topics/ios/hig-doctor/skills/hig-patterns",
		]);
	});
});
