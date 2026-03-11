---
summary: "Compact reference: Bun shell usage, output handling, redirection, piping, and shell-first decision rules"
read_when:
  - Need a compact Bun Shell reference grounded in the official Bun shell docs.
  - Deciding whether a shell task should use `$` or `Bun.spawn(...)`.
---

# Bun Shell

> Use Bun's shell scripting API to run shell commands from JavaScript.

Bun Shell is a cross-platform, bash-like shell with JavaScript interop. All examples below assume:

```ts
import { $ } from "bun";
```

Quickstart:

```ts
const response = await fetch("https://example.com");

// Use a Response as stdin.
await $`cat < ${response} | wc -c`; // 1256
```

## Practical decision rule

If you are trying to run a shell command in Bun, start with `$`.

Do not jump to `Bun.spawn(...)` just because:

- the command is interactive
- the command uses the terminal
- you want captured output
- you want line-by-line output
- you want to redirect to `/dev/tty`

`$` already handles all of those cases in many real scripts.

Reach for `Bun.spawn(...)` only when you need a real child-process handle from JavaScript, such as:

- direct `proc.stdin.write(...)`
- direct `proc.kill(...)`
- direct `proc.exited`
- direct PTY control through `proc.terminal`

## Getting started

```ts
// Run a shell command.
await $`echo "Hello World!"`; // Hello World!

// Suppress terminal printing.
await $`echo "Hello World!"`.quiet(); // No output
```

`.quiet()` suppresses terminal printing for both stdout and stderr, but both streams remain available on the returned `ShellOutput`.

```ts
// Read stdout as a string. `.text()` calls `.quiet()` for you.
const welcome = await $`echo "Hello World!"`.text();
console.log(welcome); // Hello World!\n

// Awaiting directly returns stdout/stderr as Buffers.
const { stdout, stderr } = await $`echo "Hello!"`.quiet();
console.log(stdout); // Buffer(7) [ 72, 101, 108, 108, 111, 33, 10 ]
console.log(stderr); // Buffer(0) []
```

`.text()` can still work with interactive commands if the command reads from the terminal or `/dev/tty` and writes its final result to stdout.

### Return types

There are three layers:

- the `$` template literal returns a `ShellPromise`
- awaiting that shell command returns a `ShellOutput`
- helpers like `.text()`, `.json()`, `.blob()`, and `.lines()` convert that output into a different shape

Useful mental model:

- use plain `await` when you want `stdout`, `stderr`, and `exitCode`
- use `.text()` when you want a string
- use `.lines()` when you want streaming stdout lines

## Error handling

```ts
// Non-zero exit codes throw a ShellError by default.
try {
  const output = await $`something-that-may-fail`.text();
  console.log(output);
} catch (err) {
  console.log(`Failed with code ${err.exitCode}`);
  console.log(err.stdout.toString());
  console.log(err.stderr.toString());
}

// Disable throwing and check exitCode yourself.
const result = await $`something-that-may-fail`.nothrow().quiet();
if (result.exitCode !== 0) {
  console.log(`Non-zero exit code ${result.exitCode}`);
}
console.log(result.stdout);
console.log(result.stderr);
```

The default handling of non-zero exit codes can also be configured on `$` itself:

```ts
// Shell promises will not throw. Check `exitCode` manually on every command.
$.nothrow(); // equivalent to $.throws(false)

// Restore default behavior: non-zero exit codes throw.
$.throws(true);

// Alias for $.nothrow()
$.throws(false);

await $`something-that-may-fail`; // No exception thrown
```

## Redirection

A command's input or output may be redirected with typical Bash operators:

- `<` redirect stdin
- `>` or `1>` redirect stdout
- `2>` redirect stderr
- `&>` redirect both stdout and stderr
- `>>` or `1>>` redirect stdout, appending instead of overwriting
- `2>>` redirect stderr, appending instead of overwriting
- `&>>` redirect both stdout and stderr, appending instead of overwriting
- `1>&2` redirect stdout to stderr
- `2>&1` redirect stderr to stdout

Bun Shell also supports redirecting from and to JavaScript objects.

### Redirect output to JavaScript objects (`>`)

```ts
// Redirect stdout into a Buffer.
const buffer = Buffer.alloc(100);
await $`echo "Hello World!" > ${buffer}`;
console.log(buffer.toString()); // Hello World!\n
```

Supported redirection targets:

