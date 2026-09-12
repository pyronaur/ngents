import { access, copyFile, mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

import { toDocsError } from "../core/errors.ts";
import {
	makeTempDir,
	replaceDirectory,
	replaceFile,
	runTransform,
} from "./fetch-handler-support.ts";
import { materializeTransformOutput, mergeMarkdownFileTarget } from "./fetch-transform-output.ts";

async function listRegularFiles(directoryPath: string): Promise<string[]> {
	const entries = await readdir(directoryPath, { withFileTypes: true });
	const files = await Promise.all(entries.map(async (entry) => {
		const entryPath = path.join(directoryPath, entry.name);
		if (entry.isDirectory()) {
			return listRegularFiles(entryPath);
		}
		if (entry.isFile()) {
			return [entryPath];
		}
		return [];
	}));
	return files.flat().sort();
}

function isMarkdownFileTarget(targetPath: string): boolean {
	return path.extname(targetPath).toLowerCase() === ".md";
}

async function copyTargetFile(targetPath: string, sourcePath: string): Promise<void> {
	await rm(targetPath, { force: true, recursive: true });
	await mkdir(path.dirname(targetPath), { recursive: true });
	await copyFile(sourcePath, targetPath);
}

async function materializeFileTarget(input: {
	inputDirectory: string;
	targetPath: string;
}): Promise<void> {
	const inputFiles = await listRegularFiles(input.inputDirectory);
	if (inputFiles.length !== 1) {
		throw new Error(
			`Fetch file target mode requires exactly one staged file: ${input.targetPath}`,
		);
	}
	const sourcePath = inputFiles[0] ?? "";
	if (!isMarkdownFileTarget(input.targetPath)) {
		await copyTargetFile(input.targetPath, sourcePath);
		return;
	}

	const incomingContent = await readFile(sourcePath, "utf8");
	await replaceFile(input.targetPath, await mergeMarkdownFileTarget({
		targetPath: input.targetPath,
		incomingContent,
	}));
}

async function runFetchTransform(input: {
	command: string;
	source: string;
	inputDirectory: string;
	outputDirectory: string;
	targetPath: string;
	root?: string;
}): Promise<{
	inputFiles: string[];
	outputFiles: string[];
	stdout: string;
}> {
	const inputFiles = await listRegularFiles(input.inputDirectory);
	const inputFile = inputFiles.length === 1 ? inputFiles[0] : undefined;
	const stdin = inputFile ? await readFile(inputFile) : undefined;
	const result = await runTransform({
		command: input.command,
		source: input.source,
		inputPath: input.inputDirectory,
		outputPath: input.outputDirectory,
		targetPath: input.targetPath,
		stdin,
		root: input.root,
	});
	const outputFiles = await listRegularFiles(input.outputDirectory);
	return {
		inputFiles,
		outputFiles,
		stdout: result.stdout,
	};
}

export async function pathExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

export async function materializeHandlerOutput(input: {
	source: string;
	inputDirectory: string;
	targetPath: string;
	transform?: string;
	root?: string;
}): Promise<void> {
	const fileTarget = isMarkdownFileTarget(input.targetPath);

	if (!input.transform) {
		if (fileTarget) {
			await materializeFileTarget({
				inputDirectory: input.inputDirectory,
				targetPath: input.targetPath,
			});
			return;
		}
		await replaceDirectory(input.targetPath, input.inputDirectory);
		return;
	}

	const transformOutputDir = await makeTempDir("docs-fetch-transform-");
	try {
		await mkdir(transformOutputDir, { recursive: true });
		const result = await runFetchTransform({
			command: input.transform,
			source: input.source,
			inputDirectory: input.inputDirectory,
			outputDirectory: transformOutputDir,
			targetPath: input.targetPath,
			root: input.root,
		});
		await materializeTransformOutput({
			...result,
			command: input.transform,
			outputDirectory: transformOutputDir,
			targetPath: input.targetPath,
		});
	} finally {
		await rm(transformOutputDir, { force: true, recursive: true });
	}
}

export async function runFetchHandlerMain(main: () => Promise<void>): Promise<void> {
	try {
		await main();
	} catch (error) {
		const wrapped = toDocsError(error);
		console.error(wrapped.message);
		process.exit(wrapped.exitCode);
	}
}
