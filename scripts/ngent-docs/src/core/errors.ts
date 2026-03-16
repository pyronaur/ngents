import { EXIT_RUNTIME_ERROR, EXIT_USAGE_ERROR } from "../constants.ts";

export class DocsError extends Error {
	public readonly exitCode: number;

	constructor(message: string, exitCode: number) {
		super(message);
		this.name = "DocsError";
		this.exitCode = exitCode;
	}
}

export function usageError(message: string): DocsError {
	const error = new DocsError(message, EXIT_USAGE_ERROR);
	error.name = "UsageError";
	return error;
}

export function runtimeError(message: string): DocsError {
	const error = new DocsError(message, EXIT_RUNTIME_ERROR);
	error.name = "RuntimeError";
	return error;
}

export function toDocsError(error: unknown): DocsError {
	if (error instanceof DocsError) {
		return error;
	}
	if (error instanceof Error) {
		return runtimeError(error.message);
	}
	return runtimeError(String(error));
}
