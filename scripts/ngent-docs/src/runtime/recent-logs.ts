import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { resolveShellPath, shellMarkdownReads } from "./recent-shell.ts";

type SessionAgent = "claude" | "codex" | "pi";

export type SessionLogFile = {
	agent: SessionAgent;
	path: string;
	size: number;
	mtimeMs: number;
};

/** Session state carried between incremental scans of one log. */
export type SessionContext = {
	cwd: string | null;
	startedAt: number | null;
};

type MarkdownRead = {
	path: string;
	at: number;
};

const FILE_READ_TOOLS = new Set(["Read", "read", "read_file"]);
const SHELL_TOOLS = new Set([
	"Bash",
	"bash",
	"exec_command",
	"local_shell",
	"shell",
	"shell_command",
]);
const STAT_BATCH = 256;

const toolInputSchema = z.object({
	cmd: z.string().optional(),
	command: z.union([z.string(), z.array(z.string())]).optional(),
	file_path: z.string().optional(),
	path: z.string().optional(),
	workdir: z.string().optional(),
});

const toolCallSchema = z.object({
	type: z.enum(["tool_use", "toolCall"]),
	name: z.string(),
	input: z.unknown().optional(),
	arguments: z.unknown().optional(),
});

const lineSchema = z.object({
	type: z.string().optional(),
	timestamp: z.string().optional(),
	cwd: z.string().optional(),
	message: z.object({ content: z.unknown() }).optional(),
	payload: z.unknown().optional(),
});

const codexPayloadSchema = z.object({
	type: z.string().optional(),
	cwd: z.string().optional(),
	timestamp: z.string().optional(),
	name: z.string().optional(),
	arguments: z.string().optional(),
});

type SessionLine = z.infer<typeof lineSchema>;

function parseTimestamp(value: string | undefined): number | null {
	if (!value) {
		return null;
	}
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? null : parsed;
}

function shellCommandText(command: string | string[] | undefined): string | null {
	if (Array.isArray(command)) {
		return command.at(-1) ?? null;
	}
	return command ?? null;
}

function toolCallReads(name: string, rawInput: unknown, cwd: string | null): string[] {
	const parsed = toolInputSchema.safeParse(rawInput);
	if (!parsed.success) {
		return [];
	}
	const input = parsed.data;
	const workdir = input.workdir ?? cwd;
	if (FILE_READ_TOOLS.has(name)) {
		const target = input.file_path ?? input.path;
		const resolved = target?.endsWith(".md") ? resolveShellPath(workdir, target) : null;
		return resolved ? [resolved] : [];
	}
	if (!SHELL_TOOLS.has(name)) {
		return [];
	}
	const command = input.cmd ?? shellCommandText(input.command);
	return command ? shellMarkdownReads(command, workdir) : [];
}

function contentToolCallReads(content: unknown, cwd: string | null): string[] {
	if (!Array.isArray(content)) {
		return [];
	}
	return content.flatMap(item => {
		const call = toolCallSchema.safeParse(item);
		if (!call.success) {
			return [];
		}
		return toolCallReads(call.data.name, call.data.input ?? call.data.arguments, cwd);
	});
}

function stampReads(paths: string[], at: number | null): MarkdownRead[] {
	if (at === null) {
		return [];
	}
	return paths.map(readPath => ({ path: readPath, at }));
}

function claudeLineReads(line: SessionLine, context: SessionContext): MarkdownRead[] {
	context.cwd = line.cwd ?? context.cwd;
	const at = parseTimestamp(line.timestamp) ?? context.startedAt;
	return stampReads(contentToolCallReads(line.message?.content, context.cwd), at);
}

function piLineReads(line: SessionLine, context: SessionContext): MarkdownRead[] {
	if (line.type === "session") {
		context.cwd = line.cwd ?? context.cwd;
		context.startedAt = parseTimestamp(line.timestamp);
		return [];
	}
	const at = parseTimestamp(line.timestamp) ?? context.startedAt;
	return stampReads(contentToolCallReads(line.message?.content, context.cwd), at);
}

