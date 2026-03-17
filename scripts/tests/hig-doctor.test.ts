import { test, expect } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const scriptsDir = '/Users/n14/.ngents/scripts';
const scriptPath = path.join(scriptsDir, 'hig-doctor.ts');
const bunExecutable = process.execPath;

type CommandResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
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

test('missing config file leaves visible concerns in markdown output', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeProblemProject(tempDir);
		const result = await runWrapper(tempDir, 'Sources');
		expect(result.exitCode).toBe(1);
		expect(result.stdout).toContain('# HIG Doctor Issues');
		expect(result.stdout).toContain('Sources/Sample.swift:6');
		expect(result.stdout).toContain('Sources/Sample.swift:13');
		expect(result.stderr).toContain('2 HIG concern(s) found.');
		expect(result.stderr).toContain('Relevant HIG skill: hig-foundations');
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
		expect(result.stdout).toContain('Sources/Sample.swift:6');
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

test('visible concerns print docs hints on stderr', async () => {
	const tempDir = await makeTempDir();
	try {
		await writeProblemProject(tempDir);
		const result = await runWrapper(tempDir, 'Sources');
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain('docs topic ios hig-doctor');
		expect(result.stderr).toContain('hig-foundations');
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
