import { runtimeError } from "../core/errors.ts";
import { invalidateQmdCollectionsCache, runQmd } from "./qmd.ts";

function fail(message: string): never {
	throw runtimeError(message);
}

export async function runDocsUpdate(): Promise<void> {
	const updateResult = await runQmd(["update"], { streamOutput: true });
	if (updateResult.exitCode !== 0) {
		fail(updateResult.stderr.trim() || updateResult.stdout.trim() || "qmd update failed");
	}

	const embedResult = await runQmd(["embed"], { streamOutput: true });
	if (embedResult.exitCode !== 0) {
		fail(embedResult.stderr.trim() || embedResult.stdout.trim() || "qmd embed failed");
	}

	await invalidateQmdCollectionsCache();
}
