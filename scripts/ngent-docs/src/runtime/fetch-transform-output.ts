import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { mergeFetchedMarkdownFrontMatter } from "./fetch-frontmatter.ts";
import { replaceDirectory, replaceFile } from "./fetch-handler-support.ts";

function validateTransformOutput(input: {
	command: string;
	fileTarget: boolean;
	inputFiles: string[];
	outputFiles: string[];
	stdout: string;
}): void {
	const wroteStdout = input.stdout.length > 0;
	const wroteOutputFiles = input.outputFiles.length > 0;
	if (wroteStdout && wroteOutputFiles) {
		throw new Error(
			`Fetch transform must write either stdout or output files, not both: ${input.command}`,
		);
	}
	if (!wroteOutputFiles && !wroteStdout) {
		throw new Error(`Fetch transform must write output files or stdout: ${input.command}`);
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
}

export async function mergeMarkdownFileTarget(input: {
	targetPath: string;
	incomingContent: string;
}): Promise<string> {
	let localContent: string | null;
	try {
		localContent = await readFile(input.targetPath, "utf8");
	} catch (error) {
		if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
			throw error;
		}
		localContent = null;
	}
	return mergeFetchedMarkdownFrontMatter({
		localContent,
		incomingContent: input.incomingContent,
	});
}

export async function materializeTransformOutput(input: {
	command: string;
	inputFiles: string[];
	outputFiles: string[];
	outputDirectory: string;
	targetPath: string;
	stdout: string;
}): Promise<void> {
	const fileTarget = path.extname(input.targetPath).toLowerCase() === ".md";
	validateTransformOutput({ ...input, fileTarget });
	if (fileTarget) {
		const contents = await mergeMarkdownFileTarget({
			targetPath: input.targetPath,
			incomingContent: input.stdout,
		});
		await replaceFile(input.targetPath, contents);
		return;
	}
	if (input.stdout.length > 0) {
		await writeFile(path.join(input.outputDirectory, "README.md"), input.stdout);
	}
	await replaceDirectory(input.targetPath, input.outputDirectory);
}
