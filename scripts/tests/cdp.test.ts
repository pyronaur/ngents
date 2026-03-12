import { test, expect } from 'bun:test';
import { $ } from 'bun';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const skillScriptsDir = '/Users/n14/.ngents/skills/browser-local/scripts';
const bunExecutable = process.execPath;

type CommandResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

async function makeTempDir(): Promise<string> {
	return mkdtemp(path.join(process.env.TMPDIR ?? '/tmp', 'ngents-cdp-test-'));
}

async function writeConfig(dir: string, payload: object): Promise<string> {
	const configPath = path.join(dir, 'cdp.json');
	await writeFile(configPath, JSON.stringify(payload, null, 2));
	return configPath;
}

async function writeExecutable(dir: string, name: string, body: string): Promise<void> {
	const scriptPath = path.join(dir, name);
	await writeFile(scriptPath, body);
	await chmod(scriptPath, 0o755);
}

async function runCommand(scriptName: 'status' | 'stop', env: Record<string, string>): Promise<CommandResult> {
	const result = await $`${bunExecutable} ${path.join(skillScriptsDir, `${scriptName}.ts`)}`.env({
		...process.env,
		...env,
	}).nothrow().quiet();

	return {
		exitCode: result.exitCode,
		stdout: result.stdout.toString('utf8'),
		stderr: result.stderr.toString('utf8'),
	};
}

async function reserveUnusedPort(): Promise<number> {
	const server = Bun.serve({
		port: 0,
		fetch() {
			return new Response('temporary');
		},
	});
	const { port } = server;
	await server.stop(true);
	return port;
}

test('status reports missing config file', async () => {
	const tempDir = await makeTempDir();
	try {
		const missingPath = path.join(tempDir, 'missing.json');
		const result = await runCommand('status', { NGENTS_CDP_CONFIG: missingPath });
		expect(result.exitCode).toBe(3);
		expect(result.stderr).toContain('Config file not found');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('status reports malformed config JSON', async () => {
	const tempDir = await makeTempDir();
	try {
		const configPath = path.join(tempDir, 'cdp.json');
		await writeFile(configPath, '{not json');
		const result = await runCommand('status', { NGENTS_CDP_CONFIG: configPath });
		expect(result.exitCode).toBe(3);
		expect(result.stderr).toContain('Failed to read config file');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('status reports stopped when no listener exists', async () => {
	const tempDir = await makeTempDir();
	try {
		const port = await reserveUnusedPort();
		const configPath = await writeConfig(tempDir, {
			chromeApp: 'Google Chrome',
			profilePath: path.join(tempDir, 'profile'),
			cdpEndpoint: `http://127.0.0.1:${String(port)}`,
			extraArgs: [],
		});
		const result = await runCommand('status', { NGENTS_CDP_CONFIG: configPath });
		expect(result.exitCode).toBe(1);
		expect(result.stdout).toContain('State: stopped');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('status reports listener conflict when port is occupied by a non-CDP server', async () => {
	const tempDir = await makeTempDir();
	const server = Bun.serve({
		port: 0,
		fetch() {
			return new Response('not cdp');
		},
	});

	try {
		const configPath = await writeConfig(tempDir, {
			chromeApp: 'Google Chrome',
			profilePath: path.join(tempDir, 'profile'),
			cdpEndpoint: `http://127.0.0.1:${String(server.port)}`,
			extraArgs: [],
		});
		const result = await runCommand('status', { NGENTS_CDP_CONFIG: configPath });
		expect(result.exitCode).toBe(2);
		expect(result.stdout).toContain('State: listener-conflict');
	} finally {
		await server.stop(true);
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('stop is idempotent when no listener exists', async () => {
	const tempDir = await makeTempDir();
	try {
		const port = await reserveUnusedPort();
		const configPath = await writeConfig(tempDir, {
			chromeApp: 'Google Chrome',
			profilePath: path.join(tempDir, 'profile'),
			cdpEndpoint: `http://127.0.0.1:${String(port)}`,
			extraArgs: [],
		});
		const result = await runCommand('stop', { NGENTS_CDP_CONFIG: configPath });
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain('already stopped');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('status ignores blank pid lines from lsof output', async () => {
	const tempDir = await makeTempDir();
	const binDir = path.join(tempDir, 'bin');
	try {
		await Bun.$`mkdir -p ${binDir}`.quiet();
		await writeExecutable(
			binDir,
			'lsof',
			'#!/bin/sh\nprintf "\\n"\n',
		);
		await writeExecutable(
			binDir,
			'ps',
			'#!/bin/sh\nexit 0\n',
		);
		const configPath = await writeConfig(tempDir, {
			chromeApp: 'Google Chrome',
			profilePath: path.join(tempDir, 'profile'),
			cdpEndpoint: 'http://127.0.0.1:65534',
			extraArgs: [],
		});
		const result = await runCommand('status', {
			NGENTS_CDP_CONFIG: configPath,
			PATH: `${binDir}:${process.env.PATH ?? ''}`,
		});
		expect(result.exitCode).toBe(1);
		expect(result.stdout).toContain('State: stopped');
		expect(result.stdout).not.toContain('Listener PID: 0');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});
