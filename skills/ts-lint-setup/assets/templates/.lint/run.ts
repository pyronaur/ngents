#!/usr/bin/env bun

import { $ } from "bun";

type Mode = "check" | "fix";

type PackageJson = {
	scripts?: Record<string, string>;
};

type Step = {
	label: string;
	script: string;
};

type StepResult = {
	durationMs: number;
	exitCode: number;
	label: string;
	output: string;
};

const decoder = new TextDecoder();
const fixSteps: Step[] = [
	{ label: "dprint fix", script: "lint:dprint:fix" },
	{ label: "oxlint fix", script: "lint:oxlint:fix" },
];
const checkSteps: Step[] = [
	{ label: "dprint", script: "lint:dprint" },
	{ label: "oxlint", script: "lint:oxlint" },
	{ label: "typecheck", script: "typecheck" },
	{ label: "jscpd:src", script: "jscpd:src" },
	{ label: "jscpd:tests", script: "jscpd:tests" },
	{ label: "knip", script: "knip" },
];

$.throws(false);

function isMode(value: string | undefined): value is Mode {
	return value === "check" || value === "fix";
}

function readMode(): Mode {
	const mode = process.argv[2];
	if (isMode(mode)) {
		return mode;
	}
	console.error("Usage: bun ./.lint/run.ts <check|fix>");
	process.exit(1);
}

function readOutput(output: Uint8Array): string {
	return decoder.decode(output).trim();
}

function joinOutput(input: {
	stderr: string;
	stdout: string;
}): string {
	const parts = [input.stdout, input.stderr].filter((value) => value.length > 0);
	return parts.join("\n");
}

function formatDuration(durationMs: number): string {
	return `${(durationMs / 1000).toFixed(2)}s`;
}

async function readPackageJson(): Promise<PackageJson> {
	const packageJson: PackageJson = JSON.parse(await Bun.file("package.json").text());
	return packageJson;
}

async function readAvailableScripts(): Promise<Set<string>> {
	const packageJson = await readPackageJson();
	return new Set(Object.keys(packageJson.scripts ?? {}));
}

function selectCheckSteps(availableScripts: Set<string>): Step[] {
	return checkSteps.filter((step) =>
		step.script !== "jscpd:tests" || availableScripts.has(step.script)
	);
}

function readMissingScripts(input: {
	availableScripts: Set<string>;
	steps: Step[];
}): string[] {
	return input.steps
		.map((step) => step.script)
		.filter((script) => !input.availableScripts.has(script));
}

function createScriptError(script: string): StepResult {
	return {
		label: script,
		exitCode: 1,
		durationMs: 0,
		output: `Missing required package script: ${script}`,
	};
}

function readScriptErrors(input: {
	availableScripts: Set<string>;
	steps: Step[];
}): StepResult[] {
	return readMissingScripts(input).map((script) => createScriptError(script));
}

async function runStep(input: {
	step: Step;
}): Promise<StepResult> {
	const startedAt = performance.now();
	const result = await $`bun run ${input.step.script}`.quiet();
	return {
		label: input.step.label,
		exitCode: result.exitCode,
		durationMs: performance.now() - startedAt,
		output: joinOutput({
			stdout: readOutput(result.stdout),
			stderr: readOutput(result.stderr),
		}),
	};
}

async function runParallelSteps(input: {
	steps: Step[];
}): Promise<StepResult[]> {
	return Promise.all(input.steps.map((step) => runStep({
		step,
	})));
}

async function runSequentialSteps(input: {
	steps: Step[];
}): Promise<StepResult[]> {
	const results: StepResult[] = [];
	for (const step of input.steps) {
		results.push(await runStep({
			step,
		}));
	}
	return results;
}

function logSuccess(result: StepResult): void {
	console.log(`PASS ${result.label} (${formatDuration(result.durationMs)})`);
}

function logFailure(result: StepResult): void {
	console.error(`FAIL ${result.label} (${formatDuration(result.durationMs)})`);
	if (result.output.length === 0) {
		return;
	}
	console.error(result.output);
}

function logResults(results: StepResult[]): void {
	for (const result of results) {
		if (result.exitCode === 0) {
			logSuccess(result);
			continue;
		}
		logFailure(result);
	}
}

function logSummary(results: StepResult[]): void {
	const failedCount = results.filter((result) => result.exitCode !== 0).length;
	const passedCount = results.length - failedCount;
	console.log(`Summary: ${passedCount} passed, ${failedCount} failed`);
}

function readExitCode(results: StepResult[]): number {
	return results.some((result) => result.exitCode !== 0) ? 1 : 0;
}

async function runCheckMode(input: {
	availableScripts: Set<string>;
}): Promise<StepResult[]> {
	const steps = selectCheckSteps(input.availableScripts);
	const scriptErrors = readScriptErrors({
		availableScripts: input.availableScripts,
		steps,
	});
	if (scriptErrors.length > 0) {
		return scriptErrors;
	}
	console.log(`Running ${steps.length} lint checks in parallel`);
	return runParallelSteps({
		steps,
	});
}

async function runFixMode(input: {
	availableScripts: Set<string>;
}): Promise<StepResult[]> {
	const validationSteps = selectCheckSteps(input.availableScripts).filter((step) =>
		step.script !== "lint:dprint" && step.script !== "lint:oxlint"
	);
	const steps = [...fixSteps, ...validationSteps];
	const scriptErrors = readScriptErrors({
		availableScripts: input.availableScripts,
		steps,
	});
	if (scriptErrors.length > 0) {
		return scriptErrors;
	}
	console.log(`Running ${fixSteps.length} fix steps sequentially`);
	const fixedResults = await runSequentialSteps({
		steps: fixSteps,
	});
	console.log(`Running ${validationSteps.length} validation steps in parallel`);
	const validationResults = await runParallelSteps({
		steps: validationSteps,
	});
	return [...fixedResults, ...validationResults];
}

async function run(): Promise<void> {
	const mode = readMode();
	const availableScripts = await readAvailableScripts();
	const results = mode === "fix"
		? await runFixMode({
			availableScripts,
		})
		: await runCheckMode({
			availableScripts,
		});
	logResults(results);
	logSummary(results);
	process.exit(readExitCode(results));
}

await run();
