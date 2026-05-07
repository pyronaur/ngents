import pc from "picocolors";

function heading(scope: string): string {
	return pc.bold(pc.cyan(`${scope}:`));
}

function write(scope: string, message: string): void {
	console.error(`${heading(scope)} ${message}`);
}

export function fetchStart(scope: string, label: string): void {
	write(scope, `${pc.blue("fetch start")} ${pc.dim(label)}`);
}

export function fetchStatus(scope: string, status: "unchanged" | "updated", label: string): void {
	const coloredStatus = status === "updated" ? pc.green(status) : pc.dim(status);
	write(scope, `${pc.blue("fetch")} ${coloredStatus} ${pc.dim(label)}`);
}

export function fetchMissing(label: string, message: string): void {
	write("docs update", `${pc.yellow("fetch missing")} ${pc.dim(label)}: ${pc.yellow(message)}`);
}

export function fetchFailed(label: string): void {
	write("docs update", `${pc.red("fetch failed")} ${pc.dim(label)}`);
}

export function fetchGroupStart(docsRoot: string, count: number): void {
	write("docs update",
		`${pc.blue("fetch group start")} ${pc.dim(docsRoot)} ${pc.yellow(`(${count})`)}`);
}

export function fetchGroupDone(docsRoot: string): void {
	write("docs update", `${pc.green("fetch group done")} ${pc.dim(docsRoot)}`);
}

export function fetchManifestWrote(manifestPath: string): void {
	write("docs update", `${pc.green("fetch manifest wrote")} ${pc.dim(manifestPath)}`);
}

export function registeredFetches(count: number): void {
	write("docs update", `${pc.blue("registered fetches")} ${pc.yellow(String(count))}`);
}

export function unsafeFetchEntry(message: string): void {
	write("docs update", pc.red(message));
}

export function qmdStep(step: "update" | "embed"): void {
	write("docs update", `${pc.magenta("qmd")} ${pc.blue(step)} ${pc.dim("start")}`);
}

export function qmdCacheInvalidated(): void {
	write("docs update", `${pc.magenta("qmd")} ${pc.green("cache invalidated")}`);
}

export function skippedMissingSources(count: number): void {
	write("docs update", `${pc.yellow("skipped missing fetch sources")} ${pc.yellow(String(count))}`);
}
