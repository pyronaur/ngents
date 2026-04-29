import { test, expect } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const scriptsDir = '/Users/n14/.ngents/scripts/ng';
const scriptPath = path.join(scriptsDir, 'hig-doctor.ts');
const bunExecutable = process.execPath;

type CommandResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

type HigDoctorHint = {
	skill: string;
	command: string;
};

async function makeTempDir(): Promise<string> {
	return mkdtemp(path.join(process.env.TMPDIR ?? '/tmp', 'ngents-hig-doctor-'));
}

async function writeProjectFile(rootDir: string, relativePath: string, content: string): Promise<void> {
	const filePath = path.join(rootDir, relativePath);
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, content);
}

async function runWrapper(cwd: string, targetDir = '.'): Promise<CommandResult> {
	const processHandle = Bun.spawn({
		cmd: [bunExecutable, scriptPath, targetDir],
		cwd,
		env: process.env,
		stdout: 'pipe',
		stderr: 'pipe',
	});

	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(processHandle.stdout).text(),
		new Response(processHandle.stderr).text(),
		processHandle.exited,
	]);

	return { exitCode, stdout, stderr };
}

async function runWrapperWithArgs(cwd: string, args: string[]): Promise<CommandResult> {
	const processHandle = Bun.spawn({
		cmd: [bunExecutable, scriptPath, ...args],
		cwd,
		env: process.env,
		stdout: 'pipe',
		stderr: 'pipe',
	});

	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(processHandle.stdout).text(),
		new Response(processHandle.stderr).text(),
		processHandle.exited,
	]);

	return { exitCode, stdout, stderr };
}

function parseConcernCount(stderr: string): number | null {
	const match = /^(\d+) HIG concern\(s\) found\.$/m.exec(stderr);
	if (!match) {
		return null;
	}

	return Number(match[1]);
}

function parseHintLines(stderr: string): HigDoctorHint[] {
	return stderr
		.split('\n')
		.flatMap(line => {
			const match = /^Relevant HIG skill: (.+) — (.+)$/.exec(line.trim());
			if (!match) {
				return [];
			}

			const skill = match[1];
			const command = match[2];
			if (!skill || !command) {
				return [];
			}

			return [{ skill, command }];
		});
}

async function writeProblemProject(rootDir: string): Promise<void> {
	await writeProjectFile(
		rootDir,
		'Sources/Sample.swift',
		[
			'import SwiftUI',
			'',
			'struct FirstView: View {',
			'    var body: some View {',
			'        Text("One")',
			'            .ignoresSafeArea()',
			'    }',
			'}',
			'',
			'struct SecondView: View {',
			'    var body: some View {',
			'        Text("Two")',
			'            .ignoresSafeArea()',
			'    }',
			'}',
			'',
		].join('\n'),
	);
}

async function writeCleanProject(rootDir: string): Promise<void> {
	await writeProjectFile(
		rootDir,
		'Sources/Clean.swift',
		[
			'import SwiftUI',
			'',
			'struct CleanView: View {',
			'    var body: some View {',
			'        Text("Clean")',
			'    }',
			'}',
			'',
		].join('\n'),
	);
}

async function writeExcludedPathProject(rootDir: string): Promise<void> {
	await writeProjectFile(
		rootDir,
		'CountdownKit/Sources/CountdownKit/Feature/ShippingView.swift',
		[
			'import SwiftUI',
			'',
			'struct ShippingView: View {',
			'    var body: some View {',
			'        Text("Ship")',
			'            .ignoresSafeArea()',
			'    }',
			'}',
			'',
		].join('\n'),
	);

	await writeProjectFile(
		rootDir,
		'CountdownKit/Sources/CountdownKit/Testing/MaestroVisualRegressionFixture.swift',
		[
			'import SwiftUI',
			'',
			'struct MaestroVisualRegressionFixture: View {',
			'    var body: some View {',
			'        Text("Fixture")',
			'            .ignoresSafeArea()',
			'    }',
			'}',
			'',
		].join('\n'),
	);
}

async function writeExcludedGlobProject(rootDir: string): Promise<void> {
	await writeProjectFile(
		rootDir,
		'Sources/Shipping/MainView.swift',
		[
			'import SwiftUI',
			'',
			'struct MainView: View {',
			'    var body: some View {',
			'        Text("Main")',
			'            .ignoresSafeArea()',
			'    }',
			'}',
			'',
		].join('\n'),
	);

	await writeProjectFile(
		rootDir,
		'Sources/Fixtures/DebugFixture.swift',
		[
			'import SwiftUI',
			'',
			'struct DebugFixture: View {',
			'    var body: some View {',
			'        Text("Fixture")',
			'            .ignoresSafeArea()',
			'    }',
			'}',
			'',
		].join('\n'),
	);
}

