#!/usr/bin/env node

import { realpath, rm } from "node:fs/promises";
import path from "node:path";

import { parseFetchHandlerInvocation } from "../src/runtime/fetch-handler-cli.ts";
import * as handlerRuntime from "../src/runtime/fetch-handler-runtime.ts";
import * as fetchSupport from "../src/runtime/fetch-handler-support.ts";

function isPathWithinRoot(candidatePath: string, rootPath: string): boolean {
	return candidatePath === rootPath || candidatePath.startsWith(`${rootPath}${path.sep}`);
}

function normalizeSubpath(root: string | undefined): string | undefined {
	if (!root) {
		return undefined;
	}

	const normalizedPath = path.posix.normalize(root);
	if (normalizedPath.length === 0 || normalizedPath === "." || normalizedPath === "..") {
		throw new Error(`Invalid git fetch root: ${root}`);
	}
	if (path.posix.isAbsolute(normalizedPath)) {
		throw new Error(`Invalid git fetch root: ${root}`);
	}

	const segments = normalizedPath.split("/").filter(segment => segment.length > 0);
	if (
		segments.length === 0 || segments.some(segment => segment === "." || segment === "..")
	) {
		throw new Error(`Invalid git fetch root: ${root}`);
	}

	return segments.join("/");
}

async function resolveRemoteHead(source: string): Promise<string> {
	const result = await fetchSupport.runExternalCommand({
		command: "git",
		args: ["ls-remote", source, "HEAD"],
	});
	if (result.exitCode !== 0) {
		throw new Error(
			result.stderr.trim() || result.stdout.trim() || `Unable to read git HEAD: ${source}`,
		);
	}

	const firstLine = result.stdout.split(/\r?\n/).find(line => line.trim().length > 0);
	const hash = firstLine?.split(/\s+/)[0]?.trim();
	if (!hash) {
		throw new Error(`Unable to parse git HEAD for: ${source}`);
	}

	return hash;
}

async function cloneRepository(input: {
	source: string;
	checkoutDir: string;
	root?: string;
}): Promise<void> {
	const cloneArgs = ["clone", "--depth=1", "--filter=blob:none"];
	if (input.root) {
		cloneArgs.push("--sparse");
	}
	cloneArgs.push(input.source, input.checkoutDir);

	const cloneResult = await fetchSupport.runExternalCommand({
		command: "git",
		args: cloneArgs,
	});
	if (cloneResult.exitCode !== 0) {
		throw new Error(cloneResult.stderr.trim() || cloneResult.stdout.trim() || "git clone failed");
	}

	if (!input.root) {
		return;
	}

	const sparseResult = await fetchSupport.runExternalCommand({
		command: "git",
		args: ["-C", input.checkoutDir, "sparse-checkout", "set", "--cone", input.root],
	});
	if (sparseResult.exitCode !== 0) {
		throw new Error(
			sparseResult.stderr.trim() || sparseResult.stdout.trim() || "git sparse-checkout failed",
		);
	}
}

async function materializeOutput(input: {
	checkoutDir: string;
	targetPath: string;
	source: string;
	root?: string;
	transform?: string;
}): Promise<void> {
	const sourceDirectory = input.root ? path.join(input.checkoutDir, input.root) : input.checkoutDir;
	if (!(await handlerRuntime.pathExists(sourceDirectory))) {
		throw new Error(`Requested git root not found: ${input.root}`);
	}
	const resolvedCheckoutDir = await realpath(input.checkoutDir);
	const resolvedSourceDirectory = await realpath(sourceDirectory);
	if (!isPathWithinRoot(resolvedSourceDirectory, resolvedCheckoutDir)) {
		throw new Error(`Git fetch root resolves outside the cloned repository: ${input.root}`);
	}

	await handlerRuntime.materializeHandlerOutput({
		source: input.source,
		inputDirectory: sourceDirectory,
		targetPath: input.targetPath,
		transform: input.transform,
		root: input.root,
	});
}

async function main(): Promise<void> {
	const invocation = parseFetchHandlerInvocation({
		commandName: "docs-git-fetch",
		argv: process.argv.slice(2),
	});
	const normalizedRoot = normalizeSubpath(invocation.root);
	const transformSignature = await fetchSupport.commandSignature(invocation.transform);
	const remoteHead = await resolveRemoteHead(invocation.source);
	const fingerprint = fetchSupport.sha256(
		[
			"type=git",
			`source=${invocation.source}`,
			`head=${remoteHead}`,
			`root=${normalizedRoot ?? ""}`,
			`transform=${transformSignature}`,
		].join("\n"),
	);

	if (fingerprint === invocation.previousHash) {
		process.stdout.write(`${fingerprint}\n`);
		return;
	}

	const checkoutDir = await fetchSupport.makeTempDir("docs-fetch-git-");
	try {
		await cloneRepository({
			source: invocation.source,
			checkoutDir,
			root: normalizedRoot,
		});
		await materializeOutput({
			checkoutDir,
			targetPath: invocation.target,
			source: invocation.source,
			root: normalizedRoot,
			transform: invocation.transform,
		});
		process.stdout.write(`${fingerprint}\n`);
	} finally {
		await rm(checkoutDir, { force: true, recursive: true });
	}
}

await handlerRuntime.runFetchHandlerMain(main);
