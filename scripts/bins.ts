/**
 * List globally linked Bun/npm package bins from local sources.
 * @autohelp
 * @usage ngents bins
 */
import { existsSync } from 'node:fs';
import { lstat, readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

type Manager = 'bun' | 'npm';

type JsonObject = Record<string, unknown>;

type PackageEntry = {
	packageName: string;
	packageDir: string;
	packageLstat: Awaited<ReturnType<typeof lstat>>;
};

type BinDefinition = {
	binName: string;
	relativeTarget: string;
};

type BinReport = {
	binName: string;
	binTarget: string;
	shimResolved: string;
};

type PackageReport = {
	manager: Manager;
	packageName: string;
	sourceRoot: string;
	bins: BinReport[];
};

type ManagerSection = {
	reports: PackageReport[];
	unavailableReason?: string;
};

type ShellResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

const POSIX_SEP = '/';

function toDisplayPath(value: string): string {
	return value.replaceAll('\\', POSIX_SEP);
}

function normalizePath(value: string): string {
	return toDisplayPath(path.resolve(value));
}

function readString(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	if (!normalized) {
		return null;
	}

	return normalized;
}

function toText(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}

	if (value instanceof Uint8Array) {
		return Buffer.from(value).toString('utf8');
	}

	if (value === null || value === undefined) {
		return '';
	}

	return String(value);
}

async function lstatSafe(filePath: string): Promise<Awaited<ReturnType<typeof lstat>> | null> {
	try {
		return await lstat(filePath);
	} catch {
		return null;
	}
}

async function realpathSafe(filePath: string): Promise<string | null> {
	try {
		const resolved = await realpath(filePath);
		return normalizePath(resolved);
	} catch {
		return null;
	}
}

async function readJsonFile(filePath: string): Promise<JsonObject | null> {
	try {
		const content = await readFile(filePath, 'utf8');
		const parsed = JSON.parse(content);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return null;
		}
		return parsed as JsonObject;
	} catch {
		return null;
	}
}

async function pathExists(filePath: string): Promise<boolean> {
	const entry = await lstatSafe(filePath);
	return entry !== null;
}

async function isDirectoryLike(
	filePath: string,
	entryLstat: Awaited<ReturnType<typeof lstat>>,
): Promise<boolean> {
	if (entryLstat.isDirectory()) {
		return true;
	}

	if (!entryLstat.isSymbolicLink()) {
		return false;
	}

	try {
		const resolvedStat = await stat(filePath);
		return resolvedStat.isDirectory();
	} catch {
		return false;
	}
}

function isLocalPathSpec(value: unknown): value is string {
	const spec = readString(value);
	if (!spec) {
		return false;
	}

	const prefixes = ['/', './', '../', '~/', 'file:', 'link:'];
	return prefixes.some(prefix => spec.startsWith(prefix));
}

function resolveLocalPathSpec(spec: string, baseDir: string, homeDir: string | null): string | null {
	let normalizedSpec = spec.trim();
	if (!normalizedSpec) {
		return null;
	}

	if (normalizedSpec.startsWith('file:')) {
		normalizedSpec = normalizedSpec.slice('file:'.length);
	}

	if (normalizedSpec.startsWith('link:')) {
		normalizedSpec = normalizedSpec.slice('link:'.length);
	}

	if (normalizedSpec === '~') {
		if (!homeDir) {
			return null;
		}
		return normalizePath(homeDir);
	}

	if (normalizedSpec.startsWith('~/')) {
		if (!homeDir) {
			return null;
		}
		return normalizePath(path.join(homeDir, normalizedSpec.slice(2)));
	}

	if (path.isAbsolute(normalizedSpec)) {
		return normalizePath(normalizedSpec);
	}

	return normalizePath(path.resolve(baseDir, normalizedSpec));
}

function extractBinDefinitions(manifest: JsonObject, fallbackPackageName: string): BinDefinition[] {
	const manifestName = readString(manifest.name);
	const packageName = manifestName ?? fallbackPackageName;
	const manifestBin = manifest.bin;

	if (typeof manifestBin === 'string') {
		const relativeTarget = manifestBin.trim();
		if (!relativeTarget) {
			return [];
		}
		return [{ binName: packageName, relativeTarget }];
	}

	if (!manifestBin || typeof manifestBin !== 'object' || Array.isArray(manifestBin)) {
		return [];
	}

	const binDefinitions: BinDefinition[] = [];
	for (const [binName, binValue] of Object.entries(manifestBin)) {
		const normalizedBinName = readString(binName);
		const normalizedBinValue = readString(binValue);
		if (!normalizedBinName || !normalizedBinValue) {
			continue;
		}
		binDefinitions.push({ binName: normalizedBinName, relativeTarget: normalizedBinValue });
	}

	return binDefinitions;
}

async function readPackageManifest(
	sourceRoot: string,
	packageDir: string,
): Promise<JsonObject | null> {
	const sourceManifestPath = path.join(sourceRoot, 'package.json');
	const sourceManifest = await readJsonFile(sourceManifestPath);
	if (sourceManifest) {
		return sourceManifest;
	}

	const packageManifestPath = path.join(packageDir, 'package.json');
	return readJsonFile(packageManifestPath);
}

