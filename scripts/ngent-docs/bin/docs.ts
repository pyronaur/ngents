#!/usr/bin/env node

import { runDocsCliFromProcess } from "../src/core/command-dispatch.ts";
import { toDocsError } from "../src/core/errors.ts";
import { runQmdCollectionsCacheRefreshFromProcess } from "../src/runtime/qmd.ts";

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error;
}

function swallowBrokenPipe(error: Error): void {
	if (isErrnoException(error) && error.code === "EPIPE") {
		return;
	}
	throw error;
}

process.stdout.on("error", swallowBrokenPipe);
process.stderr.on("error", swallowBrokenPipe);

try {
	if (process.env.DOCS_INTERNAL_REFRESH_QMD_COLLECTIONS_CACHE === "1") {
		await runQmdCollectionsCacheRefreshFromProcess();
		process.exit(0);
	}

	await runDocsCliFromProcess();
} catch (error) {
	const wrapped = toDocsError(error);
	console.error(wrapped.message);
	process.exit(wrapped.exitCode);
}
