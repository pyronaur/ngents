#!/usr/bin/env node

import { copyFile, mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";

import { parseFetchHandlerInvocation } from "../src/runtime/fetch-handler-cli.ts";
import {
	materializeHandlerOutput,
	pathExists,
	runFetchHandlerMain,
} from "../src/runtime/fetch-handler-runtime.ts";
import {
	commandSignature,
	makeTempDir,
	runExternalCommand,
	sha256,
} from "../src/runtime/fetch-handler-support.ts";

function outputFileNameForSource(source: URL): string {
	const baseName = path.posix.basename(source.pathname);
	if (baseName.endsWith(".txt")) {
		return `${baseName.slice(0, -4)}.md`;
	}
	return baseName || "index.md";
}

function validatorFingerprint(input: {
	source: string;
	outputFileName: string;
	etag: string | null;
	lastModified: string | null;
	transformSignature: string;
}): string | null {
	if (!input.etag && !input.lastModified) {
		return null;
	}

	return sha256(
		[
			"type=url-file",
			`source=${input.source}`,
			`file=${input.outputFileName}`,
			`etag=${input.etag ?? ""}`,
			`last-modified=${input.lastModified ?? ""}`,
			`transform=${input.transformSignature}`,
		].join("\n"),
	);
}

async function readHeadValidators(source: string): Promise<{
	etag: string | null;
	lastModified: string | null;
}> {
	const result = await runExternalCommand({
		command: "curl",
		args: ["-fsSIL", "--compressed", source],
	});
	if (result.exitCode !== 0) {
		return {
			etag: null,
			lastModified: null,
		};
	}

	const headerBlocks = result.stdout
		.split(/\r?\n\r?\n/)
		.map(block => block.split(/\r?\n/).filter(line => line.length > 0))
		.filter(block => block.length > 0);
	const finalHeaderLines = headerBlocks.at(-1) ?? [];
	const etag = finalHeaderLines
		.find(line => /^etag:/i.test(line))
		?.split(":")
		.slice(1)
		.join(":")
		.trim() ?? null;
	const lastModified = finalHeaderLines
		.find(line => /^last-modified:/i.test(line))
		?.split(":")
		.slice(1)
		.join(":")
		.trim() ?? null;

	return {
		etag,
		lastModified,
	};
}

async function downloadHttpSource(source: string, destinationPath: string): Promise<void> {
	const result = await runExternalCommand({
		command: "curl",
		args: ["-fsSL", "--compressed", source, "-o", destinationPath],
	});
	if (result.exitCode !== 0) {
		throw new Error(result.stderr.trim() || result.stdout.trim() || `Failed to fetch ${source}`);
	}
}

async function downloadFileUrl(source: URL, destinationPath: string): Promise<string> {
	const localPath = decodeURIComponent(source.pathname);
	if (!(await pathExists(localPath))) {
		throw new Error(`Source file not found: ${localPath}`);
	}
	await copyFile(localPath, destinationPath);
	return localPath;
}

async function readValidatorHash(input: {
	invocation: ReturnType<typeof parseFetchHandlerInvocation>;
	outputFileName: string;
	transformSignature: string;
}): Promise<string | null> {
	const sourceUrl = new URL(input.invocation.source);
	if (sourceUrl.protocol !== "http:" && sourceUrl.protocol !== "https:") {
		return null;
	}

	const validators = await readHeadValidators(input.invocation.source);
	return validatorFingerprint({
		source: input.invocation.source,
		outputFileName: input.outputFileName,
		etag: validators.etag,
		lastModified: validators.lastModified,
		transformSignature: input.transformSignature,
	});
}

async function downloadToStaging(input: {
	sourceUrl: URL;
	source: string;
	destinationPath: string;
}): Promise<string | null> {
	if (input.sourceUrl.protocol === "file:") {
		return downloadFileUrl(input.sourceUrl, input.destinationPath);
	}
	if (input.sourceUrl.protocol === "http:" || input.sourceUrl.protocol === "https:") {
		await downloadHttpSource(input.source, input.destinationPath);
		return null;
	}

	throw new Error(`Unsupported url-file source protocol: ${input.sourceUrl.protocol}`);
}

async function buildFingerprint(input: {
	source: string;
	outputFileName: string;
	transformSignature: string;
	localSourcePath: string | null;
	downloadedFilePath: string;
	validatorHash: string | null;
}): Promise<string> {
	if (input.localSourcePath) {
		const fileStat = await stat(input.localSourcePath);
		const localContentsHash = sha256(await readFile(input.localSourcePath));
		return sha256(
			[
				"type=url-file",
				`source=${input.source}`,
				`file=${input.outputFileName}`,
				`size=${fileStat.size}`,
				`mtime=${fileStat.mtimeMs}`,
				`content=${localContentsHash}`,
				`transform=${input.transformSignature}`,
			].join("\n"),
		);
	}
	if (input.validatorHash) {
		return input.validatorHash;
	}

	return sha256(
		[
			"type=url-file",
			`source=${input.source}`,
			`file=${input.outputFileName}`,
			`content=${sha256(await readFile(input.downloadedFilePath))}`,
			`transform=${input.transformSignature}`,
		].join("\n"),
	);
}

async function refreshUrlFileFetch(
	invocation: ReturnType<typeof parseFetchHandlerInvocation>,
): Promise<string> {
	const sourceUrl = new URL(invocation.source);
	const outputFileName = outputFileNameForSource(sourceUrl);
	const transformSignature = await commandSignature(invocation.transform);
	const validatorHash = await readValidatorHash({
		invocation,
		outputFileName,
		transformSignature,
	});
	if (validatorHash && validatorHash === invocation.previousHash) {
		return validatorHash;
	}

	const stagingDir = await makeTempDir("docs-fetch-url-");
	try {
		await mkdir(stagingDir, { recursive: true });
		const downloadedFilePath = path.join(stagingDir, outputFileName);
		const localSourcePath = await downloadToStaging({
			sourceUrl,
			source: invocation.source,
			destinationPath: downloadedFilePath,
		});
		const fingerprint = await buildFingerprint({
			source: invocation.source,
			outputFileName,
			transformSignature,
			localSourcePath,
			downloadedFilePath,
			validatorHash,
		});
		if (fingerprint === invocation.previousHash) {
			return fingerprint;
		}

		await materializeHandlerOutput({
			source: invocation.source,
			inputDirectory: stagingDir,
			targetPath: invocation.target,
			transform: invocation.transform,
		});
		return fingerprint;
	} finally {
		await rm(stagingDir, { force: true, recursive: true });
	}
}

async function main(): Promise<void> {
	const invocation = parseFetchHandlerInvocation({
		commandName: "docs-url-file-fetch",
		argv: process.argv.slice(2),
	});
	if (invocation.root) {
		throw new Error("The url-file fetch handler does not support --root");
	}
	process.stdout.write(`${await refreshUrlFileFetch(invocation)}\n`);
}

await runFetchHandlerMain(main);
