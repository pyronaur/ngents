---
name: agents-development-mode
description: Update the current project's AGENTS.md to reflect an active-development posture and a surface-level, black-box testing philosophy. Use this skill whenever the user asks to update, improve, or add development posture or testing guidance to AGENTS.md, or when AGENTS.md is missing these sections entirely.
---

# Agents Development Mode

## Objective

Update the active project's `AGENTS.md` with minimal, scoped edits that preserve project voice while clarifying development posture and testing strategy.

---

## Scope Boundaries

- Edit only the current project's `AGENTS.md` in the working repo.
- Do not edit global or shared agent config files unless explicitly requested.
- Avoid unrelated edits; change only sections needed for posture and testing guidance.
- If no `AGENTS.md` exists, ask before creating one.

---

## Doctrine

These principles are non-negotiable. Wording and technical application adapt per project; the substance does not.

### Delivery Posture

- This project is in active development. Breaking changes are acceptable when they improve architecture or code clarity.
- Prefer direct refactors over compatibility shims, fallback paths, or migration layers unless explicitly requested.
- Default validation is manual behavior verification plus successful builds.

### Testing Philosophy

The goal of tests is to verify the correctness of the program's behavior without coupling tests to its implementation. Tests must survive refactors — if internal code is restructured but behavior is unchanged, no test should need to change.

**Test at the surface, not the implementation.**

Every program has an interaction surface — the outermost boundary where the outside world meets the code. That is where tests belong. Do not test internal functions, private methods, or implementation details directly.

Surface examples by app type:
- **HTTP API** → the route handler (mock an inbound request, assert the response)
- **CLI** → the command invocation (call the CLI, assert stdout/stderr/exit code/side effects)
- **iOS / SwiftUI** → the view model or service layer (not UIKit/SwiftUI internals, not the simulator)
- **Background worker / job** → the job entry point (mock inputs, assert outputs and side effects)
- **Library / SDK** → the public API (call the public interface, assert what callers observe)

**Priority order — always test at the highest surface that is fast and stable:**

1. **Integration tests at the surface** — fast, broad, refactor-resistant. Default choice.
2. **Contract tests** — verify interface contracts between components when needed.
3. **UI / E2E tests (Playwright, XCUITest, simulator)** — last resort only. Slow and brittle. Use only to reproduce a specific bug at the UI level or when explicitly requested. Never the default.

**Test design rules:**
- Mock at the boundary (external I/O, network, filesystem), not inside business logic.
- Assert observable outcomes: responses, state changes, errors, side effects.
- Use fixtures where state setup is complex; include a script to regenerate fixtures if they can drift.
- Design interaction surfaces to be reusable — the same entry points used by the app should be callable from a test harness or CLI utility, enabling manual testing during development.

**Avoid:**
- Tests that target a single internal function or class by mocking its dependencies — these couple tests to implementation and break on refactors.
- Testing SQL queries, file manipulation, or internal utilities directly — test the observable outcome at the surface instead.

---

## Follow this step by step workflow:

### 1. Read and research

Read the current `AGENTS.md` and nearby project docs to capture tone, structure, and any existing posture guidance. Then research the project's test reality: stack, language, framework, CI/test commands, and what the public interaction surface looks like. Use available tools — do not ask the user for things you can discover yourself.

### 2. Compute the policy delta

Compare the current `AGENTS.md` against the doctrine above. Identify what is missing, what conflicts, and what is already covered. This delta drives everything — do not insert content that is already present in substance.

### 3. Choose interaction mode

- **Confirm with the user** when a change introduces new policy meaning, changes existing strictness, or requires choosing between multiple valid interpretations (e.g., which testing framework to adopt, what counts as the surface in this specific project).
- **Edit directly** when the change is a wording or structural clarification that preserves existing intent. No confirmation needed.
- When confirmation is needed, present a recommendation plus alternatives only when tradeoffs are genuinely real. One clear recommendation is fine when the choice is obvious — do not force options for the sake of it.

### 4. Apply scoped edits

Make minimal in-place edits. Match project voice and existing section structure. Insert new sections near `Agent Protocol` or `Build / Test` if present; otherwise append. Avoid section churn — extend or replace partial coverage rather than duplicating.

### 5. Summarize

State clearly what changed and why, expressed as a policy delta.

---

## Baseline Template

Use only when a section is entirely absent and the user agrees to add it. Adapt wording to project voice — the content below is the substance to convey, not a paste target.

```md
## Delivery Posture

- This project is in active development. Breaking changes are acceptable when they improve architecture or code clarity.
- Prefer direct refactors over compatibility shims or migration layers unless explicitly requested.
- Default validation is manual behavior verification plus successful builds.

## Testing Philosophy

Tests verify behavior, not implementation. Internal rewrites should not require test rewrites when observable behavior is unchanged.

Test at the interaction surface of the program — the outermost boundary where the outside world meets the code. [Describe the specific surface for this project here.]

Priority order:
1. Integration tests at the surface (default)
2. Contract tests where interface boundaries need explicit verification
3. UI / E2E tests (last resort — slow and brittle, use only when explicitly required)

Mock at the boundary. Assert observable outcomes. Use fixtures for complex state; include a regeneration path if fixtures can drift. Design surfaces to be reusable as manual test harnesses.

Do not write tests that target internal functions or mock internal dependencies — these couple tests to implementation and create friction for refactoring.

[Framework, entry point, and fixture specifics for this project.]
```
