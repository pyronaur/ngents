#!/usr/bin/env node

import { runNdexCliFromProcess } from "../src/core/command-dispatch.ts";
import { toNdexError } from "../src/core/errors.ts";

try {
	await runNdexCliFromProcess();
} catch (error) {
	const wrapped = toNdexError(error);
	console.error(wrapped.message);
	process.exit(wrapped.exitCode);
}
