import { spawn } from "node:child_process";
import { access, mkdir, readFile, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runtimeError } from "../core/errors.ts";
import browseContracts from "./browse-contracts.ts";
import { discoverDocsSources } from "./browse-sources.ts";
import {
	BUILTIN_GIT_FETCH_HANDLER,
	BUILTIN_URL_FILE_FETCH_HANDLER,
	FETCH_MANIFEST_NAME,
	type FetchHandlerInvocation,
	type FetchManifest,
	type FetchManifestEntry,
} from "./fetch-contract.ts";
import { expandHomePath } from "./fetch-handler-support.ts";

const { normalizePath } = browseContracts;

const BUILTIN_HANDLER_PATHS = {
	[BUILTIN_GIT_FETCH_HANDLER]: fileURLToPath(
		new URL("../../bin/docs-git-fetch.ts", import.meta.url),
	),
	[BUILTIN_URL_FILE_FETCH_HANDLER]: fileURLToPath(
		new URL("../../bin/docs-url-file-fetch.ts", import.meta.url),
	),
} as const;

const BUILTIN_HANDLER_SHORTHANDS = {
	git: BUILTIN_GIT_FETCH_HANDLER,
	url: BUILTIN_URL_FILE_FETCH_HANDLER,
} as const;

type ResolvedFetchTarget = {
	docsRoot: string;
	targetRelativePath: string;
};
type RunFetchDefinition = {
	docsRoot: string;
	entry: FetchManifestEntry;
};
type ValidatedFetchDefinition = RunFetchDefinition & {
	absoluteTargetPath: string;
};

function normalizeStoredCommand(command: string, projectDir: string): string {
	const expandedCommand = expandHomePath(command);
	if (
		path.isAbsolute(expandedCommand) || expandedCommand.startsWith("./")
		|| expandedCommand.startsWith("../") || expandedCommand.includes(path.posix.sep)
	) {
		return normalizePath(path.resolve(projectDir, expandedCommand));
	}
	return command;
}

function isBuiltinHandlerShorthand(
	handler: string,
): handler is keyof typeof BUILTIN_HANDLER_SHORTHANDS {
	return Object.hasOwn(BUILTIN_HANDLER_SHORTHANDS, handler);
}

function normalizeHandlerReference(handler: string, projectDir: string): string {
	const builtinHandler = isBuiltinHandlerShorthand(handler)
		? BUILTIN_HANDLER_SHORTHANDS[handler]
		: handler;
	return normalizeStoredCommand(builtinHandler, projectDir);
}

