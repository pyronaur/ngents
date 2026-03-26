import path from "node:path";

import pc from "picocolors";

import browseContracts, {
	type BrowseInventory,
	type MarkdownEntry,
	type MergedTopic,
	type RegisteredDocsRow,
	type SectionEntry,
	type TopicIndexRow,
} from "./browse-contracts.ts";
import {
	isCompactFocusedSkillSection,
	printCompactFocusedSkillSection,
	printFocusedSkillsBlock,
} from "./browse-focused-skills.ts";
import {
	printScopedTopicBrowser,
	printTopicBrowser,
} from "./browse-topic-browser.ts";
import { printTopicOverview } from "./browse-topic-overview.ts";
import { availableSectionKeys } from "./browse-topic-sections.ts";
import { groupedDocs } from "./docs-grouping.ts";

const {
	compactDescription,
	errorText,
	heading,
	normalizeInlineText,
	printLine,
} = browseContracts;

function printGuideBody(guideBody: string): void {
	for (const line of guideBody.split("\n")) {
		printLine(line);
	}
}

function renderBlock(
	renderLines: (pushLine: (text?: string, indent?: number) => void) => void,
): string {
	const lines: string[] = [];
	renderLines((text = "", indent = 0) => {
		lines.push(`${" ".repeat(indent)}${text}`);
	});
	return lines.join("\n");
}

function renderInventoryTopicLines(topics: TopicIndexRow[]): string[] {
	return topics.map(topic => {
		const description = compactDescription(topic.short, topic.summary);
		if (!description) {
			return `- ${topic.name}`;
		}
		return `- ${topic.name} - ${description}`;
	});
}

function renderRegisteredDocsLines(registeredDocs: RegisteredDocsRow[]): string[] {
	return registeredDocs.map(directory =>
		`- ${directory.name}: ${directory.absolutePaths.join(", ")}`
	);
}

function pushBrowseInventory(
	pushLine: (text?: string, indent?: number) => void,
	inventory: BrowseInventory,
): void {
	const hasTopics = inventory.topics.length > 0;
	const hasRegisteredDocs = inventory.registeredDocs.length > 0;
	if (!hasTopics && !hasRegisteredDocs) {
		pushLine("[no topics or registered docs found]");
		return;
	}

	if (hasTopics) {
		pushLine(heading(2, "Topics"));
		pushLine("Use `docs topic <name>` to inspect a topic directly.");
		for (const line of renderInventoryTopicLines(inventory.topics)) {
			pushLine(line);
		}
	}

	if (hasTopics && hasRegisteredDocs) {
		pushLine();
	}

	if (hasRegisteredDocs) {
		pushLine(heading(2, "Registered Docs"));
		pushLine("You can see the full index with compact descriptions using `docs ls`");
		pushLine("These are registered doc directories:");
		for (const line of renderRegisteredDocsLines(inventory.registeredDocs)) {
			pushLine(line);
		}
	}
}

function renderSelectorNotFound(
	selector: string,
	inventory: BrowseInventory,
	options: { topicHint?: string } = {},
): string {
	return renderBlock(pushLine => {
		pushLine(`Sorry, \`${selector}\` not found`);
		if (options.topicHint) {
			pushLine("- `docs ls` only opens registered docs directories");
			pushLine(
				`- \`${options.topicHint}\` is a topic you can inspect with \`docs topic ${options.topicHint}\``,
			);
		}
		if (!options.topicHint) {
			pushLine("- I couldn't locate a registered docs directory called that");
		}
		pushLine();
		pushLine("Here's what I do have:");
		pushBrowseInventory(pushLine, inventory);
	});
}

function renderRootSelectorNotFound(
	selector: string,
	commands: string[],
	inventory: BrowseInventory,
): string {
	return renderBlock(pushLine => {
		pushLine(`Sorry, \`${selector}\` not found`);
		pushLine(`- It's not a command: ${commands.join(", ")}`);
		pushLine("- I couldn't locate a topic or registered docs source called that either");
		pushLine();
		pushLine("Here's what I do have:");
		pushBrowseInventory(pushLine, inventory);
	});
}

