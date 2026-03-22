import { access, mkdir, rm } from "node:fs/promises";

import { toDocsError } from "../core/errors.ts";
import {
	makeTempDir,
	replaceDirectory,
	runTransform,
} from "./fetch-handler-support.ts";

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
	if (!input.transform) {
		await replaceDirectory(input.targetPath, input.inputDirectory);
		return;
	}

	const transformOutputDir = await makeTempDir("docs-fetch-transform-");
	try {
		await mkdir(transformOutputDir, { recursive: true });
		await runTransform({
			command: input.transform,
			source: input.source,
			inputPath: input.inputDirectory,
			outputPath: transformOutputDir,
			targetPath: input.targetPath,
			root: input.root,
		});
		await replaceDirectory(input.targetPath, transformOutputDir);
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