function manifestPathForDocsRoot(docsRoot: string): string {
	return path.join(docsRoot, FETCH_MANIFEST_NAME);
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

function isFetchManifest(value: unknown): value is FetchManifest {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as { entries?: unknown };
	if (!Array.isArray(candidate.entries)) {
		return false;
	}

	return candidate.entries.every(isFetchManifestEntry);
}

async function readFetchManifest(docsRoot: string): Promise<FetchManifest> {
	const manifestPath = manifestPathForDocsRoot(docsRoot);
	if (!(await fileExists(manifestPath))) {
		return { entries: [] };
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(await readFile(manifestPath, "utf8"));
	} catch {
		throw runtimeError(`Invalid fetch manifest: ${manifestPath}`);
	}

	if (!isFetchManifest(parsed)) {
		throw runtimeError(`Invalid fetch manifest: ${manifestPath}`);
	}
	return parsed;
}

function isFetchManifestEntry(value: unknown): value is FetchManifestEntry {
	if (!value || typeof value !== "object") {
		return false;
	}
	const candidate = value as Partial<FetchManifestEntry>;
	return typeof candidate.source === "string"
		&& typeof candidate.target === "string"
		&& typeof candidate.handler === "string"
		&& typeof candidate.hash === "string"
		&& (candidate.root === undefined || typeof candidate.root === "string")
		&& (candidate.transform === undefined || typeof candidate.transform === "string");
}

async function writeFetchManifest(docsRoot: string, manifest: FetchManifest): Promise<void> {
	const manifestPath = manifestPathForDocsRoot(docsRoot);
	const tempPath = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;
	await mkdir(docsRoot, { recursive: true });
	await writeFile(tempPath, `${JSON.stringify(manifest, null, "\t")}\n`);
	await rename(tempPath, manifestPath);
}

function isWithinDocsRoot(targetPath: string, docsRoot: string): boolean {
	return targetPath === docsRoot || targetPath.startsWith(`${docsRoot}${path.posix.sep}`);
}

function isStrictlyWithinDocsRoot(targetPath: string, docsRoot: string): boolean {
	return targetPath !== docsRoot && targetPath.startsWith(`${docsRoot}${path.posix.sep}`);
}

function hasTraversalSegment(value: string): boolean {
	return value.replaceAll("\\", path.posix.sep).split(path.posix.sep).some(segment =>
		segment === ".."
	);
}

async function canonicalizePath(filePath: string): Promise<string> {
	const suffix: string[] = [];
	let current = normalizePath(filePath);

	for (;;) {
		try {
			let resolved = normalizePath(await realpath(current));
			for (const segment of suffix.reverse()) {
				resolved = normalizePath(path.join(resolved, segment));
			}
			return resolved;
		} catch {
			const parent = normalizePath(path.dirname(current));
			if (parent === current) {
				return normalizePath(filePath);
			}

			suffix.push(path.basename(current));
			current = parent;
		}
	}
}

async function resolveFetchTarget(
	projectDir: string,
	targetArg: string,
): Promise<ResolvedFetchTarget> {
	const sources = await discoverDocsSources(projectDir);
	const resolvedTarget = await canonicalizePath(
		normalizePath(path.resolve(projectDir, expandHomePath(targetArg))),
	);
	const canonicalDocsRoots = await Promise.all(
		sources.mergedDocsRoots.map(async docsRoot => ({
			original: docsRoot,
			canonical: await canonicalizePath(docsRoot),
		})),
	);
	const matchingDocsRoots = canonicalDocsRoots
		.filter(candidate => isWithinDocsRoot(resolvedTarget, candidate.canonical))
		.sort((left, right) => right.canonical.length - left.canonical.length);
	const docsRoot = matchingDocsRoots[0];
	if (!docsRoot) {
		throw runtimeError(`Fetch target is outside discovered docs roots: ${targetArg}`);
	}

	const targetRelativePath = path.posix.relative(docsRoot.canonical, resolvedTarget);
	return {
		docsRoot: docsRoot.original,
		targetRelativePath: targetRelativePath.length > 0 ? targetRelativePath : ".",
	};
}

async function validateFetchEntryTarget(definition: RunFetchDefinition): Promise<
	{
		ok: true;
		value: ValidatedFetchDefinition;
	} | {
		ok: false;
		message: string;
	}
> {
	const manifestTarget = definition.entry.target;
	if (manifestTarget.length === 0 || manifestTarget === ".") {
		return {
			ok: false,
			message:
				`Skipping unsafe fetch entry in ${definition.docsRoot}: target must be a subdirectory, got ${
					manifestTarget || "<empty>"
				}`,
		};
	}
	if (path.isAbsolute(manifestTarget)) {
		return {
			ok: false,
			message:
				`Skipping unsafe fetch entry in ${definition.docsRoot}: target must be relative, got ${manifestTarget}`,
		};
	}
	if (hasTraversalSegment(manifestTarget)) {
		return {
			ok: false,
			message:
				`Skipping unsafe fetch entry in ${definition.docsRoot}: target must not contain '..', got ${manifestTarget}`,
		};
	}

	const canonicalDocsRoot = await canonicalizePath(definition.docsRoot);
	const absoluteTargetPath = await canonicalizePath(
		normalizePath(path.resolve(definition.docsRoot, manifestTarget)),
	);
	if (!isStrictlyWithinDocsRoot(absoluteTargetPath, canonicalDocsRoot)) {
		return {
			ok: false,
			message:
				`Skipping unsafe fetch entry in ${definition.docsRoot}: target resolves outside the docs root, got ${manifestTarget}`,
		};
	}

	return {
		ok: true,
		value: {
			...definition,
			absoluteTargetPath,
		},
	};
}

function isBuiltinHandlerName(
	handler: string,
): handler is keyof typeof BUILTIN_HANDLER_PATHS {
	return Object.hasOwn(BUILTIN_HANDLER_PATHS, handler);
}

function toHandlerArgs(invocation: FetchHandlerInvocation): string[] {
	return [
		"--source",
		invocation.source,
		"--target",
		invocation.target,
		"--previous-hash",
		invocation.previousHash,
		...(invocation.root ? ["--root", invocation.root] : []),
		...(invocation.transform ? ["--transform", invocation.transform] : []),
	];
}

function resolveHandlerCommand(handler: string): { command: string; args: string[] } {
	const builtinHandlerPath = isBuiltinHandlerName(handler)
		? BUILTIN_HANDLER_PATHS[handler]
		: undefined;
	if (builtinHandlerPath) {
		return {
			command: process.execPath,
			args: [builtinHandlerPath],
		};
	}

	return {
		command: expandHomePath(handler),
		args: [],
	};
}

async function runFetchHandler(invocation: {
	handler: string;
	definition: FetchHandlerInvocation;
}): Promise<string> {
	const handlerCommand = resolveHandlerCommand(invocation.handler);
	const handlerArgs = [...handlerCommand.args, ...toHandlerArgs(invocation.definition)];

	return new Promise((resolve, reject) => {
		const child = spawn(handlerCommand.command, handlerArgs, {
			env: process.env,
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (chunk: Buffer | string) => {
			stdout += chunk.toString();
		});
		child.stderr.on("data", (chunk: Buffer | string) => {
			stderr += chunk.toString();
		});
		child.on("error", (error: NodeJS.ErrnoException) => {
			if (error.code === "ENOENT") {
				reject(runtimeError(`Fetch handler not found: ${invocation.handler}`));
				return;
			}

			reject(error);
		});
		child.on("close", (exitCode) => {
			if ((exitCode ?? 1) !== 0) {
				reject(
					runtimeError(
						stderr.trim() || stdout.trim()
							|| `Fetch handler failed: ${invocation.handler}`,
					),
				);
				return;
			}

			const hashes = stdout
				.split(/\r?\n/)
				.map(line => line.trim())
				.filter(line => line.length > 0);
			if (hashes.length !== 1) {
				reject(runtimeError(`Fetch handler must print exactly one hash: ${invocation.handler}`));
				return;
			}

			resolve(hashes[0] ?? "");
		});
	});
}

function upsertManifestEntry(
	manifest: FetchManifest,
	nextEntry: FetchManifestEntry,
): FetchManifest {
	const entries = manifest.entries.filter(entry => entry.target !== nextEntry.target);
	entries.push(nextEntry);
	entries.sort((left, right) => left.target.localeCompare(right.target));
	return { entries };
}

async function runFetchDefinition(
	definition: ValidatedFetchDefinition,
): Promise<FetchManifestEntry> {
	const nextHash = await runFetchHandler({
		handler: definition.entry.handler,
		definition: {
			source: definition.entry.source,
			target: definition.absoluteTargetPath,
			previousHash: definition.entry.hash,
			root: definition.entry.root,
			transform: definition.entry.transform,
		},
	});

	return {
		...definition.entry,
		hash: nextHash,
	};
}

async function listFetchDefinitions(projectDir: string): Promise<RunFetchDefinition[]> {
	const sources = await discoverDocsSources(projectDir);
	const definitions: RunFetchDefinition[] = [];

	for (const docsRoot of sources.mergedDocsRoots) {
		const manifest = await readFetchManifest(docsRoot);
		for (const entry of manifest.entries) {
			definitions.push({
				docsRoot,
				entry,
			});
		}
	}

	return definitions.sort((left, right) => {
		const pathCompare = left.docsRoot.localeCompare(right.docsRoot);
		if (pathCompare !== 0) {
			return pathCompare;
		}
		return left.entry.target.localeCompare(right.entry.target);
	});
}

export async function runRegisteredFetches(
	projectDir: string,
): Promise<{ skippedUnsafeEntries: string[] }> {
	const definitions = await listFetchDefinitions(projectDir);
	const skippedUnsafeEntries: string[] = [];
	for (const definition of definitions) {
		const validatedDefinition = await validateFetchEntryTarget(definition);
		if (!validatedDefinition.ok) {
			skippedUnsafeEntries.push(validatedDefinition.message);
			console.error(validatedDefinition.message);
			continue;
		}
		const manifest = await readFetchManifest(definition.docsRoot);
		const updatedEntry = await runFetchDefinition(validatedDefinition.value);
		await writeFetchManifest(definition.docsRoot, upsertManifestEntry(manifest, updatedEntry));
	}

	return {
		skippedUnsafeEntries,
	};
}

export async function runDocsFetch(input: {
	projectDir: string;
	source: string;
	targetArg: string;
	handler: string;
	root?: string;
	transform?: string;
}): Promise<void> {
	const resolvedTarget = await resolveFetchTarget(input.projectDir, input.targetArg);
	if (resolvedTarget.targetRelativePath === ".") {
		throw runtimeError(
			`Fetch target must be a subdirectory inside a discovered docs root: ${input.targetArg}`,
		);
	}
	const manifest = await readFetchManifest(resolvedTarget.docsRoot);
	const existingEntry = manifest.entries.find(entry =>
		entry.target === resolvedTarget.targetRelativePath
	);

	const nextEntry: FetchManifestEntry = {
		source: input.source,
		target: resolvedTarget.targetRelativePath,
		handler: normalizeHandlerReference(input.handler, input.projectDir),
		...(input.root ? { root: input.root } : {}),
		...(input.transform
			? { transform: normalizeStoredCommand(input.transform, input.projectDir) }
			: {}),
		hash: existingEntry?.hash ?? "",
	};

	const updatedEntry = await runFetchDefinition({
		docsRoot: resolvedTarget.docsRoot,
		entry: nextEntry,
		absoluteTargetPath: normalizePath(
			path.join(resolvedTarget.docsRoot, resolvedTarget.targetRelativePath),
		),
	});

	await writeFetchManifest(resolvedTarget.docsRoot, upsertManifestEntry(manifest, updatedEntry));
}
