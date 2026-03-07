---
name: agents-development-mode
description: Invoked by user directly to enable "Devmode Instructions" in project.
---

# agents-development-mode

## Goal

Add or update two sections in the project's `AGENTS.md`: **Development Posture** and **Testing**.

These sections exist because Codex defaults to production-conservative behavior and needs a project-scoped override. The content below is not a summary of principles — it is the minimum required content, written to be concrete enough that it cannot be misapplied.

---

## Workflow

### 1. Read and identify the surface

Read the project source to find the outermost interaction boundary — the entry point where the outside world meets the code. You will need this to fill in the Testing section.

Examples of surfaces:
- **CLI**: the action function that receives parsed args (not the arg parser; not deeper utilities)
- **HTTP API**: the route handler — mock inbound request, assert response
- **Library / SDK**: the public API exports
- **Background job**: the job entry point

Describe the surface by its architectural role, not by file path. Paths change; the role does not.

- Wrong: "The CLI action functions in `src/cli.ts` (`monitor`, `capture-replies`)"
- Right: "CLI commands — the action function invoked after argument parsing"

### 2. Compute the delta

Check whether Development Posture and Testing sections already exist. Do not duplicate content already present. Only add or replace what is absent or contradictory.

### 3. Write

Copy the Required Content below verbatim, then:
- Fill in the surface placeholder in the Testing section with the specific surface you identified.
- Adapt wording to match the project's voice only where necessary — do not change meaning.
- Insert near `Architecture` or `Build / Test` if present; otherwise append.
- Do not ask for confirmation. Write directly.

---

## Required Content

The following must appear in the project's `AGENTS.md`. This is the minimum. Do not summarize, paraphrase, or condense it.

---

### Development Posture

This project is in active development. The goal is a codebase that is always easy to change. Every line of code is a line that must be understood, maintained, and worked around in the next refactor. The right amount of code is the minimum that correctly implements current requirements — not a generalized version, not a future-proof version, not a version that anticipates other callers.

**Scope:**
- Implement what is required now. Not what might be needed. Not what a more general version of this would need.
- Do not add configuration options or optional parameters with a single fixed value. Hardcode the value or use a constant.
- Do not add abstraction layers, interfaces, or base classes with a single concrete implementation. Write the concrete thing directly.
- Do not add optional code paths, conditional branches, or feature flags for scenarios not currently exercised.
- Do not make functions accept parameters they are never called with in the current codebase.
- Do not generalize or parametrize code that is only ever called one way.
- When in doubt: if you are writing code that is not required to make the current task work, stop and delete it.

**Removal:**
- Remove means purge. When asked to remove a feature, flag, CLI option, or API surface — delete all traces: the implementation, the types, the tests, the documentation, and any code that only existed to support it.
- Never add an error-throwing stub as a substitute for deletion.
- Never add a deprecation warning, a "no longer supported" comment, or a migration note.
- Never add a test that verifies a removed thing now throws an error. If it was removed, the test is removed too.

**Stability:**
- Breaking changes are acceptable when they improve architecture or clarity.
- Prefer direct refactors over compatibility shims, migration layers, or fallback paths.
- Do not preserve old behavior for callers that do not exist.

---

### Testing

Tests verify behavior, not implementation. A test suite is healthy when you can rewrite the internals of a feature completely — restructure files, rename functions, change data shapes — and have zero tests fail, because nothing changed from the outside.

**Test at the outermost interaction surface (outside-in, black-box).** [FILL IN: describe the specific surface for this project — e.g. "The CLI action functions that receive parsed arguments in `src/commands/*.ts`" or "The HTTP route handlers in `src/routes/*.ts`".]

Rules:
- Mock at the external boundary only: network, filesystem, third-party services. Never mock internal functions, intermediate modules, or implementation details.
- Assert observable outcomes: HTTP responses, exit codes, stdout/stderr, returned values, persisted state, side effects.
- Do not write tests for individual internal functions, private methods, helper utilities, or implementation details.
- Do not add a test for every function you touch. Add or update a surface test that exercises the behavior you changed.
- Do not write a test verifying that a removed feature now throws an error. Remove the test with the feature.
- One test that drives a full code path through the interaction surface is worth more than ten tests of internal functions.

---

## Optional additions

After writing the required content, consider whether the following are relevant for this specific project. Add them only if they apply:

- **Fixture guidance**: if the project has complex state setup, note where fixtures live and whether a regeneration script is needed.
- **Framework/runner specifics**: if the project uses a non-obvious test runner or invocation pattern, document the exact command.
- **Multiple surfaces**: if the project has more than one distinct surface (e.g. a CLI and an HTTP API), describe each one and which tests belong to which.