function printExpandedDocDescription(entry: MarkdownEntry): void {
	if (entry.readWhen.length > 0) {
		for (const readWhen of entry.readWhen) {
			printLine(pc.gray(readWhen), 3);
		}
		return;
	}

	const summary = normalizeInlineText(entry.summary);
	if (summary) {
		printLine(pc.gray(summary), 3);
	}
}

function printExpandedDocsIndex(
	docs: MarkdownEntry[],
	options: {
		title: string;
		titleLevel: 1 | 2;
		groupHeadingLevel: 2 | 3;
		topicHint?: string;
	},
): void {
	printLine(heading(options.titleLevel, options.title));
	if (options.topicHint) {
		printLine(`Topic available: docs topic ${options.topicHint}`);
	}
	if (docs.length === 0) {
		printLine();
		printLine("- [no docs found]");
		return;
	}

	printLine();
	for (const [groupIndex, [directoryPath, entries]] of groupedDocs(docs).entries()) {
		printLine(heading(options.groupHeadingLevel, directoryPath));
		for (
			const [entryIndex, entry] of entries
				.sort((left, right) => left.absolutePath.localeCompare(right.absolutePath))
				.entries()
		) {
			printLine(`- ${path.basename(entry.absolutePath)}`, 1);
			printExpandedDocDescription(entry);
			if (entry.error) {
				printLine(errorText(entry.error), 3);
			}
			if (entryIndex < entries.length - 1) {
				printLine();
			}
		}
		if (groupIndex < groupedDocs(docs).length - 1) {
			printLine();
		}
	}
}

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

function printMarkdownDetails(entry: MarkdownEntry, level: HeadingLevel): void {
	printLine(heading(level, entry.title ?? entry.relativePath));
	printLine(`${pc.dim("path:")} ${pc.dim(entry.absolutePath)}`);

	const summary = normalizeInlineText(entry.summary) ?? compactDescription(entry.short, null);
	if (summary) {
		printLine(summary);
	}
	if (entry.readWhen.length > 0) {
		printLine(`${pc.dim("Read when:")} ${entry.readWhen.join("; ")}`);
	}
	if (entry.error) {
		printLine(errorText(entry.error));
	}
}

function printTopicView(topic: MergedTopic): void {
	printTopicOverview(topic, {
		titlePrefix: "Topic: ",
	});
}

function sharedSectionTitle(sectionKey: string, sections: SectionEntry[]): string {
	for (const section of sections) {
		const title = section.title.trim();
		if (title.length > 0) {
			return title;
		}
	}

	return path.basename(sectionKey);
}

function nextHeadingLevel(level: HeadingLevel): HeadingLevel {
	if (level === 2) {
		return 3;
	}
	if (level === 3) {
		return 4;
	}
	if (level === 4) {
		return 5;
	}
	return 6;
}

function printGuideSectionMetadata(
	guideBody: string | null,
	error: string | undefined,
	readWhen: string[],
): void {
	if (guideBody) {
		printGuideBody(guideBody);
	}
	if (error) {
		printLine(errorText(error));
	}
	if (readWhen.length > 0) {
		printLine(`${pc.dim("Read when:")} ${readWhen.join("; ")}`);
	}
	if (guideBody || error || readWhen.length > 0) {
		printLine();
	}
}

function printFocusedSectionBody(section: SectionEntry): void {
	printLine(`${pc.dim("source:")} ${pc.dim(section.absolutePath)}`);
	printGuideSectionMetadata(section.guideBody, section.error, section.readWhen);

	printFocusedSkillsBlock(section);
	if (section.skills.length > 0 && section.markdownEntries.length > 0) {
		printLine();
	}

	for (const [index, entry] of section.markdownEntries.entries()) {
		printMarkdownDetails(entry, 3);
		if (index < section.markdownEntries.length - 1) {
			printLine();
		}
	}

	if (
		(section.skills.length > 0 || section.markdownEntries.length > 0) && section.children.length > 0
	) {
		printLine();
	}

	for (const [index, child] of section.children.entries()) {
		printFocusedSubtree(child, 3);
		if (index < section.children.length - 1) {
			printLine();
		}
	}
	if (
		section.markdownEntries.length === 0 && section.skills.length === 0
		&& section.children.length === 0
	) {
		printLine(pc.dim("[no section entries found]"));
	}
}