async function resolveShim(shimPath: string): Promise<string> {
	if (!existsSync(shimPath)) {
		return `(missing shim: ${toDisplayPath(shimPath)})`;
	}

	const resolved = await realpathSafe(shimPath);
	if (!resolved) {
		return `(unresolved shim: ${toDisplayPath(shimPath)})`;
	}

	return resolved;
}

async function listPackageEntries(nodeModulesDir: string): Promise<PackageEntry[]> {
	if (!(await pathExists(nodeModulesDir))) {
		return [];
	}

	let entries: Awaited<ReturnType<typeof readdir>>;
	try {
		entries = await readdir(nodeModulesDir, { withFileTypes: true });
	} catch {
		return [];
	}

	const packages: PackageEntry[] = [];

	for (const entry of entries) {
		const entryName = entry.name;
		if (!entryName || entryName.startsWith('.')) {
			continue;
		}

		const entryPath = path.join(nodeModulesDir, entryName);
		const entryLstat = await lstatSafe(entryPath);
		if (!entryLstat || !(await isDirectoryLike(entryPath, entryLstat))) {
			continue;
		}

		if (!entryName.startsWith('@')) {
			packages.push({
				packageName: entryName,
				packageDir: entryPath,
				packageLstat: entryLstat,
			});
			continue;
		}

		let scopedEntries: Awaited<ReturnType<typeof readdir>>;
		try {
			scopedEntries = await readdir(entryPath, { withFileTypes: true });
		} catch {
			continue;
		}

		for (const scopedEntry of scopedEntries) {
			const scopedName = scopedEntry.name;
			if (!scopedName || scopedName.startsWith('.')) {
				continue;
			}

			const scopedPath = path.join(entryPath, scopedName);
			const scopedLstat = await lstatSafe(scopedPath);
			if (!scopedLstat || !(await isDirectoryLike(scopedPath, scopedLstat))) {
				continue;
			}

			packages.push({
				packageName: `${entryName}/${scopedName}`,
				packageDir: scopedPath,
				packageLstat: scopedLstat,
			});
		}
	}

	return packages;
}

function formatShellResult(result: unknown): ShellResult {
	if (!result || typeof result !== 'object') {
		return { exitCode: 1, stdout: '', stderr: 'Unknown command result shape' };
	}

	const shellResult = result as {
		exitCode?: number;
		stdout?: unknown;
		stderr?: unknown;
	};

	const exitCode = typeof shellResult.exitCode === 'number' ? shellResult.exitCode : 1;
	const stdout = toText(shellResult.stdout).trim();
	const stderr = toText(shellResult.stderr).trim();

	return { exitCode, stdout, stderr };
}

async function collectBunSection(): Promise<ManagerSection> {
	const home = readString(Bun.env.HOME);
	if (!home) {
		return { reports: [] };
	}

	const homeDir = normalizePath(home);
	const bunGlobalDir = normalizePath(path.join(homeDir, '.bun/install/global'));
	const bunNodeModulesDir = normalizePath(path.join(bunGlobalDir, 'node_modules'));
	const bunBinDir = normalizePath(path.join(homeDir, '.bun/bin'));
	const bunGlobalManifest = await readJsonFile(path.join(bunGlobalDir, 'package.json'));

	const bunDependencies = new Map<string, string>();
	if (bunGlobalManifest?.dependencies && typeof bunGlobalManifest.dependencies === 'object') {
		for (const [dependencyName, specValue] of Object.entries(bunGlobalManifest.dependencies)) {
			if (typeof specValue !== 'string') {
				continue;
			}
			bunDependencies.set(dependencyName, specValue);
		}
	}

	const packageEntries = await listPackageEntries(bunNodeModulesDir);
	const reports: PackageReport[] = [];

	for (const packageEntry of packageEntries) {
		const packageManifestPath = path.join(packageEntry.packageDir, 'package.json');
		const packageManifestLstat = await lstatSafe(packageManifestPath);

		const packageSpec = bunDependencies.get(packageEntry.packageName);
		const linkedBySpec = isLocalPathSpec(packageSpec);
		const linkedByPackageSymlink = packageEntry.packageLstat.isSymbolicLink();
		const linkedByManifestSymlink = packageManifestLstat?.isSymbolicLink() ?? false;

		if (!linkedBySpec && !linkedByPackageSymlink && !linkedByManifestSymlink) {
			continue;
		}

		let sourceRoot: string | null = null;

		if (linkedBySpec && packageSpec) {
			sourceRoot = resolveLocalPathSpec(packageSpec, bunGlobalDir, homeDir);
		}

		if (!sourceRoot && linkedByPackageSymlink) {
			sourceRoot = await realpathSafe(packageEntry.packageDir);
		}

		if (!sourceRoot && linkedByManifestSymlink) {
			const resolvedManifestPath = await realpathSafe(packageManifestPath);
			if (resolvedManifestPath) {
				sourceRoot = normalizePath(path.dirname(resolvedManifestPath));
			}
		}

		if (!sourceRoot) {
			continue;
		}

		sourceRoot = normalizePath(sourceRoot);
		if (sourceRoot === bunGlobalDir) {
			continue;
		}

		if (!(await pathExists(sourceRoot))) {
			continue;
		}

		const manifest = await readPackageManifest(sourceRoot, packageEntry.packageDir);
		if (!manifest) {
			continue;
		}

		const packageName = readString(manifest.name) ?? packageEntry.packageName;
		const binDefinitions = extractBinDefinitions(manifest, packageName);
		if (binDefinitions.length === 0) {
			continue;
		}

		const bins: BinReport[] = [];
		for (const binDefinition of binDefinitions) {
			const binTarget = normalizePath(path.resolve(sourceRoot, binDefinition.relativeTarget));
			const shimPath = path.join(bunBinDir, binDefinition.binName);
			const shimResolved = await resolveShim(shimPath);
			bins.push({ binName: binDefinition.binName, binTarget, shimResolved });
		}

		bins.sort((first, second) => first.binName.localeCompare(second.binName));
		reports.push({
			manager: 'bun',
			packageName,
			sourceRoot,
			bins,
		});
	}

	reports.sort((first, second) => {
		const nameOrder = first.packageName.localeCompare(second.packageName);
		if (nameOrder !== 0) {
			return nameOrder;
		}
		return first.sourceRoot.localeCompare(second.sourceRoot);
	});

	return { reports };
}

