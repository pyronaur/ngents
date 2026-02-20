/**
 * Task-agnostic playground for Bunmagic argument routing.
 * Prefer `args` and `flags` for normal scripts.
 * Use raw `process.argv` only for advanced passthrough cases.
 * @autohelp
 * @usage bunmagic exec ~/.ngents/docs/bunmagic/examples/argv-playground.ts alpha --verbose
 * @usage bunmagic exec ~/.ngents/docs/bunmagic/examples/argv-playground.ts -- --literal '--weird=value' tail
 * @flag --demo <text> Optional shell interpolation demo text
 */

function toJson(value: unknown): string {
	return JSON.stringify(value);
}

function rawAfterDoubleDash(raw: string[]): string[] {
	const index = raw.indexOf("--");
	if (index < 0) {
		return [];
	}
	return raw.slice(index + 1);
}

export default async function (): Promise<void> {
	const raw = process.argv.slice(2);
	const passthrough = rawAfterDoubleDash(raw);

	await $`echo "== Bunmagic Arg Playground =="`;
	await $`echo "Prefer this: args + flags"`;
	await $`echo "args=${toJson(args)}"`;
	await $`echo "flags=${toJson(flags)}"`;
	await $`echo "argv=${toJson(argv)}"`;

	await $`echo "Advanced-only: raw process.argv"`;
	await $`echo "process.argv.slice(2)=${toJson(raw)}"`;
	await $`echo "tokens-after-double-dash=${toJson(passthrough)}"`;

	if (!passthrough.length) {
		await $`echo "No passthrough tokens detected."`;
		return;
	}

	const joined = passthrough.join(" ");
	await $`echo "escaped-template=${joined}"`;
	await $`echo raw-template=${{ raw: joined }}`;

	const demo =
		typeof flags.demo === "string" && flags.demo.trim()
			? flags.demo.trim()
			: "$(echo hello) plain";

	await $`echo "demo-escaped=${demo}"`;
	await $`echo demo-raw=${{ raw: demo }}`;
}
