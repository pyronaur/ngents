import browseContracts from "./browse-contracts.ts";
import browseDiscovery from "./browse-discovery.ts";
import browseRender from "./browse-render.ts";
import { discoverDocsSources } from "./browse-sources.ts";

const { normalizePath } = browseContracts;

export async function runDocsRootHelp(options: { includeDocsIndex: boolean }): Promise<void> {
	const currentDir = normalizePath(process.cwd());
	const sources = await discoverDocsSources(currentDir);
	const index = await browseDiscovery.buildIndexData(sources.mergedDocsRoots);
	browseRender.printRootHelp(index.topics, index.docs, {
		includeDocsIndex: options.includeDocsIndex,
	});
}
