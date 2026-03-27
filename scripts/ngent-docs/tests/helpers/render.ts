import { vi } from "vitest";

function restoreColorEnv(input: {
	originalForceColor: string | undefined;
	originalNoColor: string | undefined;
}): void {
	if (input.originalNoColor === undefined) {
		delete process.env.NO_COLOR;
	}
	if (input.originalNoColor !== undefined) {
		process.env.NO_COLOR = input.originalNoColor;
	}
	if (input.originalForceColor === undefined) {
		delete process.env.FORCE_COLOR;
	}
	if (input.originalForceColor !== undefined) {
		process.env.FORCE_COLOR = input.originalForceColor;
	}
}

export async function captureOutput(run: () => void | Promise<void>): Promise<string> {
	const captured: string[] = [];
	const originalNoColor = process.env.NO_COLOR;
	const originalForceColor = process.env.FORCE_COLOR;

	process.env.NO_COLOR = "1";
	delete process.env.FORCE_COLOR;

	const logSpy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
		captured.push(`${args.map(value => String(value)).join(" ")}\n`);
	});
	const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(
		(chunk, encoding) => {
			if (typeof chunk === "string") {
				captured.push(chunk);
			}
			if (typeof chunk !== "string") {
				captured.push(
					Buffer.from(chunk).toString(typeof encoding === "string" ? encoding : "utf8"),
				);
			}
			return true;
		},
	);

	try {
		await run();
	} finally {
		logSpy.mockRestore();
		stdoutSpy.mockRestore();
		restoreColorEnv({
			originalForceColor,
			originalNoColor,
		});
	}

	return captured.join("");
}
