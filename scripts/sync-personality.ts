#!/usr/bin/env bun

import os from "node:os";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const REQUIRED_SLOT = "pragmatic";
const REQUIRED_NAME = "smart";
const DEFAULT_SOURCE_MODEL = "gpt-5.3-codex";
const SOURCE_MODELS_URL =
	"https://raw.githubusercontent.com/openai/codex/main/codex-rs/core/models.json";

type Command = "set" | "activate";

type ModelsCatalog = {
	models: unknown[];
	[key: string]: unknown;
};

function fail(message: string): never {
	console.error(`Error: ${message}`);
	process.exit(1);
}

function usage(message?: string): never {
	if (message) {
		console.error(`Error: ${message}`);
	}
	console.error(
		[
			"Usage:",
			"  bun run ~/.ngents/scripts/sync-personality.ts set pragmatic smart [--source-model <slug>]",
			"  bun run ~/.ngents/scripts/sync-personality.ts activate smart",
		].join("\n"),
	);
	process.exit(1);
}

function parseArgs(argv: string[]): {
	command: Command;
	sourceModel: string;
} {
	const command = argv[0];
	if (command !== "set" && command !== "activate") {
		usage(`unknown command: ${command ?? "(missing)"}`);
	}

	if (command === "set") {
		const slot = argv[1];
		const name = argv[2];
		if (slot !== REQUIRED_SLOT || name !== REQUIRED_NAME) {
			usage(
				`expected: set ${REQUIRED_SLOT} ${REQUIRED_NAME}; got: set ${slot ?? "(missing)"} ${name ?? "(missing)"}`,
			);
		}

		let sourceModel = DEFAULT_SOURCE_MODEL;
		let index = 3;
		while (index < argv.length) {
			const token = argv[index];
			if (token === "--source-model") {
				const value = argv[index + 1];
				if (!value) {
					usage("missing value for --source-model");
				}
				sourceModel = value;
				index += 2;
				continue;
			}
			if (token.startsWith("--source-model=")) {
				const value = token.slice("--source-model=".length);
				if (!value) {
					usage("missing value for --source-model");
				}
				sourceModel = value;
				index += 1;
				continue;
			}
			usage(`unknown argument: ${token}`);
		}
		return { command, sourceModel };
	}

	const name = argv[1];
	if (name !== REQUIRED_NAME) {
		usage(`expected: activate ${REQUIRED_NAME}; got: activate ${name ?? "(missing)"}`);
	}
	if (argv.length > 2) {
		usage(`unexpected argument: ${argv[2]}`);
	}
	return { command, sourceModel: DEFAULT_SOURCE_MODEL };
}

async function parseResponseJsonOrFail(response: Response, sourceUrl: string): Promise<unknown> {
	try {
		return await response.json();
	} catch (error) {
		fail(`failed to parse source models catalog JSON from ${sourceUrl}: ${String(error)}`);
	}
}

async function fetchSourceCatalog(): Promise<ModelsCatalog> {
	const response = await fetch(SOURCE_MODELS_URL);
	if (!response.ok) {
		fail(
			`failed to fetch source models catalog from ${SOURCE_MODELS_URL}: HTTP ${response.status} ${response.statusText}`,
		);
	}

	const parsed = await parseResponseJsonOrFail(response, SOURCE_MODELS_URL);

	if (!isObject(parsed) || !Array.isArray(parsed.models)) {
		fail(`invalid source catalog format from ${SOURCE_MODELS_URL}`);
	}

	return parsed as ModelsCatalog;
}

function getManagedDir(): string {
	return path.join(os.homedir(), ".ngents", "config");
}

function getManagedMarkdownPath(): string {
	return path.join(getManagedDir(), "personality.md");
}

function getManagedCatalogPath(): string {
	return path.join(getManagedDir(), "personality.models.json");
}

function getConfigPathCandidates(): string[] {
	const envCodexHome = process.env.CODEX_HOME?.trim();
	const home = os.homedir();

	const candidates: string[] = [];
	if (envCodexHome) {
		candidates.push(path.join(envCodexHome, "config.toml"));
	}
	candidates.push(path.join(home, ".agents", "config.toml"));
	candidates.push(path.join(home, ".codex", "config.toml"));
	return [...new Set(candidates)];
}

