#!/usr/bin/env bun
/**
 * Filtered HIG Doctor wrapper with YAML-based exact ignore support.
 * @autohelp
 * @usage ng hig-doctor [directory]
 */
import { access, readFile, realpath } from 'node:fs/promises';
import path, { dirname, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type MatchType = 'pattern' | 'positive' | 'concern';

type PatternMatch = {
	category: string;
	subcategory: string;
	type: MatchType;
	pattern: string;
	line: number;
	lineContent: string;
	file: string;
};

type ScannedFile = {
	relativePath: string;
	absolutePath: string;
	content: string;
};

type ScanResult = {
	directory: string;
	frameworks: string[];
	codeFiles: ScannedFile[];
	styleFiles: ScannedFile[];
	configFiles: ScannedFile[];
	markupFiles: ScannedFile[];
};

type CategorySummary = {
	skillName: string;
	category: string;
	label: string;
	matches: PatternMatch[];
	concerns: number;
	positives: number;
	patterns: number;
	fileCount: number;
	files: string[];
};

type HigDoctorModules = {
	scanProject: (directory: string) => Promise<ScanResult>;
	detectPatterns: (content: string, file: string) => PatternMatch[];
	categorizeMatches: (matches: PatternMatch[]) => CategorySummary[];
};

type IgnoreEntry = {
	file: string;
	pattern: string;
	line: number;
	reason: string;
};

type IgnoreConfig = {
	excludedPaths: string[];
	ignoredConcerns: IgnoreEntry[];
};

type IgnoredConcern = {
	match: PatternMatch;
	reason: string;
};

const IGNORE_FILE_NAME = '.higignore.yaml';

function toPosixPath(value: string): string {
	return value.replaceAll('\\', '/');
}

function usage(): string {
	return [
		'Usage: ng hig-doctor [directory]',
		'',
		`Reads ${IGNORE_FILE_NAME} from the current working directory.`,
		'- `excludedPaths` skips matching files before HIG pattern detection runs.',
		'- `ignoredConcerns` filters exact concern matches by file, pattern, and line.',
	].join('\n');
}

function fail(message: string, exitCode = 1): never {
	process.stderr.write(`${message}\n`);
	process.exit(exitCode);
}

function readNonEmptyString(value: unknown, fieldPath: string): string {
	if (typeof value !== 'string') {
		throw new Error(`${fieldPath} must be a string`);
	}

	const normalized = value.trim();
	if (!normalized) {
		throw new Error(`${fieldPath} must be a non-empty string`);
	}

	return normalized;
}

function readPositiveLine(value: unknown, fieldPath: string): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
		throw new Error(`${fieldPath} must be a positive integer`);
	}

	return value;
}

