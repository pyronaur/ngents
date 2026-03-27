import browseContracts from "./browse-contracts.ts";

const { printLine } = browseContracts;

export function printRenderedTemplate(rendered: string): void {
	for (const line of rendered.split("\n")) {
		printLine(line);
	}
}

export default {
	printRenderedTemplate,
};
