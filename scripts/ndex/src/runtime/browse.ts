import { runtimeError } from "../core/errors.ts";
import browseContracts from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import browseRender from "./browse-render.ts";
import {
	discoverDocsSources,
	resolveLocalDocsDirectory,
	resolveMergedDocsDirectories,
} from "./browse-sources.ts";

const { normalizePath } = browseContracts;

function fail(message: string): never {
	throw runtimeError(message);
}

function ensureDocsRoots(docsRoots: string[], label: string): void {
	if (docsRoots.length > 0) {
		return;
	}

	fail(`Docs root not found: ${label}`);
}

async function docsEntriesForWhere(currentDir: string, where: string | null) {
	const sources = await discoverDocsSources(currentDir);
	if (!where) {
		ensureDocsRoots(sources.mergedDocsRoots, currentDir);
		const index = await browseDiscovery.buildIndexData(sources.mergedDocsRoots);
		return {
			docs: index.docs,
		};
	}

	if (where === ".") {
		ensureDocsRoots(sources.localDocsRoots, ".");
		const index = await browseDiscovery.buildIndexData(sources.localDocsRoots);
		return {
			docs: index.docs,
		};
	}

	if (where === "global") {
		ensureDocsRoots(sources.globalDocsRoots, "~/.ngents/docs");
		const index = await browseDiscovery.buildIndexData(sources.globalDocsRoots);
		return {
			docs: index.docs,
		};
	}

	if (where.startsWith("docs/")) {
		ensureDocsRoots(sources.mergedDocsRoots, currentDir);
		const directories = await resolveMergedDocsDirectories(sources, where);
		const index = await browseDiscovery.buildIndexData(directories);
		return {
			docs: index.docs,
		};
	}

	const directoryPath = await resolveLocalDocsDirectory(sources, where);
	return {
		docs: await browseDiscovery.readDocsEntriesUnder(directoryPath),
	};
}

export async function runNdexLs(positionals: string[]): Promise<void> {
	if (positionals.length > 1) {
		fail("Usage: ndex ls [where]");
	}

	const currentDir = normalizePath(process.cwd());
	const where = positionals[0]?.trim() || null;
	const { docs } = await docsEntriesForWhere(currentDir, where);
	browseRender.printDocsBrowser(docs);
}
