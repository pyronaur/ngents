import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runtimeError } from "../core/errors.ts";

export type CommandResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

let stdioBrokenPipeHandlingInstalled = false;
let stdoutBrokenPipe = false;
let stderrBrokenPipe = false;

function fail(message: string): never {
	throw runtimeError(message);
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error;
}

function swallowBrokenPipe(error: Error): void {
	if (isErrnoException(error) && error.code === "EPIPE") {
		stdoutBrokenPipe = true;
		stderrBrokenPipe = true;
		return;
	}
	throw error;
}

function isExecutableAccessible(candidatePath: string): Promise<boolean> {
	return access(candidatePath, 0o111)
		.then(() => true)
		.catch(() => false);
}

function isPathLikeCommand(command: string): boolean {
	return path.isAbsolute(command) || command.startsWith("./") || command.startsWith("../")
		|| command.startsWith("~/") || command.includes(path.posix.sep);
}

async function resolveCommandPath(command: string): Promise<string | null> {
	const expandedCommand = expandHomePath(command);
	if (isPathLikeCommand(expandedCommand)) {
		return expandedCommand;
	}

	const pathEnv = process.env.PATH ?? "";
	for (const directory of pathEnv.split(path.delimiter)) {
		const candidatePath = path.join(directory, expandedCommand);
		if (await isExecutableAccessible(candidatePath)) {
			return candidatePath;
		}
	}

	return null;
}

export function expandHomePath(value: string): string {
	const homeDir = process.env.HOME;
	if (!homeDir) {
		return value;
	}
	if (value === "~") {
		return homeDir;
	}
	if (value.startsWith("~/")) {
		return path.join(homeDir, value.slice(2));
	}
	return value;
}

export async function commandSignature(command: string | undefined): Promise<string> {
	if (!command) {
		return "";
	}

	const resolvedPath = await resolveCommandPath(command);
	if (!resolvedPath) {
		return sha256(`command:${command}`);
	}

	let contentsHash = "";
	try {
		contentsHash = sha256(await readFile(resolvedPath));
	} catch {
		contentsHash = "";
	}

	return sha256(`command:${command}\npath:${resolvedPath}\ncontents:${contentsHash}`);
}

export function sha256(value: string | Buffer): string {
	return createHash("sha256").update(value).digest("hex");
}

export async function makeTempDir(prefix: string): Promise<string> {
	return mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function replaceDirectory(targetPath: string, sourcePath: string): Promise<void> {
	await rm(targetPath, { recursive: true, force: true });
	await mkdir(path.dirname(targetPath), { recursive: true });
	await cp(sourcePath, targetPath, { force: true, recursive: true });
}

export async function replaceFile(targetPath: string, contents: Buffer | string): Promise<void> {
	await rm(targetPath, { recursive: true, force: true });
	await mkdir(path.dirname(targetPath), { recursive: true });
	await writeFile(targetPath, contents);
}

export async function runExternalCommand(input: {
	command: string;
	args?: string[];
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	stdin?: Buffer | string;
	streamStderr?: boolean;
	streamStdout?: boolean;
	missingCommandMessage?: string;
}): Promise<CommandResult> {
	const args = input.args ?? [];
	ensureProcessStdioHandlesBrokenPipe();
	return new Promise((resolve, reject) => {
		const child = spawn(input.command, args, {
			cwd: input.cwd,
			env: {
				...process.env,
				...input.env,
			},
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (chunk: Buffer | string) => {
			const text = chunk.toString();
			stdout += text;
			if (input.streamStdout) {
				writeProcessStream(process.stdout, text, {
					isBroken: () => stdoutBrokenPipe,
					setBroken: () => {
						stdoutBrokenPipe = true;
					},
				});
			}
		});
		child.stderr.on("data", (chunk: Buffer | string) => {
			const text = chunk.toString();
			stderr += text;
			if (input.streamStderr) {
				writeProcessStream(process.stderr, text, {
					isBroken: () => stderrBrokenPipe,
					setBroken: () => {
						stderrBrokenPipe = true;
					},
				});
			}
		});
		child.on("error", (error: NodeJS.ErrnoException) => {
			if (error.code === "ENOENT") {
				reject(
					runtimeError(
						input.missingCommandMessage ?? `Required command not found: ${input.command}`,
					),
				);
				return;
			}

			reject(error);
		});
		child.stdin.on("error", (error: NodeJS.ErrnoException) => {
			if (error.code === "EPIPE" || error.code === "ERR_STREAM_DESTROYED") {
				return;
			}
			reject(error);
		});
		child.stdin.end(input.stdin);
		child.on("close", (exitCode) => {
			resolve({
				exitCode: exitCode ?? 1,
				stdout,
				stderr,
			});
		});
	});
}

export async function runTransform(input: {
	command: string;
	source: string;
	inputPath: string;
	outputPath: string;
	targetPath: string;
	stdin?: Buffer;
	root?: string;
}): Promise<CommandResult> {
	const transformCommand = expandHomePath(input.command);
	const result = await runExternalCommand({
		command: transformCommand,
		env: {
			DOCS_FETCH_SOURCE: input.source,
			DOCS_FETCH_INPUT: input.inputPath,
			DOCS_FETCH_OUTPUT: input.outputPath,
			DOCS_FETCH_TARGET: input.targetPath,
			...(input.root ? { DOCS_FETCH_ROOT: input.root } : {}),
		},
		stdin: input.stdin,
	});
	if (result.exitCode !== 0) {
		fail(
			result.stderr.trim() || result.stdout.trim() || `Fetch transform failed: ${input.command}`,
		);
	}
	return result;
}

export function ensureProcessStdioHandlesBrokenPipe(): void {
	if (stdioBrokenPipeHandlingInstalled) {
		return;
	}
	stdioBrokenPipeHandlingInstalled = true;
	process.stdout.on("error", swallowBrokenPipe);
	process.stderr.on("error", swallowBrokenPipe);
	process.stdout.on("close", () => {
		stdoutBrokenPipe = true;
	});
	process.stderr.on("close", () => {
		stderrBrokenPipe = true;
	});
}

export function writeProcessStream(
	stream: NodeJS.WriteStream,
	text: string,
	options: {
		isBroken: () => boolean;
		setBroken: () => void;
	},
): void {
	ensureProcessStdioHandlesBrokenPipe();
	if (options.isBroken() || stream.destroyed || text.length === 0) {
		return;
	}

	stream.write(text, (error?: Error | null) => {
		if (!error) {
			return;
		}
		if (isErrnoException(error) && error.code === "EPIPE") {
			options.setBroken();
			return;
		}
		throw error;
	});
}
