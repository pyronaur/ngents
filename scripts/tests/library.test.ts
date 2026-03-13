import { afterEach, describe, expect, test } from 'bun:test';
import { $ } from 'bun';
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const scriptPath = path.join(import.meta.dir, '..', 'library.ts');
const bunExecutable = process.execPath;
const tempDirs: string[] = [];

type RunResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

function stripAnsi(value: string): string {
	return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

async function makeTempDir(prefix: string): Promise<string> {
	const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
	tempDirs.push(dir);
	return dir;
}

async function writeFixtureFile(rootDir: string, relativePath: string, contents: string): Promise<void> {
	const filePath = path.join(rootDir, relativePath);
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, contents);
}

async function runLibrary(args: string[], cwd: string): Promise<RunResult> {
	const result = await $`${[bunExecutable, scriptPath, ...args]}`.cwd(cwd).nothrow().quiet();
	return {
		exitCode: result.exitCode,
		stdout: stripAnsi(result.stdout.toString()),
		stderr: result.stderr.toString(),
	};
}

async function createLibraryFixture(): Promise<string> {
	const rootDir = await makeTempDir('ngents-library-test-');
	await writeFixtureFile(rootDir, '.git', '');
	await writeFixtureFile(
		rootDir,
		'library/library.json',
		JSON.stringify(
			{
				'aso/aso-store-aso-skill': {
					title: 'App Store ASO Skill',
					source: 'https://example.com/aso',
				},
				'ios/hig-doctor': {
					title: 'HIG Doctor',
					source: 'https://example.com/hig-doctor',
				},
			},
			null,
			2,
		),
	);
	await writeFixtureFile(
		rootDir,
		'library/aso/LIB.md',
`# ASO Library

This library collects local ASO strategy notes plus imported ASO tooling and skills.

- Start with \`ASO.md\` for the local strategy and writing heuristics.
- Use the imported ASO skill when you want a structured optimization workflow.
- Use the validator script before finalizing App Store metadata.
`,
	);
	await writeFixtureFile(
		rootDir,
		'library/ios/LIB.md',
`# iOS Library

This library collects iOS-focused references and imported Apple HIG skills.

Prioritize \`hig-doctor\` first when you need Apple HIG guidance or a skill index.

- Use \`SOSUMI.md\` when you need Apple Developer docs in Markdown.
- Use \`hig-doctor\` when you need curated Apple HIG skills and references.
- Prefer \`hig-doctor\` before raw Apple docs when both could answer the question.
`,
	);
	await writeFixtureFile(
		rootDir,
		'library/ios/SOSUMI.md',
		`---
summary: "Sosumi CLI and MCP reference for Apple Developer docs."
read_when:
- Need Apple docs as markdown.
---

# Sosumi
`,
	);
	await writeFixtureFile(
		rootDir,
		'library/ios/hig-doctor/skills/hig-foundations/SKILL.md',
		`---
name: hig-foundations
version: 1.0.0
description: >-
  Apple HIG foundations guidance for color and typography, including layout,
  motion, privacy, and iconography decisions across Apple platforms.
---

# Apple HIG: Design Foundations

| Reference | Topic |
|---|---|
| [color.md](references/color.md) | Color |
| [typography.md](references/typography.md) | Typography |
`,
	);
	await writeFixtureFile(rootDir, 'library/ios/hig-doctor/skills/hig-foundations/references/color.md', '# Color\n');
	await writeFixtureFile(
		rootDir,
		'library/ios/hig-doctor/skills/hig-foundations/references/typography.md',
		'# Typography\n',
	);
	await writeFixtureFile(rootDir, 'library/aso/ASO.md', '# ASO Guide\n');
	await writeFixtureFile(rootDir, 'library/aso/README.md', '# ASO Library Guide\n');
	await writeFixtureFile(
		rootDir,
		'library/aso/aso-store-aso-skill/SKILL.md',
		`---
name: app-store-aso
version: 1.2.3
description: "Imported ASO workflow."
---

See [guide.md](references/guide.md).
Use [ASO Learnings](references/aso_learnings.md).
Validate with [validate_metadata.py](scripts/validate_metadata.py).
`,
	);
	await writeFixtureFile(rootDir, 'library/aso/aso-store-aso-skill/references/guide.md', '# Guide\n');
	await writeFixtureFile(rootDir, 'library/aso/aso-store-aso-skill/references/aso_learnings.md', '# Learnings\n');
	await writeFixtureFile(rootDir, 'library/aso/aso-store-aso-skill/scripts/validate_metadata.py', 'print("ok")\n');

	return rootDir;
}

