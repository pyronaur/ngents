import os from "node:os";
import path from "node:path";

// Commands whose file arguments mean "the agent read this file".
const READ_COMMANDS = new Set(["bat", "cat", "docs", "head", "less", "more", "nl", "sed", "tail"]);
const SEGMENT_SEPARATOR = /&&|\|\||[;|\n]/;
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

function tokenize(segment: string): string[] {
	const tokens: string[] = [];
	for (const match of segment.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/g)) {
		tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
	}
	return tokens;
}

function expandHome(value: string): string {
	if (value === "~") {
		return os.homedir();
	}
	if (value.startsWith("~/")) {
		return path.join(os.homedir(), value.slice(2));
	}
	return value;
}

function commandWords(segment: string): string[] {
	const words = tokenize(segment.trim());
	while (words[0] && ENV_ASSIGNMENT.test(words[0])) {
		words.shift();
	}
	return words;
}

function markdownArguments(words: string[], cwd: string | null): string[] {
	return words
		.slice(1)
		.filter(word => word.endsWith(".md") && !word.startsWith("-"))
		.map(word => resolveShellPath(cwd, word))
		.filter(value => value !== null);
}

/** Absolute path for a path argument, or null when relative with no known cwd. */
export function resolveShellPath(cwd: string | null, value: string): string | null {
	const expanded = expandHome(value);
	if (path.isAbsolute(expanded)) {
		return path.normalize(expanded);
	}
	if (!cwd) {
		return null;
	}
	return path.resolve(cwd, expanded);
}

/** Markdown files read by a shell command, following `cd` between segments. */
export function shellMarkdownReads(command: string, cwd: string | null): string[] {
	const reads: string[] = [];
	let currentDir = cwd;
	for (const segment of command.split(SEGMENT_SEPARATOR)) {
		const words = commandWords(segment);
		const program = path.basename(words[0] ?? "");
		if (program === "cd" && words[1]) {
			currentDir = resolveShellPath(currentDir, words[1]);
			continue;
		}
		if (READ_COMMANDS.has(program)) {
			reads.push(...markdownArguments(words, currentDir));
		}
	}
	return reads;
}
