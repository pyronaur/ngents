import { docsRootHelpFixture } from "./docs.fixture.ts";

export const lsFixture = {
	defaultView: {
		docs: docsRootHelpFixture.docs,
	},
	selectorView: {
		docs: docsRootHelpFixture.docs.filter(entry => entry.relativePath.startsWith("architecture/")),
		options: {
			title: "Docs: architecture",
			topicHint: "architecture",
		},
	},
};
