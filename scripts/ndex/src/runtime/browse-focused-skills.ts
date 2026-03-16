import pc from "picocolors";

import type { SectionEntry } from "./browse-contracts.ts";
import browseContracts from "./browse-contracts.ts";
import { groupedSkillReferenceNames } from "./browse-skill-references.ts";

const { errorText, heading, normalizeInlineText, printLine } = browseContracts;

function skillDisplayLabel(section: SectionEntry): string {
	const [skill] = section.skills;
	if (!skill) {
		return section.key;
	}

	return skill.title ?? skill.name;
}

function rootSkillRelativePath(section: SectionEntry): string {
	return `${section.key}/SKILL.md`;
}

function printSkillDescriptionAndReferences(
	section: SectionEntry,
	options: {
		pathLabel: boolean;
		referenceHeadingPrefix: "###" | "#####";
		blankLineAfterPath: boolean;
	},
): void {
	const [skill] = section.skills;
	if (!skill) {
		return;
	}

	const referenceGroups = groupedSkillReferenceNames(skill);
	if (options.pathLabel) {
		printLine(`${pc.dim("path:")} ${pc.dim(skill.absolutePath)}`);
		return printSkillDescriptionAndReferencesBody(
			descriptionAndReferenceState(skill, referenceGroups),
			options,
		);
	}
	printLine(skill.absolutePath);
	return printSkillDescriptionAndReferencesBody(
		descriptionAndReferenceState(skill, referenceGroups),
		options,
	);
}

function descriptionAndReferenceState(
	skill: SectionEntry["skills"][number],
	referenceGroups: ReturnType<typeof groupedSkillReferenceNames>,
): {
	description: string | null;
	referenceGroups: ReturnType<typeof groupedSkillReferenceNames>;
	skill: SectionEntry["skills"][number];
} {
	return {
		description: normalizeInlineText(skill.description),
		referenceGroups,
		skill,
	};
}

function printSkillDescriptionAndReferencesBody(
	state: {
		description: string | null;
		referenceGroups: ReturnType<typeof groupedSkillReferenceNames>;
		skill: SectionEntry["skills"][number];
	},
	options: {
		pathLabel: boolean;
		referenceHeadingPrefix: "###" | "#####";
		blankLineAfterPath: boolean;
	},
): void {
	const { description, referenceGroups, skill } = state;
	if (options.blankLineAfterPath && (description || skill.error || referenceGroups.length > 0)) {
		printLine();
	}
	if (description) {
		printLine(description);
	}
	if (skill.error) {
		printLine(errorText(skill.error));
	}
	for (const [index, [directoryPath, fileNames]] of referenceGroups.entries()) {
		if (index > 0 || description || skill.error) {
			printLine();
		}
		printLine(`${options.referenceHeadingPrefix} ${directoryPath}/:`);
		for (const fileName of fileNames) {
			printLine(`- ${fileName}`);
		}
	}
}

export function isCompactFocusedSkillSection(section: SectionEntry): boolean {
	if (section.markdownEntries.length > 0 || section.skills.length !== 1) {
		return false;
	}

	const [skill] = section.skills;
	if (!skill) {
		return false;
	}

	return skill.relativePath === rootSkillRelativePath(section);
}

export function printCompactFocusedSkillSection(section: SectionEntry): void {
	printLine(heading(2, skillDisplayLabel(section)));
	printSkillDescriptionAndReferences(section, {
		pathLabel: false,
		referenceHeadingPrefix: "###",
		blankLineAfterPath: true,
	});
}

export function printFocusedSkillsBlock(section: SectionEntry): void {
	if (section.skills.length === 0) {
		return;
	}

	printLine(heading(3, "Skills"));
	printLine();

	for (const [index, skill] of section.skills.entries()) {
		printLine(`#### ${skill.title ?? skill.name}`);
		printSkillDescriptionAndReferences(
			{
				...section,
				skills: [skill],
			},
			{ pathLabel: true, referenceHeadingPrefix: "#####", blankLineAfterPath: false },
		);
		if (index < section.skills.length - 1) {
			printLine();
		}
	}
}
