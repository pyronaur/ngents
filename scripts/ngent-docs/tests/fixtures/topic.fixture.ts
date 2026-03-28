import type {
	MergedTopic,
	SectionEntry,
	TopicIndexRow,
} from "../../src/runtime/browse-contracts.ts";

const localGuidesSection: SectionEntry = {
	key: "docs/guides",
	absolutePath: "/fixture/repo/docs/topics/platform/docs/guides",
	title: "guides",
	short: "local platform guides",
	summary: "Local platform guides.",
	guideBody: "Use local workflows first.",
	readWhen: ["Need guided simulator setup."],
	markdownEntries: [
		{
			absolutePath: "/fixture/repo/docs/topics/platform/docs/guides/session.md",
			relativePath: "docs/guides/session.md",
			title: "Session Guide",
			short: "local workspace setup",
			summary: "Prepare the local workspace before using the topic tooling.",
			readWhen: [],
		},
	],
	skills: [],
	children: [],
};

const globalGuidesSection: SectionEntry = {
	key: "docs/guides",
	absolutePath: "/fixture/home/.ngents/docs/topics/platform/docs/guides",
	title: "guides",
	short: "global platform guides",
	summary: "Global platform guides.",
	guideBody: "Shared machine conventions.",
	readWhen: [],
	markdownEntries: [
		{
			absolutePath: "/fixture/home/.ngents/docs/topics/platform/docs/guides/shared.md",
			relativePath: "docs/guides/shared.md",
			title: "Shared Guide",
			short: null,
			summary: "Shared workspace guidance.",
			readWhen: [],
		},
	],
	skills: [],
	children: [],
};

const contentCardsSkillSection: SectionEntry = {
	key: "pattern-library/skills/content-cards",
	absolutePath: "/fixture/repo/docs/topics/platform/pattern-library/skills/content-cards",
	title: "content-cards",
	short: null,
	summary: "Structured review skill.",
	guideBody: null,
	readWhen: [],
	markdownEntries: [],
	skills: [
		{
			absolutePath:
				"/fixture/repo/docs/topics/platform/pattern-library/skills/content-cards/SKILL.md",
			relativePath: "pattern-library/skills/content-cards/SKILL.md",
			name: "content-cards",
			title: "Content Cards Review",
			description: "Review content card structures and their supporting references.",
			hint: null,
			referencePaths: ["references/checklist.md", "references/examples.md"],
		},
	],
	children: [],
};

const patternLibrarySkillsSection: SectionEntry = {
	key: "pattern-library/skills",
	absolutePath: "/fixture/repo/docs/topics/platform/pattern-library/skills",
	title: "skills",
	short: null,
	summary: null,
	guideBody: null,
	readWhen: [],
	markdownEntries: [],
	skills: [],
	children: [contentCardsSkillSection],
};

const slugSection: SectionEntry = {
	key: "pattern-library/website/app/topics/[slug]",
	absolutePath: "/fixture/repo/docs/topics/platform/pattern-library/website/app/topics/[slug]",
	title: "[slug]",
	short: null,
	summary: null,
	guideBody: null,
	readWhen: [],
	markdownEntries: [],
	skills: [],
	children: [],
};

const topicsSection: SectionEntry = {
	key: "pattern-library/website/app/topics",
	absolutePath: "/fixture/repo/docs/topics/platform/pattern-library/website/app/topics",
	title: "topics",
	short: null,
	summary: null,
	guideBody: null,
	readWhen: [],
	markdownEntries: [],
	skills: [],
	children: [slugSection],
};

const appSection: SectionEntry = {
	key: "pattern-library/website/app",
	absolutePath: "/fixture/repo/docs/topics/platform/pattern-library/website/app",
	title: "app",
	short: null,
	summary: null,
	guideBody: null,
	readWhen: [],
	markdownEntries: [],
	skills: [],
	children: [topicsSection],
};

const uiSection: SectionEntry = {
	key: "pattern-library/website/components/ui",
	absolutePath: "/fixture/repo/docs/topics/platform/pattern-library/website/components/ui",
	title: "ui",
	short: null,
	summary: null,
	guideBody: null,
	readWhen: [],
	markdownEntries: [],
	skills: [],
	children: [],
};

