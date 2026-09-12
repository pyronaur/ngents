import { access } from "node:fs/promises";

import {
	fetchEntryLabel,
	listFetchDefinitions,
	manifestPathForDocsRoot,
	MissingFetchSourceError,
	readFetchManifest,
	runFetchDefinition,
	upsertManifestEntry,
	type ValidatedFetchDefinition,
	validateFetchEntryTarget,
	writeFetchManifest,
} from "./fetch.ts";
import * as updateLog from "./update-log.ts";

const FETCH_FRESHNESS_MS = 24 * 60 * 60 * 1_000;

type FetchOutcome =
	| {
		ok: true;
		definition: ValidatedFetchDefinition;
		entry: Awaited<ReturnType<typeof runFetchDefinition>>;
	}
	| {
		ok: false;
		definition: ValidatedFetchDefinition;
		error: Error;
		missingSource: boolean;
	};

function groupFetchDefinitions(
	definitions: ValidatedFetchDefinition[],
): Map<string, ValidatedFetchDefinition[]> {
	const groups = new Map<string, ValidatedFetchDefinition[]>();
	for (const definition of definitions) {
		const group = groups.get(definition.docsRoot) ?? [];
		group.push(definition);
		groups.set(definition.docsRoot, group);
	}
	return groups;
}

async function runFetchEntry(definition: ValidatedFetchDefinition): Promise<FetchOutcome> {
	try {
		return {
			ok: true,
			definition,
			entry: await runFetchDefinition(definition, "docs update"),
		};
	} catch (error) {
		if (error instanceof MissingFetchSourceError) {
			updateLog.fetchMissing(fetchEntryLabel(definition), error.message);
			return {
				ok: false,
				definition,
				error,
				missingSource: true,
			};
		}
		if (error instanceof Error) {
			updateLog.fetchFailed(fetchEntryLabel(definition));
			return {
				ok: false,
				definition,
				error,
				missingSource: false,
			};
		}
		const wrapped = new Error(String(error));
		updateLog.fetchFailed(fetchEntryLabel(definition));
		return {
			ok: false,
			definition,
			error: wrapped,
			missingSource: false,
		};
	}
}

function needsFetchRefresh(input: {
	checkedAt?: string;
	targetExists: boolean;
	now: number;
	force?: boolean;
}): boolean {
	const checkedAt = Date.parse(input.checkedAt ?? "");
	return !!input.force || !input.targetExists || !Number.isFinite(checkedAt)
		|| checkedAt > input.now || checkedAt <= input.now - FETCH_FRESHNESS_MS;
}

async function targetExists(definition: ValidatedFetchDefinition): Promise<boolean> {
	try {
		await access(definition.absoluteTargetPath);
		return true;
	} catch {
		return false;
	}
}

async function runFetchGroup(
	docsRoot: string,
	definitions: ValidatedFetchDefinition[],
): Promise<FetchOutcome[]> {
	updateLog.fetchGroupStart(docsRoot, definitions.length);
	const outcomes = await Promise.all(definitions.map(runFetchEntry));
	const updatedEntries = outcomes.flatMap(outcome => outcome.ok ? [outcome.entry] : []);
	if (updatedEntries.length > 0) {
		let manifest = await readFetchManifest(docsRoot);
		for (const entry of updatedEntries) {
			manifest = upsertManifestEntry(manifest, entry);
		}
		await writeFetchManifest(docsRoot, manifest);
		updateLog.fetchManifestWrote(manifestPathForDocsRoot(docsRoot));
	}
	updateLog.fetchGroupDone(docsRoot);
	return outcomes;
}

export async function runRegisteredFetches(
	docsRoots: string[],
	options: { force?: boolean } = {},
): Promise<{ skippedMissingSources: string[]; skippedUnsafeEntries: string[] }> {
	const definitions = await listFetchDefinitions(docsRoots);
	const skippedUnsafeEntries: string[] = [];
	const validDefinitions: ValidatedFetchDefinition[] = [];
	updateLog.registeredFetches(definitions.length);
	for (const definition of definitions) {
		const validatedDefinition = await validateFetchEntryTarget(definition);
		if (!validatedDefinition.ok) {
			skippedUnsafeEntries.push(validatedDefinition.message);
			updateLog.unsafeFetchEntry(validatedDefinition.message);
			continue;
		}
		validDefinitions.push(validatedDefinition.value);
	}

	if (validDefinitions.length === 0) {
		return {
			skippedMissingSources: [],
			skippedUnsafeEntries,
		};
	}

	const definitionsToFetch = options.force
		? validDefinitions
		: (await Promise.all(
			validDefinitions.map(async definition =>
				needsFetchRefresh({
						checkedAt: definition.entry.checkedAt,
						targetExists: await targetExists(definition),
						now: Date.now(),
					})
					? definition
					: null
			),
		)).filter((definition): definition is ValidatedFetchDefinition => definition !== null);
	updateLog.freshFetchesSkipped(validDefinitions.length - definitionsToFetch.length);
	if (definitionsToFetch.length === 0) {
		return {
			skippedMissingSources: [],
			skippedUnsafeEntries,
		};
	}

	const groupedDefinitions = groupFetchDefinitions(definitionsToFetch);
	const outcomes = (
		await Promise.all(
			[...groupedDefinitions].map(([docsRoot, group]) => runFetchGroup(docsRoot, group)),
		)
	).flat();
	const failedOutcome = outcomes.find(outcome => !outcome.ok && !outcome.missingSource);
	if (failedOutcome && !failedOutcome.ok) {
		throw failedOutcome.error;
	}
	const skippedMissingSources = outcomes.flatMap(outcome =>
		!outcome.ok && outcome.missingSource ? [fetchEntryLabel(outcome.definition)] : []
	);
	return {
		skippedMissingSources,
		skippedUnsafeEntries,
	};
}