describe('library', () => {
	test('lists all topics, standalone references, imports, skills, and skill references', async () => {
		const rootDir = await createLibraryFixture();
		const resolvedRootDir = await realpath(rootDir);
		const result = await runLibrary([], rootDir);

		expect(result.exitCode).toBe(0);
		expect(result.stderr).toBe('');
		expect(result.stdout).toContain('ASO Guide');
		expect(result.stdout).toContain(`path: ${path.join(resolvedRootDir, 'library', 'aso', 'ASO.md').replaceAll('\\', '/')}`);
		expect(result.stdout).toContain('ASO Library Guide');
		expect(result.stdout).toContain(`path: ${path.join(resolvedRootDir, 'library', 'aso', 'README.md').replaceAll('\\', '/')}`);
		expect(result.stdout).toContain('## Skill: App Store ASO Skill');
		expect(result.stdout).toContain('### app-store-aso');
		expect(result.stdout).toContain('path:');
		expect(result.stdout).toContain(
			path.join(resolvedRootDir, 'library', 'aso', 'aso-store-aso-skill', 'SKILL.md').replaceAll('\\', '/'),
		);
		expect(result.stdout).toContain(
			`${path.join(resolvedRootDir, 'library', 'aso', 'aso-store-aso-skill', 'references').replaceAll('\\', '/')}/:`,
		);
		expect(result.stdout).toContain('- guide.md');
		expect(result.stdout).toContain('- aso_learnings.md');
		expect(result.stdout).toContain(
			`${path.join(resolvedRootDir, 'library', 'aso', 'aso-store-aso-skill', 'scripts').replaceAll('\\', '/')}/:`,
		);
		expect(result.stdout).toContain('- validate_metadata.py');
		expect(result.stdout).toContain('# iOS Library');
		expect(result.stdout).toContain('## Sosumi');
		expect(result.stdout).toContain(
			`path: ${path.join(resolvedRootDir, 'library', 'ios', 'SOSUMI.md').replaceAll('\\', '/')}`,
		);
		expect(result.stdout).toContain('Sosumi CLI and MCP reference for Apple Developer docs.');
		expect(result.stdout).toContain('## Skill: HIG Doctor');
		expect(result.stdout).toContain(
			`path: ${path.join(resolvedRootDir, 'library', 'ios', 'hig-doctor').replaceAll('\\', '/')}`,
		);
		expect(result.stdout).toContain('### Apple HIG: Design Foundations');
		expect(result.stdout).toContain(
			path.join(resolvedRootDir, 'library', 'ios', 'hig-doctor', 'skills', 'hig-foundations', 'SKILL.md').replaceAll('\\', '/'),
		);
		expect(result.stdout).toContain(
			'Apple HIG foundations guidance for color and typography, including layout, motion, privacy, and iconography decisions across Apple platforms.',
		);
		expect(result.stdout).toContain(
			`${path.join(resolvedRootDir, 'library', 'ios', 'hig-doctor', 'skills', 'hig-foundations', 'references').replaceAll('\\', '/')}/:`,
		);
		expect(result.stdout).toContain('- color.md');
		expect(result.stdout).toContain('- typography.md');
	});

	test('filters to a single topic from a nested working directory', async () => {
		const rootDir = await createLibraryFixture();
		const nestedDir = path.join(rootDir, 'library', 'ios', 'hig-doctor');
		const result = await runLibrary(['ios'], nestedDir);

		expect(result.exitCode).toBe(0);
		expect(result.stderr).toBe('');
		expect(result.stdout).toContain('# iOS Library');
		expect(result.stdout).toContain('This library collects iOS-focused references and imported Apple HIG skills.');
		expect(result.stdout).toContain('Prioritize `hig-doctor` first when you need Apple HIG guidance or a skill index.');
		expect(result.stdout).toContain('- Prefer `hig-doctor` before raw Apple docs when both could answer the question.');
		expect(result.stdout).not.toContain('ASO Guide');
	});

	test('renders the aso library guide and supporting skill files', async () => {
		const rootDir = await createLibraryFixture();
		const result = await runLibrary(['aso'], rootDir);

		expect(result.exitCode).toBe(0);
		expect(result.stderr).toBe('');
		expect(result.stdout).toContain('# ASO Library');
		expect(result.stdout).toContain('This library collects local ASO strategy notes plus imported ASO tooling and skills.');
		expect(result.stdout).toContain('- Use the validator script before finalizing App Store metadata.');
		expect(result.stdout).toContain('## Skill: App Store ASO Skill');
		expect(result.stdout).toContain('- validate_metadata.py');
	});

	test('fails with available topics when the filter does not exist', async () => {
		const rootDir = await createLibraryFixture();
		const result = await runLibrary(['macos'], rootDir);

		expect(result.exitCode).toBe(1);
		expect(result.stdout).toBe('');
		expect(result.stderr.trim()).toBe('Unknown library topic "macos". Available topics: aso, ios');
	});

	test('surfaces malformed frontmatter without crashing', async () => {
		const rootDir = await createLibraryFixture();
		await writeFixtureFile(rootDir, 'library/ios/BAD.md', '---\nsummary: broken');

		const result = await runLibrary(['ios'], rootDir);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain('## BAD.md');
		expect(result.stdout).toContain('[unterminated front matter]');
	});
});