function printFocusedSubtree(section: SectionEntry, headingLevel: 2 | 3 | 4 | 5 | 6): void {
	if (isCompactFocusedSkillSection(section)) {
		printCompactFocusedSkillSection(section, { headingLevel });
		return;
	}

	printLine(heading(headingLevel, sharedSectionTitle(section.key, [section])));
	printLine(`${pc.dim("path:")} ${pc.dim(section.absolutePath)}/`);
	printGuideSectionMetadata(section.guideBody, section.error, section.readWhen);

	if (section.skills.length > 0) {
		printFocusedSkillsBlock(section, {
			blockHeadingLevel: nextHeadingLevel(headingLevel),
			entryHeadingPrefix: "#####",
		});
		if (section.markdownEntries.length > 0 || section.children.length > 0) {
			printLine();
		}
	}

	for (const [index, entry] of section.markdownEntries.entries()) {
		printMarkdownDetails(entry, nextHeadingLevel(headingLevel));
		if (index < section.markdownEntries.length - 1) {
			printLine();
		}
	}

	if (section.markdownEntries.length > 0 && section.children.length > 0) {
		printLine();
	}

	for (const [index, child] of section.children.entries()) {
		printFocusedSubtree(child, nextHeadingLevel(headingLevel));
		if (index < section.children.length - 1) {
			printLine();
		}
	}

	if (
		section.skills.length === 0 && section.markdownEntries.length === 0
		&& section.children.length === 0
	) {
		printLine(pc.dim("[no section entries found]"));
	}
}

function printFocusedSection(sectionView: { key: string; sections: SectionEntry[] }): void {
	if (sectionView.sections.length === 1) {
		const [section] = sectionView.sections;
		if (section && isCompactFocusedSkillSection(section)) {
			printCompactFocusedSkillSection(section);
			return;
		}
	}

	printLine(heading(2, sharedSectionTitle(sectionView.key, sectionView.sections)));
	printLine();

	for (const [index, section] of sectionView.sections.entries()) {
		printFocusedSectionBody(section);
		if (index < sectionView.sections.length - 1) {
			printLine();
		}
	}
}

function printDocsBrowser(
	docs: MarkdownEntry[],
	options: {
		title?: string;
		titleLevel?: 1 | 2;
		groupHeadingLevel?: 2 | 3;
		topicHint?: string;
	} = {},
): void {
	printExpandedDocsIndex(docs, {
		title: options.title ?? "Docs",
		titleLevel: options.titleLevel ?? 1,
		groupHeadingLevel: options.groupHeadingLevel ?? 2,
		topicHint: options.topicHint,
	});
}

function printCombinedSelectorView(
	selector: string,
	topic: MergedTopic,
	docs: MarkdownEntry[],
): void {
	printLine(heading(1, `Docs: ${selector}`));
	printLine();
	printTopicOverview(topic, {
		titleLevel: 2,
		titlePrefix: "Topic: ",
		sectionHeadingLevel: 3,
		entryHeadingLevel: 4,
	});
	printLine();
	printLine();
	printExpandedDocsIndex(docs, {
		title: `Docs: ${selector}`,
		titleLevel: 2,
		groupHeadingLevel: 3,
	});
}

function printCollectionSelectorView(
	selector: string,
	topics: TopicIndexRow[],
	docs: MarkdownEntry[],
): void {
	printLine(heading(1, `Docs: ${selector}`));

	if (topics.length > 0) {
		printLine();
		printScopedTopicBrowser(topics, {
			title: `Topics: ${selector}`,
			titleLevel: 2,
		});
	}

	if (docs.length > 0 || topics.length === 0) {
		if (topics.length > 0) {
			printLine();
			printLine();
		}
		printExpandedDocsIndex(docs, {
			title: `Docs: ${selector}`,
			titleLevel: 2,
			groupHeadingLevel: 3,
		});
	}
}

export default {
	availableSectionKeys,
	printCollectionSelectorView,
	printCombinedSelectorView,
	printDocsBrowser,
	printFocusedSection,
	printScopedTopicBrowser,
	renderRootSelectorNotFound,
	renderSelectorNotFound,
	printTopicBrowser,
	printTopicView,
};
