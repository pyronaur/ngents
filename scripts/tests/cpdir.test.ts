import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const scriptPath = path.join(import.meta.dir, '..', 'cpdir.ts');

type RunResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
	clipboardPath: string;
	invocationsPath: string;
};

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

async function makeTempDir(prefix: string): Promise<string> {
	const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
	tempDirs.push(dir);
	return dir;
}

async function writeExecutable(filePath: string, contents: string): Promise<void> {
	await writeFile(filePath, contents);
	await chmod(filePath, 0o755);
}

async function createStubBin(rootDir: string): Promise<{
	binDir: string;
	clipboardPath: string;
	invocationsPath: string;
}> {
	const binDir = path.join(rootDir, 'bin');
	await mkdir(binDir, { recursive: true });

	const clipboardPath = path.join(rootDir, 'clipboard.txt');
	const invocationsPath = path.join(rootDir, 'zoxide-invocations.txt');
	await writeFile(clipboardPath, '');
	await writeFile(invocationsPath, '');

	await writeExecutable(
		path.join(binDir, 'pbcopy'),
		`#!/bin/sh
cat > "$CPDIR_TEST_CLIPBOARD"
`,
	);

	await writeExecutable(
		path.join(binDir, 'zoxide'),
		`#!/bin/sh
printf '%s\\n' "$*" >> "$CPDIR_TEST_INVOKE_LOG"
mode=""
for arg in "$@"; do
  if [ "$arg" = "-l" ] || [ "$arg" = "-i" ]; then
    mode="$arg"
  fi
done
if [ "$mode" = "-l" ]; then
  if [ -n "$CPDIR_TEST_ZOXIDE_LIST" ]; then
    printf '%s' "$CPDIR_TEST_ZOXIDE_LIST"
  fi
  exit "\${CPDIR_TEST_ZOXIDE_LIST_EXIT:-0}"
fi
if [ "$mode" = "-i" ]; then
  if [ -n "$CPDIR_TEST_ZOXIDE_INTERACTIVE" ]; then
    printf '%s' "$CPDIR_TEST_ZOXIDE_INTERACTIVE"
  fi
  exit "\${CPDIR_TEST_ZOXIDE_INTERACTIVE_EXIT:-0}"
fi
echo "unexpected zoxide invocation: $*" >&2
exit 99
`,
	);

	return { binDir, clipboardPath, invocationsPath };
}

async function runCpdir(
	args: string[],
	options: {
		cwd: string;
		env?: Record<string, string | undefined>;
		pathOverride?: string;
		runnerArgs?: string[];
	},
): Promise<RunResult> {
	const rootDir = await makeTempDir('cpdir-test-');
	const stubBin = await createStubBin(rootDir);
	const child = Bun.spawn({
		cmd: [process.execPath, scriptPath, ...(options.runnerArgs ?? []), ...args],
		cwd: options.cwd,
		env: {
			...process.env,
			...options.env,
			CPDIR_TEST_CLIPBOARD: stubBin.clipboardPath,
			CPDIR_TEST_INVOKE_LOG: stubBin.invocationsPath,
			PATH: options.pathOverride ?? `${stubBin.binDir}:${process.env.PATH ?? ''}`,
		},
		stdout: 'pipe',
		stderr: 'pipe',
	});

	const stdout = await new Response(child.stdout).text();
	const stderr = await new Response(child.stderr).text();
	const exitCode = await child.exited;

	return {
		exitCode,
		stdout,
		stderr,
		clipboardPath: stubBin.clipboardPath,
		invocationsPath: stubBin.invocationsPath,
	};
}

