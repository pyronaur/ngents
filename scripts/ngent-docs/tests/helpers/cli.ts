import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

type CommandResult = {
	exitCode: number | null;
	stdout: string;
	stderr: string;
};

const helpersDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(helpersDir, "..", "..");

export function runCommand(
	command: string,
	args: string[],
	options: {
		cwd?: string;
		env?: NodeJS.ProcessEnv;
	} = {},
): Promise<CommandResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options.cwd ?? packageRoot,
			env: {
				...process.env,
				...options.env,
			},
		});

		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk: Buffer | string) => {
			stdout += chunk.toString();
		});
		child.stderr.on("data", (chunk: Buffer | string) => {
			stderr += chunk.toString();
		});
		child.on("error", reject);
		child.on("close", (exitCode) => {
			resolve({
				exitCode,
				stdout,
				stderr,
			});
		});
	});
}

export function runDocsCli(
	args: string[],
	options: {
		cwd?: string;
		env?: NodeJS.ProcessEnv;
	} = {},
): Promise<CommandResult> {
	return runCommand("node", [path.join(packageRoot, "bin", "docs.ts"), ...args], options);
}