async function resolveActiveConfigPath(): Promise<string> {
	const candidates = getConfigPathCandidates();
	for (const candidate of candidates) {
		const exists = await Bun.file(candidate).exists();
		if (exists) {
			return candidate;
		}
	}
	return candidates[0]!;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getModelSlug(model: unknown): string | null {
	if (!isObject(model)) {
		return null;
	}
	const slug = model.slug;
	return typeof slug === "string" ? slug : null;
}

function getPragmaticPersonalityText(model: unknown): string | null {
	if (!isObject(model)) {
		return null;
	}
	const modelMessages = model.model_messages;
	if (!isObject(modelMessages)) {
		return null;
	}
	const instructionsVariables = modelMessages.instructions_variables;
	if (!isObject(instructionsVariables)) {
		return null;
	}
	const pragmatic = instructionsVariables.personality_pragmatic;
	return typeof pragmatic === "string" ? pragmatic : null;
}

function setPragmaticPersonalityText(model: unknown, value: string): boolean {
	if (!isObject(model)) {
		return false;
	}
	const modelMessages = model.model_messages;
	if (!isObject(modelMessages)) {
		return false;
	}
	const instructionsVariables = modelMessages.instructions_variables;
	if (!isObject(instructionsVariables)) {
		return false;
	}
	if (typeof instructionsVariables.personality_pragmatic !== "string") {
		return false;
	}
	instructionsVariables.personality_pragmatic = value;
	return true;
}

function cloneCatalog(catalog: ModelsCatalog): ModelsCatalog {
	return JSON.parse(JSON.stringify(catalog)) as ModelsCatalog;
}

function collectPragmaticModelSlugs(catalog: ModelsCatalog): string[] {
	const slugs: string[] = [];
	for (const model of catalog.models) {
		const slug = getModelSlug(model);
		const pragmatic = getPragmaticPersonalityText(model);
		if (slug && pragmatic !== null) {
			slugs.push(slug);
		}
	}
	return slugs;
}

function resolveSourceModelPragmaticText(catalog: ModelsCatalog, sourceModel: string): string {
	for (const model of catalog.models) {
		const slug = getModelSlug(model);
		if (slug !== sourceModel) {
			continue;
		}
		const pragmatic = getPragmaticPersonalityText(model);
		if (pragmatic === null) {
			const pragmaticSlugs = collectPragmaticModelSlugs(catalog);
			fail(
				`source model \`${sourceModel}\` has no pragmatic slot. Valid source models: ${pragmaticSlugs.join(", ")}`,
			);
		}
		return pragmatic;
	}
	fail(`source model \`${sourceModel}\` was not found in source catalog`);
}

function applyPragmaticTextToCatalog(catalog: ModelsCatalog, text: string): {
	updatedCatalog: ModelsCatalog;
	updatedSlugs: string[];
} {
	const updatedCatalog = cloneCatalog(catalog);
	const updatedSlugs: string[] = [];
	for (const model of updatedCatalog.models) {
		const slug = getModelSlug(model);
		if (!slug) {
			continue;
		}
		if (setPragmaticPersonalityText(model, text)) {
			updatedSlugs.push(slug);
		}
	}
	if (updatedSlugs.length === 0) {
		fail("no models with pragmatic personality slot were found in source catalog");
	}
	return { updatedCatalog, updatedSlugs };
}

function parseTopLevelProfile(configToml: string): string | null {
	const lines = configToml.split(/\r?\n/);
	let inSection = false;

	for (const line of lines) {
		const sectionMatch = line.match(/^\s*\[.*\]\s*(?:#.*)?$/);
		if (sectionMatch) {
			inSection = true;
		}
		if (inSection) {
			continue;
		}

		const profileMatch = line.match(/^\s*profile\s*=\s*(?:"([^"]+)"|'([^']+)')\s*(?:#.*)?$/);
		if (profileMatch) {
			return profileMatch[1] ?? profileMatch[2] ?? null;
		}
	}

	return null;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toTomlString(value: string): string {
	return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function isSectionHeader(line: string): boolean {
	return /^\s*\[.*\]\s*(?:#.*)?$/.test(line);
}

function findProfileSectionStart(lines: string[], profile: string): number {
	const profileSectionPattern = new RegExp(
		`^\\s*\\[\\s*profiles\\.(?:"([^"]+)"|([^\\]\\s#]+))\\s*\\]\\s*(?:#.*)?$`,
	);
	for (let index = 0; index < lines.length; index += 1) {
		const match = lines[index]?.match(profileSectionPattern);
		if (!match) {
			continue;
		}
		const found = (match[1] ?? match[2] ?? "").trim();
		if (found === profile) {
			return index;
		}
	}
	return -1;
}

function findNextSectionStart(lines: string[], start: number): number {
	for (let index = start; index < lines.length; index += 1) {
		if (isSectionHeader(lines[index] ?? "")) {
			return index;
		}
	}
	return lines.length;
}

function ensureProfileSection(lines: string[], profile: string): {
	start: number;
	end: number;
} {
	let start = findProfileSectionStart(lines, profile);
	if (start === -1) {
		if (lines.length > 0 && lines[lines.length - 1] !== "") {
			lines.push("");
		}
		const safeProfileName = /^[A-Za-z0-9_-]+$/.test(profile) ? profile : `"${profile}"`;
		lines.push(`[profiles.${safeProfileName}]`);
		start = lines.length - 1;
	}
	const end = findNextSectionStart(lines, start + 1);
	return { start, end };
}

function upsertKeyInRange(lines: string[], key: string, value: string, start: number, end: number): void {
	const keyPattern = new RegExp(`^\\s*${escapeRegExp(key)}\\s*=`);
	for (let index = start; index < end; index += 1) {
		const line = lines[index] ?? "";
		if (line.trimStart().startsWith("#")) {
			continue;
		}
		if (keyPattern.test(line)) {
			lines[index] = `${key} = ${toTomlString(value)}`;
			return;
		}
	}
	lines.splice(end, 0, `${key} = ${toTomlString(value)}`);
}

function upsertConfigValues(configToml: string, values: Record<string, string>): string {
	const lines = configToml.length === 0 ? [] : configToml.split(/\r?\n/);
	const activeProfile = parseTopLevelProfile(configToml);

	if (activeProfile) {
		const { start, end } = ensureProfileSection(lines, activeProfile);
		let insertionEnd = end;
		for (const [key, value] of Object.entries(values)) {
			upsertKeyInRange(lines, key, value, start + 1, insertionEnd);
			insertionEnd = findNextSectionStart(lines, start + 1);
		}
	} else {
		const firstSection = findNextSectionStart(lines, 0);
		for (const [key, value] of Object.entries(values)) {
			upsertKeyInRange(lines, key, value, 0, firstSection);
		}
	}

	return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

async function writeManagedFiles(params: {
	sourceCatalog: ModelsCatalog;
	pragmaticText: string;
}): Promise<{ updatedSlugs: string[] }> {
	const managedDir = getManagedDir();
	const managedMarkdownPath = getManagedMarkdownPath();
	const managedCatalogPath = getManagedCatalogPath();

	await mkdir(managedDir, { recursive: true });
	await writeFile(managedMarkdownPath, `${params.pragmaticText.replace(/\n+$/, "")}\n`, "utf8");

	const { updatedCatalog, updatedSlugs } = applyPragmaticTextToCatalog(
		params.sourceCatalog,
		params.pragmaticText,
	);
	await writeFile(managedCatalogPath, `${JSON.stringify(updatedCatalog, null, 2)}\n`, "utf8");

	return { updatedSlugs };
}

async function updateActiveConfig(catalogPath: string): Promise<string> {
	const configPath = await resolveActiveConfigPath();
	const configFile = Bun.file(configPath);
	const configToml = (await configFile.exists()) ? await configFile.text() : "";
	const updated = upsertConfigValues(configToml, {
		model_catalog_json: catalogPath,
		personality: REQUIRED_SLOT,
	});

	await mkdir(path.dirname(configPath), { recursive: true });
	await writeFile(configPath, updated, "utf8");
	return configPath;
}

function printSummary(params: {
	command: Command;
	sourceModel: string | null;
	configPath: string;
	updatedSlugs: string[];
}): void {
	console.log(`Command: ${params.command}`);
	if (params.sourceModel) {
		console.log(`Source model: ${params.sourceModel}`);
	}
	console.log(`Config updated: ${params.configPath}`);
	console.log(`Managed markdown: ${getManagedMarkdownPath()}`);
	console.log(`Managed catalog: ${getManagedCatalogPath()}`);
	console.log(`Pragmatic models updated (${params.updatedSlugs.length}): ${params.updatedSlugs.join(", ")}`);
}

async function runSet(sourceModel: string): Promise<void> {
	const sourceCatalog = await fetchSourceCatalog();

	const pragmaticText = resolveSourceModelPragmaticText(sourceCatalog, sourceModel);
	const { updatedSlugs } = await writeManagedFiles({ sourceCatalog, pragmaticText });
	const configPath = await updateActiveConfig(getManagedCatalogPath());

	printSummary({
		command: "set",
		sourceModel,
		configPath,
		updatedSlugs,
	});
}

async function runActivate(): Promise<void> {
	const sourceCatalog = await fetchSourceCatalog();

	const markdownFile = Bun.file(getManagedMarkdownPath());
	if (!(await markdownFile.exists())) {
		fail(
			`missing personality markdown at ${getManagedMarkdownPath()}. Run \`set pragmatic smart\` first.`,
		);
	}
	const pragmaticText = (await markdownFile.text()).replace(/\r\n/g, "\n").replace(/\n+$/, "");
	if (!pragmaticText.trim()) {
		fail(`personality markdown is empty at ${getManagedMarkdownPath()}`);
	}

	const { updatedSlugs } = await writeManagedFiles({ sourceCatalog, pragmaticText });
	const configPath = await updateActiveConfig(getManagedCatalogPath());

	printSummary({
		command: "activate",
		sourceModel: null,
		configPath,
		updatedSlugs,
	});
}

async function main(): Promise<void> {
	const { command, sourceModel } = parseArgs(process.argv.slice(2));
	if (command === "set") {
		await runSet(sourceModel);
		return;
	}
	await runActivate();
}

await main();
