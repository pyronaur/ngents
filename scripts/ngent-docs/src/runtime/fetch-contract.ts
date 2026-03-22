export const FETCH_MANIFEST_NAME = ".docs-fetch.json";
export const BUILTIN_GIT_FETCH_HANDLER = "docs-git-fetch";
export const BUILTIN_URL_FILE_FETCH_HANDLER = "docs-url-file-fetch";

export type FetchManifestEntry = {
	source: string;
	target: string;
	handler: string;
	root?: string;
	transform?: string;
	hash: string;
};

export type FetchManifest = {
	entries: FetchManifestEntry[];
};

export type FetchHandlerInvocation = {
	source: string;
	target: string;
	previousHash: string;
	root?: string;
	transform?: string;
};
