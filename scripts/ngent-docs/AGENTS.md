# Requirements
This template uses Node.js + pnpm for runtime code, installs, and tests.
Do not introduce Bun runtime APIs into the package runtime or `bun:test` usage.
Use pnpm commands for install and test verification.

Selector routing has one source of truth. All `docs <where>` and
`docs ls [where...]` selector decisions must go through
`resolveDocsSelectorRoute`; callers may render returned routes, but must not
pre-resolve topics, docs roots, files, or parked collections in parallel paths.

# Agent Guidance

## Workflow

- Before handoff: Ensure `gate` is green.

## Delivery Posture

- This template is in active development.
- Keep this template lean and composable for CLI package reuse.
- Prefer direct refactors over compatibility shims unless explicitly requested.
- Keep public CLI behavior stable and documented.
- Gatefile owns validation routing.

## CLI Flag Policy

- Unless the user explicitly asks for CI/non-interactive compatibility, do not add new CLI flags.
- Do not add speculative or future-proofing flags.
- When reviewing template changes, focus on architectural patterns, not copying domain-specific command functionality.

## Testing Philosophy

Tests must verify observable behavior at the CLI surface:

1. Command routing and help behavior.
2. Flag parsing and coercion behavior.
3. Command output contracts in text and JSON modes.
4. Exit behavior for usage/runtime failures.

For bugs:
- Add a failing path test first.
- Fix the bug.
- Re-run tests and verify pass.

Priority order:
1. Integration tests at the CLI surface.
2. Contract tests where boundaries need explicit verification.
3. UI/E2E tests only when explicitly required.