async function loadIgnoreConfig(configDir: string): Promise<IgnoreConfig> {
	const configPath = join(configDir, IGNORE_FILE_NAME);

	try {
		await access(configPath);
	} catch {
		return { excludedPaths: [], ignoredConcerns: [] };
	}

	let parsed: unknown;
	try {
		const content = await readFile(configPath, 'utf8');
		parsed = Bun.YAML.parse(content);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to read ${IGNORE_FILE_NAME}: ${message}`);
	}

	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error(`${IGNORE_FILE_NAME} must contain a top-level mapping`);
	}

	const object = parsed as Record<string, unknown>;
	const excludedPathsValue = object.excludedPaths;
	const ignoredConcernsValue = object.ignoredConcerns;

	let excludedPaths: string[] = [];
	if (excludedPathsValue !== undefined) {
		if (!Array.isArray(excludedPathsValue)) {
			throw new Error('excludedPaths must be an array');
		}

		excludedPaths = excludedPathsValue.map((entry, index) =>
			toPosixPath(readNonEmptyString(entry, `excludedPaths[${index}]`)),
		);
	}

	if (ignoredConcernsValue === undefined) {
		return { excludedPaths, ignoredConcerns: [] };
	}

	if (!Array.isArray(ignoredConcernsValue)) {
		throw new Error('ignoredConcerns must be an array');
	}

	const ignoredConcerns = ignoredConcernsValue.map((entry, index) => {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
			throw new Error(`ignoredConcerns[${index}] must be a mapping`);
		}

		const object = entry as Record<string, unknown>;
		return {
			file: toPosixPath(readNonEmptyString(object.file, `ignoredConcerns[${index}].file`)),
			pattern: readNonEmptyString(object.pattern, `ignoredConcerns[${index}].pattern`),
			line: readPositiveLine(object.line, `ignoredConcerns[${index}].line`),
			reason: readNonEmptyString(object.reason, `ignoredConcerns[${index}].reason`),
		};
	});

	return { excludedPaths, ignoredConcerns };
}

async function importModule<T>(modulePath: string): Promise<T> {
	return import(pathToFileURL(modulePath).href) as Promise<T>;
}

async function resolveModulePath(moduleDir: string, baseName: string, preferredExt: string): Promise<string> {
	const candidates = [preferredExt, '.ts', '.js', '.mjs']
		.filter((value, index, values) => value && values.indexOf(value) === index)
		.map(extension => join(moduleDir, `${baseName}${extension}`));

	for (const candidate of candidates) {
		try {
			await access(candidate);
			return candidate;
		} catch {}
	}

	throw new Error(`Unable to resolve hig-doctor module "${baseName}" from ${moduleDir}`);
}

async function loadHigDoctorModules(): Promise<HigDoctorModules> {
	const executablePath = Bun.which('hig-doctor');
	if (!executablePath) {
		throw new Error('hig-doctor is not installed or not on PATH');
	}

	const entrypointPath = await realpath(executablePath);
	const moduleDir = dirname(entrypointPath);
	const preferredExt = extname(entrypointPath);

	const scannerPath = await resolveModulePath(moduleDir, 'scanner', preferredExt);
	const patternsPath = await resolveModulePath(moduleDir, 'patterns', preferredExt);
	const categorizerPath = await resolveModulePath(moduleDir, 'categorizer', preferredExt);

	const [scannerModule, patternsModule, categorizerModule] = await Promise.all([
		importModule<{ scanProject: HigDoctorModules['scanProject'] }>(scannerPath),
		importModule<{ detectPatterns: HigDoctorModules['detectPatterns'] }>(patternsPath),
		importModule<{ categorizeMatches: HigDoctorModules['categorizeMatches'] }>(categorizerPath),
	]);

	return {
		scanProject: scannerModule.scanProject,
		detectPatterns: patternsModule.detectPatterns,
		categorizeMatches: categorizerModule.categorizeMatches,
	};
}

function ignoreKey(entry: Pick<IgnoreEntry, 'file' | 'pattern' | 'line'>): string {
	return `${toPosixPath(entry.file)}:${entry.pattern}:${String(entry.line)}`;
}

function matchKey(match: PatternMatch): string {
	return `${toPosixPath(match.file)}:${match.pattern}:${String(match.line)}`;
}

function formatLineContent(lineContent: string): string {
	return lineContent.trim() || '(blank line)';
}

function toConfigRelativePath(targetDirectory: string, configDirectory: string, targetRelativePath: string): string {
	return toPosixPath(path.relative(configDirectory, join(targetDirectory, targetRelativePath)));
}

function compileExcludeMatchers(patterns: string[]): Bun.Glob[] {
	return patterns.map((pattern, index) => {
		try {
			return new Bun.Glob(pattern);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`excludedPaths[${index}] is not a valid glob: ${message}`);
		}
	});
}

function isExcludedPath(
	targetDirectory: string,
	configDirectory: string,
	targetRelativePath: string,
	matchers: Bun.Glob[],
): boolean {
	if (matchers.length === 0) {
		return false;
	}

	const configRelativePath = toConfigRelativePath(targetDirectory, configDirectory, targetRelativePath);
	return matchers.some(matcher => matcher.match(configRelativePath));
}

function renderConcernsMarkdown(categories: CategorySummary[]): string {
	if (categories.length === 0) {
		return '';
	}

	const lines = ['# HIG Doctor Issues', ''];

	for (const category of categories) {
		lines.push(`## ${category.label}`);
		lines.push('');

		for (const match of category.matches) {
			lines.push(`- \`${match.file}:${String(match.line)}\` \`${match.pattern}\``);
			lines.push(`  > \`${formatLineContent(match.lineContent)}\``);
			lines.push('');
		}
	}

	return lines.join('\n').trimEnd();
}