const componentsSection: SectionEntry = {
	key: "pattern-library/website/components",
	absolutePath: "/fixture/repo/docs/topics/platform/pattern-library/website/components",
	title: "components",
	short: null,
	summary: null,
	guideBody: null,
	readWhen: [],
	markdownEntries: [],
	skills: [],
	children: [uiSection],
};

const websiteSection: SectionEntry = {
	key: "pattern-library/website",
	absolutePath: "/fixture/repo/docs/topics/platform/pattern-library/website",
	title: "website",
	short: null,
	summary: null,
	guideBody: null,
	readWhen: [],
	markdownEntries: [],
	skills: [],
	children: [appSection, componentsSection],
};

export const patternLibrarySection: SectionEntry = {
	key: "pattern-library",
	absolutePath: "/fixture/repo/docs/topics/platform/pattern-library",
	title: "pattern-library",
	short: null,
	summary: null,
	guideBody: "Use this subtree before falling back to broader references.",
	readWhen: [],
	markdownEntries: [
		{
			absolutePath: "/fixture/repo/docs/topics/platform/pattern-library/usage.md",
			relativePath: "pattern-library/usage.md",
			title: "Pattern Library Usage",
			short: null,
			summary: "Start here before opening deeper sections in the subtree.",
			readWhen: [],
		},
	],
	skills: [],
	children: [patternLibrarySkillsSection, websiteSection],
};

export const directSkillSection: SectionEntry = {
	key: "workflow-agent",
	absolutePath: "/fixture/repo/docs/topics/platform/workflow-agent",
	title: "workflow-agent",
	short: null,
	summary: "Workflow skill.",
	guideBody: null,
	readWhen: [],
	markdownEntries: [],
	skills: [
		{
			absolutePath: "/fixture/repo/docs/topics/platform/workflow-agent/SKILL.md",
			relativePath: "workflow-agent/SKILL.md",
			name: "workflow-agent",
			title: "Workflow Agent",
			description: "Run the current workflow against a local test environment.",
			hint: "Workflow-first checks.",
			referencePaths: ["references/checklist.md", "references/troubleshooting.md"],
		},
	],
	children: [],
};

export const topicIndexRows = [
	{
		name: "platform",
		title: "Platform Library",
		short: "platform docs",
		summary: "Platform references and skills.",
	},
	{
		name: "ops",
		title: "Ops Notes",
		short: null,
		summary:
			"This summary is intentionally longer than sixty-four characters so compact views must truncate it.",
	},
] satisfies TopicIndexRow[];

export const platformTopicFixture = {
	topic: {
		name: "platform",
		title: "Platform Library",
		contributions: [
			{
				name: "platform",
				absolutePath: "/fixture/repo/docs/topics/platform",
				title: "Platform Library",
				short: "platform docs",
				summary: "Platform references and skills.",
				guideBody: "Use `docs topic platform <path>` to focus one path inside the topic.",
				readWhen: [],
				markdownEntries: [
					{
						absolutePath: "/fixture/repo/docs/topics/platform/overview.md",
						relativePath: "overview.md",
						title: "Topic Overview",
						short: "entry point",
						summary: "Start here for the shared topic entry point.",
						readWhen: [],
					},
				],
				sectionEntries: [localGuidesSection, patternLibrarySection, directSkillSection],
			},
			{
				name: "platform",
				absolutePath: "/fixture/home/.ngents/docs/topics/platform",
				title: "Platform Library",
				short: "global platform docs",
				summary: "Global platform references.",
				guideBody: "Shared machine-level platform context.",
				readWhen: ["Need reusable machine docs."],
				markdownEntries: [
					{
						absolutePath: "/fixture/home/.ngents/docs/topics/platform/overview.md",
						relativePath: "overview.md",
						title: "Platform Overview",
						short: null,
						summary: "Global overview notes.",
						readWhen: [],
					},
				],
				sectionEntries: [globalGuidesSection],
			},
		],
	} satisfies MergedTopic,
	focusedSection: {
		key: "docs/guides",
		sections: [localGuidesSection, globalGuidesSection],
	},
	deepFocusedSection: {
		key: patternLibrarySection.key,
		sections: [patternLibrarySection],
	},
	directSkillSection,
};
