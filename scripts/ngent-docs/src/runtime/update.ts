import { runtimeError } from "../core/errors.ts";
import { runRegisteredFetches } from "./fetch.ts";
import { invalidateQmdCollectionsCache, runQmd } from "./qmd.ts";

function fail(message: string): never {
	throw runtimeError(message);
}

export async function runDocsUpdate(): Promise<void> {
	const fetchResult = await runRegisteredFetches(process.cwd());

	const updateResult = await runQmd(["update"], { streamOutput: true });
	if (updateResult.exitCode !== 0) {
		fail(updateResult.stderr.trim() || updateResult.stdout.trim() || "qmd update failed");
	}

	const embedResult = await runQmd(["embed"], { streamOutput: true });
	if (embedResult.exitCode !== 0) {
		fail(embedResult.stderr.trim() || embedResult.stdout.trim() || "qmd embed failed");
	}

	await invalidateQmdCollectionsCache();

	if (fetchResult.skippedUnsafeEntries.length > 0) {
		const count = fetchResult.skippedUnsafeEntries.length;
		fail(
			`${count} unsafe fetch ${
				count === 1 ? "entry was" : "entries were"
			} skipped during docs update.`,
		);
	}
}
