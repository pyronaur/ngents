import { access, copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { toDocsError } from "../core/errors.ts";
import {
	makeTempDir,
	replaceDirectory,
	runTransform,
} from "./fetch-handler-support.ts";

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

async function writeTargetFile(targetPath: string, contents: string): Promise<void> {
	await rm(targetPath, { force: true, recursive: true });
	await mkdir(path.dirname(targetPath), { recursive: true });
	await writeFile(targetPath, contents);
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
	await copyTargetFile(input.targetPath, inputFiles[0] ?? "");
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

function validateTransformOutput(input: {
	command: string;
	fileTarget: boolean;
	inputFiles: string[];
	outputFiles: string[];
	stdout: string;
}): { wroteOutputFiles: boolean; wroteStdout: boolean } {
	const wroteStdout = input.stdout.length > 0;
	const wroteOutputFiles = input.outputFiles.length > 0;

	if (wroteStdout && wroteOutputFiles) {
		throw new Error(
			`Fetch transform must write either stdout or output files, not both: ${input.command}`,
		);
	}
	if (!wroteOutputFiles && !wroteStdout) {
		throw new Error(
			`Fetch transform must write output files or stdout: ${input.command}`,
		);
	}
	if (wroteStdout && input.inputFiles.length !== 1) {
		throw new Error(
			`Fetch transform stdout-only mode requires exactly one staged file: ${input.command}`,
		);
	}
	if (input.fileTarget && wroteOutputFiles) {
		throw new Error(
			`Fetch file target mode does not support directory output transforms: ${input.command}`,
		);
	}

	return {
		wroteOutputFiles,
		wroteStdout,
	};
}

async function materializeTransformOutput(input: {
	fileTarget: boolean;
	outputDirectory: string;
	targetPath: string;
	stdout: string;
	wroteStdout: boolean;
}): Promise<void> {
	if (input.fileTarget) {
		await writeTargetFile(input.targetPath, input.stdout);
		return;
	}
	if (input.wroteStdout) {
		await writeFile(path.join(input.outputDirectory, "README.md"), input.stdout);
	}
	await replaceDirectory(input.targetPath, input.outputDirectory);
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
		const validated = validateTransformOutput({
			command: input.transform,
			fileTarget,
			inputFiles: result.inputFiles,
			outputFiles: result.outputFiles,
			stdout: result.stdout,
		});
		await materializeTransformOutput({
			fileTarget,
			outputDirectory: transformOutputDir,
			targetPath: input.targetPath,
			stdout: result.stdout,
			wroteStdout: validated.wroteStdout,
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
