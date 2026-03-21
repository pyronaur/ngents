import { $ } from 'bun';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const EXIT_CONFIG = 3;
const EXIT_CONFLICT = 2;
const EXIT_STOPPED = 1;
const PERSONAL_PROFILE_FALLBACK_DIRECTORY = 'Default';
const POLL_MS = 250;
const START_TIMEOUT_MS = 10_000;
const STOP_TIMEOUT_MS = 5_000;

type Config = {
	chromeApp: string;
	profilePath: string;
	cdpEndpoint: string;
	extraArgs: string[];
};

type LoadedConfig = {
	config: Config;
	configPath: string;
	port: number;
};

type Listener = {
	pid: number;
	args: string | null;
};

type BrowserProcess = {
	pid: number;
	args: string;
};

type PersonalChromeTarget = {
	profileDirectory: string;
};

type State = 'running' | 'stopped' | 'listener-conflict';

class ConfigError extends Error {
	override name = 'ConfigError';
}

function failConfig(error: unknown): never {
	const message = error instanceof Error ? error.message : String(error);
	console.error(message);
	process.exit(EXIT_CONFIG);
}

function configPath(): string {
	const override = Bun.env.NGENTS_CDP_CONFIG?.trim();
	if (override) {
		return path.resolve(override);
	}

	const home = Bun.env.HOME?.trim();
	if (!home) {
		throw new ConfigError('HOME is not set; cannot resolve ~/.ngents/local/cdp.json');
	}

	return path.join(home, '.ngents', 'local', 'cdp.json');
}

function requireString(value: unknown, field: string): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new ConfigError(`Config field "${field}" must be a non-empty string.`);
	}

	return value.trim();
}

function readStringArray(value: unknown, field: string): string[] {
	if (value === undefined) {
		return [];
	}

	if (!Array.isArray(value)) {
		throw new ConfigError(`Config field "${field}" must be an array of strings.`);
	}

	return value.map((entry, index) => requireString(entry, `${field}[${index}]`));
}

function normalizeEndpoint(endpoint: string): string {
	return endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
}

function parsePort(endpoint: string): number {
	let url: URL;
	try {
		url = new URL(endpoint);
	} catch {
		throw new ConfigError(`Config field "cdpEndpoint" must be a valid URL. Received: ${endpoint}`);
	}

	const port = Number(url.port);
	if (!Number.isInteger(port) || port < 1 || port > 65_535) {
		throw new ConfigError('Config field "cdpEndpoint" must include a valid explicit port.');
	}

	return port;
}

function personalChromeStatePath(): string {
	const home = Bun.env.HOME?.trim();
	if (!home) {
		return '';
	}

	return path.join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'Local State');
}

async function personalChromeTarget(): Promise<PersonalChromeTarget> {
	const statePath = personalChromeStatePath();
	if (!statePath) {
		return { profileDirectory: PERSONAL_PROFILE_FALLBACK_DIRECTORY };
	}

	try {
		const parsed = await Bun.file(statePath).json() as {
			profile?: {
				last_used?: unknown;
			};
		};
		const lastUsed = parsed.profile?.last_used;
		if (typeof lastUsed === 'string' && lastUsed.trim()) {
			return { profileDirectory: lastUsed.trim() };
		}
	} catch {
		// Fall back to Chrome's Default profile when Local State is unavailable.
	}

	return { profileDirectory: PERSONAL_PROFILE_FALLBACK_DIRECTORY };
}

async function loadConfig(): Promise<LoadedConfig> {
	const resolvedPath = configPath();
	let parsed: unknown;

	try {
		parsed = await Bun.file(resolvedPath).json();
	} catch (error) {
		if (error instanceof Error && error.message.includes('ENOENT')) {
			throw new ConfigError(`Config file not found: ${resolvedPath}`);
		}

		const message = error instanceof Error ? error.message : String(error);
		throw new ConfigError(`Failed to read config file ${resolvedPath}: ${message}`);
	}

	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new ConfigError(`Config file ${resolvedPath} must contain a JSON object.`);
	}

	const record = parsed as Record<string, unknown>;
	const config = {
		chromeApp: requireString(record.chromeApp, 'chromeApp'),
		profilePath: path.resolve(requireString(record.profilePath, 'profilePath')),
		cdpEndpoint: normalizeEndpoint(requireString(record.cdpEndpoint, 'cdpEndpoint')),
		extraArgs: readStringArray(record.extraArgs, 'extraArgs'),
	};

	return {
		config,
		configPath: resolvedPath,
		port: parsePort(config.cdpEndpoint),
	};
}

