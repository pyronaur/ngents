import { access, realpath } from "node:fs/promises";
import os from "node:os";

import browseContracts from "./browse-contracts.ts";
import { discoverDocsSources } from "./browse-sources.ts";
import commandTemplate from "./command-template.ts";
import { readMarkdownDocument } from "./markdown-document.ts";
import { recentIndexPath, refreshRecentIndex } from "./recent-index.ts";
import { rankRecentDocs, type RecentDoc } from "./recent-rank.ts";
import templateOutput from "./template-output.ts";

const { compactDescription, directoryDisplayPath, heading, homeRelativePath } = browseContracts;

const SECTION_LIMIT = 12;
const AGE_UNITS: Array<[label: string, ms: number]> = [
	["y", 365 * 24 * 60 * 60 * 1000],
	["mo", 30 * 24 * 60 * 60 * 1000],
	["d", 24 * 60 * 60 * 1000],
	["h", 60 * 60 * 1000],
	["m", 60 * 1000],
];

function formatAge(elapsedMs: number): string {
	for (const [label, unitMs] of AGE_UNITS) {
		if (elapsedMs >= unitMs) {
			return `${Math.floor(elapsedMs / unitMs)}${label} ago`;
		}
	}
	return "just now";
}

async function docDescription(docPath: string): Promise<string | null> {
	const doc = await readMarkdownDocument(docPath).catch(() => null);
	if (!doc) {
		return null;
	}
	return compactDescription(doc.short, doc.summary) ?? doc.title;
}

async function docEntry(doc: RecentDoc, now: number) {
	const description = await docDescription(doc.path);
	const sessions = doc.sessions === 1 ? "1 session" : `${doc.sessions} sessions`;
	const usage = `${formatAge(now - doc.lastReadAt)} · ${sessions}`;
	return {
		detail_lines: [`   ${description ? `${description} · ${usage}` : usage}`],
		file_line: ` - ${homeRelativePath(doc.path)}`,
	};
}

async function section(title: string, docs: RecentDoc[], now: number) {
	return {
		entries: await Promise.all(docs.map(doc => docEntry(doc, now))),
		heading_line: heading(2, title),
	};
}

// Ranked doc paths are real paths, so roots must be too.
async function canonicalRoots(roots: string[]): Promise<string[]> {
	return Promise.all(roots.map(root => realpath(root).catch(() => root)));
}

async function indexExists(indexPath: string): Promise<boolean> {
	try {
		await access(indexPath);
		return true;
	} catch {
		return false;
	}
}

export async function runDocsRecent(projectDir: string): Promise<void> {
	const indexPath = recentIndexPath();
	if (!(await indexExists(indexPath))) {
		console.error(
			"Indexing agent session logs. The first run reads every log and can take a while.",
		);
	}
	const [sources, index] = await Promise.all([
		discoverDocsSources(projectDir),
		refreshRecentIndex({ homeDir: os.homedir(), indexPath }),
	]);
	const projectRoot = sources.repoRoot ?? sources.currentDir;
	const ranked = await rankRecentDocs(index, {
		projectRoot,
		globalDocsRoots: await canonicalRoots(sources.globalDocsRoots),
		limit: SECTION_LIMIT,
	});
	const now = Date.now();
	templateOutput.printRenderedTemplate(commandTemplate.renderRecentTemplate({
		sections: await Promise.all([
			section(`This project: ${directoryDisplayPath(projectRoot)}`, ranked.project, now),
			section("Global", ranked.global, now),
		]),
		title_line: heading(1, "Recent docs"),
		view: "recent",
	}));
}
