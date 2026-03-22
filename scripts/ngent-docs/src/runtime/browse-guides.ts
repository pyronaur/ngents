import { access, readFile } from "node:fs/promises";
import path from "node:path";

import browseContracts, {
	type GuideMetadata,
	type TopicIndexRow,
} from "./browse-contracts.ts";
import browseParse from "./browse-parse.ts";

const { META_FILE, normalizePath, POSIX_SEP } = browseContracts;

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function readGuideMetadata(directoryPath: string): Promise<GuideMetadata> {
	const guidePath = path.join(directoryPath, META_FILE);
	if (!(await fileExists(guidePath))) {
		return {
			title: null,
			short: null,
			summary: null,
			guideBody: null,
			readWhen: [],
			hints: new Map(),
		};
	}

	const content = await readFile(guidePath, "utf8");
	const frontMatter = browseParse.parseFrontMatter(content);
	return {
		title: browseParse.stringField(frontMatter.values, "title")
			?? browseParse.stringField(frontMatter.values, "name"),
		short: browseParse.stringField(frontMatter.values, "short"),
		summary: browseParse.stringField(frontMatter.values, "summary")
			?? browseParse.parseGuideSummary(content),
		guideBody: browseParse.parseGuideBody(content),
		readWhen: browseParse.stringArrayField(frontMatter.values, "read_when"),
		hints: browseParse.hintMapField(frontMatter.values, "hints"),
		error: frontMatter.error,
	};
}

function resolveHintTargetPath(guideDirectory: string, relativeTarget: string): string {
	return normalizePath(path.resolve(guideDirectory, relativeTarget));
}

async function collectSkillHints(
	topicDir: string,
	skillFile: string,
	guideCache: Map<string, GuideMetadata>,
): Promise<Map<string, string>> {
	const hints = new Map<string, string>();

	for (const directory of guideDirectoriesForSkill(topicDir, skillFile)) {
		let guide = guideCache.get(directory);
		if (!guide) {
			guide = await readGuideMetadata(directory);
			guideCache.set(directory, guide);
		}

		for (const [key, value] of guide.hints) {
			hints.set(resolveHintTargetPath(directory, key), value);
		}
	}

	return hints;
}

function mergeGuideDescriptions(
	target: { short: string | null; summary: string | null },
	guide: GuideMetadata,
): void {
	if (!target.short && guide.short) {
		target.short = guide.short;
	}
	if (!target.summary && guide.summary) {
		target.summary = guide.summary;
	}
}

function createTopicIndexRow(topicName: string, guide: GuideMetadata): TopicIndexRow {
	return {
		name: topicName,
		title: guide.title ?? topicName,
		short: guide.short,
		summary: guide.summary,
	};
}

export function isSameOrDescendantPath(ancestorPath: string, candidatePath: string): boolean {
	return candidatePath === ancestorPath || candidatePath.startsWith(`${ancestorPath}${POSIX_SEP}`);
}

export function guideDirectoriesForSkill(topicDir: string, skillFile: string): string[] {
	const directories: string[] = [];
	let currentDir = normalizePath(path.dirname(skillFile));

	while (isSameOrDescendantPath(topicDir, currentDir)) {
		directories.push(currentDir);
		if (currentDir === topicDir) {
			break;
		}

		const parentDir = normalizePath(path.dirname(currentDir));
		if (parentDir === currentDir) {
			break;
		}

		currentDir = parentDir;
	}

	return directories.reverse();
}

export default {
	collectSkillHints,
	createTopicIndexRow,
	mergeGuideDescriptions,
	readGuideMetadata,
};