async function listenerPids(port: number): Promise<number[]> {
	const result = await $`lsof -nP -tiTCP:${port} -sTCP:LISTEN`.nothrow().quiet();
	if (result.exitCode !== 0) {
		return [];
	}

	return result.stdout
		.toString()
		.split('\n')
		.map(line => Number(line.trim()))
		.filter(pid => Number.isInteger(pid) && pid > 0);
}

async function processArgs(pid: number): Promise<string | null> {
	const result = await $`ps -p ${pid} -o args=`.nothrow().quiet();
	if (result.exitCode !== 0) {
		return null;
	}

	const args = result.stdout.toString().trim();
	return args || null;
}

async function listeners(port: number): Promise<Listener[]> {
	const pids = await listenerPids(port);
	return Promise.all(pids.map(async pid => ({ pid, args: await processArgs(pid) })));
}

async function cdpHealth(endpoint: string): Promise<{ ok: true; browser: string; ws: string; } | { ok: false; error: string; }> {
	try {
		const response = await fetch(`${endpoint}/json/version`, {
			signal: AbortSignal.timeout(1_000),
		});
		if (!response.ok) {
			return { ok: false, error: `HTTP ${response.status} from ${endpoint}/json/version` };
		}

		const body = await response.json() as Record<string, unknown>;
		const browser = typeof body.Browser === 'string' ? body.Browser.trim() : '';
		const ws = typeof body.webSocketDebuggerUrl === 'string' ? body.webSocketDebuggerUrl.trim() : '';
		if (!browser || !ws) {
			return { ok: false, error: 'CDP metadata is missing Browser or webSocketDebuggerUrl.' };
		}

		return { ok: true, browser, ws };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, error: message };
	}
}

async function inspect(loaded: LoadedConfig): Promise<{
	state: State;
	listeners: Listener[];
	health: Awaited<ReturnType<typeof cdpHealth>>;
}> {
	const currentListeners = await listeners(loaded.port);
	const health = await cdpHealth(loaded.config.cdpEndpoint);

	if (health.ok) {
		return { state: 'running', listeners: currentListeners, health };
	}

	if (currentListeners.length === 0) {
		return { state: 'stopped', listeners: [], health };
	}

	return { state: 'listener-conflict', listeners: currentListeners, health };
}

function printConfig(loaded: LoadedConfig): void {
	console.log(`Config: ${loaded.configPath}`);
	console.log(`Chrome app: ${loaded.config.chromeApp}`);
	console.log(`Profile: ${loaded.config.profilePath}`);
	console.log(`CDP endpoint: ${loaded.config.cdpEndpoint}`);
}

function printListeners(currentListeners: Listener[]): void {
	for (const listener of currentListeners) {
		console.log(`Listener PID: ${listener.pid}`);
		if (listener.args) {
			console.log(`Listener args: ${listener.args}`);
		}
	}
}

function printState(
	message: string,
	state: State,
	health: Awaited<ReturnType<typeof cdpHealth>>,
	currentListeners: Listener[],
): void {
	console.log(message);
	console.log(`State: ${state}`);
	if (health.ok) {
		console.log(`Browser: ${health.browser}`);
		console.log(`WebSocket: ${health.ws}`);
	} else {
		console.log(`Health: ${health.error}`);
	}
	if (currentListeners.length > 0) {
		printListeners(currentListeners);
	}
}

function expectedListener(listener: Listener, loaded: LoadedConfig): boolean {
	const args = listener.args ?? '';
	return args.includes(loaded.config.profilePath) || args.includes(`--remote-debugging-port=${loaded.port}`);
}