function codexLineReads(line: SessionLine, context: SessionContext): MarkdownRead[] {
	// Older Codex logs store payload fields at the top level.
	const payload = codexPayloadSchema.safeParse(line.payload ?? line);
	if (!payload.success) {
		return [];
	}
	const lineAt = parseTimestamp(line.timestamp ?? payload.data.timestamp);
	context.startedAt ??= lineAt;
	if (line.type === "session_meta" || line.type === "turn_context") {
		context.cwd = payload.data.cwd ?? context.cwd;
		return [];
	}
	const { name, arguments: rawArguments } = payload.data;
	if (payload.data.type !== "function_call" || !name || !rawArguments) {
		return [];
	}
	const reads = toolCallReads(name, parseJson(rawArguments), context.cwd);
	return stampReads(reads, lineAt ?? context.startedAt);
}

const LINE_READERS: Record<
	SessionAgent,
	(line: SessionLine, context: SessionContext) => MarkdownRead[]
> = {
	claude: claudeLineReads,
	codex: codexLineReads,
	pi: piLineReads,
};

// Cheap substring checks so only lines that can matter get JSON-parsed.
function mayMatter(agent: SessionAgent, text: string, context: SessionContext): boolean {
	if (agent === "codex" && (context.startedAt === null || text.includes("\"turn_context\""))) {
		return true;
	}
	if (agent === "pi" && text.startsWith("{\"type\":\"session\"")) {
		return true;
	}
	return text.includes(".md") && /"tool_use"|"toolCall"|"function_call"/.test(text);
}

async function listJsonlFiles(directory: string): Promise<string[]> {
	let entries;
	try {
		entries = await readdir(directory, { withFileTypes: true, recursive: true });
	} catch {
		return [];
	}
	return entries
		.filter(entry => entry.isFile() && entry.name.endsWith(".jsonl"))
		.map(entry => path.join(entry.parentPath, entry.name));
}

// pi names session folders after the encoded cwd. Folders outside home are
// throwaway runs in temp directories, so they are skipped without reading.
async function listPiSessionFiles(sessionsDir: string, homeDir: string): Promise<string[]> {
	const homePrefix = `--${homeDir.slice(1).replaceAll("/", "-")}-`;
	let entries;
	try {
		entries = await readdir(sessionsDir, { withFileTypes: true });
	} catch {
		return [];
	}
	const projectDirs = entries.filter(entry =>
		entry.isDirectory() && entry.name.startsWith(homePrefix)
	);
	const nested = await Promise.all(
		projectDirs.map(entry => listJsonlFiles(path.join(sessionsDir, entry.name))),
	);
	return nested.flat();
}

async function statLogs(agent: SessionAgent, filePaths: string[]): Promise<SessionLogFile[]> {
	const logs: SessionLogFile[] = [];
	for (let index = 0; index < filePaths.length; index += STAT_BATCH) {
		const batch = filePaths.slice(index, index + STAT_BATCH);
		const stats = await Promise.all(batch.map(filePath => stat(filePath).catch(() => null)));
		stats.forEach((fileStat, batchIndex) => {
			const filePath = batch[batchIndex];
			if (fileStat && filePath) {
				logs.push({ agent, path: filePath, size: fileStat.size, mtimeMs: fileStat.mtimeMs });
			}
		});
	}
	return logs;
}

/** Session logs written by Claude Code, Codex, and pi under `homeDir`. */
export async function listSessionLogs(homeDir: string): Promise<SessionLogFile[]> {
	const [claude, codex, codexArchived, pi] = await Promise.all([
		listJsonlFiles(path.join(homeDir, ".claude", "projects")),
		listJsonlFiles(path.join(homeDir, ".codex", "sessions")),
		listJsonlFiles(path.join(homeDir, ".codex", "archived_sessions")),
		listPiSessionFiles(path.join(homeDir, ".pi", "agent", "sessions"), homeDir),
	]);
	const groups = await Promise.all([
		statLogs("claude", claude),
		statLogs("codex", [...codex, ...codexArchived]),
		statLogs("pi", pi),
	]);
	return groups.flat();
}

/** Parsed JSON, or null for text that is not valid JSON. */
export function parseJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

/** Markdown reads recorded on one log line. Updates `context` as session state changes. */
export function sessionLineReads(
	agent: SessionAgent,
	text: string,
	context: SessionContext,
): MarkdownRead[] {
	if (!mayMatter(agent, text, context)) {
		return [];
	}
	const line = lineSchema.safeParse(parseJson(text));
	if (!line.success) {
		return [];
	}
	return LINE_READERS[agent](line.data, context);
}
