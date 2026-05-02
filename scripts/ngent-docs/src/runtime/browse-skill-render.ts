import path from "node:path";

import pc from "picocolors";

import browseContracts, { type SectionEntry, type SkillEntry } from "./browse-contracts.ts";

const { errorText, heading, normalizeInlineText } = browseContracts;
type SkillListOptions = {
	description?: boolean;
	headingLevel?: 3 | 4 | 5 | 6;
	metadata?: string[];
	sectionKey: string;
	sectionPath: string;
	skills: SkillEntry[];
	title?: string;
	topicName: string;
};

type TemplateEntry = { parts: string[]; variable: string };

function selector(skill: SkillEntry): string {
	return skill.relativePath.replace(/\/SKILL\.md$/u, "");
}
function directory(skill: SkillEntry): string {
	return path.basename(selector(skill));
}
function template(entries: TemplateEntry[]): string[] | null {
	const first = entries[0]?.parts;
	if (!first || entries.some(entry => entry.parts.length !== first.length)) {
		return null;
	}

	let variableIndex: number | null = null;
	for (const [index, value] of first.entries()) {
		if (!entries.some(entry => entry.parts[index] !== value)) {
			continue;
		}
		if (variableIndex !== null) {
			return null;
		}
		variableIndex = index;
	}
	if (
		variableIndex === null || entries.some(entry => entry.parts[variableIndex] !== entry.variable)
	) {
		return null;
	}

	const parts = [...first];
	parts[variableIndex] = "{$directory}";
	return parts;
}
function skillPath(base: string, skills: SkillEntry[]): string | null {
	if (skills.length === 1) {
		return skills[0]?.absolutePath ?? null;
	}

	const entries: TemplateEntry[] = [];
	for (const skill of skills) {
		if (!skill.absolutePath.startsWith(`${base}/`)) {
			return null;
		}
		entries.push({
			parts: skill.absolutePath.slice(base.length + 1).split("/").filter(Boolean),
			variable: directory(skill),
		});
	}

	const parts = template(entries);
	return parts ? `${base}/${parts.join("/")}` : null;
}
function skillOpen(topicName: string, skills: SkillEntry[]): string | null {
	if (skills.length === 1) {
		const [skill] = skills;
		return skill ? `docs topic ${topicName} ${selector(skill)}` : null;
	}

	const parts = template(skills.map(skill => ({
		parts: selector(skill).split("/").filter(Boolean),
		variable: directory(skill),
	})));
	return parts ? `docs topic ${topicName} ${parts.join("/")}` : null;
}
function displaySelector(sectionKey: string, skill: SkillEntry): string {
	const value = selector(skill);
	if (value === sectionKey) {
		return path.basename(value);
	}
	return value.startsWith(`${sectionKey}/`) ? value.slice(sectionKey.length + 1) : value;
}
function sorted(skills: SkillEntry[]): SkillEntry[] {
	return [...skills].sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}
function metaLine(label: "Open" | "Path", value: string): string {
	return pc.gray(`${label}: ${value}`);
}
function skillLine(skill: SkillEntry, options: SkillListOptions): string {
	const description = options.description
		? normalizeInlineText(skill.hint) ?? normalizeInlineText(skill.description)
		: normalizeInlineText(skill.hint);
	const line = `- ${displaySelector(options.sectionKey, skill)}: $${skill.name}`;
	return description ? `${line} - ${description}` : line;
}
function fallbackSkillLines(options: SkillListOptions): string[] {
	return sorted(options.skills).flatMap(skill => [
		skillLine(skill, options),
		`  ${metaLine("Path", skill.absolutePath)}`,
		`  ${metaLine("Open", `docs topic ${options.topicName} ${selector(skill)}`)}`,
	]);
}

export function renderSkillList(options: SkillListOptions): string[] {
	const skills = sorted(options.skills);
	if (skills.length === 0) {
		return [];
	}

	const lines = options.title ? [heading(options.headingLevel ?? 3, options.title)] : [];
	const pathLine = skillPath(options.sectionPath, skills);
	const openLine = skillOpen(options.topicName, skills);
	if (!pathLine || !openLine) {
		lines.push(...(options.metadata ?? []), ...fallbackSkillLines({ ...options, skills }));
		return lines;
	}

	lines.push(metaLine("Path", pathLine), metaLine("Open", openLine), "");
	if (options.metadata && options.metadata.length > 0) {
		lines.push(...options.metadata, "");
	}
	lines.push(...skills.map(skill => skillLine(skill, options)));
	return lines;
}

export function renderDirectSkill(section: SectionEntry, topicName: string): string[] {
	const [skill] = section.skills;
	if (!skill) {
		return [];
	}

	const description = normalizeInlineText(skill.description) ?? normalizeInlineText(skill.hint);
	return [
		metaLine("Path", skill.absolutePath),
		metaLine("Open", `docs topic ${topicName} ${selector(skill)}`),
		...(description || skill.error || skill.referencePaths.length > 0 ? [""] : []),
		...(description ? [description] : []),
		...(skill.error ? [errorText(skill.error)] : []),
		...(skill.referencePaths.length > 0
			? [
				...(description || skill.error ? [""] : []),
				heading(3, "References"),
				...skill.referencePaths.map(referencePath => `- ${path.basename(referencePath)}`),
			]
			: []),
	];
}
