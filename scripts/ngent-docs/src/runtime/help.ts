import browseContracts from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import { discoverDocsSources } from "./browse-sources.ts";
import helpRender from "./help-render.ts";

const { normalizePath } = browseContracts;

async function readDocsRootHelpData() {
	const currentDir = normalizePath(process.cwd());
	const sources = await discoverDocsSources(currentDir);
	return await browseDiscovery.buildIndexData(sources.mergedDocsRoots);
}

export async function runDocsRootHelp(options: { includeDocsIndex: boolean }): Promise<void> {
	const index = await readDocsRootHelpData();
	helpRender.printRootHelp(index.topics, index.docs, {
		includeDocsIndex: options.includeDocsIndex,
	});
}

export async function renderDocsRootHelp(options: { includeDocsIndex: boolean }): Promise<string> {
	const index = await readDocsRootHelpData();
	return helpRender.renderRootHelp(index.topics, index.docs, {
		includeDocsIndex: options.includeDocsIndex,
	});
}