- `Buffer`, `Uint8Array`, `Uint16Array`, `Uint32Array`, `Int8Array`, `Int16Array`, `Int32Array`, `Float32Array`, `Float64Array`, `ArrayBuffer`, `SharedArrayBuffer`
- `Bun.file(path)`, `Bun.file(fd)`

### Redirect input from JavaScript objects (`<`)

```ts
// Redirect a Response body into stdin.
const response = new Response("hello i am a response body");
const result = await $`cat < ${response}`.text();
console.log(result); // hello i am a response body
```

Supported redirection sources:

- `Buffer`, `Uint8Array`, `Uint16Array`, `Uint32Array`, `Int8Array`, `Int16Array`, `Int32Array`, `Float32Array`, `Float64Array`, `ArrayBuffer`, `SharedArrayBuffer`
- `Bun.file(path)`, `Bun.file(fd)`
- `Response`

### File redirection examples

```ts
// Read from a file into stdin.
await $`cat < myfile.txt`;

// Write stdout to a file.
await $`echo bun! > greeting.txt`;

// Write stderr to a file.
await $`bun run index.ts 2> errors.txt`;

// Redirect stderr to stdout, so all output is available on stdout.
await $`bun run ./index.ts 2>&1`;

// Redirect stdout to stderr, so all output is available on stderr.
await $`bun run ./index.ts 1>&2`;
```

### `/dev/tty` redirection

```ts
// If a command already works in your terminal, try the shell version first.
await $`vim --version >> /dev/tty`;
```

Interactive or terminal-aware commands do not automatically require `Bun.spawn(...)`.

### Interactive commands with captured output

An interactive command can still work under `$` while returning stdout to JavaScript.

```ts
// Keep terminal interaction, but capture stdout/stderr and exit code.
const result = await $`interactive-picker`.nothrow().quiet();
if (result.exitCode !== 0) return null;
const selected = result.stdout.toString().trim();

// When you only need stdout as a string, `.text()` can work too.
const selectedText = (await $`interactive-picker`.text()).trim();
```

The important distinction:

- `$` can still run interactive commands through normal shell semantics
- `Bun.spawn(...)` is only needed when you need direct `Subprocess` or PTY control
- "possible with `$`" and "most convenient with `$`" are different questions

## Piping (`|`)

```ts
// Pipe one command into another.
const wordCount = await $`echo "Hello World!" | wc -w`.text();
console.log(wordCount); // 2\n

// Piping also works with JavaScript objects.
const response = new Response("hello i am a response body");
const words = await $`cat < ${response} | wc -w`.text();
console.log(words); // 6\n
```

### Shell plumbing

`$` is not limited to one-shot commands.

If needed, you can combine:

- pipes
- redirection
- background processes
- FIFOs
- `.lines()`

to orchestrate longer-lived processes from Bun without using `Bun.spawn(...)`.

For example:

- create a FIFO for stdin
- start a background process with shell redirection
- keep a JS writer open to that FIFO
- read output incrementally with `.lines()`

That is more indirect than `Bun.spawn(...)`, but it is still possible with `$`. This includes cases as heavy as driving a real REPL through shell plumbing. For example, a Python REPL can be run in the background, fed through a FIFO, and observed incrementally with `.lines()`.

## Command substitution (`$(...)`)

```ts
// Insert another command's stdout into the current command.
await $`echo Hash of current commit: $(git rev-parse HEAD)`;

// Use substitution inside a larger shell block.
await $`
REV=$(git rev-parse HEAD)
docker built -t myapp:$REV
echo Done building docker image "myapp:$REV"
`;
```

Because Bun uses the template literal's `raw` strings internally, backtick command substitution does not work:

```ts
await $`echo \`echo hi\``;
```

That prints `echo hi`, not `hi`.

Use `$(...)` instead.

## Environment variables

```ts
// Set env vars like in bash.
await $`FOO=foo bun -e 'console.log(process.env.FOO)'`; // foo\n

// Interpolation works when setting env vars.
const foo = "bar123";
await $`FOO=${foo + "456"} bun -e 'console.log(process.env.FOO)'`; // bar123456\n

// Interpolated input is escaped by default.
const unsafe = "bar123; rm -rf /tmp";
await $`FOO=${unsafe} bun -e 'console.log(process.env.FOO)'`; // bar123; rm -rf /tmp\n
```

### Changing the environment

```ts
// Override env for one command.
await $`echo $FOO`.env({ ...process.env, FOO: "bar" }); // bar

