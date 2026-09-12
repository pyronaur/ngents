import { runtimeError } from "../core/errors.ts";
import { discoverDocsSources } from "./browse-sources.ts";
import { runRegisteredFetches } from "./fetch-update.ts";
import * as updateLog from "./update-log.ts";

function fail(message: string): never {
	throw runtimeError(message);
}

export async function runDocsUpdate(options: { force?: boolean } = {}): Promise<void> {
	const sources = await discoverDocsSources(process.cwd());
	const fetchResult = await runRegisteredFetches(sources.mergedDocsRoots, options);

	if (fetchResult.skippedUnsafeEntries.length > 0) {
		const count = fetchResult.skippedUnsafeEntries.length;
		fail(
			`${count} unsafe fetch ${
				count === 1 ? "entry was" : "entries were"
			} skipped during docs update.`,
		);
	}

	if (fetchResult.skippedMissingSources.length > 0) {
		updateLog.skippedMissingSources(fetchResult.skippedMissingSources.length);
	}
}