async function collectNpmSection(): Promise<ManagerSection> {
	const npmRootRaw = await $`npm root -g`.quiet().nothrow();
	const npmRoot = formatShellResult(npmRootRaw);
	if (npmRoot.exitCode !== 0 || !npmRoot.stdout) {
		const reason = npmRoot.stderr || 'npm root -g failed';
		return { reports: [], unavailableReason: reason };
	}

	const npmPrefixRaw = await $`npm prefix -g`.quiet().nothrow();
	const npmPrefix = formatShellResult(npmPrefixRaw);
	if (npmPrefix.exitCode !== 0 || !npmPrefix.stdout) {
		const reason = npmPrefix.stderr || 'npm prefix -g failed';
		return { reports: [], unavailableReason: reason };
	}

	const npmRootDir = normalizePath(npmRoot.stdout);
	const npmBinDir = normalizePath(path.join(npmPrefix.stdout, 'bin'));
	const packageEntries = await listPackageEntries(npmRootDir);
	const reports: PackageReport[] = [];

	for (const packageEntry of packageEntries) {
		if (!packageEntry.packageLstat.isSymbolicLink()) {
			continue;
		}

		const sourceRoot = await realpathSafe(packageEntry.packageDir);
		if (!sourceRoot) {
			continue;
		}

		if (!(await pathExists(sourceRoot))) {
			continue;
		}

		const manifest = await readPackageManifest(sourceRoot, packageEntry.packageDir);
		if (!manifest) {
			continue;
		}

		const packageName = readString(manifest.name) ?? packageEntry.packageName;
		const binDefinitions = extractBinDefinitions(manifest, packageName);
		if (binDefinitions.length === 0) {
			continue;
		}

		const bins: BinReport[] = [];
		for (const binDefinition of binDefinitions) {
			const binTarget = normalizePath(path.resolve(sourceRoot, binDefinition.relativeTarget));
			const shimPath = path.join(npmBinDir, binDefinition.binName);
			const shimResolved = await resolveShim(shimPath);
			bins.push({ binName: binDefinition.binName, binTarget, shimResolved });
		}

		bins.sort((first, second) => first.binName.localeCompare(second.binName));
		reports.push({
			manager: 'npm',
			packageName,
			sourceRoot: normalizePath(sourceRoot),
			bins,
		});
	}

	reports.sort((first, second) => {
		const nameOrder = first.packageName.localeCompare(second.packageName);
		if (nameOrder !== 0) {
			return nameOrder;
		}
		return first.sourceRoot.localeCompare(second.sourceRoot);
	});

	return { reports };
}

function printSection(title: string, section: ManagerSection): void {
	console.log(`## ${title}`);

	if (section.unavailableReason) {
		console.log(`- (unavailable: ${section.unavailableReason})`);
		return;
	}

	if (section.reports.length === 0) {
		console.log('- (none)');
		return;
	}

	for (let index = 0; index < section.reports.length; index += 1) {
		const report = section.reports[index];
		console.log(report.packageName);
		console.log(`  source: ${report.sourceRoot}`);

		for (const bin of report.bins) {
			console.log(`  ${bin.binName} -> ${bin.binTarget}`);
			console.log(`    shim: ${bin.shimResolved}`);
		}

		if (index === section.reports.length - 1) {
			continue;
		}

		console.log('');
	}
}

export default async function () {
	const bunSection = await collectBunSection();
	const npmSection = await collectNpmSection();

	console.log('# Linked bins (local sources)');
	console.log('');
	printSection('Bun', bunSection);
	console.log('');
	printSection('npm', npmSection);
}
