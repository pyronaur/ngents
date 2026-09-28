import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

import {
	listSessionLogs,
	parseJson,
	type SessionContext,
	sessionLineReads,
	type SessionLogFile,
} from "./recent-logs.ts";

const CHUNK_BYTES = 4 * 1024 * 1024;
const SCAN_CONCURRENCY = 16;
const NEWLINE = 0x0a;

// Per log: where scanning stopped, the session state needed to resume there,
// and the markdown files it read as `path -> [last read ms, read count]`.
const logEntrySchema = z.object({
	size: z.number(),
	mtimeMs: z.number(),
	offset: z.number(),
	cwd: z.string().nullable(),
	startedAt: z.number().nullable(),
	reads: z.record(z.string(), z.tuple([z.number(), z.number()])),
});

const recentIndexSchema = z.object({
	logs: z.record(z.string(), logEntrySchema),
});

export type RecentLogEntry = z.infer<typeof logEntrySchema>;

export type RecentIndex = z.infer<typeof recentIndexSchema>;

function emptyEntry(): RecentLogEntry {
	return { size: 0, mtimeMs: 0, offset: 0, cwd: null, startedAt: null, reads: {} };
}

async function loadIndex(indexPath: string): Promise<RecentIndex> {
	// A missing or unreadable index is rebuilt from the logs.
	const raw = await readFile(indexPath, "utf8").catch(() => "");
	const parsed = recentIndexSchema.safeParse(parseJson(raw));
	return parsed.success ? parsed.data : { logs: {} };
}

async function saveIndex(indexPath: string, index: RecentIndex): Promise<void> {
	await mkdir(path.dirname(indexPath), { recursive: true });
	const tempPath = `${indexPath}.${process.pid}.tmp`;
	try {
		await writeFile(tempPath, JSON.stringify(index));
		await rename(tempPath, indexPath);
	} finally {
		await rm(tempPath, { force: true });
	}
}

function recordLines(text: string, log: SessionLogFile, entry: RecentLogEntry): void {
	const context: SessionContext = { cwd: entry.cwd, startedAt: entry.startedAt };
	for (const line of text.split("\n")) {
		for (const read of sessionLineReads(log.agent, line, context)) {
			const [lastAt, count] = entry.reads[read.path] ?? [0, 0];
			entry.reads[read.path] = [Math.max(lastAt, read.at), count + 1];
		}
	}
	entry.cwd = context.cwd;
	entry.startedAt = context.startedAt;
}

// Logs are append-only JSONL, so scanning resumes at the last complete line.
async function scanLog(log: SessionLogFile, previous: RecentLogEntry): Promise<RecentLogEntry> {
	const entry = { ...previous, reads: { ...previous.reads }, size: log.size, mtimeMs: log.mtimeMs };
	const handle = await open(log.path, "r");
	try {
		let position = entry.offset;
		let carry = Buffer.alloc(0);
		while (position < log.size) {
			const chunk = Buffer.alloc(Math.min(CHUNK_BYTES, log.size - position));
			const { bytesRead } = await handle.read(chunk, 0, chunk.length, position);
			if (bytesRead === 0) {
				break;
			}
			position += bytesRead;
			const data = Buffer.concat([carry, chunk.subarray(0, bytesRead)]);
			const lineEnd = data.lastIndexOf(NEWLINE);
			carry = lineEnd === -1 ? data : data.subarray(lineEnd + 1);
			if (lineEnd !== -1) {
				recordLines(data.subarray(0, lineEnd).toString("utf8"), log, entry);
			}
		}
		entry.offset = position - carry.length;
		return entry;
	} finally {
		await handle.close();
	}
}

function isUnchanged(log: SessionLogFile, entry: RecentLogEntry | undefined): boolean {
	return entry !== undefined && entry.size === log.size && entry.mtimeMs === log.mtimeMs;
}

function resumeFrom(log: SessionLogFile, entry: RecentLogEntry | undefined): RecentLogEntry {
	// A log that shrank was rewritten; its old reads no longer apply.
	if (!entry || log.size < entry.offset) {
		return emptyEntry();
	}
	return entry;
}

async function scanChanged(
	changed: SessionLogFile[],
	previous: RecentIndex,
	next: RecentIndex,
): Promise<void> {
	let cursor = 0;
	const worker = async (): Promise<void> => {
		for (let log = changed[cursor++]; log; log = changed[cursor++]) {
			const entry = await scanLog(log, resumeFrom(log, previous.logs[log.path])).catch(() => null);
			if (entry) {
				next.logs[log.path] = entry;
			}
		}
	};
	await Promise.all(Array.from({ length: SCAN_CONCURRENCY }, worker));
}

export function recentIndexPath(): string {
	return path.join(os.homedir(), ".ngents", "local", "docs", "recent-index.json");
}

/**
 * Bring the index up to date with the session logs under `homeDir`.
 * Unchanged logs are skipped, grown logs are read from their saved offset,
 * and logs that disappeared are dropped.
 */
export async function refreshRecentIndex(input: {
	homeDir: string;
	indexPath: string;
}): Promise<RecentIndex> {
	const [previous, logs] = await Promise.all([
		loadIndex(input.indexPath),
		listSessionLogs(input.homeDir),
	]);
	const next: RecentIndex = { logs: {} };
	const changed: SessionLogFile[] = [];
	for (const log of logs) {
		const entry = previous.logs[log.path];
		if (entry && isUnchanged(log, entry)) {
			next.logs[log.path] = entry;
			continue;
		}
		changed.push(log);
	}
	await scanChanged(changed, previous, next);
	if (changed.length > 0 || logs.length !== Object.keys(previous.logs).length) {
		await saveIndex(input.indexPath, next);
	}
	return next;
}
