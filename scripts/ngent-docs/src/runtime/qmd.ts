import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

import { runtimeError } from "../core/errors.ts";

type QmdRunResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

export const INDEX_NAME = "ngents-docs";
export const COLLECTION_NAME = "global-docs";
export const DOCS_ROOT = path.join(os.homedir(), ".ngents", "docs");
export const CACHE_ROOT = path.join(os.homedir(), ".ngents", "local", "qmd-cache");
export const CONFIG_ROOT = path.join(os.homedir(), ".ngents", "local", "qmd-config");

export function qmdEnv(): NodeJS.ProcessEnv {
	return {
		...process.env,
		XDG_CACHE_HOME: CACHE_ROOT,
		XDG_CONFIG_HOME: CONFIG_ROOT,
	};
}

export async function runQmd(
	args: string[],
	options: {
		streamOutput?: boolean;
	} = {},
): Promise<QmdRunResult> {
	return new Promise((resolve, reject) => {
		const child = spawn("qmd", ["--index", INDEX_NAME, ...args], {
			env: qmdEnv(),
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (chunk: Buffer | string) => {
			const text = chunk.toString();
			stdout += text;
			if (options.streamOutput) {
				process.stdout.write(text);
			}
		});
		child.stderr.on("data", (chunk: Buffer | string) => {
			const text = chunk.toString();
			stderr += text;
			if (options.streamOutput) {
				process.stderr.write(text);
			}
		});
		child.on("error", (error: NodeJS.ErrnoException) => {
			if (error.code === "ENOENT") {
				reject(runtimeError("qmd is required"));
				return;
			}

			reject(error);
		});
		child.on("close", (exitCode) => {
			resolve({
				exitCode: exitCode ?? 1,
				stdout,
				stderr,
			});
		});
	});
}
