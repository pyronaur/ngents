#!/usr/bin/env node

import { runDocsCliFromProcess } from "../src/core/command-dispatch.ts";
import { toDocsError } from "../src/core/errors.ts";
import { runQmdCollectionsCacheRefreshFromProcess } from "../src/runtime/qmd.ts";

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
