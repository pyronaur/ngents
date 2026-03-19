import { spawn } from "node:child_process";
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

function fail(message: string): never {
	throw runtimeError(message);
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

export async function listQmdCollections(): Promise<QmdCollection[]> {
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

	return collections.sort((left, right) => left.name.localeCompare(right.name));
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

export const INDEX_NAME = "ngents-docs";
export const CACHE_ROOT = path.join(os.homedir(), ".ngents", "local", "qmd-cache");
export const CONFIG_ROOT = path.join(os.homedir(), ".ngents", "local", "qmd-config");
