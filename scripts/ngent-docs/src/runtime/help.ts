import browseContracts from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import browseRender from "./browse-render.ts";
import { discoverDocsSources } from "./browse-sources.ts";

const { normalizePath } = browseContracts;

async function readDocsRootHelpData() {
	const currentDir = normalizePath(process.cwd());
	const sources = await discoverDocsSources(currentDir);
	return await browseDiscovery.buildIndexData(sources.mergedDocsRoots);
}

export async function runDocsRootHelp(options: { includeDocsIndex: boolean }): Promise<void> {
	const index = await readDocsRootHelpData();
	browseRender.printRootHelp(index.topics, index.docs, {
		includeDocsIndex: options.includeDocsIndex,
	});
}

export async function renderDocsRootHelp(options: { includeDocsIndex: boolean }): Promise<string> {
	const index = await readDocsRootHelpData();
	return browseRender.renderRootHelp(index.topics, index.docs, {
		includeDocsIndex: options.includeDocsIndex,
	});
}
