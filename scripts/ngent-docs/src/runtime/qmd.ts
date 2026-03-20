import { spawn } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runtimeError } from "../core/errors.ts";

type QmdRunResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

export type QmdCollection = {
	name: string;
	path: string;
	pattern: string | null;
	includeByDefault: boolean;
};

type CollectionsCacheFile = {
	version: number;
	fetchedAt: string;
	collections: QmdCollection[];
};

const COLLECTIONS_CACHE_TTL_MS = 60 * 60 * 1000;
const COLLECTIONS_CACHE_VERSION = 1;
const INTERNAL_REFRESH_ENV = "DOCS_INTERNAL_REFRESH_QMD_COLLECTIONS_CACHE";

function fail(message: string): never {
	throw runtimeError(message);
}

function collectionsCacheFilePath(): string {
	return path.join(CACHE_ROOT, "docs-qmd-collections-cache.json");
}

function parseCollectionListNames(stdout: string): string[] {
	if (stdout.includes("No collections found.")) {
		return [];
	}

	return Array.from(stdout.matchAll(/^(.+?) \(qmd:\/\/[^/]+\/\)$/gm))
		.map((match) => match[1]?.trim() ?? "")
		.filter(name => name.length > 0);
}

function parseCollectionShow(stdout: string, name: string): QmdCollection {
	const pathMatch = stdout.match(/^\s*Path:\s+(.+)$/m);
	const patternMatch = stdout.match(/^\s*Pattern:\s+(.+)$/m);
	const includeMatch = stdout.match(/^\s*Include:\s+(.+)$/m);
	const collectionNameMatch = stdout.match(/^Collection:\s+(.+)$/m);

	const collectionName = collectionNameMatch?.[1]?.trim() ?? name;
	const collectionPath = pathMatch?.[1]?.trim();
	if (!collectionPath) {
		fail(`Failed to parse qmd collection path for "${name}".`);
	}

	return {
		name: collectionName,
		path: collectionPath,
		pattern: patternMatch?.[1]?.trim() ?? null,
		includeByDefault: includeMatch?.[1]?.trim().startsWith("yes") ?? false,
	};
}

async function fetchQmdCollections(): Promise<QmdCollection[]> {
	const listResult = await runQmd(["collection", "list"]);
	if (listResult.exitCode !== 0) {
		fail(listResult.stderr.trim() || listResult.stdout.trim() || "qmd collection list failed");
	}

	const names = parseCollectionListNames(listResult.stdout);
	const collections: QmdCollection[] = [];
	for (const name of names) {
		const showResult = await runQmd(["collection", "show", name]);
		if (showResult.exitCode !== 0) {
			fail(
				showResult.stderr.trim() || showResult.stdout.trim()
					|| `qmd collection show failed for "${name}"`,
			);
		}

		collections.push(parseCollectionShow(showResult.stdout, name));
	}

	return sortCollections(collections);
}

async function readCollectionsCache(): Promise<CollectionsCacheFile | null> {
	let raw: string;
	try {
		raw = await readFile(collectionsCacheFilePath(), "utf8");
	} catch {
		return null;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}

	if (!isCollectionsCacheFile(parsed)) {
		return null;
	}

	return {
		version: parsed.version,
		fetchedAt: parsed.fetchedAt,
		collections: sortCollections(parsed.collections),
	};
}

function isCollectionsCacheFile(value: unknown): value is CollectionsCacheFile {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Partial<CollectionsCacheFile>;
	if (candidate.version !== COLLECTIONS_CACHE_VERSION || typeof candidate.fetchedAt !== "string") {
		return false;
	}
	if (!Array.isArray(candidate.collections)) {
		return false;
	}

	return candidate.collections.every(isQmdCollection);
}

function isQmdCollection(value: unknown): value is QmdCollection {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Partial<QmdCollection>;
	if (typeof candidate.name !== "string" || typeof candidate.path !== "string") {
		return false;
	}
	if (
		candidate.pattern !== null && candidate.pattern !== undefined
		&& typeof candidate.pattern !== "string"
	) {
		return false;
	}
	return typeof candidate.includeByDefault === "boolean";
}

function isExpiredCollectionsCache(cache: CollectionsCacheFile): boolean {
	const fetchedAtMs = Date.parse(cache.fetchedAt);
	if (!Number.isFinite(fetchedAtMs)) {
		return true;
	}

	return Date.now() - fetchedAtMs >= COLLECTIONS_CACHE_TTL_MS;
}

