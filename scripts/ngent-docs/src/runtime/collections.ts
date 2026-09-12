import { mkdir, open, readFile, realpath, rename, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

import { runtimeError } from "../core/errors.ts";

const collectionSchema = z.object({
	name: z.string().trim().min(1).refine(name => !name.includes("/")),
	path: z.string().refine(value => path.isAbsolute(value)),
});

export type DocsCollection = z.infer<typeof collectionSchema>;

export function docsRegistryPath(): string {
	return path.join(os.homedir(), ".ngents", "local", "docs", "collections.json");
}

export async function listDocsCollections(filePath: string): Promise<DocsCollection[]> {
	let raw: string;
	try {
		raw = await readFile(filePath, "utf8");
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return [];
		}
		throw error;
	}
	const result = z.array(collectionSchema).safeParse(JSON.parse(raw));
	if (!result.success) {
		throw runtimeError(`Invalid docs collection registry: ${filePath}`);
	}
	return result.data.sort((left, right) => left.name.localeCompare(right.name));
}

export async function addDocsCollection(
	filePath: string,
	name: string,
	docsRoot: string,
): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true });
	const lockPath = `${filePath}.lock`;
	const lock = await open(lockPath, "wx");
	const tempPath = `${filePath}.${process.pid}.tmp`;
	try {
		const collections = await listDocsCollections(filePath);
		if (
			collections.some(collection =>
				collection.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0
			)
		) {
			throw runtimeError(`Docs collection already parked: ${name}`);
		}
		const canonicalRoot = await realpath(docsRoot);
		for (const collection of collections) {
			const canonicalPath = await realpath(collection.path).catch(() => collection.path);
			if (canonicalPath === canonicalRoot) {
				throw runtimeError(`Docs root already parked as "${collection.name}": ${docsRoot}`);
			}
		}
		collections.push(collectionSchema.parse({ name, path: canonicalRoot }));
		const temp = await open(tempPath, "wx");
		try {
			await temp.writeFile(`${JSON.stringify(collections, null, "\t")}\n`);
		} finally {
			await temp.close();
		}
		await rename(tempPath, filePath);
	} finally {
		await rm(tempPath, { force: true });
		await lock.close();
		await rm(lockPath);
	}
}