// Change the default env for all commands.
$.env({ FOO: "bar" });
await $`echo $FOO`; // bar
await $`echo $FOO`.env({ FOO: "baz" }); // baz

// Reset to default environment.
$.env({ FOO: "bar" });
await $`echo $FOO`; // bar
await $`echo $FOO`.env(undefined); // ""
```

### Changing the working directory

```ts
// Override cwd for one command.
await $`pwd`.cwd("/tmp"); // /tmp

// Change the default cwd for all commands.
$.cwd("/tmp");
await $`pwd`; // /tmp
await $`pwd`.cwd("/"); // /
```

## Reading output

```ts
// Read stdout as a string.
const text = await $`echo "Hello World!"`.text();
console.log(text); // Hello World!\n

// Read stdout as JSON.
const json = await $`echo '{"foo": "bar"}'`.json();
console.log(json); // { foo: "bar" }

// Read stdout as a Blob.
const blob = await $`echo "Hello World!"`.blob();
console.log(blob); // Blob(13) { size: 13, type: "text/plain" }
```

### Reading output line-by-line

```ts
// Stream stdout line by line.
for await (const line of $`echo "Hello World!"`.lines()) {
  console.log(line); // Hello World!
}

// `.lines()` also works on a completed command.
const search = "bun";
for await (const line of $`cat list.txt | grep ${search}`.lines()) {
  console.log(line);
}
```

### Streaming with `.lines()`

Use `.lines()` when:

- the command may keep running for a while
- you want output incrementally
- you do not want to wait for the full buffered result

This is one of the main reasons `$` is more capable than a naive "run and wait" API.

## Utilities

### `$.braces`

Implements simple [brace expansion](https://www.gnu.org/software/bash/manual/html_node/Brace-Expansion.html):

```ts
await $.braces(`echo {1,2,3}`);
// => ["echo 1", "echo 2", "echo 3"]
```

### `$.escape`

Exposes Bun Shell's escaping logic:

```ts
console.log($.escape('$(foo) `bar` "baz"'));
// => \$(foo) \`bar\` \"baz\"
```

If you do not want your string escaped, wrap it in `{ raw: "..." }`:

```ts
await $`echo ${{ raw: '$(foo) `bar` "baz"' }}`;
// => bun: command not found: foo
// => bun: command not found: bar
// => baz
```

## `.sh` file loader

For simple shell scripts, Bun Shell can run `.sh` files directly instead of `/bin/sh`.

```sh
# script.sh
echo "Hello World! pwd=$(pwd)"
```

```sh
bun ./script.sh
```

```txt
Hello World! pwd=/home/demo
```

Scripts with Bun Shell are cross-platform, so they also work on Windows:

```powershell
bun .\script.sh
```

```txt
Hello World! pwd=C:\Users\Demo
```

## Security in the Bun shell

By design, Bun Shell does not invoke a system shell like `/bin/sh`. It is a re-implementation of bash that runs in the same Bun process and is designed with security in mind.
When parsing command arguments, Bun treats all interpolated variables as single, literal strings. This protects against command injection:

```ts
const userInput = "my-file.txt; rm -rf /";

// SAFE: `userInput` is treated as one literal argument.
await $`ls ${userInput}`;
```

In that example, `ls` tries to read one directory literally named `"my-file; rm -rf /"`.

### Security considerations

While command injection is prevented by default, developers are still responsible for security in certain scenarios.
Similar to `Bun.spawn` or `node:child_process.exec()`, you can intentionally execute a command that starts a new shell such as `bash -c`.
When you do that, you hand off control, and Bun's built-in protections no longer apply to the string interpreted by that new shell.

```ts
const userInput = "world; touch /tmp/pwned";

// UNSAFE: this starts a new shell with `bash -c`.
// Any user input passed this way must be rigorously sanitized.
await $`bash -c "echo ${userInput}"`;
```

### Argument injection

Bun Shell cannot know how an external command interprets its own command-line arguments. An attacker can supply input that the target program recognizes as one of its own flags or options, leading to unintended behavior.

```ts
// Malicious input formatted as a Git flag.
const branch = "--upload-pack=echo pwned";

// UNSAFE: Bun passes this as one argument, but `git` still interprets it as a flag.
await $`git ls-remote origin ${branch}`;
```