function sortCollections(collections: QmdCollection[]): QmdCollection[] {
	return [...collections].sort((left, right) => left.name.localeCompare(right.name));
}

async function writeCollectionsCache(collections: QmdCollection[]): Promise<void> {
	const cachePath = collectionsCacheFilePath();
	const tempPath = `${cachePath}.${process.pid}.${Date.now()}.${
		Math.random().toString(16).slice(2)
	}.tmp`;
	const payload = JSON.stringify({
		version: COLLECTIONS_CACHE_VERSION,
		fetchedAt: new Date().toISOString(),
		collections: sortCollections(collections),
	});

	try {
		await mkdir(CACHE_ROOT, { recursive: true });
		await writeFile(tempPath, payload);
		await rename(tempPath, cachePath);
	} catch {
		await rm(tempPath, { force: true }).catch(() => undefined);
	}
}

function spawnCollectionsCacheRefresh(): void {
	if (process.env[INTERNAL_REFRESH_ENV] === "1") {
		return;
	}

	const scriptPath = process.argv[1]?.trim();
	if (!scriptPath) {
		return;
	}

	const child = spawn(process.execPath, [scriptPath], {
		detached: true,
		stdio: "ignore",
		env: {
			...process.env,
			[INTERNAL_REFRESH_ENV]: "1",
		},
	});
	child.unref();
}

export const INDEX_NAME = "ngents-docs";
export const CACHE_ROOT = path.join(os.homedir(), ".ngents", "local", "qmd-cache");
export const CONFIG_ROOT = path.join(os.homedir(), ".ngents", "local", "qmd-config");

export async function listQmdCollections(): Promise<QmdCollection[]> {
	const cached = await readCollectionsCache();
	if (cached) {
		if (!isExpiredCollectionsCache(cached)) {
			return cached.collections;
		}

		spawnCollectionsCacheRefresh();
		return cached.collections;
	}

	const collections = await fetchQmdCollections();
	await writeCollectionsCache(collections);
	return collections;
}

export async function listQmdCollectionsFresh(): Promise<QmdCollection[]> {
	const collections = await fetchQmdCollections();
	await writeCollectionsCache(collections);
	return collections;
}

export async function runQmdCollectionsCacheRefreshFromProcess(): Promise<void> {
	const collections = await fetchQmdCollections();
	await writeCollectionsCache(collections);
}

export async function invalidateQmdCollectionsCache(): Promise<void> {
	await rm(collectionsCacheFilePath(), { force: true }).catch(() => undefined);
}

export function qmdEnv(): NodeJS.ProcessEnv {
	return {
		...process.env,
		XDG_CACHE_HOME: CACHE_ROOT,
		XDG_CONFIG_HOME: CONFIG_ROOT,
	};
}

export async function runQmd(
	args: string[],
	options: {
		streamOutput?: boolean;
	} = {},
): Promise<QmdRunResult> {
	return new Promise((resolve, reject) => {
		const child = spawn("qmd", ["--index", INDEX_NAME, ...args], {
			env: qmdEnv(),
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (chunk: Buffer | string) => {
			const text = chunk.toString();
			stdout += text;
			if (options.streamOutput) {
				process.stdout.write(text);
			}
		});
		child.stderr.on("data", (chunk: Buffer | string) => {
			const text = chunk.toString();
			stderr += text;
			if (options.streamOutput) {
				process.stderr.write(text);
			}
		});
		child.on("error", (error: NodeJS.ErrnoException) => {
			if (error.code === "ENOENT") {
				reject(runtimeError("qmd is required"));
				return;
			}

			reject(error);
		});
		child.on("close", (exitCode) => {
			resolve({
				exitCode: exitCode ?? 1,
				stdout,
				stderr,
			});
		});
	});
}

export async function addQmdCollection(name: string, collectionPath: string): Promise<void> {
	const result = await runQmd(["collection", "add", collectionPath, "--name", name], {
		streamOutput: true,
	});
	if (result.exitCode !== 0) {
		fail(result.stderr.trim() || result.stdout.trim() || `qmd collection add failed for "${name}"`);
	}
}

export function isQmdRequiredError(error: unknown): boolean {
	return error instanceof Error && error.message === "qmd is required";
}
