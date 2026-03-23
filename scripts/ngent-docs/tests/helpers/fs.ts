import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function makeTempDir(prefix: string): Promise<string> {
	return mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function writeText(filePath: string, contents: string): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, contents);
}

export async function readText(filePath: string): Promise<string> {
	return readFile(filePath, "utf8");
}

export async function readTextOrEmpty(filePath: string): Promise<string> {
	try {
		return await readText(filePath);
	} catch {
		return "";
	}
}

export async function writeExecutable(
	dir: string,
	name: string,
	body: string,
): Promise<void> {
	const filePath = path.join(dir, name);
	await writeText(filePath, body);
	await chmod(filePath, 0o755);
}

export async function waitFor(
	description: string,
	check: () => Promise<boolean>,
	timeoutMs = 2_000,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		if (await check()) {
			return;
		}

		if (Date.now() >= deadline) {
			throw new Error(`Timed out waiting for ${description}`);
		}

		await new Promise(resolve => setTimeout(resolve, 25));
	}
}

export async function withTempDir<T>(prefix: string, run: (dir: string) => Promise<T>): Promise<T> {
	const dir = await makeTempDir(prefix);
	try {
		return await run(dir);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
