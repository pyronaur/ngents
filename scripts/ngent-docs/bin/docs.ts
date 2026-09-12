#!/usr/bin/env node

import { runDocsCliFromProcess } from "../src/core/command-dispatch.ts";
import { toDocsError } from "../src/core/errors.ts";
import { ensureProcessStdioHandlesBrokenPipe } from "../src/runtime/fetch-handler-support.ts";

ensureProcessStdioHandlesBrokenPipe();

try {
	await runDocsCliFromProcess();
} catch (error) {
	const wrapped = toDocsError(error);
	console.error(wrapped.message);
	process.exit(wrapped.exitCode);
}