test('missing config file leaves visible concerns in markdown output', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeProblemProject(tempDir);
		const result = await runWrapper(tempDir, 'Sources');
		expect(result.exitCode).toBe(1);
		expect(result.stdout).toContain('# HIG Doctor Issues');
		expect(result.stdout).toContain('Sources/Sample.swift:6');
		expect(result.stdout).toContain('Sources/Sample.swift:13');
		expect(result.stdout).toContain('`.ignoresSafeArea()`\n\n- `Sources/Sample.swift:13`');
		expect(parseConcernCount(result.stderr)).toBe(2);
		expect(parseHintLines(result.stderr)).toEqual([
			{ skill: 'hig-foundations', command: 'docs topic app hig-doctor' },
		]);
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('malformed yaml config fails with a clear error', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeProblemProject(tempDir);
		await writeProjectFile(tempDir, '.higignore.yaml', 'ignoredConcerns: [');
		const result = await runWrapper(tempDir, 'Sources');
		expect(result.exitCode).toBe(2);
		expect(result.stdout).toBe('');
		expect(result.stderr).toContain('Failed to read .higignore.yaml');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('excludedPaths must be an array', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeProblemProject(tempDir);
		await writeProjectFile(tempDir, '.higignore.yaml', 'excludedPaths: true\n');
		const result = await runWrapper(tempDir, 'Sources');
		expect(result.exitCode).toBe(2);
		expect(result.stderr).toContain('excludedPaths must be an array');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('excludedPaths entries must be non-empty strings', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeProblemProject(tempDir);
		await writeProjectFile(
			tempDir,
			'.higignore.yaml',
			['excludedPaths:', '  - ""', ''].join('\n'),
		);
		const result = await runWrapper(tempDir, 'Sources');
		expect(result.exitCode).toBe(2);
		expect(result.stderr).toContain('excludedPaths[0]');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('missing reason fails config validation', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeProblemProject(tempDir);
		await writeProjectFile(
			tempDir,
			'.higignore.yaml',
			[
				'ignoredConcerns:',
				'  - file: Sources/Sample.swift',
				'    pattern: ignoresSafeArea',
				'    line: 6',
				'',
			].join('\n'),
		);
		const result = await runWrapper(tempDir, 'Sources');
		expect(result.exitCode).toBe(2);
		expect(result.stderr).toContain('ignoredConcerns[0].reason');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('exact file pattern and line ignore suppresses only that concern', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeProblemProject(tempDir);
		await writeProjectFile(
			tempDir,
			'.higignore.yaml',
			[
				'ignoredConcerns:',
				'  - file: Sources/Sample.swift',
				'    pattern: ignoresSafeArea',
				'    line: 6',
				'    reason: Full-bleed background must extend behind safe areas.',
				'',
			].join('\n'),
		);
		const result = await runWrapper(tempDir, 'Sources');
		expect(result.exitCode).toBe(1);
		expect(result.stdout).toContain('# HIG Doctor Issues');
		expect(result.stdout).toContain('Sources/Sample.swift:13');
		expect(result.stdout).toContain('## Ignored Concerns');
		expect(result.stdout).toContain('`ignoresSafeArea`: ok because Full-bleed background must extend behind safe areas.');
		expect(result.stdout).toContain('-> in `Sources/Sample.swift:6`');
		expect(result.stderr).toContain('1 HIG concern(s) found.');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('excluded directory glob skips testing support code before detection', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeExcludedPathProject(tempDir);
		await writeProjectFile(
			tempDir,
			'.higignore.yaml',
			['excludedPaths:', '  - "**/Testing/**"', ''].join('\n'),
		);
		const result = await runWrapper(tempDir, 'CountdownKit/Sources');
		expect(result.exitCode).toBe(1);
		expect(result.stdout).toContain('CountdownKit/Sources/CountdownKit/Feature/ShippingView.swift:6');
		expect(result.stdout).not.toContain('CountdownKit/Sources/CountdownKit/Testing/MaestroVisualRegressionFixture.swift');
		expect(result.stderr).toContain('1 HIG concern(s) found.');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('excluded file glob skips matching fixture files outside testing directories', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeExcludedGlobProject(tempDir);
		await writeProjectFile(
			tempDir,
			'.higignore.yaml',
			['excludedPaths:', '  - "Sources/**/DebugFixture.swift"', ''].join('\n'),
		);
		const result = await runWrapper(tempDir, 'Sources');
		expect(result.exitCode).toBe(1);
		expect(result.stdout).toContain('Sources/Shipping/MainView.swift:6');
		expect(result.stdout).not.toContain('Sources/Fixtures/DebugFixture.swift');
		expect(result.stderr).toContain('1 HIG concern(s) found.');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('same pattern on a different line is not ignored', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeProblemProject(tempDir);
		await writeProjectFile(
			tempDir,
			'.higignore.yaml',
			[
				'ignoredConcerns:',
				'  - file: Sources/Sample.swift',
				'    pattern: ignoresSafeArea',
				'    line: 13',
				'    reason: This one is intentionally allowed.',
				'',
			].join('\n'),
		);
		const result = await runWrapper(tempDir, 'Sources');
		expect(result.exitCode).toBe(1);
		expect(result.stdout).toContain('Sources/Sample.swift:6');
		expect(result.stdout).toContain('Sources/Sample.swift:13');
		expect(result.stderr).toContain('1 HIG concern(s) found.');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('excluded paths and exact ignores can be used together', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeExcludedPathProject(tempDir);
		await writeProjectFile(
			tempDir,
			'.higignore.yaml',
			[
				'excludedPaths:',
				'  - "**/Testing/**"',
				'ignoredConcerns:',
				'  - file: CountdownKit/Sources/CountdownKit/Feature/ShippingView.swift',
				'    pattern: ignoresSafeArea',
				'    line: 6',
				'    reason: Shipping view intentionally extends edge to edge.',
				'',
			].join('\n'),
		);
		const result = await runWrapper(tempDir, 'CountdownKit/Sources');
		expect(result.exitCode).toBe(0);
		expect(result.stdout).not.toContain('# HIG Doctor Issues');
		expect(result.stdout).toContain('## Ignored Concerns');
		expect(result.stdout).toContain('CountdownKit/Sources/CountdownKit/Feature/ShippingView.swift:6');
		expect(result.stdout).not.toContain('CountdownKit/Sources/CountdownKit/Testing/MaestroVisualRegressionFixture.swift');
		expect(result.stderr).toBe('');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('visible concerns print docs hints on stderr', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeProblemProject(tempDir);
		const result = await runWrapper(tempDir, 'Sources');
		expect(result.exitCode).toBe(1);
		expect(parseHintLines(result.stderr)).toEqual([
			{ skill: 'hig-foundations', command: 'docs topic app hig-doctor' },
		]);
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('help documents excludedPaths support', async () => {
	const tempDir = await makeTempDir();
	try {
		const result = await runWrapperWithArgs(tempDir, ['--help']);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain('excludedPaths');
		expect(result.stdout).toContain('ignoredConcerns');
		expect(result.stderr).toBe('');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('fully ignored concerns produce only ignored markdown and succeed', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeProblemProject(tempDir);
		await writeProjectFile(
			tempDir,
			'.higignore.yaml',
			[
				'ignoredConcerns:',
				'  - file: Sources/Sample.swift',
				'    pattern: ignoresSafeArea',
				'    line: 6',
				'    reason: Full-bleed background must extend behind safe areas.',
				'  - file: Sources/Sample.swift',
				'    pattern: ignoresSafeArea',
				'    line: 13',
				'    reason: Wallpaper owns edge-to-edge rendering here.',
				'',
			].join('\n'),
		);
		const result = await runWrapper(tempDir, 'Sources');
		expect(result.exitCode).toBe(0);
		expect(result.stdout).not.toContain('# HIG Doctor Issues');
		expect(result.stdout).toContain('## Ignored Concerns');
		expect(result.stdout).toContain('-> in `Sources/Sample.swift:6`');
		expect(result.stdout).toContain('-> in `Sources/Sample.swift:13`');
		expect(result.stdout).toContain('`\n\n- `ignoresSafeArea`');
		expect(result.stderr).toBe('');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test('clean input produces no output and succeeds', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeCleanProject(tempDir);
		const result = await runWrapper(tempDir, 'Sources');
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toBe('');
		expect(result.stderr).toBe('');
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});