async function waitForState(loaded: LoadedConfig, wanted: State, timeoutMs: number) {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		const current = await inspect(loaded);
		if (current.state === wanted || Date.now() >= deadline) {
			return current;
		}
		await Bun.sleep(POLL_MS);
	}
}

async function openChromeApp(chromeApp: string, args: string[]): Promise<void> {
	const openArgs = [
		'-g',
		'-na',
		chromeApp,
		'--args',
		...args,
	];
	const result = await Bun.spawn(['open', ...openArgs], {
		stdout: 'ignore',
		stderr: 'pipe',
	}).exited;
	if (result !== 0) {
		throw new Error(`Failed to start ${chromeApp}.`);
	}
}

async function launchChrome(loaded: LoadedConfig): Promise<void> {
	await mkdir(loaded.config.profilePath, { recursive: true });
	await openChromeApp(loaded.config.chromeApp, [
		`--user-data-dir=${loaded.config.profilePath}`,
		`--remote-debugging-port=${loaded.port}`,
		...loaded.config.extraArgs,
	]);
}

function chromeBinaryName(chromeApp: string): string {
	const resolved = chromeApp.trim();
	if (resolved.endsWith('.app')) {
		return path.basename(resolved, '.app');
	}

	return path.basename(resolved);
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function browserProcessPattern(loaded: LoadedConfig): RegExp {
	const binaryName = escapeRegex(chromeBinaryName(loaded.config.chromeApp));
	return new RegExp(String.raw`^\S*\/Contents\/MacOS\/${binaryName}(?:\s|$)`);
}

async function browserProcesses(loaded: LoadedConfig): Promise<BrowserProcess[]> {
	const result = await $`ps -axo pid=,args=`.nothrow().quiet();
	if (result.exitCode !== 0) {
		return [];
	}

	const pattern = browserProcessPattern(loaded);
	return result.stdout
		.toString()
		.split('\n')
		.map(line => line.match(/^\s*(\d+)\s+(.*)$/))
		.filter((match): match is RegExpMatchArray => match !== null)
		.map(match => ({
			pid: Number(match[1]),
			args: match[2]?.trim() ?? '',
		}))
		.filter(process => Number.isInteger(process.pid) && process.pid > 0)
		.filter(process => process.args.length > 0)
		.filter(process => pattern.test(process.args))
		.filter(process => !process.args.includes('--headless'));
}

function isManagedBrowserProcess(process: BrowserProcess, loaded: LoadedConfig): boolean {
	return process.args.includes(`--user-data-dir=${loaded.config.profilePath}`)
		|| process.args.includes(`--remote-debugging-port=${loaded.port}`);
}

async function ensurePersonalChrome(loaded: LoadedConfig): Promise<PersonalChromeTarget | null> {
	const currentProcesses = await browserProcesses(loaded);
	const personalRunning = currentProcesses.some(process => !isManagedBrowserProcess(process, loaded));
	if (personalRunning) {
		return null;
	}

	const target = await personalChromeTarget();
	await openChromeApp(loaded.config.chromeApp, [
		`--profile-directory=${target.profileDirectory}`,
	]);
	return target;
}

async function ensureHealthyBrowser(loaded: LoadedConfig, current: Awaited<ReturnType<typeof inspect>>): Promise<Awaited<ReturnType<typeof inspect>>> {
	if (current.state === 'running') {
		return current;
	}

	if (current.state === 'listener-conflict') {
		return current;
	}

	await launchChrome(loaded);
	return waitForState(loaded, 'running', START_TIMEOUT_MS);
}

async function connectAgentBrowser(port: number): Promise<string> {
	const result = Bun.spawn(['agent-browser', 'connect', String(port)], {
		stdout: 'pipe',
		stderr: 'pipe',
		env: process.env,
	});
	const exitCode = await result.exited;
	const stdout = (await new Response(result.stdout).text()).trim();
	const stderr = (await new Response(result.stderr).text()).trim();
	if (exitCode !== 0) {
		throw new Error(stderr || stdout || `agent-browser connect ${port} failed.`);
	}

	return stdout || `agent-browser connected to CDP port ${port}.`;
}

async function stopListeners(currentListeners: Listener[]): Promise<void> {
	for (const listener of currentListeners) {
		const result = await $`kill ${listener.pid}`.nothrow().quiet();
		if (result.exitCode !== 0) {
			const error = result.stderr.toString().trim() || `Failed to stop PID ${listener.pid}.`;
			throw new Error(error);
		}
	}
}

export async function runStatusCommand(): Promise<void> {
	let loaded: LoadedConfig;
	try {
		loaded = await loadConfig();
	} catch (error) {
		failConfig(error);
	}

	printConfig(loaded);
	const current = await inspect(loaded);
	if (current.state === 'listener-conflict') {
		printState('A listener exists on the configured port, but it is not serving valid CDP metadata.', current.state, current.health, current.listeners);
		process.exit(EXIT_CONFLICT);
	}

	const personalTarget = await ensurePersonalChrome(loaded);
	if (personalTarget) {
		console.log(`Started personal Chrome session (${personalTarget.profileDirectory}).`);
	}

	const healthy = await ensureHealthyBrowser(loaded, current);
	if (healthy.state !== 'running') {
		printState(`Timed out waiting for CDP listener on ${loaded.config.cdpEndpoint}.`, healthy.state, healthy.health, healthy.listeners);
		process.exit(EXIT_CONFLICT);
	}

	printState('Local CDP Chrome session is healthy.', healthy.state, healthy.health, healthy.listeners);
	try {
		console.log(await connectAgentBrowser(loaded.port));
		process.exit(0);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(EXIT_CONFLICT);
	}
}

export async function runStartCommand(): Promise<void> {
	let loaded: LoadedConfig;
	try {
		loaded = await loadConfig();
	} catch (error) {
		failConfig(error);
	}

	printConfig(loaded);
	const current = await inspect(loaded);

	if (current.state === 'listener-conflict') {
		printState('Refusing to start Chrome because the configured port is already occupied.', current.state, current.health, current.listeners);
		process.exit(EXIT_CONFLICT);
	}

	const personalTarget = await ensurePersonalChrome(loaded);
	if (personalTarget) {
		console.log(`Started personal Chrome session (${personalTarget.profileDirectory}).`);
	}

	const healthy = await ensureHealthyBrowser(loaded, current);
	if (healthy.state !== 'running') {
		printState(`Timed out waiting for CDP listener on ${loaded.config.cdpEndpoint}.`, healthy.state, healthy.health, healthy.listeners);
		process.exit(EXIT_CONFLICT);
	}

	if (current.state === 'running') {
		printState('Local CDP Chrome session is already running.', healthy.state, healthy.health, healthy.listeners);
	} else {
		printState('Started local CDP Chrome session.', healthy.state, healthy.health, healthy.listeners);
	}
	try {
		console.log(await connectAgentBrowser(loaded.port));
		process.exit(0);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(EXIT_CONFLICT);
	}
}

export async function runStopCommand(): Promise<void> {
	let loaded: LoadedConfig;
	try {
		loaded = await loadConfig();
	} catch (error) {
		failConfig(error);
	}

	printConfig(loaded);
	const current = await inspect(loaded);
	if (current.state === 'stopped') {
		printState('Local CDP Chrome session is already stopped.', current.state, current.health, current.listeners);
		process.exit(0);
	}

	const unsafe = current.listeners.filter(listener => !expectedListener(listener, loaded));
	if (unsafe.length > 0) {
		printState('Refusing to stop the configured port because the listener does not match the expected Chrome profile.', 'listener-conflict', current.health, unsafe);
		process.exit(EXIT_CONFLICT);
	}

	await stopListeners(current.listeners);
	const stopped = await waitForState(loaded, 'stopped', STOP_TIMEOUT_MS);
	if (stopped.state !== 'stopped') {
		printState('Port is still occupied after stop request.', stopped.state, stopped.health, stopped.listeners);
		process.exit(EXIT_CONFLICT);
	}

	printState('Stopped local CDP Chrome session.', stopped.state, stopped.health, stopped.listeners);
	process.exit(0);
}