describe('cpdir', () => {
	test('copies the resolved current directory when called without args', async () => {
		const cwd = await makeTempDir('cpdir-cwd-');
		const expectedPath = await realpath(cwd);
		const result = await runCpdir([], { cwd });

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe(`Copied: ${expectedPath}`);
		expect(await readFile(result.clipboardPath, 'utf8')).toBe(expectedPath);
	});

	test('ignores bunmagic global shim argv when called without query args', async () => {
		const cwd = await makeTempDir('cpdir-shim-cwd-');
		const expectedPath = await realpath(cwd);
		const result = await runCpdir([], {
			cwd,
			runnerArgs: [scriptPath, 'cpdir'],
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe(`Copied: ${expectedPath}`);
		expect(await readFile(result.clipboardPath, 'utf8')).toBe(expectedPath);
	});

	test('copies the only zoxide match without interactive selection', async () => {
		const cwd = await makeTempDir('cpdir-query-cwd-');
		const targetDir = await makeTempDir('cpdir-target-');
		const symlinkPath = path.join(cwd, 'only-match');
		await symlink(targetDir, symlinkPath);

		const result = await runCpdir(['bun'], {
			cwd,
			env: {
				CPDIR_TEST_ZOXIDE_LIST: `${symlinkPath}\n`,
			},
		});

		const expectedPath = await realpath(targetDir);
		const invocations = await readFile(result.invocationsPath, 'utf8');

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe(`Copied: ${expectedPath}`);
		expect(await readFile(result.clipboardPath, 'utf8')).toBe(expectedPath);
		expect(invocations).toContain('query -l -- bun');
		expect(invocations).not.toContain('query -i -- bun');
	});

	test('ignores bunmagic global shim argv before zoxide query args', async () => {
		const cwd = await makeTempDir('cpdir-shim-query-cwd-');
		const targetDir = await makeTempDir('cpdir-shim-target-');
		const result = await runCpdir(['bunmagic_v2'], {
			cwd,
			env: {
				CPDIR_TEST_ZOXIDE_LIST: `${targetDir}\n`,
			},
			runnerArgs: [scriptPath, 'cpdir'],
		});

		const expectedPath = await realpath(targetDir);
		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe(`Copied: ${expectedPath}`);
		expect(await readFile(result.clipboardPath, 'utf8')).toBe(expectedPath);
	});

	test('uses zoxide interactive selection when multiple matches exist', async () => {
		const cwd = await makeTempDir('cpdir-query-many-cwd-');
		const firstDir = await makeTempDir('cpdir-first-');
		const secondDir = await makeTempDir('cpdir-second-');
		const secondLink = path.join(cwd, 'selected-match');
		await symlink(secondDir, secondLink);

		const result = await runCpdir(['bun'], {
			cwd,
			env: {
				CPDIR_TEST_ZOXIDE_LIST: `${firstDir}\n${secondLink}\n`,
				CPDIR_TEST_ZOXIDE_INTERACTIVE: `${secondLink}\n`,
			},
		});

		const expectedPath = await realpath(secondDir);
		const invocations = await readFile(result.invocationsPath, 'utf8');

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe(`Copied: ${expectedPath}`);
		expect(await readFile(result.clipboardPath, 'utf8')).toBe(expectedPath);
		expect(invocations).toContain('query -l -- bun');
		expect(invocations).toContain('query -i -- bun');
	});

	test('fails clearly when zoxide returns no matches', async () => {
		const cwd = await makeTempDir('cpdir-no-match-cwd-');
		const result = await runCpdir(['unknown'], {
			cwd,
			env: {
				CPDIR_TEST_ZOXIDE_LIST: '',
			},
		});

		expect(result.exitCode).toBe(1);
		expect(result.stdout).toBe('');
		expect(result.stderr.trim()).toBe('No zoxide matches for "unknown"');
	});

	test('fails when interactive selection is cancelled', async () => {
		const cwd = await makeTempDir('cpdir-cancel-cwd-');
		const result = await runCpdir(['bun'], {
			cwd,
			env: {
				CPDIR_TEST_ZOXIDE_LIST: '/tmp/one\n/tmp/two\n',
				CPDIR_TEST_ZOXIDE_INTERACTIVE_EXIT: '130',
			},
		});

		expect(result.exitCode).toBe(1);
		expect(result.stdout).toBe('');
		expect(result.stderr.trim()).toBe('Selection cancelled');
	});

	test('fails clearly when zoxide is unavailable for query mode', async () => {
		const cwd = await makeTempDir('cpdir-no-zoxide-cwd-');
		const pathDir = await makeTempDir('cpdir-path-');
		const pbcopyPath = path.join(pathDir, 'pbcopy');
		await writeExecutable(
			pbcopyPath,
			`#!/bin/sh
cat > "$CPDIR_TEST_CLIPBOARD"
`,
		);

		const result = await runCpdir(['bun'], {
			cwd,
			pathOverride: `${pathDir}:/usr/bin:/bin:/usr/sbin:/sbin`,
		});

		expect(result.exitCode).toBe(1);
		expect(result.stdout).toBe('');
		expect(result.stderr.trim()).toBe('zoxide is required for query mode');
	});
});