function renderIgnoredConcernsMarkdown(ignoredConcerns: IgnoredConcern[]): string {
	if (ignoredConcerns.length === 0) {
		return '';
	}

	const lines = ['## Ignored Concerns', ''];

	for (const ignoredConcern of ignoredConcerns) {
		const { match, reason } = ignoredConcern;
		lines.push(`- \`${match.pattern}\`: ok because ${reason}`);
		lines.push(`  -> in \`${match.file}:${String(match.line)}\``);
		lines.push('');
	}

	return lines.join('\n').trimEnd();
}

function renderMarkdown(categories: CategorySummary[], ignoredConcerns: IgnoredConcern[]): string {
	const sections = [renderConcernsMarkdown(categories), renderIgnoredConcernsMarkdown(ignoredConcerns)]
		.map(section => section.trim())
		.filter(section => section.length > 0);

	if (sections.length === 0) {
		return '';
	}

	return `${sections.join('\n\n')}\n`;
}

function writeIssueSummary(categories: CategorySummary[]): void {
	const concernCount = categories.reduce((sum, category) => sum + category.concerns, 0);
	process.stderr.write(`${String(concernCount)} HIG concern(s) found.\n`);

	const skills = [...new Set(categories.map(category => category.skillName))].sort();
	for (const skill of skills) {
		process.stderr.write(`Relevant HIG skill: ${skill} — docs topic app hig-doctor\n`);
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	if (args.includes('--help') || args.includes('-h')) {
		process.stdout.write(`${usage()}\n`);
		process.exit(0);
	}

	const unsupportedFlags = args.filter(argument => argument.startsWith('-'));
	if (unsupportedFlags.length > 0) {
		fail(`Unsupported option: ${unsupportedFlags[0]}\n\n${usage()}`);
	}

	const [directory = '.'] = args;
	const targetDirectory = resolve(directory);
	const configDirectory = process.cwd();

	const [modules, ignoreConfig] = await Promise.all([
		loadHigDoctorModules(),
		loadIgnoreConfig(configDirectory),
	]);

	const scanResult = await modules.scanProject(targetDirectory);
	const excludeMatchers = compileExcludeMatchers(ignoreConfig.excludedPaths);
	const allFiles = [...scanResult.codeFiles, ...scanResult.styleFiles, ...scanResult.markupFiles].filter(
		file => !isExcludedPath(targetDirectory, configDirectory, file.relativePath, excludeMatchers),
	);
	const allMatches = allFiles.flatMap(file =>
		modules.detectPatterns(file.content, file.relativePath).map(match => ({
			...match,
			file: toConfigRelativePath(targetDirectory, configDirectory, match.file),
		})),
	);

	const ignoreReasons = new Map(ignoreConfig.ignoredConcerns.map(entry => [ignoreKey(entry), entry.reason]));
	const visibleConcernMatches: PatternMatch[] = [];
	const ignoredConcerns: IgnoredConcern[] = [];

	for (const match of allMatches) {
		if (match.type !== 'concern') {
			continue;
		}

		const reason = ignoreReasons.get(matchKey(match));
		if (reason) {
			ignoredConcerns.push({ match, reason });
			continue;
		}

		visibleConcernMatches.push(match);
	}

	const categories = modules.categorizeMatches(visibleConcernMatches);
	const markdown = renderMarkdown(categories, ignoredConcerns);

	if (markdown) {
		process.stdout.write(markdown);
	}

	if (categories.length > 0) {
		writeIssueSummary(categories);
		process.exit(1);
	}

	process.exit(0);
}

await main().catch(error => {
	const message = error instanceof Error ? error.message : String(error);
	fail(message, 2);
});
