#!/usr/bin/env bun
import { $ } from "bun";
import path from "node:path";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

const ANSI_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;

type ReviewMode =
	| { readonly kind: "uncommitted" }
	| { readonly kind: "base"; readonly value: string }
	| { readonly kind: "commit"; readonly value: string };

type Options = {
	readonly mode: ReviewMode;
	readonly workspaceDir?: string;
	readonly workspaceSlug?: string;
	readonly label?: string;
	readonly extractFile?: string;
	readonly help: boolean;
};

function usage(): string {
	return `Usage:
  bun scripts/codex-review.ts [--workspace <slug>|--workspace-dir <dir>] [--label r001]
  bun scripts/codex-review.ts --base <branch> [--workspace <slug>|--workspace-dir <dir>]
  bun scripts/codex-review.ts --commit <sha> [--workspace <slug>|--workspace-dir <dir>]
  bun scripts/codex-review.ts --extract-file <transcript.md>

Default mode is: codex review --uncommitted
Default workspace slug comes from: PI_WORKS_SLUG
`;
}

function parseArgs(argv: readonly string[]): Options {
	let mode: ReviewMode = { kind: "uncommitted" };
	let workspaceDir: string | undefined;
	let workspaceSlug: string | undefined;
	let label: string | undefined;
	let extractFile: string | undefined;
	let help = false;

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		const next = argv[index + 1];
		if (arg === "--help" || arg === "-h") {
			help = true;
			continue;
		}
		if (arg === "--workspace-dir" && next) {
			workspaceDir = next;
			index += 1;
			continue;
		}
		if (arg === "--workspace" && next) {
			workspaceSlug = slugify(next);
			index += 1;
			continue;
		}
		if (arg === "--label" && next) {
			label = next;
			index += 1;
			continue;
		}
		if (arg === "--base" && next) {
			mode = { kind: "base", value: next };
			index += 1;
			continue;
		}
		if (arg === "--commit" && next) {
			mode = { kind: "commit", value: next };
			index += 1;
			continue;
		}
		if (arg === "--extract-file" && next) {
			extractFile = next;
			index += 1;
			continue;
		}
		throw new Error(`Unknown or incomplete argument: ${arg ?? ""}`);
	}

	return { mode, workspaceDir, workspaceSlug, label, extractFile, help };
}

function slugify(value: string): string {
	const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
	return slug || "workspace";
}

function stripAnsi(value: string): string {
	return value.replace(ANSI_PATTERN, "");
}

function commandText(mode: ReviewMode): string {
	if (mode.kind === "base") {
		return `codex review --base ${mode.value}`;
	}
	if (mode.kind === "commit") {
		return `codex review --commit ${mode.value}`;
	}
	return "codex review --uncommitted";
}

async function runReview(mode: ReviewMode): Promise<{ readonly raw: string; readonly exitCode: number }> {
	const output = mode.kind === "base"
		? await $`codex review --base ${mode.value} 2>&1`.nothrow().quiet()
		: mode.kind === "commit"
		? await $`codex review --commit ${mode.value} 2>&1`.nothrow().quiet()
		: await $`codex review --uncommitted 2>&1`.nothrow().quiet();

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

function defaultReviewDir(options: Options): string {
	if (options.workspaceDir) {
		return path.resolve(options.workspaceDir, "review");
	}

	const slug = options.workspaceSlug
		?? slugify(process.env.PI_WORKS_SLUG ?? path.basename(process.cwd()));
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
	const options = parseArgs(Bun.argv.slice(2));
	if (options.help) {
		console.log(usage());
		return 0;
	}
	if (options.extractFile) {
		const raw = await readFile(options.extractFile, "utf8");
		console.log(extractReview(raw));
		return 0;
	}

	const reviewDir = defaultReviewDir(options);
	await mkdir(reviewDir, { recursive: true });
	const label = options.label ?? await nextLabel(reviewDir);
	const transcriptPath = path.join(reviewDir, `${label}.md`);
	const result = await runReview(options.mode);
	const review = extractReview(result.raw);
	await writeFile(transcriptPath, transcriptMarkdown({
		label,
		cwd: process.cwd(),
		command: commandText(options.mode),
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
