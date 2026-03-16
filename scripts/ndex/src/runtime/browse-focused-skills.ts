import pc from "picocolors";

import type { SectionEntry } from "./browse-contracts.ts";
import browseContracts from "./browse-contracts.ts";
import { groupedSkillReferenceNames } from "./browse-skill-references.ts";

const { errorText, heading, normalizeInlineText, printLine } = browseContracts;

export function printFocusedSkillsBlock(section: SectionEntry): void {
	if (section.skills.length === 0) {
		return;
	}

	printLine(heading(3, "Skills"));
	printLine();

	for (const [index, skill] of section.skills.entries()) {
		printLine(`#### ${skill.title ?? skill.name}`);
		printLine(`${pc.dim("path:")} ${pc.dim(skill.absolutePath)}`);

		const description = normalizeInlineText(skill.description);
		if (description) {
			printLine(description);
		}
		if (skill.error) {
			printLine(errorText(skill.error));
		}
		for (const [directoryPath, fileNames] of groupedSkillReferenceNames(skill)) {
			printLine();
			printLine(`##### ${directoryPath}/:`);
			for (const fileName of fileNames) {
				printLine(`- ${fileName}`);
			}
		}
		if (index < section.skills.length - 1) {
			printLine();
		}
	}
}
