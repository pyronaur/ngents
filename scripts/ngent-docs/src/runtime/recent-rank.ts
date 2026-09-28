import { realpath } from "node:fs/promises";
import path from "node:path";

import browseContracts from "./browse-contracts.ts";
import type { RecentIndex, RecentLogEntry } from "./recent-index.ts";

const { EXCLUDED_DIRS } = browseContracts;

export type RecentDoc = {
	path: string;
	lastReadAt: number;
	sessions: number;
};

type RecentDocs = {
	project: RecentDoc[];
	global: RecentDoc[];
};

type RankScope = {
	projectRoot: string;
	globalDocsRoots: string[];
	limit: number;
};

const SKIPPED_DIRS = new Set([...EXCLUDED_DIRS, ".git", ".tmp", "tmp"]);

function isWithin(target: string, root: string): boolean {
	return target === root || target.startsWith(`${root}${path.sep}`);
}

function isDocPath(filePath: string, docsRoots: string[]): boolean {
	if (!filePath.endsWith(".md") || path.basename(filePath) === "SKILL.md") {
		return false;
	}
	const directories = path.dirname(filePath).split(path.sep);
	if (directories.some(segment => SKIPPED_DIRS.has(segment))) {
		return false;
	}
	return directories.includes("docs") || docsRoots.some(root => isWithin(filePath, root));
}

// Reads through symlinked paths collapse onto one doc; deleted docs drop out.
async function canonicalDocPaths(
	index: RecentIndex,
	docsRoots: string[],
): Promise<Map<string, string>> {
	const candidates = new Set<string>();
	for (const entry of Object.values(index.logs)) {
		for (const readPath of Object.keys(entry.reads)) {
			if (isDocPath(readPath, docsRoots)) {
				candidates.add(readPath);
			}
		}
	}
	const resolved = await Promise.all(
		Array.from(candidates,
			async readPath => [readPath, await realpath(readPath).catch(() => null)] as const),
	);
	const canonical = new Map<string, string>();
	for (const [readPath, realPath] of resolved) {
		if (realPath) {
			canonical.set(readPath, realPath);
		}
	}
	return canonical;
}

function sessionDocReads(
	entry: RecentLogEntry,
	canonical: Map<string, string>,
): Map<string, number> {
	const reads = new Map<string, number>();
	for (const [readPath, [lastReadAt]] of Object.entries(entry.reads)) {
		const docPath = canonical.get(readPath);
		if (docPath) {
			reads.set(docPath, Math.max(reads.get(docPath) ?? 0, lastReadAt));
		}
	}
	return reads;
}

function addSession(usage: Map<string, RecentDoc>, reads: Map<string, number>): void {
	for (const [docPath, lastReadAt] of reads) {
		const current = usage.get(docPath);
		usage.set(docPath, {
			path: docPath,
			lastReadAt: Math.max(current?.lastReadAt ?? 0, lastReadAt),
			sessions: (current?.sessions ?? 0) + 1,
		});
	}
}

function mostRecentFirst(usage: Map<string, RecentDoc>, limit: number): RecentDoc[] {
	return Array.from(usage.values())
		.sort((left, right) => right.lastReadAt - left.lastReadAt)
		.slice(0, limit);
}

function isGlobalDoc(docPath: string, globalDocsRoots: string[]): boolean {
	return globalDocsRoots.some(root => isWithin(docPath, root));
}

/**
 * Docs agents read, most recently read first (move-to-front order).
 * `project` covers sessions started inside `projectRoot`. `global` covers
 * docs under the global docs roots read in any session, minus docs already
 * listed for the project.
 */
export async function rankRecentDocs(index: RecentIndex, scope: RankScope): Promise<RecentDocs> {
	const canonical = await canonicalDocPaths(index, scope.globalDocsRoots);
	const projectUsage = new Map<string, RecentDoc>();
	const globalUsage = new Map<string, RecentDoc>();
	for (const entry of Object.values(index.logs)) {
		const reads = sessionDocReads(entry, canonical);
		if (entry.cwd !== null && isWithin(entry.cwd, scope.projectRoot)) {
			addSession(projectUsage, reads);
		}
		addSession(globalUsage, reads);
	}
	const project = mostRecentFirst(projectUsage, scope.limit);
	for (const [docPath] of globalUsage) {
		if (!isGlobalDoc(docPath, scope.globalDocsRoots) || project.some(doc => doc.path === docPath)) {
			globalUsage.delete(docPath);
		}
	}
	return { project, global: mostRecentFirst(globalUsage, scope.limit) };
}
