import { EXIT_RUNTIME_ERROR, EXIT_USAGE_ERROR } from "../constants.ts";

export class NdexError extends Error {
	public readonly exitCode: number;

	constructor(message: string, exitCode: number) {
		super(message);
		this.name = "NdexError";
		this.exitCode = exitCode;
	}
}

export function usageError(message: string): NdexError {
	const error = new NdexError(message, EXIT_USAGE_ERROR);
	error.name = "UsageError";
	return error;
}

export function runtimeError(message: string): NdexError {
	const error = new NdexError(message, EXIT_RUNTIME_ERROR);
	error.name = "RuntimeError";
	return error;
}

export function toNdexError(error: unknown): NdexError {
	if (error instanceof NdexError) {
		return error;
	}
	if (error instanceof Error) {
		return runtimeError(error.message);
	}
	return runtimeError(String(error));
}
