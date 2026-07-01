#!/usr/bin/env bun
import { $ } from "bun";
import path from "node:path";
import { mkdir, readdir, writeFile } from "node:fs/promises";

const ANSI_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;

function stripAnsi(value: string): string {
	return value.replace(ANSI_PATTERN, "");
}

async function runReview(): Promise<{ readonly raw: string; readonly exitCode: number }> {
	const output = await $`codex review --uncommitted 2>&1`.nothrow().quiet();
	return { raw: output.stdout.toString(), exitCode: output.exitCode };
}

function afterLastCodexSpeaker(raw: string): string {
	const lines = stripAnsi(raw).trimEnd().split(/\r?\n/);
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		if (lines[index]?.trim() === "codex") {
			return lines.slice(index + 1).join("\n").trim();
		}
	}

	return lines.slice(Math.max(0, lines.length - 80)).join("\n").trim();
}

function removeDuplicateFinalBlock(text: string): string {
	const lines = text.trim().split(/\r?\n/);
	for (let split = 1; split < lines.length; split += 1) {
		const first = lines.slice(0, split).join("\n").trim();
		const second = lines.slice(split).join("\n").trim();
		if (first && first === second) {
			return first;
		}
	}

	return text.trim();
}

function extractReview(raw: string): string {
	const block = afterLastCodexSpeaker(raw).replace(/\n```\s*$/u, "").trim();
	return removeDuplicateFinalBlock(block) || "No review block extracted; inspect the transcript.";
}

async function nextLabel(reviewDir: string): Promise<string> {
	let entries: string[] = [];
	try {
		entries = await readdir(reviewDir);
	} catch {
		return "r001";
	}

	const max = entries.reduce((current, entry) => {
		const match = /^r(\d{3})\.md$/u.exec(entry);
		return match ? Math.max(current, Number(match[1])) : current;
	}, 0);
	return `r${String(max + 1).padStart(3, "0")}`;
}

function defaultReviewDir(): string {
	const slug = process.env.PI_WORKS_SLUG;
	if (!slug) {
		throw new Error("PI_WORKS_SLUG is required to choose the review workspace.");
	}
	return path.resolve(process.cwd(), ".tmp", "work", slug, "review");
}

function transcriptMarkdown(options: {
	readonly label: string;
	readonly cwd: string;
	readonly command: string;
	readonly exitCode: number;
	readonly review: string;
	readonly raw: string;
}): string {
	return `# Codex Review ${options.label}

cwd: \`${options.cwd}\`
command: \`${options.command}\`
exit code: \`${options.exitCode}\`

## Review

${options.review}

## Full Transcript

\`\`\`text
${options.raw.trimEnd()}
\`\`\`
`;
}

async function main(): Promise<number> {
	if (Bun.argv.length > 2) {
		throw new Error("codex-review.ts accepts no arguments.");
	}

	const reviewDir = defaultReviewDir();
	await mkdir(reviewDir, { recursive: true });
	const label = await nextLabel(reviewDir);
	const transcriptPath = path.join(reviewDir, `${label}.md`);
	const result = await runReview();
	const review = extractReview(result.raw);
	await writeFile(transcriptPath, transcriptMarkdown({
		label,
		cwd: process.cwd(),
		command: "codex review --uncommitted",
		exitCode: result.exitCode,
		review,
		raw: result.raw,
	}), "utf8");

	console.error(`Saved transcript: ${transcriptPath}`);
	console.log(review);
	return result.exitCode;
}

try {
	process.exitCode = await main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
