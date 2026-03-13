# Sosumi CLI

Use Sosumi when you want Apple Developer documentation in AI-readable Markdown from the command line.

## Bun CLI

Run Sosumi directly with `bunx`:

```bash
bunx @nshipster/sosumi fetch https://developer.apple.com/documentation/swift/array
```

If you use it regularly, install it globally with Bun:

```bash
bun i -g @nshipster/sosumi
```

Then use it as:

```bash
sosumi fetch /documentation/swift/array
```

## What it can fetch

Sosumi supports the same broad content categories described on `sosumi.ai`:

- Apple API docs
- Human Interface Guidelines
- Apple video transcripts, including WWDC sessions
- External Swift-DocC pages

Examples:

```bash
bunx @nshipster/sosumi fetch /documentation/swift/array
bunx @nshipster/sosumi fetch /documentation/swiftui
bunx @nshipster/sosumi fetch /design/human-interface-guidelines/color
bunx @nshipster/sosumi fetch /videos/play/wwdc2021/10133
bunx @nshipster/sosumi fetch https://apple.github.io/swift-argument-parser/documentation/argumentparser
```

## Search

Search Apple Developer documentation:

```bash
bunx @nshipster/sosumi search "SwiftData"
```

## JSON output

Use `--json` for scripts and agent tooling:

```bash
bunx @nshipster/sosumi fetch /documentation/swift/array --json
bunx @nshipster/sosumi search "SwiftData" --json
```

## Local server

Sosumi can also run a local server from the published package:

```bash
bunx @nshipster/sosumi serve
bunx @nshipster/sosumi serve --port 8787
```

## Path patterns

You can pass either:

- a full Apple Developer URL, such as `https://developer.apple.com/documentation/swift/array`
- a Sosumi-compatible path, such as `/documentation/swift/array`
- an external Swift-DocC URL, such as `https://apple.github.io/swift-argument-parser/documentation/argumentparser`

Useful patterns:

```text
/documentation/<framework-or-symbol>
/design/human-interface-guidelines/<topic>
/videos/play/<series>/<id>
https://apple.github.io/<package>/documentation/<module>
```

## When to use it

Use Sosumi CLI when:

- you need Apple docs as Markdown in the terminal,
- you want scriptable output for agents,
- you do not want to open JS-heavy Apple docs in a browser,
- you want a lightweight fetch/search tool without setting up MCP first.

Use Sosumi MCP instead when:

- you want tool-based access from an MCP client,
- you want search and fetch available as MCP tools inside an agent workflow.

The Sosumi MCP endpoint documented by the official site is:

```text
https://sosumi.ai/mcp
```

## References

- Official site: <https://sosumi.ai/#cli>
- Skill instructions: <https://sosumi.ai/SKILL.md>
- MCP endpoint: <https://sosumi.ai/mcp>
