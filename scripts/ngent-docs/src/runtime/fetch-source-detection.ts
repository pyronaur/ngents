import { access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runtimeError } from "../core/errors.ts";
import {
	BUILTIN_GIT_FETCH_HANDLER,
	BUILTIN_URL_FILE_FETCH_HANDLER,
} from "./fetch-contract.ts";

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

function looksLikeGitRepositoryUrl(source: string): boolean {
	if (source.startsWith("git@")) {
		return true;
	}

	let parsed: URL;
	try {
		parsed = new URL(source);
	} catch {
		return false;
	}

	if (parsed.protocol === "ssh:" || parsed.protocol === "git:") {
		return true;
	}
	if (parsed.protocol === "file:") {
		return false;
	}
	if (parsed.pathname.endsWith(".git")) {
		return true;
	}

	const pathSegments = parsed.pathname.split("/").filter(Boolean);
	if (pathSegments.length < 2) {
		return false;
	}

	return ["github.com", "gitlab.com", "codeberg.org", "bitbucket.org"].includes(parsed.hostname);
}

async function detectLocalFileUrlSourceType(source: URL): Promise<"git" | "file" | null> {
	const localPath = fileURLToPath(source);

	let sourceStats;
	try {
		sourceStats = await stat(localPath);
	} catch {
		return null;
	}

	if (sourceStats.isFile()) {
		return "file";
	}
	if (!sourceStats.isDirectory()) {
		return null;
	}
	if (
		await fileExists(path.join(localPath, ".git"))
		|| (
			await fileExists(path.join(localPath, "HEAD"))
			&& await fileExists(path.join(localPath, "objects"))
			&& await fileExists(path.join(localPath, "refs"))
		)
	) {
		return "git";
	}

	return null;
}

export async function selectDefaultFetchHandler(source: string): Promise<string> {
	if (looksLikeGitRepositoryUrl(source)) {
		return BUILTIN_GIT_FETCH_HANDLER;
	}

	let parsed: URL;
	try {
		parsed = new URL(source);
	} catch {
		throw runtimeError(`Unable to auto-detect fetch handler for source: ${source}`);
	}

	if (parsed.protocol === "file:") {
		const localSourceType = await detectLocalFileUrlSourceType(parsed);
		if (localSourceType === "git") {
			return BUILTIN_GIT_FETCH_HANDLER;
		}
		if (localSourceType === "file") {
			return BUILTIN_URL_FILE_FETCH_HANDLER;
		}
		throw runtimeError(`Unable to auto-detect fetch handler for source: ${source}`);
	}

	if (["http:", "https:"].includes(parsed.protocol)) {
		return BUILTIN_URL_FILE_FETCH_HANDLER;
	}

	throw runtimeError(`Unable to auto-detect fetch handler for source: ${source}`);
}
